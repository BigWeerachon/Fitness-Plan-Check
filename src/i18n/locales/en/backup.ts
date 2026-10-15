const backup = {
  backUp: 'Back up data',
  lastBackup: 'Last backup: {{date}}',
  neverBackedUp: 'Not backed up yet',
  restore: 'Restore from file',
  restoreSub: 'Replace the data on this phone with a backup file',
  hint: 'Your data is stored only on this phone. Back up regularly and keep the file somewhere safe (Drive, Files, LINE or email) so you can restore it on a new phone.',
  shareTitle: 'Save your Fitnese backup',
  unavailable: 'Saving files isn’t available on this device.',
  backupFailed: 'Couldn’t create the backup file. Please try again.',
  confirmTitle: 'Replace all data on this phone?',
  confirmBody:
    'Backup from {{date}} (app version {{version}}):\n{{counts}}\n\nEverything currently on this phone will be replaced by this backup. This can’t be undone.',
  confirm: 'Replace data',
  counts: {
    programs: 'Programs: {{n}}',
    workouts: 'Workouts: {{n}}',
    sets: 'Sets: {{n}}',
    dailyLogs: 'Daily log entries: {{n}}',
    customExercises: 'Custom exercises: {{n}}',
  },
  restored: 'Your data has been restored.',
  restoreFailed: 'Couldn’t restore the backup. Nothing on this phone was changed.',
  invalidTitle: 'Can’t use this file',
  invalid: {
    tooLarge: 'This file is too large to be a Fitnese backup.',
    notJson: 'This file isn’t a Fitnese backup. Choose a file named “fitnese-backup-….json”.',
    notBackup: 'This file isn’t a Fitnese backup. Choose a file named “fitnese-backup-….json”.',
    newerFormat: 'This backup was made by a newer version of Fitnese. Update the app, then try again.',
    newerSchema: 'This backup was made by a newer version of Fitnese. Update the app, then try again.',
    missingTable: 'This backup is incomplete or damaged and can’t be restored.',
    badRows: 'This backup is damaged and can’t be restored.',
    unreadable: 'We couldn’t open this file. Save it to your phone first, then choose it again.',
  },
} as const;

export default backup;
