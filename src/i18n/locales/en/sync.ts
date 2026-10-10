const sync = {
  title: 'Sync',
  status: {
    idle: 'Up to date',
    syncing: 'Syncing…',
    offline: 'Offline — changes are saved on this device',
    error: 'Sync problem — we’ll retry automatically',
    waiting: 'Waiting for your membership to be confirmed',
    disabled: 'Sync is off — data is kept on this device',
  },
  lastSynced: 'Last synced {{when}}',
  never: 'Not synced yet',
  pending_one: '{{count}} change waiting to upload',
  pending_other: '{{count}} changes waiting to upload',
  syncNow: 'Sync now',
} as const;

export default sync;
