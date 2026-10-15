# App Review Notes (App Store) and App access (Google Play)

> Written in English because App Review and Play review read English. Replace every `<PLACEHOLDER>` before submitting (list in [README.md](README.md)). Where to paste: App Store Connect → version page → **App Review Information**; Play Console → Policy and programs → App content → **App access**. Background: SPEC N1 as changed by [docs/SPEC_CHANGES.md](../docs/SPEC_CHANGES.md) (local-only app, D81), HUMAN_TASKS items 48 and 53.
>
> The app has **no accounts and no sign-in**, so there is **no demo account** to provide. Re-check every menu path on the real build before pasting.

## 1. App Store Connect → App Review Information

| Field | Value |
|---|---|
| Sign-in required | **No** (the app has no login) |
| User name / Password | leave empty |
| Contact first / last name | `<CONTACT_NAME>` |
| Contact phone | `<CONTACT_PHONE>` |
| Contact email | `<CONTACT_EMAIL>` |
| Notes | The block below (count 3121; App Store Connect shows its own limit for this field — about 4000 characters) |
| Attachment (optional, recommended) | A short screen recording of: setup → paywall → sandbox purchase → Today → Settings > Your data > Back up data (share sheet) → Restore from file → Delete all data on this device |

### Notes — paste this block
<!-- id:asc_notes -->
```text
Thank you for reviewing Fitnese, a strength-training planner and workout log.

NO ACCOUNT, DATA STAYS ON THE DEVICE
- Fitnese has no user accounts and no sign-in, so no demo account is needed.
- All training, profile and health data is stored only on the device (SQLite). We run no servers and receive none of it.
- Purchases go through the App Store via RevenueCat with an anonymous ID. Restore Purchases uses the App Store account.
- Users keep their data with "Back up data" (a JSON file shared through the system share sheet to Files, Drive, email, etc.) and "Restore from file" on a new phone.

HOW TO TEST THE PURCHASE FLOW
1. Launch the app and finish 3 short setup steps: language/theme/color; profile (skippable); starter program (template, own, or skip).
2. On the paywall choose Monthly (7-day free trial for eligible users, then the monthly App Store price) or Lifetime (one-time, no trial).
3. Tap the purchase button and confirm the sandbox purchase. The app opens on Today.
Setup step 1 also has "Already purchased? Restore purchases".

WHERE THINGS ARE
- Paywall: after setup and whenever there is no active membership (features locked, data kept). With Monthly or a trial: Settings > Membership > Get lifetime opens the paywall in upgrade mode, warning that the monthly plan/trial is not cancelled automatically. After a failed renewal it offers "Fix payment".
- Restore Purchases: paywall, Settings > Membership, and the Settings screen opened from the paywall's "Settings" button (available without a membership).
- Manage/cancel subscription: Settings > Membership > Manage subscription (opens App Store subscriptions); also on the paywall.
- Back up / restore: Settings > Your data > Back up data / Restore from file (also without a membership).
- Delete data: Settings > Your data > Delete all data on this device (also without a membership). Two confirmations; it explains that this does not cancel the App Store subscription and links to subscription settings. There is no account to delete.
- Privacy Policy and Terms of Use: paywall, Settings > About.

HEALTH INFORMATION (Guideline 1.4.1)
- BMR/TDEE, calorie and macro targets, workout calories and estimated 1RM are estimates. A "not medical advice" disclaimer with a "Sources" link is shown on Today, Stats, the strength chart, Profile & targets, the session summary, History detail and Settings.
- References (Settings > About > References and the paywall footer) cite and link Mifflin et al. 1990, ISSN protein position stand 2017, 2024 Adult Compendium of Physical Activities and the Epley 1RM formula.
- Not a medical device; no diagnosis or treatment. Weight-loss targets are not shown to users under 18.

PRIVACY
- No ads, analytics, crash reporting or tracking, no advertising identifier, so no ATT prompt.

IN-APP PURCHASES
- fitnese_monthly: auto-renewable, 1 month, introductory offer = 7-day free trial. Ineligible users see a plain monthly plan with no trial wording.
- fitnese_lifetime: non-consumable, no trial.
- Prices come from the App Store via RevenueCat. If a purchase fails offline, the app says the user was not charged.
```

### Test accounts the owner must prepare (not pasted above)

| Account | Purpose | Placeholder | How (HUMAN_TASKS) |
|---|---|---|---|
| Apple sandbox tester | Your own TestFlight/sandbox testing of every state (start trial, convert, cancel, lifetime, restore, new device + restore from file). App Review uses its own sandbox accounts. | `<APPLE_SANDBOX_EMAIL>` / `<APPLE_SANDBOX_PASSWORD>` | item 45 |
| Google Play license tester | Your own test purchases on Android (not charged). Play reviewers use their own accounts. | (your Gmail) | item 46 |

## 2. Google Play → App content → App access

All features after setup need a Fitnese Pro membership bought through Google Play, but **no login or credentials** are involved. Choose **"All or some functionality in my app is restricted"** → **Add instructions** (no username/password) — see Q22 in [OPEN_QUESTIONS](../docs/OPEN_QUESTIONS.md) if Play Console asks for credentials:

| Field | Value |
|---|---|
| Name for these instructions | `No account — membership via Google Play` |
| Username / email | leave empty |
| Password | leave empty |
| Any other information | The block below (count 473). Check the field limit shown in Play Console and shorten if needed. |

<!-- id:play_access -->
```text
No account or login: all data stays on the device. Features after setup need a Fitnese Pro membership bought through Google Play. 1) Finish 3 setup steps (profile and program can be skipped). 2) On the paywall pick Monthly (7-day free trial) or Lifetime and buy. Restore: paywall or Settings > Membership. Backup: Settings > Your data > Back up data / Restore from file. Delete: Settings > Your data > Delete all data on this device (also on the paywall's Settings screen).
```

## 3. Things reviewers often ask about — answers ready

- **"Where is account deletion (5.1.1(v))?"** The app does not support account creation, so there is no account to delete. Users can erase everything with Settings > Your data > Delete all data on this device, available even without a membership (SPEC_CHANGES B12).
- **"Do I need to sign in to buy?"** No. Purchases use the store account with an anonymous RevenueCat ID; Restore Purchases works on a new device signed in to the same store account (SPEC_CHANGES B4, J3).
- **"What happens on a reinstall or a new phone?"** Restore Purchases brings the membership back from the store; "Restore from file" brings the data back from the user's backup file. Nothing is stored on our servers (SPEC_CHANGES B11).
- **"Health claims?"** No diagnosis or treatment; disclaimer and References screen with links (SPEC H5, H6, N1).
- **"Does the app track users?"** No. `app.config.ts` sets `NSPrivacyTracking: false`; there are no ads, analytics or attribution SDKs in `package.json`.
- **"Trial shown to someone who already used it?"** No. Eligibility comes from the store via RevenueCat; ineligible users see "Subscribe" wording without a trial (SPEC B6).
- **"What if the renewal payment fails?"** During the store's grace/billing-retry period access continues and the app shows a "Payment issue" badge (Today, Settings) and the date to update by; once access has ended the paywall shows a "There's a problem with your payment" headline and a primary "Fix payment" button that opens the store's subscription page (D62).
