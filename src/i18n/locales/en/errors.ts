const errors = {
  generic: 'Something went wrong. Please try again.',
  purchaseFailed: 'The purchase didn’t go through. You were not charged.',
  purchaseOffline: 'No internet connection. You were not charged — please try again when you’re online.',
  purchaseNotAllowed: 'This purchase isn’t allowed on this device.',
  storeUnavailable: 'The store is not available right now. Please try again later.',
  linkFailed: 'Couldn’t open this link. Please try again later.',
  restoreFailed: 'Couldn’t restore purchases. Please try again.',
  required: 'Please fill this in',
  invalidNumber: 'Please enter a valid number',
  outOfRange: 'Please enter a value between {{min}} and {{max}}',
} as const;

export default errors;
