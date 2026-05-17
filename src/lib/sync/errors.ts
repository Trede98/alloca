export const SYNC_ERROR = {
	NO_BUDGET: 'sync_error_no_budget',
	INVALID_REMOTE: 'sync_error_invalid_remote',
	AUTH_FAILED: 'sync_error_auth_failed',
	UPLOAD_FAILED: 'sync_error_upload_failed',
	DOWNLOAD_FAILED: 'sync_error_download_failed'
} as const;

export type SyncErrorCode = (typeof SYNC_ERROR)[keyof typeof SYNC_ERROR];

export class SyncError extends Error {
	constructor(public readonly code: SyncErrorCode) {
		super(code);
	}
}
