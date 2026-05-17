import type {
	PublicClientApplication,
	AccountInfo,
	AuthenticationResult
} from '@azure/msal-browser';
import type { CloudPlug, CloudFile, CloudDocument, ConnectedAccount } from '../types';
import { SyncError, SYNC_ERROR } from '../errors';
import { cloudFileName, SYNC_APP_FOLDER, CLOUD_PROVIDER, SYNC_FILE_PREFIX, SYNC_FILE_EXT } from '../constants';

const MSAL_CLIENT_ID = import.meta.env.VITE_ONEDRIVE_CLIENT_ID ?? '';
const SCOPES = ['Files.ReadWrite.AppFolder', 'User.Read'];
const META_KEY_PREFIX = 'alloca_sync_onedrive_';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

interface AccountMeta {
	accountId: string;
	displayName: string;
	homeAccountId: string; // MSAL internal key
}

function metaKey(accountId: string) {
	return `${META_KEY_PREFIX}${accountId}`;
}

function loadMeta(accountId: string): AccountMeta | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		return JSON.parse(localStorage.getItem(metaKey(accountId)) ?? 'null');
	} catch {
		return null;
	}
}

function saveMeta(meta: AccountMeta) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(metaKey(meta.accountId), JSON.stringify(meta));
}

function clearMeta(accountId: string) {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(metaKey(accountId));
}

let msalInstance: PublicClientApplication | null = null;

async function getMsal(): Promise<PublicClientApplication> {
	if (msalInstance) return msalInstance;
	const { PublicClientApplication } = await import('@azure/msal-browser');
	const instance = new PublicClientApplication({
		auth: {
			clientId: MSAL_CLIENT_ID,
			redirectUri: typeof window !== 'undefined' ? window.location.origin + '/' : '/'
		},
		cache: { cacheLocation: 'localStorage' }
	});
	await instance.initialize();
	msalInstance = instance;
	return instance;
}

async function acquireToken(homeAccountId: string): Promise<string> {
	const msal = await getMsal();
	const accounts = msal.getAllAccounts();
	const account = accounts.find((a: AccountInfo) => a.homeAccountId === homeAccountId);
	if (!account) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
	try {
		const result: AuthenticationResult = await msal.acquireTokenSilent({
			scopes: SCOPES,
			account
		});
		return result.accessToken;
	} catch {
		throw new SyncError(SYNC_ERROR.AUTH_FAILED);
	}
}

async function graphRequest(
	method: string,
	path: string,
	accessToken: string,
	body?: unknown,
	contentType?: string
): Promise<Response> {
	const res = await fetch(`${GRAPH_BASE}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			...(body
				? { 'Content-Type': contentType ?? 'application/json' }
				: {})
		},
		body: body
			? contentType === 'application/octet-stream'
				? (body as string)
				: JSON.stringify(body)
			: undefined
	});
	if (!res.ok) {
		if (res.status === 401) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		throw new SyncError(method === 'GET' ? SYNC_ERROR.DOWNLOAD_FAILED : SYNC_ERROR.UPLOAD_FAILED);
	}
	return res;
}

export const onedrivePlug: CloudPlug = {
	id: CLOUD_PROVIDER.ONEDRIVE,
	displayName: 'OneDrive',
	iconName: 'Cloud',

	async connect(): Promise<ConnectedAccount> {
		if (!MSAL_CLIENT_ID) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		const msal = await getMsal();
		let result: AuthenticationResult;
		try {
			result = await msal.loginPopup({ scopes: SCOPES });
		} catch {
			throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		}
		const account = result.account;
		if (!account) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		const accountId = account.localAccountId;
		const displayName = account.username ?? account.name ?? accountId;
		saveMeta({ accountId, displayName, homeAccountId: account.homeAccountId });
		return {
			providerId: CLOUD_PROVIDER.ONEDRIVE,
			accountId,
			displayName,
			connectedAt: new Date().toISOString()
		};
	},

	async disconnect(accountId: string): Promise<void> {
		const meta = loadMeta(accountId);
		if (meta) {
			try {
				const msal = await getMsal();
				const accounts = msal.getAllAccounts();
				const account = accounts.find((a: AccountInfo) => a.homeAccountId === meta.homeAccountId);
				if (account) await msal.logoutPopup({ account });
			} catch {
				// Best effort
			}
		}
		clearMeta(accountId);
	},

	isConnected(accountId: string): boolean {
		return loadMeta(accountId) !== null;
	},

	async refreshTokenIfNeeded(accountId: string): Promise<void> {
		const meta = loadMeta(accountId);
		if (!meta) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		// Throws SyncError if silent refresh fails
		await acquireToken(meta.homeAccountId);
	},

	async listFiles(accountId: string): Promise<CloudFile[]> {
		const meta = loadMeta(accountId);
		if (!meta) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		const token = await acquireToken(meta.homeAccountId);

		// Ensure the app folder exists by requesting it
		await graphRequest('GET', `/me/drive/special/approot`, token);

		const res = await graphRequest(
			'GET',
			`/me/drive/special/approot:/${SYNC_APP_FOLDER}:/children?$select=id,name,lastModifiedDateTime`,
			token
		);
		const data = await res.json();
		return (data.value ?? [])
			.filter((f: { name: string }) => f.name.startsWith(SYNC_FILE_PREFIX) && f.name.endsWith(SYNC_FILE_EXT))
			.map((f: { id: string; name: string; lastModifiedDateTime: string }) => ({
				providerId: CLOUD_PROVIDER.ONEDRIVE,
				accountId,
				fileId: f.id,
				name: f.name,
				lastModified: f.lastModifiedDateTime
			}));
	},

	async loadFile(file: CloudFile): Promise<CloudDocument> {
		const meta = loadMeta(file.accountId);
		if (!meta) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		const token = await acquireToken(meta.homeAccountId);
		const res = await graphRequest('GET', `/me/drive/items/${file.fileId}/content`, token);
		try {
			return (await res.json()) as CloudDocument;
		} catch {
			throw new SyncError(SYNC_ERROR.DOWNLOAD_FAILED);
		}
	},

	async saveFile(
		accountId: string,
		doc: CloudDocument,
		_existingFileId?: string
	): Promise<CloudFile> {
		const meta = loadMeta(accountId);
		if (!meta) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		const token = await acquireToken(meta.homeAccountId);
		const name = cloudFileName(doc.budget.year, doc.budget.id);
		const content = JSON.stringify(doc, null, 2);
		// PUT to approot creates or replaces the file
		const res = await graphRequest(
			'PUT',
			`/me/drive/special/approot:/${SYNC_APP_FOLDER}/${name}:/content`,
			token,
			content,
			'application/octet-stream'
		);
		const saved = await res.json();
		return {
			providerId: CLOUD_PROVIDER.ONEDRIVE,
			accountId,
			fileId: saved.id as string,
			name: saved.name as string,
			lastModified: saved.lastModifiedDateTime as string
		};
	},

	async getLastModified(file: CloudFile): Promise<string> {
		const meta = loadMeta(file.accountId);
		if (!meta) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		const token = await acquireToken(meta.homeAccountId);
		const res = await graphRequest(
			'GET',
			`/me/drive/items/${file.fileId}?$select=lastModifiedDateTime`,
			token
		);
		const data = await res.json();
		return data.lastModifiedDateTime as string;
	}
};
