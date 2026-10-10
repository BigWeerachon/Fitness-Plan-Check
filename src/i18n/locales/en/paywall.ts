const paywall = {
  title: 'Fitnese Pro',
  headline: {
    trial: 'Try everything free for {{count}} days',
    subscribe: 'Unlock your full training plan',
    winback: 'Welcome back — pick up where you left off',
    billing: 'There’s a problem with your payment',
  },
  sub: {
    trial: 'Then {{price}} per month. Cancel anytime.',
    subscribe: 'All features, on all your devices.',
    winback: 'Your programs and history are safe and waiting for you.',
    billing: 'Update your payment method in your store account to keep access.',
  },
  features: {
    today: 'Know exactly what to train today',
    programs: 'Your own weekly plan, programs and templates',
    overload: 'Progressive overload you can adjust mid-workout',
    stats: 'Stats by program, routine type and muscle',
    sync: 'Synced across your devices',
  },
  plans: {
    monthly: 'Monthly',
    lifetime: 'Lifetime',
    perMonth: '{{price}} / month',
    oneTime: '{{price}} one-time',
    perMonthLabel: 'per month',
    oneTimeLabel: 'one-time payment',
    trialBadge: '{{count}}-day free trial',
    monthlyNote: 'Renews monthly. Cancel anytime.',
    lifetimeNote: 'Unlocks everything forever. No free trial.',
  },
  cta: {
    trial: 'Start {{count}}-day free trial',
    monthly: 'Subscribe for {{price}} / month',
    lifetime: 'Buy lifetime for {{price}}',
    signInFirst: 'You’ll sign in with Google or Apple first, so your purchase stays with your account.',
    signedInAs: 'Signed in as {{email}}',
  },
  disclosure: {
    trialThenPrice: 'Free for {{count}} days, then {{price}} per month.',
    monthlyPrice: '{{price}} per month. No free trial.',
    autoRenew: 'The subscription renews automatically each month until you cancel.',
    cancelBeforeTrialEnds:
      'Cancel anytime before the trial ends in your {{store}} account settings and you won’t be charged.',
    cancelAnytime:
      'Cancel anytime in your {{store}} account settings; access continues until the end of the billing period.',
    lifetimeNoTrial: 'Lifetime is a one-time purchase and does not include a free trial.',
  },
  manageSubscription: 'Manage or cancel subscription',
  restore: 'Restore purchases',
  restored: 'Your purchase was restored.',
  nothingToRestore: 'No previous purchase was found for this account.',
  success: 'You’re all set! Enjoy Fitnese Pro.',
  unavailable: 'Plans can’t be loaded from the store right now.',
  loadingPlans: 'Loading plans from the store…',
  terms: 'Terms of Use',
  privacy: 'Privacy Policy',
  references: 'References',
  account: 'Account & settings',
  store: { ios: 'App Store', android: 'Google Play' },
} as const;

export default paywall;
