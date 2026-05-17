import { loadBudget, replaceBudget } from '$lib/db';
import { ExportDataSchema } from '$lib/schemas';
import type { Budget } from '$lib/types';
import type { ConnectedAccount, CloudFile, ConflictChoice } from './types';
import { PLUGS } from './registry';
import {
	getSyncState,
	setSyncStatus,
	setSyncError,
	setLastSyncAt,
	getLastSyncAt,
	setLastSyncHash,
	setPendingConflict,
	setActiveAccount
} from './state.svelte';
import { cloudFileName, SYNC_STATUS, CONFLICT_CHOICE, EXPORT_FORMAT_VERSION } from './constants';
import { SyncError, SYNC_ERROR } from './errors';

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function computeHash(obj: unknown): Promise<string> {
	const text = JSON.stringify(JSON.parse(JSON.stringify(obj)));
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function triggerDownload(budget: Budget) {
	const data = { version: EXPORT_FORMAT_VERSION, exportedAt: new Date().toISOString(), budget };
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `alloca-${budget.year}-backup.json`;
	a.click();
	URL.revokeObjectURL(url);
}

export async function pushToCloud(account: ConnectedAccount, currentBudget: Budget): Promise<void> {
	setSyncStatus(SYNC_STATUS.SYNCING);
	setSyncError(null);
	const plug = PLUGS[account.providerId];
	try {
		await plug.refreshTokenIfNeeded(account.accountId);
		const doc = {
			version: EXPORT_FORMAT_VERSION,
			exportedAt: new Date().toISOString(),
			budget: currentBudget
		};
		const existingFiles = await plug.listFiles(account.accountId);
		const targetName = cloudFileName(currentBudget.year, currentBudget.id);
		const matching = existingFiles.find((f) => f.name === targetName);
		await plug.saveFile(account.accountId, doc, matching?.fileId);
		setLastSyncAt(new Date().toISOString());
		setLastSyncHash(await computeHash(doc));
		setSyncStatus(SYNC_STATUS.IDLE);
	} catch (e) {
		const code = e instanceof SyncError ? e.code : SYNC_ERROR.UPLOAD_FAILED;
		setSyncError(code);
	}
}

export async function pullFromCloud(
	account: ConnectedAccount,
	file: CloudFile,
	localBudget: Budget,
	onImport: (b: Budget) => void,
	explicit = false
): Promise<'needs-confirm' | void> {
	setSyncStatus(SYNC_STATUS.SYNCING);
	setSyncError(null);
	const plug = PLUGS[account.providerId];
	try {
		await plug.refreshTokenIfNeeded(account.accountId);
		const remoteDoc = await plug.loadFile(file);
		const result = ExportDataSchema.safeParse(remoteDoc);
		if (!result.success) {
			setSyncError(SYNC_ERROR.INVALID_REMOTE);
			return;
		}
		const remoteBudget = result.data.budget;
		const localTs = new Date(localBudget.updatedAt).getTime();
		const remoteTs = new Date(remoteBudget.updatedAt).getTime();
		const lastSync = getLastSyncAt();

		if (localTs === remoteTs) {
			if (!explicit) {
				setSyncStatus(SYNC_STATUS.IDLE);
				return;
			}
			// Explicit load with same timestamp: user asked to load (e.g. manual JSON edit without changing updatedAt)
			const budget = JSON.parse(JSON.stringify(remoteBudget));
			await replaceBudget(budget);
			onImport(budget);
			setLastSyncAt(new Date().toISOString());
			setLastSyncHash(await computeHash(remoteDoc));
			setActiveAccount(account);
			setSyncStatus(SYNC_STATUS.IDLE);
			return;
		}

		if (remoteTs <= localTs) {
			if (explicit) {
				// User explicitly chose to load — ask for confirmation since local is newer
				if (remoteTs < localTs) {
					setSyncStatus(SYNC_STATUS.IDLE);
					return 'needs-confirm';
				} else {
					setSyncStatus(SYNC_STATUS.IDLE);
				}
			} else {
				// Background pull: local is newer → push up
				await pushToCloud(account, localBudget);
			}
			return;
		}

		// Remote is newer — check for conflict
		if (!explicit && localTs > lastSync && remoteTs > lastSync) {
			// Both sides changed since last background sync — user must decide
			setPendingConflict({ localBudget, remoteBudget, remoteFile: file });
			return;
		}

		// Only remote changed (or explicit load of a newer file) — apply
		const budget = JSON.parse(JSON.stringify(remoteBudget));
		await replaceBudget(budget);
		onImport(budget);
		setLastSyncAt(new Date().toISOString());
		setLastSyncHash(await computeHash(remoteDoc));
		setActiveAccount(account);
		setSyncStatus(SYNC_STATUS.IDLE);
	} catch (e) {
		const code = e instanceof SyncError ? e.code : SYNC_ERROR.DOWNLOAD_FAILED;
		setSyncError(code);
	}
}

export async function resolveConflict(
	choice: ConflictChoice,
	onImport: (b: Budget) => void
): Promise<void> {
	const state = getSyncState();
	const conflict = state.pendingConflict;
	if (!conflict) return;

	const account = state.connected.find((a) => a.providerId === conflict.remoteFile.providerId);

	if (choice === CONFLICT_CHOICE.KEEP_LOCAL && account) {
		await pushToCloud(account, conflict.localBudget);
	} else if (choice === CONFLICT_CHOICE.LOAD_REMOTE) {
		const budget = JSON.parse(JSON.stringify(conflict.remoteBudget));
		await replaceBudget(budget);
		onImport(budget);
		setLastSyncAt(new Date().toISOString());
		setLastSyncHash(await computeHash(budget));
		if (account) setActiveAccount(account);
		setSyncStatus(SYNC_STATUS.IDLE);
	} else if (choice === CONFLICT_CHOICE.EXPORT_THEN_LOAD) {
		triggerDownload(conflict.localBudget);
		const budget = JSON.parse(JSON.stringify(conflict.remoteBudget));
		await replaceBudget(budget);
		onImport(budget);
		setLastSyncAt(new Date().toISOString());
		setLastSyncHash(await computeHash(budget));
		if (account) setActiveAccount(account);
		setSyncStatus(SYNC_STATUS.IDLE);
	}

	setPendingConflict(null);
}

export function startPolling(
	account: ConnectedAccount,
	getBudget: () => Budget,
	onImport: (b: Budget) => void,
	intervalMs: number
): void {
	if (pollTimer !== null) return;
	pollTimer = setInterval(async () => {
		const state = getSyncState();
		if (state.status === SYNC_STATUS.SYNCING || state.status === SYNC_STATUS.CONFLICT) return;
		try {
			const plug = PLUGS[account.providerId];
			const files = await plug.listFiles(account.accountId);
			if (files.length === 0) return;
			const budget = getBudget();
			const targetName = cloudFileName(budget.year, budget.id);
			const file = files.find((f) => f.name === targetName) ?? files[0];
			const remoteModified = await plug.getLastModified(file);
			const lastSync = getLastSyncAt();
			if (lastSync > 0 && new Date(remoteModified).getTime() <= lastSync) return;
			await pullFromCloud(account, file, budget, onImport);
		} catch {
			// Silent — poll errors do not interrupt the user
		}
	}, intervalMs);
}

export function stopPolling(): void {
	if (pollTimer !== null) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
}

export async function initSync(budget: Budget, onImport: (b: Budget) => void): Promise<void> {
	const state = getSyncState();
	if (state.connected.length === 0) return;

	// Verify handles / tokens are still valid on load (non-blocking)
	for (const account of state.connected) {
		const plug = PLUGS[account.providerId];
		try {
			await plug.refreshTokenIfNeeded(account.accountId);
		} catch {
			// Account needs re-auth — leave it connected but in error state
			setSyncError(SYNC_ERROR.AUTH_FAILED);
		}
	}

	// Load the budget fresh from DB to avoid stale reference
	const fresh = await loadBudget();
	if (!fresh) return;

	// Do an initial pull from the first connected account
	const account = state.connected[0];
	const plug = PLUGS[account.providerId];
	try {
		const files = await plug.listFiles(account.accountId);
		const targetName = cloudFileName(fresh.year, fresh.id);
		const file = files.find((f) => f.name === targetName);
		if (file) {
			await pullFromCloud(account, file, fresh, onImport);
		}
	} catch {
		// Non-fatal on init
	}
}
