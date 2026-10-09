const errors = {
  generic: 'Something went wrong. Please try again.',
  network: 'No internet connection. Your changes are saved on this device and will sync later.',
  signInFailed: 'Sign-in didn’t finish. Please try again.',
  signInCancelled: 'Sign-in was cancelled.',
  purchaseFailed: 'The purchase didn’t go through. You were not charged.',
  purchaseNotAllowed: 'This purchase isn’t allowed on this device.',
  storeUnavailable: 'The store is not available right now. Please try again later.',
  restoreFailed: 'Couldn’t restore purchases. Please try again.',
  syncFailed: 'Sync failed. We’ll keep trying — nothing on this device is lost.',
  notConfigured: 'This feature is not set up yet.',
  required: 'Please fill this in',
  invalidNumber: 'Please enter a valid number',
  outOfRange: 'Please enter a value between {{min}} and {{max}}',
} as const;

export default errors;
