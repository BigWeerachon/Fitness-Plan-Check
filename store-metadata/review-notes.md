# App Review Notes (App Store) and App access (Google Play)

> Written in English because App Review and Play review read English. Replace every `<PLACEHOLDER>` before submitting (list in [README.md](README.md)). Where to paste: App Store Connect → version page → **App Review Information**; Play Console → Policy and programs → App content → **App access**. Background: SPEC N1, HUMAN_TASKS items 71 and 76.
>
> Checked against commit `c7f2171` (paywall upgrade mode, "Get lifetime" row, "fix payment" prompt and the "you were not charged" message are in that commit). The disclaimer sentence below lists only the screens that have the disclaimer in that commit; if more screens get it (and a "Sources" link) before release, extend the sentence using the snippet in [README.md](README.md) "Release scope" — do not claim screens that do not have it. Re-check every menu path on the real build before pasting.

## 1. App Store Connect → App Review Information

| Field | Value |
|---|---|
| Sign-in required | **Yes** |
| User name | `<REVIEW_GOOGLE_EMAIL>` (Google account made only for review — HUMAN_TASKS item 71) |
| Password | `<REVIEW_GOOGLE_PASSWORD>` |
| Contact first / last name | `<CONTACT_NAME>` |
| Contact phone | `<CONTACT_PHONE>` |
| Contact email | `<CONTACT_EMAIL>` |
| Notes | The block below (count 3798; App Store Connect shows its own limit for this field — about 4000 characters) |
| Attachment (optional, recommended) | A short screen recording of: setup → paywall → sign-in → back to paywall → sandbox purchase → Today → Settings > Account > Delete account and data |

### Notes — paste this block
<!-- id:asc_notes -->
```text
Thank you for reviewing Fitnese, a strength-training planner and workout log.

ACCOUNT-BASED APP
- Sign-in is Sign in with Apple or Google only (no email/password). Both buttons have the same size and prominence.
- Data is saved on the device first (offline-first) and syncs to the user's account, so it is available on every device where they sign in.
- The membership (entitlement "pro") belongs to the account, not the device, so it works across devices and after reinstalling.
- Therefore the user must sign in BEFORE a free trial or purchase can start. The purchase sheet is never opened for a signed-out user.

HOW TO TEST THE PURCHASE FLOW
1. Launch the app and finish 3 short setup steps: language/theme/color; profile (skippable); starter program (template, own, or skip).
2. On the paywall choose Monthly (7-day free trial for eligible users, then the monthly App Store price) or Lifetime (one-time, no trial).
3. Tap the purchase button. If not signed in, the sign-in screen opens: use Sign in with Apple with any Apple Account, or the Google demo account below.
4. You return to the paywall with the same plan selected. Tap again to confirm the sandbox purchase.
5. The app opens on Today.
You can also sign in first from setup step 1 ("I already have an account — sign in").

WHERE THINGS ARE
- Paywall: after setup and whenever there is no active membership (features locked, data kept). With an active Monthly plan or trial: Settings > Membership > Get lifetime opens the paywall in upgrade mode, warning that the monthly subscription/trial is not cancelled automatically.
- Restore Purchases: on the paywall, in Settings > Membership, and in the Account screen (gear icon on the paywall). Restore asks the user to sign in first because purchases belong to the account.
- Manage/cancel subscription: Settings > Membership > Manage subscription (opens App Store subscriptions); also on the paywall and in Account.
- Delete account: Settings > Account > Delete account and data. Without a membership: paywall gear icon (Account & settings) > Information > Delete account and data. It explains that deleting the account does not cancel the App Store subscription and links to subscription settings. For Sign in with Apple users, Apple asks for one more confirmation so the server can revoke the Apple token.
- Privacy Policy and Terms of Use: on the paywall, in Settings > About and in Account.

HEALTH INFORMATION (Guideline 1.4.1)
- BMR/TDEE, calorie and macro targets, workout calories and estimated 1RM are estimates. A "not medical advice" disclaimer is shown on Stats, Profile & targets, the session summary, History detail, Settings and the References screen.
- References (Settings > About > References, Account > References, and the paywall footer) cite and link Mifflin et al. 1990 (BMR), ISSN protein position stand 2017, 2024 Adult Compendium of Physical Activities (MET) and the Epley 1RM formula.
- Fitnese is not a medical device and does not diagnose or treat any condition. Weight-loss targets are not shown to users under 18.

PRIVACY
- No ads, no analytics or crash-reporting SDKs, no tracking, no advertising identifier, so no App Tracking Transparency prompt.

IN-APP PURCHASES
- fitnese_monthly: auto-renewable, 1 month, introductory offer = 7-day free trial. Eligibility is checked; ineligible users see a plain monthly subscription with no trial wording.
- fitnese_lifetime: non-consumable, no trial.
- Prices come from the App Store via RevenueCat, never hard-coded. If a purchase fails because the device is offline, the app says the user was not charged.

DEMO ACCOUNT
- Google: <REVIEW_GOOGLE_EMAIL> / <REVIEW_GOOGLE_PASSWORD> (no previous purchase, so the trial is offered).
- Or Sign in with Apple with any Apple Account. Sandbox purchases are not charged.
```

### Test accounts the owner must prepare (not all are pasted above)

| Account | Purpose | Placeholder | How (HUMAN_TASKS) |
|---|---|---|---|
| Google review account | Reviewer signs in with it on both stores. Fresh account: do **not** start a trial or buy with it before review, so reviewers see the free-trial flow. Turn off 2-Step Verification and sign in once on a new device first. | `<REVIEW_GOOGLE_EMAIL>` / `<REVIEW_GOOGLE_PASSWORD>` | item 71 |
| Same Google account as Play license tester | Lets the Play reviewer buy with test payments (not charged). | (same as above) | items 69, 71 |
| Apple sandbox tester | For your own TestFlight/sandbox testing of every state (start trial, convert, cancel, lifetime, restore, new device). App Review uses its own sandbox accounts, so it is not pasted into the notes unless Apple asks for one. | `<APPLE_SANDBOX_EMAIL>` / `<APPLE_SANDBOX_PASSWORD>` | item 68 |

## 2. Google Play → App content → App access

Choose **"All or some functionality in my app is restricted"** → **Add instructions**:

| Field | Value |
|---|---|
| Name for these instructions | `Google sign-in and test purchase` |
| Username / email | `<REVIEW_GOOGLE_EMAIL>` |
| Password | `<REVIEW_GOOGLE_PASSWORD>` |
| Any other information | The block below (count 493). Check the field limit shown in Play Console and shorten if needed. |

<!-- id:play_access -->
```text
Everything needs a Fitnese Pro membership; sign-in (Google or Apple) comes before any trial or purchase. 1) Finish the 3 setup steps (profile and program can be skipped). 2) On the paywall pick Monthly (7-day free trial) or Lifetime and tap the button. 3) Sign in with Google using the account above (a license tester: test purchases, not charged). 4) Tap again on the paywall to confirm. Restore: paywall or Settings > Membership. Delete account: Settings > Account > Delete account and data.
```

## 3. Things reviewers often ask about — answers ready

- **"Why must I sign in before the trial?"** The membership belongs to the account so it works on all devices and after reinstalling (SPEC B4, J3). Sign-in is only Google or Apple, shown with equal prominence (Guideline 4.8).
- **"Where is the delete-account button?"** Settings > Account > Delete account and data, and the Account screen reachable from the paywall without a membership (SPEC B12).
- **"Health claims?"** No diagnosis or treatment; disclaimer and References screen with links (SPEC H5, H6, N1).
- **"Does the app track users?"** No. `app.config.ts` sets `NSPrivacyTracking: false`; there are no ads, analytics or attribution SDKs in `package.json`.
- **"Trial shown to someone who already used it?"** No. Eligibility comes from the store via RevenueCat; ineligible users see "Subscribe" wording without a trial (SPEC B6).
