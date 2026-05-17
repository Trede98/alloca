export const SYNC_STORAGE_PREFIX = 'alloca_sync_';
export const SYNC_ACCOUNTS_KEY = 'alloca_sync_accounts';
export const SYNC_LAST_KEY = 'alloca_sync_last';
export const SYNC_HASH_KEY = 'alloca_sync_hash';
export const POLL_INTERVAL_MS = 60_000;
export const SYNC_APP_FOLDER = 'Alloca';
export const SYNC_FILE_PREFIX = 'alloca-';
export const SYNC_FILE_EXT = '.json';
export const EXPORT_FORMAT_VERSION = 1 as const;

export const SYNC_STATUS = {
	IDLE: 'idle',
	SYNCING: 'syncing',
	CONFLICT: 'conflict',
	ERROR: 'error',
	DISCONNECTED: 'disconnected'
} as const;

export const CONFLICT_CHOICE = {
	KEEP_LOCAL: 'keep-local',
	LOAD_REMOTE: 'load-remote',
	EXPORT_THEN_LOAD: 'export-then-load'
} as const;

export const CLOUD_PROVIDER = {
	GOOGLE_DRIVE: 'google-drive',
	DROPBOX: 'dropbox',
	ONEDRIVE: 'onedrive',
	LOCAL_FOLDER: 'local-folder'
} as const;

// Provider-internal magic numbers
export const PKCE_VERIFIER_BYTES = 32;
export const OAUTH_POPUP_POLL_MS = 200;
export const LOCAL_FOLDER_ID_LENGTH = 8;
export const SYNC_HANDLES_DB_VERSION = 1;
export const GOOGLE_TOKEN_EXPIRY_BUFFER_MS = 60_000;
export const GOOGLE_DEFAULT_TOKEN_LIFETIME_S = 3600;

export function cloudFileName(budgetYear: number, budgetId: string): string {
	return `${SYNC_FILE_PREFIX}${budgetYear}-${budgetId.slice(0, 8)}${SYNC_FILE_EXT}`;
}
