import type { SyncState, SyncStatus, SyncConflict, ConnectedAccount } from './types';
import { SYNC_ACCOUNTS_KEY, SYNC_LAST_KEY, SYNC_HASH_KEY, SYNC_STATUS } from './constants';

function loadStoredAccounts(): ConnectedAccount[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		return JSON.parse(localStorage.getItem(SYNC_ACCOUNTS_KEY) ?? '[]');
	} catch {
		return [];
	}
}

let state = $state<SyncState>({
	connected: loadStoredAccounts(),
	status: SYNC_STATUS.IDLE,
	lastSyncAt: null,
	error: null,
	pendingConflict: null
});

let activeAccount = $state<ConnectedAccount | null>(null);

function persistAccounts() {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(SYNC_ACCOUNTS_KEY, JSON.stringify(state.connected));
}

export function getSyncState(): SyncState {
	return state;
}

export function setSyncStatus(s: SyncStatus) {
	state.status = s;
}

export function setSyncError(msg: string | null) {
	state.error = msg;
	if (msg !== null) state.status = SYNC_STATUS.ERROR;
}

export function setLastSyncAt(ts: string) {
	state.lastSyncAt = ts;
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(SYNC_LAST_KEY, ts);
	}
}

export function getLastSyncAt(): number {
	if (typeof localStorage === 'undefined') return 0;
	const stored = localStorage.getItem(SYNC_LAST_KEY);
	return stored ? new Date(stored).getTime() : 0;
}

export function getLastSyncAtReactive(): number {
	return state.lastSyncAt ? new Date(state.lastSyncAt).getTime() : getLastSyncAt();
}

export function setPendingConflict(c: SyncConflict | null) {
	state.pendingConflict = c;
	state.status = c !== null ? SYNC_STATUS.CONFLICT : SYNC_STATUS.IDLE;
}

export function addConnectedAccount(account: ConnectedAccount) {
	state.connected = [...state.connected, account];
	persistAccounts();
}

export function removeConnectedAccount(providerId: string, accountId: string) {
	state.connected = state.connected.filter(
		(a) => !(a.providerId === providerId && a.accountId === accountId)
	);
	persistAccounts();
	if (state.connected.length === 0) {
		clearSyncFileState();
	}
}

export function setLastSyncHash(hash: string) {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(SYNC_HASH_KEY, hash);
	}
}

export function getLastSyncHash(): string {
	if (typeof localStorage === 'undefined') return '';
	return localStorage.getItem(SYNC_HASH_KEY) ?? '';
}

export function clearSyncFileState() {
	state.lastSyncAt = null;
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(SYNC_LAST_KEY);
		localStorage.removeItem(SYNC_HASH_KEY);
	}
}

export function getActiveAccount(): ConnectedAccount | null {
	return activeAccount;
}

export function setActiveAccount(account: ConnectedAccount | null) {
	activeAccount = account;
}

export function resetSyncStatusForBudget() {
	state.error = null;
	state.status = SYNC_STATUS.IDLE;
	const stored = typeof localStorage !== 'undefined'
		? localStorage.getItem(SYNC_LAST_KEY)
		: null;
	state.lastSyncAt = stored ?? null;
}
