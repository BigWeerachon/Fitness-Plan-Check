const paywall = {
  title: 'Fitnese Pro',
  headline: {
    subscribe: 'Unlock your full training plan',
    winback: 'Welcome back — pick up where you left off',
    billing: 'There’s a problem with your payment',
    upgrade: 'Keep Fitnese Pro forever',
  },
  sub: {
    subscribe: 'All features, on all your devices.',
    winback: 'Your programs and history are safe and waiting for you.',
    billing:
      'Your last payment didn’t go through, so access is paused. Update your payment method in your {{store}} account to get it back.',
    upgrade: 'Pay once and keep every feature on all your devices.',
  },
  billed: {
    trial: '{{count}} days free, then {{price}}/month',
    monthly: '{{price}}/month, renews automatically',
    lifetime: '{{price}} one-time payment',
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
    trial: 'Start free trial, then {{price}}/month',
    monthly: 'Subscribe for {{price}} / month',
    lifetime: 'Buy lifetime for {{price}}',
    fixPayment: 'Fix payment',
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
  upgrade: {
    notice:
      'Buying lifetime does not cancel your monthly subscription or free trial. Cancel it yourself in your {{store}} account settings so you aren’t charged for it.',
    manage: 'Open subscription settings',
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
