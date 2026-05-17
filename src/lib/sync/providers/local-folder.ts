import { nanoid } from 'nanoid';
import Dexie, { type Table } from 'dexie';
import type { CloudPlug, CloudFile, CloudDocument, ConnectedAccount } from '../types';
import {
	cloudFileName,
	CLOUD_PROVIDER,
	SYNC_FILE_PREFIX,
	SYNC_FILE_EXT,
	LOCAL_FOLDER_ID_LENGTH,
	SYNC_HANDLES_DB_VERSION
} from '../constants';
import { SyncError, SYNC_ERROR } from '../errors';

interface StoredHandle {
	key: string; // accountId
	handle: FileSystemDirectoryHandle;
}

class SyncHandlesDB extends Dexie {
	handles!: Table<StoredHandle, string>;
	constructor() {
		super('alloca-sync-handles');
		this.version(SYNC_HANDLES_DB_VERSION).stores({ handles: 'key' });
	}
}

const handlesDb = new SyncHandlesDB();

async function getHandle(accountId: string): Promise<FileSystemDirectoryHandle | null> {
	const row = await handlesDb.handles.get(accountId);
	return row?.handle ?? null;
}

async function storeHandle(accountId: string, handle: FileSystemDirectoryHandle) {
	await handlesDb.handles.put({ key: accountId, handle });
}

export const localFolderPlug: CloudPlug = {
	id: CLOUD_PROVIDER.LOCAL_FOLDER,
	displayName: 'Local Folder',
	iconName: 'FolderOpen',

	async connect(): Promise<ConnectedAccount> {
		if (!('showDirectoryPicker' in window)) {
			throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		}
		const handle = await (window as Window & { showDirectoryPicker: (opts?: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
			id: 'alloca-sync',
			mode: 'readwrite',
			startIn: 'documents'
		});
		const accountId = nanoid(LOCAL_FOLDER_ID_LENGTH);
		await storeHandle(accountId, handle);
		return {
			providerId: CLOUD_PROVIDER.LOCAL_FOLDER,
			accountId,
			displayName: handle.name,
			connectedAt: new Date().toISOString()
		};
	},

	async disconnect(accountId: string): Promise<void> {
		await handlesDb.handles.delete(accountId);
	},

	isConnected(_accountId: string): boolean {
		return true; // actual permission check is async; UI uses refreshTokenIfNeeded
	},

	async refreshTokenIfNeeded(accountId: string): Promise<void> {
		const handle = await getHandle(accountId);
		if (!handle) throw new SyncError(SYNC_ERROR.AUTH_FAILED);
		type PermissionHandle = FileSystemDirectoryHandle & {
			queryPermission(opts: { mode: string }): Promise<PermissionState>;
			requestPermission(opts: { mode: string }): Promise<PermissionState>;
		};
		const h = handle as PermissionHandle;
		const permission = await h.queryPermission({ mode: 'readwrite' });
		if (permission === 'granted') return;
		const result = await h.requestPermission({ mode: 'readwrite' });
		if (result !== 'granted') throw new SyncError(SYNC_ERROR.AUTH_FAILED);
	},

	async listFiles(accountId: string): Promise<CloudFile[]> {
		const handle = await getHandle(accountId);
		if (!handle) return [];
		const files: CloudFile[] = [];
		for await (const [name, entry] of handle.entries()) {
			if (entry.kind === 'file' && name.startsWith(SYNC_FILE_PREFIX) && name.endsWith(SYNC_FILE_EXT)) {
				const file = await (entry as FileSystemFileHandle).getFile();
				files.push({
					providerId: CLOUD_PROVIDER.LOCAL_FOLDER,
					accountId,
					fileId: name,
					name,
					lastModified: new Date(file.lastModified).toISOString()
				});
			}
		}
		return files.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
	},

	async loadFile(file: CloudFile): Promise<CloudDocument> {
		const dirHandle = await getHandle(file.accountId);
		if (!dirHandle) throw new SyncError(SYNC_ERROR.DOWNLOAD_FAILED);
		try {
			const fileHandle = await dirHandle.getFileHandle(file.fileId);
			const f = await fileHandle.getFile();
			const text = await f.text();
			return JSON.parse(text) as CloudDocument;
		} catch {
			throw new SyncError(SYNC_ERROR.DOWNLOAD_FAILED);
		}
	},

	async saveFile(
		accountId: string,
		doc: CloudDocument,
		existingFileId?: string
	): Promise<CloudFile> {
		const dirHandle = await getHandle(accountId);
		if (!dirHandle) throw new SyncError(SYNC_ERROR.UPLOAD_FAILED);
		const name = existingFileId ?? cloudFileName(doc.budget.year, doc.budget.id);
		try {
			const fileHandle = await dirHandle.getFileHandle(name, { create: true });
			const writable = await fileHandle.createWritable();
			await writable.write(JSON.stringify(doc, null, 2));
			await writable.close();
			const savedFile = await fileHandle.getFile();
			return {
				providerId: CLOUD_PROVIDER.LOCAL_FOLDER,
				accountId,
				fileId: name,
				name,
				lastModified: new Date(savedFile.lastModified).toISOString()
			};
		} catch {
			throw new SyncError(SYNC_ERROR.UPLOAD_FAILED);
		}
	},

	async getLastModified(file: CloudFile): Promise<string> {
		const dirHandle = await getHandle(file.accountId);
		if (!dirHandle) throw new SyncError(SYNC_ERROR.DOWNLOAD_FAILED);
		const fileHandle = await dirHandle.getFileHandle(file.fileId);
		const f = await fileHandle.getFile();
		return new Date(f.lastModified).toISOString();
	}
};
