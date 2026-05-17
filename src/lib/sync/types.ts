import type { ExportData, Budget } from '$lib/types';
import { CLOUD_PROVIDER, SYNC_STATUS, CONFLICT_CHOICE } from './constants';

export type CloudProviderId = (typeof CLOUD_PROVIDER)[keyof typeof CLOUD_PROVIDER];
export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];
export type ConflictChoice = (typeof CONFLICT_CHOICE)[keyof typeof CONFLICT_CHOICE];

export interface ConnectedAccount {
	providerId: CloudProviderId;
	accountId: string;
	displayName: string;
	connectedAt: string; // ISO 8601
}

export interface CloudFile {
	providerId: CloudProviderId;
	accountId: string;
	fileId: string;
	name: string;
	lastModified: string; // ISO 8601
}

export type CloudDocument = ExportData;

export interface SyncConflict {
	localBudget: Budget;
	remoteBudget: Budget;
	remoteFile: CloudFile;
}

export interface SyncState {
	connected: ConnectedAccount[];
	status: SyncStatus;
	// Display-only — most recent sync across any file. Per-file timestamps live in localStorage.
	lastSyncAt: string | null;
	error: string | null;
	pendingConflict: SyncConflict | null;
}

export interface CloudPlug {
	readonly id: CloudProviderId;
	readonly displayName: string;
	readonly iconName: string; // lucide-svelte icon name

	connect(): Promise<ConnectedAccount>;
	disconnect(accountId: string): Promise<void>;
	isConnected(accountId: string): boolean;
	refreshTokenIfNeeded(accountId: string): Promise<void>;

	listFiles(accountId: string): Promise<CloudFile[]>;
	loadFile(file: CloudFile): Promise<CloudDocument>;
	saveFile(accountId: string, doc: CloudDocument, existingFileId?: string): Promise<CloudFile>;
	getLastModified(file: CloudFile): Promise<string>; // ISO 8601
}
