import type { CloudPlug, CloudFile, CloudDocument, ConnectedAccount } from '../types';
import { SyncError, SYNC_ERROR } from '../errors';
import {
	cloudFileName,
	SYNC_APP_FOLDER,
	CLOUD_PROVIDER,
	SYNC_FILE_PREFIX,
	GOOGLE_TOKEN_EXPIRY_BUFFER_MS,
	GOOGLE_DEFAULT_TOKEN_LIFETIME_S
} from '../constants';

const TOKEN_KEY_PREFIX = 'alloca_sync_google_';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

interface TokenData {
	accessToken: string;
	expiresAt: number; // Unix ms
	email: string;
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

// Load the GIS script lazily
let gisLoaded = false;
async function loadGIS(): Promise<void> {
	if (gisLoaded || typeof document === 'undefined') return;
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://accounts.google.com/gsi/client';
		script.onload = () => {
			gisLoaded = true;
			resolve();
		};
		script.onerror = () => reject(new SyncError(SYNC_ERROR.AUTH_FAILED));
		document.head.appendChild(script);
	});
}

// Load gapi script lazily
let gapiLoaded = false;
async function loadGapi(): Promise<void> {
	if (gapiLoaded || typeof document === 'undefined') return;
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://apis.google.com/js/api.js';
		script.onload = () => {
			gapiLoaded = true;
			resolve();
		};
		script.onerror = () => reject(new SyncError(SYNC_ERROR.AUTH_FAILED));
		document.head.appendChild(script);
	});
}

async function getAccessToken(accountId: string): Promise<string> {
	const stored = loadToken(accountId);
	if (stored && stored.expiresAt > Date.now() + GOOGLE_TOKEN_EXPIRY_BUFFER_MS) {
		return stored.accessToken;
	}
	throw new SyncError(SYNC_ERROR.AUTH_FAILED);
}

async function driveRequest(
	method: string,
	url: string,
	accessToken: string,
	body?: unknown,
	params?: Record<string, string>
): Promise<Response> {
	const fullUrl = params
		? `${url}?${new URLSearchParams(params).toString()}`
		: url;
	const res = await fetch(fullUrl, {
		method,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			...(body ? { 'Content-Type': 'application/json' } : {})
		},
		...(body ? { body: JSON.stringify(body) } : {})
	});
	if (!res.ok) {
		if (res.status === 401) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		throw new SyncError(method === 'GET' ? SYNC_ERROR.DOWNLOAD_FAILED : SYNC_ERROR.UPLOAD_FAILED);
	}
	return res;
}

async function findAppFolder(accessToken: string): Promise<string> {
	const res = await driveRequest(
		'GET',
		'https://www.googleapis.com/drive/v3/files',
		accessToken,
		undefined,
		{
			q: `mimeType='application/vnd.google-apps.folder' and name='${SYNC_APP_FOLDER}' and trashed=false`,
			fields: 'files(id)'
		}
	);
	const data = await res.json();
	if (data.files?.length > 0) return data.files[0].id as string;

	// Create the folder
	const createRes = await driveRequest(
		'POST',
		'https://www.googleapis.com/drive/v3/files',
		accessToken,
		{ name: SYNC_APP_FOLDER, mimeType: 'application/vnd.google-apps.folder' }
	);
	const created = await createRes.json();
	return created.id as string;
}

export const googleDrivePlug: CloudPlug = {
	id: CLOUD_PROVIDER.GOOGLE_DRIVE,
	displayName: 'Google Drive',
	iconName: 'Cloud',

	async connect(): Promise<ConnectedAccount> {
		if (!GOOGLE_CLIENT_ID) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		await loadGIS();

		return new Promise((resolve, reject) => {
			// @ts-expect-error google is injected by GIS script
			const client = google.accounts.oauth2.initTokenClient({
				client_id: GOOGLE_CLIENT_ID,
				scope: SCOPES,
				callback: async (response: { access_token?: string; expires_in?: number; error?: string }) => {
					if (response.error || !response.access_token) {
						reject(new SyncError(SYNC_ERROR.AUTH_FAILED));
						return;
					}
					try {
						// Fetch user email
						const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
							headers: { Authorization: `Bearer ${response.access_token}` }
						});
						const user = await userRes.json();
						const accountId = user.sub as string;
						const expiresAt = Date.now() + (response.expires_in ?? GOOGLE_DEFAULT_TOKEN_LIFETIME_S) * 1000;
						saveToken(accountId, {
							accessToken: response.access_token,
							expiresAt,
							email: user.email as string
						});
						resolve({
							providerId: CLOUD_PROVIDER.GOOGLE_DRIVE,
							accountId,
							displayName: user.email as string,
							connectedAt: new Date().toISOString()
						});
					} catch {
						reject(new SyncError(SYNC_ERROR.AUTH_FAILED));
					}
				}
			});
			client.requestAccessToken({ prompt: 'consent' });
		});
	},

	async disconnect(accountId: string): Promise<void> {
		clearToken(accountId);
	},

	isConnected(accountId: string): boolean {
		const stored = loadToken(accountId);
		return stored !== null;
	},

	async refreshTokenIfNeeded(accountId: string): Promise<void> {
		const stored = loadToken(accountId);
		if (!stored) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		if (stored.expiresAt > Date.now() + GOOGLE_TOKEN_EXPIRY_BUFFER_MS) return;
		// GIS implicit tokens cannot be refreshed silently without user interaction
		// Mark as needing re-auth
		throw new SyncError(SYNC_ERROR.AUTH_FAILED);
	},

	async listFiles(accountId: string): Promise<CloudFile[]> {
		const token = await getAccessToken(accountId);
		const folderId = await findAppFolder(token);
		const res = await driveRequest(
			'GET',
			'https://www.googleapis.com/drive/v3/files',
			token,
			undefined,
			{
				q: `'${folderId}' in parents and name contains '${SYNC_FILE_PREFIX}' and trashed=false`,
				fields: 'files(id,name,modifiedTime)',
				orderBy: 'modifiedTime desc'
			}
		);
		const data = await res.json();
		return (data.files ?? []).map(
			(f: { id: string; name: string; modifiedTime: string }) => ({
				providerId: CLOUD_PROVIDER.GOOGLE_DRIVE,
				accountId,
				fileId: f.id,
				name: f.name,
				lastModified: f.modifiedTime
			})
		);
	},

	async loadFile(file: CloudFile): Promise<CloudDocument> {
		const token = await getAccessToken(file.accountId);
		const res = await driveRequest(
			'GET',
			`https://www.googleapis.com/drive/v3/files/${file.fileId}`,
			token,
			undefined,
			{ alt: 'media' }
		);
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
		const token = await getAccessToken(accountId);
		const name = existingFileId
			? (await (async () => {
					const files = await googleDrivePlug.listFiles(accountId);
					return files.find((f) => f.fileId === existingFileId)?.name ?? cloudFileName(doc.budget.year, doc.budget.id);
				})())
			: cloudFileName(doc.budget.year, doc.budget.id);

		const content = JSON.stringify(doc, null, 2);
		const metadata = { name, mimeType: 'application/json' };

		let res: Response;
		if (existingFileId) {
			// Multipart update
			const form = new FormData();
			form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
			form.append('file', new Blob([content], { type: 'application/json' }));
			res = await fetch(
				`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,modifiedTime`,
				{
					method: 'PATCH',
					headers: { Authorization: `Bearer ${token}` },
					body: form
				}
			);
		} else {
			const folderId = await findAppFolder(token);
			const form = new FormData();
			form.append(
				'metadata',
				new Blob([JSON.stringify({ ...metadata, parents: [folderId] })], {
					type: 'application/json'
				})
			);
			form.append('file', new Blob([content], { type: 'application/json' }));
			res = await fetch(
				'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime',
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${token}` },
					body: form
				}
			);
		}

		if (!res.ok) throw new SyncError(SYNC_ERROR.UPLOAD_FAILED);
		const saved = await res.json();
		return {
			providerId: CLOUD_PROVIDER.GOOGLE_DRIVE,
			accountId,
			fileId: saved.id as string,
			name: saved.name as string,
			lastModified: saved.modifiedTime as string
		};
	},

	async getLastModified(file: CloudFile): Promise<string> {
		const token = await getAccessToken(file.accountId);
		const res = await driveRequest(
			'GET',
			`https://www.googleapis.com/drive/v3/files/${file.fileId}`,
			token,
			undefined,
			{ fields: 'modifiedTime' }
		);
		const data = await res.json();
		return data.modifiedTime as string;
	}
};

// Suppress unused import warning — loadGapi is kept for future gapi-based features
void loadGapi;
