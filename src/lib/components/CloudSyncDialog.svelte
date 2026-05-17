<script lang="ts">
	import { Dialog, Collapsible } from 'bits-ui';
	import { tick, untrack } from 'svelte';
	import { FolderOpen, Cloud, ChevronDown, ChevronRight, X, RefreshCw, AlertCircle, CheckCircle, CloudUpload } from 'lucide-svelte';
	import type { Budget } from '$lib/types';
	import {
		getSyncState,
		addConnectedAccount,
		removeConnectedAccount,
		pullFromCloud,
		pushToCloud,
		getLastSyncAtReactive,
		getLastSyncHash,
		resetSyncStatusForBudget,
		PLUGS
	} from '$lib/sync';
	import type { ConnectedAccount, CloudFile, CloudProviderId } from '$lib/sync';
	import * as m from '$lib/paraglide/messages';

	let {
		open = $bindable(false),
		budget,
		onImport
	}: {
		open?: boolean;
		budget: Budget;
		onImport: (b: Budget) => void;
	} = $props();

	const syncState = $derived(getSyncState());
	const budgetEverSynced = $derived(getLastSyncAtReactive() > 0);

	// Close this dialog when a conflict is pending so ConflictDialog can appear cleanly
	$effect(() => {
		if (syncState.pendingConflict !== null) {
			open = false;
		}
	});

	// Per-account file lists, loaded lazily when account is expanded
	let accountFiles = $state<Record<string, CloudFile[] | 'loading' | 'error'>>({});
	let expandedAccount = $state<string | null>(null);
	let connecting = $state<CloudProviderId | null>(null);
	let connectError = $state('');
	let showConnectPanel = $state(false);
	let refreshingAccounts = $state<Set<string>>(new Set());
	let pushing = $state(false);

	// Inline confirm state for loading a file that is older than local
	let pendingLoad = $state<{ account: ConnectedAccount; file: CloudFile } | null>(null);

	// Per-file hash change detection: fileId → true if remote differs from last synced hash
	let fileHashChanged = $state<Record<string, boolean>>({});

	// Reset all cached state and auto-expand accounts on every open
	$effect(() => {
		if (!open) return;
		accountFiles = {};
		fileHashChanged = {};
		pendingLoad = null;
		expandedAccount = null;
		resetSyncStatusForBudget();
		const accounts = syncState.connected;
		untrack(() => {
			accounts.forEach((account) => loadAccount(account));
		});
	});

	async function computeFileHash(obj: unknown): Promise<string> {
		const text = JSON.stringify(JSON.parse(JSON.stringify(obj)));
		const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
		return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
	}

	const PROVIDER_LABELS: Record<CloudProviderId, () => string> = {
		'google-drive': () => m.sync_provider_google_drive(),
		dropbox: () => m.sync_provider_dropbox(),
		onedrive: () => m.sync_provider_onedrive(),
		'local-folder': () => m.sync_provider_local_folder()
	};

	const PROVIDER_ICONS: Record<CloudProviderId, typeof Cloud> = {
		'google-drive': Cloud,
		dropbox: Cloud,
		onedrive: Cloud,
		'local-folder': FolderOpen
	};

	function accountKey(a: ConnectedAccount) {
		return `${a.providerId}:${a.accountId}`;
	}

	async function loadAccount(account: ConnectedAccount) {
		const key = accountKey(account);
		accountFiles = { ...accountFiles, [key]: 'loading' };
		await tick();
		try {
			const plug = PLUGS[account.providerId];
			await plug.refreshTokenIfNeeded(account.accountId);
			const files = await plug.listFiles(account.accountId);
			accountFiles = { ...accountFiles, [key]: files };
		} catch {
			accountFiles = { ...accountFiles, [key]: 'error' };
		}
	}

	async function toggleAccount(account: ConnectedAccount) {
		const key = accountKey(account);
		if (accountFiles[key] === 'loading') return;
		if (expandedAccount === key) {
			expandedAccount = null;
			return;
		}
		expandedAccount = key;
		if (accountFiles[key] !== undefined) return;
		await loadAccount(account);
	}

	async function refreshFiles(account: ConnectedAccount) {
		const key = accountKey(account);
		refreshingAccounts = new Set([...refreshingAccounts, key]);
		await tick();
		try {
			const plug = PLUGS[account.providerId];
			await plug.refreshTokenIfNeeded(account.accountId);
			const files = await plug.listFiles(account.accountId);
			accountFiles = { ...accountFiles, [key]: files };
			// Compute hash for each file to detect external changes
			const changes: Record<string, boolean> = { ...fileHashChanged };
			for (const file of files) {
				const storedHash = getLastSyncHash();
				if (storedHash) {
					try {
						const doc = await plug.loadFile(file);
						const currentHash = await computeFileHash(doc);
						changes[file.fileId] = currentHash !== storedHash;
					} catch {
						// Skip hash check on load failure
					}
				}
			}
			fileHashChanged = changes;
			await tick();
		} catch {
			accountFiles = { ...accountFiles, [key]: 'error' };
		}
		const next = new Set(refreshingAccounts);
		next.delete(key);
		refreshingAccounts = next;
	}

	async function handlePull(account: ConnectedAccount, file: CloudFile) {
		const result = await pullFromCloud(account, file, budget, onImport, true);
		if (result === 'needs-confirm') {
			pendingLoad = { account, file };
			return;
		}
		const { [file.fileId]: _cleared, ...rest } = fileHashChanged;
		fileHashChanged = rest;
		await refreshFiles(account);
	}

	async function confirmLoad() {
		if (!pendingLoad) return;
		const { account, file } = pendingLoad;
		pendingLoad = null;
		// Force load: remote is older but user confirmed — load it directly
		await pullFromCloud(account, file, { ...budget, updatedAt: new Date(0).toISOString() }, onImport, true);
		const { [file.fileId]: _cleared, ...rest } = fileHashChanged;
		fileHashChanged = rest;
		await refreshFiles(account);
	}

	function cancelLoad() {
		pendingLoad = null;
	}

	async function handlePush(account: ConnectedAccount) {
		pushing = true;
		try {
			await pushToCloud(account, budget);
			await refreshFiles(account);
		} finally {
			pushing = false;
		}
	}

	async function handleConnect(providerId: CloudProviderId) {
		connecting = providerId;
		connectError = '';
		try {
			const plug = PLUGS[providerId];
			const account = await plug.connect();
			addConnectedAccount(account);
			showConnectPanel = false;
			// Auto-expand the new account
			expandedAccount = accountKey(account);
			await refreshFiles(account);
		} catch {
			connectError = m.sync_error_auth_failed();
		} finally {
			connecting = null;
		}
	}

	async function handleDisconnect(account: ConnectedAccount) {
		const plug = PLUGS[account.providerId];
		try {
			await plug.disconnect(account.accountId);
		} catch {
			// Best effort
		}
		removeConnectedAccount(account.providerId, account.accountId);
		const key = accountKey(account);
		const { [key]: _removed, ...rest } = accountFiles;
		accountFiles = rest;
		if (expandedAccount === key) expandedAccount = null;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleString();
	}

	function statusLabel(): string {
		switch (syncState.status) {
			case 'syncing': return m.sync_status_syncing();
			case 'conflict': return m.sync_status_conflict();
			case 'error': return syncState.error ?? m.sync_status_error();
			default: return syncState.lastSyncAt
				? `${m.sync_last_synced()}: ${formatDate(syncState.lastSyncAt)}`
				: m.sync_never_synced();
		}
	}

	const allProviderIds: CloudProviderId[] = ['google-drive', 'dropbox', 'onedrive', 'local-folder'];
	const localFolderAvailable = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-overlay" />
		<Dialog.Content
			class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
		>
			<div
				class="pointer-events-auto flex w-full max-w-md flex-col rounded-radius border border-border bg-surface max-h-[85vh]"
			>
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-border px-5 py-4">
					<Dialog.Title class="text-sm font-semibold">{m.sync_dialog_title()}</Dialog.Title>
					<Dialog.Close
						class="rounded-sm p-1 text-muted opacity-50 transition-opacity hover:opacity-100"
						aria-label="Close"
					>
						<X size={14} />
					</Dialog.Close>
				</div>

				<!-- Body -->
				<div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
					{#if syncState.connected.length === 0 && !showConnectPanel}
						<p class="text-sm text-muted">{m.sync_no_accounts()}</p>
					{/if}

					<!-- Connected accounts -->
					{#each syncState.connected as account (accountKey(account))}
						{@const key = accountKey(account)}
						{@const files = accountFiles[key]}
						{@const isExpanded = expandedAccount === key}
						{@const isRefreshing = refreshingAccounts.has(key)}
						{@const ProviderIcon = PROVIDER_ICONS[account.providerId]}

						<Collapsible.Root
							open={isExpanded}
							onOpenChange={() => toggleAccount(account)}
							class="rounded-sm border border-border"
						>
							<!-- Account header -->
							<div class="flex items-center gap-2 px-3 py-2">
								<Collapsible.Trigger
									class="flex flex-1 items-center gap-2 text-left min-w-0"
								>
									<ProviderIcon size={14} class="shrink-0 text-muted" />
									<span class="flex-1 min-w-0">
										<span class="block truncate text-sm font-medium">{PROVIDER_LABELS[account.providerId]()}</span>
										<span class="block truncate text-xs text-muted">{account.displayName}</span>
									</span>
									{#if files === 'loading'}
										<RefreshCw size={12} class="shrink-0 text-muted animate-spin" />
									{:else if isExpanded}
										<ChevronDown size={12} class="shrink-0 text-muted" />
									{:else}
										<ChevronRight size={12} class="shrink-0 text-muted" />
									{/if}
								</Collapsible.Trigger>
								<button
									type="button"
									class="shrink-0 rounded-sm px-2 py-1 text-xs text-red opacity-50 transition-opacity hover:opacity-100"
									onclick={() => handleDisconnect(account)}
								>
									{m.sync_disconnect()}
								</button>
							</div>

							<Collapsible.Content>
								<div class="border-t border-border px-3 pb-2 pt-2 flex flex-col gap-1">
									<!-- Save here (initial push — only when budget has never been synced) -->
									{#if !budgetEverSynced}
										<button
											type="button"
											disabled={syncState.status === 'syncing' || pushing}
											class="flex items-center gap-1.5 px-1 py-0.5 text-xs text-muted opacity-70 transition-opacity hover:opacity-100 disabled:opacity-40"
											onclick={() => handlePush(account)}
										>
											{#if pushing}
												<RefreshCw size={11} class="animate-spin" />
											{:else}
												<CloudUpload size={11} />
											{/if}
											{m.sync_save_here()}
										</button>
									{/if}

									<!-- Inline confirm warning -->
									{#if pendingLoad && accountKey(pendingLoad.account) === key}
										<div class="flex flex-col gap-2 rounded-sm bg-surface-hover p-2 text-xs">
											<p class="text-text">{m.sync_confirm_load_warning()}</p>
											<div class="flex gap-2">
												<button
													type="button"
													class="rounded-sm bg-accent px-2 py-1 text-xs font-medium text-accent-fg transition-opacity hover:opacity-90"
													onclick={confirmLoad}
												>
													{m.sync_confirm_load_action()}
												</button>
												<button
													type="button"
													class="rounded-sm px-2 py-1 text-xs text-muted opacity-70 transition-opacity hover:opacity-100"
													onclick={cancelLoad}
												>
													{m.cancel()}
												</button>
											</div>
										</div>
									{/if}

									<!-- File list -->
									{#if files === 'loading'}
										<p class="text-xs text-muted px-1 py-1">{m.sync_loading_files()}</p>
									{:else if files === 'error'}
										<div class="flex items-center gap-1.5 px-1 py-1 text-xs text-red">
											<AlertCircle size={11} />
											<span>{m.sync_error_auth_failed()}</span>
											<button
												type="button"
												class="ml-auto underline opacity-70 hover:opacity-100"
												onclick={() => refreshFiles(account)}
											>{m.sync_reconnect()}</button>
										</div>
									{:else if Array.isArray(files) && files.length === 0}
										<p class="text-xs text-muted px-1 py-1">{m.sync_no_files()}</p>
									{:else if Array.isArray(files)}
										{#each files as file (file.fileId)}
											<div class="flex items-center gap-2 rounded-sm px-1 py-1 hover:bg-surface-hover">
												<span class="flex-1 min-w-0">
													<span class="flex items-center gap-1 min-w-0">
														<span class="truncate text-xs text-text">{file.name}</span>
														{#if fileHashChanged[file.fileId]}
															<span title="Remote file has changed since last sync" class="shrink-0 flex items-center text-amber-500"><AlertCircle size={11} /></span>
														{/if}
													</span>
													<span class="block text-xs text-muted">{formatDate(file.lastModified)}</span>
												</span>
												<button
													type="button"
													disabled={syncState.status === 'syncing' || isRefreshing}
													class="shrink-0 rounded-sm px-2 py-1 text-xs text-accent transition-opacity hover:opacity-80 disabled:opacity-40"
													onclick={() => handlePull(account, file)}
												>
													{m.sync_pull()}
												</button>
											</div>
										{/each}
										<button
											type="button"
											disabled={isRefreshing}
											class="mt-0.5 flex items-center gap-1 px-1 py-0.5 text-xs text-muted opacity-60 transition-opacity hover:opacity-100 disabled:opacity-40"
											onclick={() => refreshFiles(account)}
										>
											<RefreshCw size={10} class={isRefreshing ? 'animate-spin' : ''} />
											<span>Refresh</span>
										</button>
									{/if}
								</div>
							</Collapsible.Content>
						</Collapsible.Root>
					{/each}

					<!-- Connect panel -->
					{#if showConnectPanel}
						<div class="flex flex-col gap-2 rounded-sm border border-border p-3">
							<p class="text-xs font-medium text-text">{m.sync_connect()}</p>
							{#if connectError}
								<p class="text-xs text-red">{connectError}</p>
							{/if}
							<div class="flex flex-col gap-1.5">
								{#each allProviderIds as providerId}
									{@const ProviderIcon = PROVIDER_ICONS[providerId]}
									{@const isLocalFolder = providerId === 'local-folder'}
									{@const unavailable = isLocalFolder && !localFolderAvailable}
									<button
										type="button"
										disabled={connecting !== null || unavailable}
										class="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm text-text transition-colors hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
										onclick={() => handleConnect(providerId)}
									>
										<ProviderIcon size={14} class="text-muted" />
										<span class="flex-1 text-left">{PROVIDER_LABELS[providerId]()}</span>
										{#if connecting === providerId}
											<RefreshCw size={12} class="animate-spin text-muted" />
										{/if}
										{#if unavailable}
											<span class="text-xs text-muted">{m.sync_unavailable_browser()}</span>
										{/if}
									</button>
								{/each}
							</div>
							<button
								type="button"
								class="mt-1 text-xs text-muted opacity-60 transition-opacity hover:opacity-100"
								onclick={() => { showConnectPanel = false; connectError = ''; }}
							>
								{m.cancel()}
							</button>
						</div>
					{:else}
						<button
							type="button"
							class="flex items-center gap-1.5 rounded-sm border border-dashed border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-hover"
							onclick={() => { showConnectPanel = true; connectError = ''; }}
						>
							<span class="text-base leading-none">+</span>
							{m.sync_connect()}
						</button>
					{/if}
				</div>

				<!-- Footer — status bar -->
				<div class="flex items-center gap-2 border-t border-border px-5 py-3">
					{#if syncState.status === 'error'}
						<AlertCircle size={12} class="text-red shrink-0" />
					{:else if syncState.status === 'idle' && syncState.lastSyncAt}
						<CheckCircle size={12} class="text-green-500 shrink-0" />
					{/if}
					<span class="text-xs text-muted truncate">{statusLabel()}</span>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
