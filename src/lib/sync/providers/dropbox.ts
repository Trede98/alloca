import type { CloudPlug, CloudFile, CloudDocument, ConnectedAccount } from '../types';
import { SyncError, SYNC_ERROR } from '../errors';
import {
	cloudFileName,
	SYNC_APP_FOLDER,
	CLOUD_PROVIDER,
	SYNC_FILE_PREFIX,
	SYNC_FILE_EXT,
	PKCE_VERIFIER_BYTES,
	OAUTH_POPUP_POLL_MS
} from '../constants';

const TOKEN_KEY_PREFIX = 'alloca_sync_dropbox_';
const DROPBOX_APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY ?? '';
const REDIRECT_URI = `${typeof window !== 'undefined' ? window.location.origin : ''}/`;
const AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const APP_FOLDER_PATH = `/${SYNC_APP_FOLDER}`;

interface TokenData {
	accessToken: string;
	refreshToken: string;
	accountId: string;
	displayName: string;
}

function tokenKey(accountId: string) {
	return `${TOKEN_KEY_PREFIX}${accountId}`;
}

function loadToken(accountId: string): TokenData | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		return JSON.parse(localStorage.getItem(tokenKey(accountId)) ?? 'null');
	} catch {
		return null;
	}
}

function saveToken(accountId: string, data: TokenData) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(tokenKey(accountId), JSON.stringify(data));
}

function clearToken(accountId: string) {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(tokenKey(accountId));
}

// PKCE helpers
async function generateCodeVerifier(): Promise<string> {
	const array = new Uint8Array(PKCE_VERIFIER_BYTES);
	crypto.getRandomValues(array);
	return btoa(String.fromCharCode(...array))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return btoa(String.fromCharCode(...new Uint8Array(hash)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

async function openAuthPopup(url: string): Promise<URL> {
	return new Promise((resolve, reject) => {
		const popup = window.open(url, 'dropbox-auth', 'width=600,height=700');
		if (!popup) {
			reject(new SyncError(SYNC_ERROR.AUTH_FAILED));
			return;
		}
		const timer = setInterval(() => {
			try {
				if (popup.closed) {
					clearInterval(timer);
					reject(new SyncError(SYNC_ERROR.AUTH_FAILED));
					return;
				}
				const redirected = new URL(popup.location.href);
				if (redirected.origin === window.location.origin) {
					clearInterval(timer);
					popup.close();
					resolve(redirected);
				}
			} catch {
				// Cross-origin — still on Dropbox domain, keep waiting
			}
		}, OAUTH_POPUP_POLL_MS);
	});
}

async function dbxRequest(
	url: string,
	accessToken: string,
	body: unknown,
	isContent = false
): Promise<Response> {
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': isContent ? 'application/octet-stream' : 'application/json'
		},
		body: isContent ? (body as string) : JSON.stringify(body)
	});
	if (!res.ok) {
		if (res.status === 401) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		throw new SyncError(SYNC_ERROR.DOWNLOAD_FAILED);
	}
	return res;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
	const res = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: DROPBOX_APP_KEY
		})
	});
	if (!res.ok) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
	const data = await res.json();
	return data.access_token as string;
}

export const dropboxPlug: CloudPlug = {
	id: CLOUD_PROVIDER.DROPBOX,
	displayName: 'Dropbox',
	iconName: 'Cloud',

	async connect(): Promise<ConnectedAccount> {
		if (!DROPBOX_APP_KEY) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		const verifier = await generateCodeVerifier();
		const challenge = await generateCodeChallenge(verifier);
		const state = crypto.randomUUID();

		const params = new URLSearchParams({
			client_id: DROPBOX_APP_KEY,
			redirect_uri: REDIRECT_URI,
			response_type: 'code',
			code_challenge: challenge,
			code_challenge_method: 'S256',
			state,
			token_access_type: 'offline'
		});

		const redirected = await openAuthPopup(`${AUTH_URL}?${params.toString()}`);
		const code = redirected.searchParams.get('code');
		const returnedState = redirected.searchParams.get('state');

		if (!code || returnedState !== state) throw new SyncError(SYNC_ERROR.AUTH_FAILED);

		const tokenRes = await fetch(TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				grant_type: 'authorization_code',
				code_verifier: verifier,
				redirect_uri: REDIRECT_URI,
				client_id: DROPBOX_APP_KEY
			})
		});
		if (!tokenRes.ok) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		const tokenData = await tokenRes.json();

		// Get account info
		const accountRes = await dbxRequest(
			'https://api.dropboxapi.com/2/users/get_current_account',
			tokenData.access_token as string,
			null
		);
		const account = await accountRes.json();
		const accountId = account.account_id as string;
		const displayName = account.email as string;

		saveToken(accountId, {
			accessToken: tokenData.access_token as string,
			refreshToken: tokenData.refresh_token as string,
			accountId,
			displayName
		});

		return {
			providerId: CLOUD_PROVIDER.DROPBOX,
			accountId,
			displayName,
			connectedAt: new Date().toISOString()
		};
	},

	async disconnect(accountId: string): Promise<void> {
		const token = loadToken(accountId);
		if (token) {
			try {
				await dbxRequest(
					'https://api.dropboxapi.com/2/auth/token/revoke',
					token.accessToken,
					null
				);
			} catch {
				// Best effort
			}
		}
		clearToken(accountId);
	},

	isConnected(accountId: string): boolean {
		return loadToken(accountId) !== null;
	},

	async refreshTokenIfNeeded(accountId: string): Promise<void> {
		const stored = loadToken(accountId);
		if (!stored) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		try {
			const newAccessToken = await refreshAccessToken(stored.refreshToken);
			saveToken(accountId, { ...stored, accessToken: newAccessToken });
		} catch {
			throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		}
	},

	async listFiles(accountId: string): Promise<CloudFile[]> {
		const token = loadToken(accountId);
		if (!token) throw new SyncError(SYNC_ERROR.AUTH_FAILED);

		// Ensure app folder exists
		try {
			await dbxRequest(
				'https://api.dropboxapi.com/2/files/create_folder_v2',
				token.accessToken,
				{ path: APP_FOLDER_PATH, autorename: false }
			);
		} catch {
			// Folder may already exist — ignore error
		}

		const res = await dbxRequest(
			'https://api.dropboxapi.com/2/files/list_folder',
			token.accessToken,
			{ path: APP_FOLDER_PATH }
		);
		const data = await res.json();
		return (data.entries ?? [])
			.filter(
				(e: { '.tag': string; name: string }) =>
					e['.tag'] === 'file' && e.name.startsWith(SYNC_FILE_PREFIX) && e.name.endsWith(SYNC_FILE_EXT)
			)
			.map(
				(e: { id: string; name: string; server_modified: string }) => ({
					providerId: CLOUD_PROVIDER.DROPBOX,
					accountId,
					fileId: e.id,
					name: e.name,
					lastModified: e.server_modified
				})
			);
	},

	async loadFile(file: CloudFile): Promise<CloudDocument> {
		const token = loadToken(file.accountId);
		if (!token) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		const res = await fetch('https://content.dropboxapi.com/2/files/download', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
				'Dropbox-API-Arg': JSON.stringify({ path: file.fileId })
			}
		});
		if (!res.ok) throw new SyncError(SYNC_ERROR.DOWNLOAD_FAILED);
		try {
			return (await res.json()) as CloudDocument;
		} catch {
			throw new SyncError(SYNC_ERROR.DOWNLOAD_FAILED);
		}
	},

	async saveFile(
		accountId: string,
		doc: CloudDocument,
		existingFileId?: string
	): Promise<CloudFile> {
		const token = loadToken(accountId);
		if (!token) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		const name = cloudFileName(doc.budget.year, doc.budget.id);
		const path = `${APP_FOLDER_PATH}/${name}`;
		const content = JSON.stringify(doc, null, 2);
		const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token.accessToken}`,
				'Content-Type': 'application/octet-stream',
				'Dropbox-API-Arg': JSON.stringify({
					path,
					mode: existingFileId ? { '.tag': 'update', update: existingFileId } : { '.tag': 'overwrite' },
					autorename: false
				})
			},
			body: content
		});
		if (!res.ok) throw new SyncError(SYNC_ERROR.UPLOAD_FAILED);
		const saved = await res.json();
		return {
			providerId: CLOUD_PROVIDER.DROPBOX,
			accountId,
			fileId: saved.id as string,
			name: saved.name as string,
			lastModified: saved.server_modified as string
		};
	},

	async getLastModified(file: CloudFile): Promise<string> {
		const token = loadToken(file.accountId);
		if (!token) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		const res = await dbxRequest(
			'https://api.dropboxapi.com/2/files/get_metadata',
			token.accessToken,
			{ path: file.fileId }
		);
		const data = await res.json();
		return data.server_modified as string;
	}
};
