# Store listing — English (App Store + Google Play)

> Temporary app name: **Fitnese** (SPEC A, D03). If the owner picks another name from [app-names.md](app-names.md), replace "Fitnese" in every block below and recount.
> Copy **only the text inside each code block**. Placeholders in angle brackets (`<TERMS_URL>` …) must be replaced before submitting — see [README.md](README.md).
>
> **How counts were made:** `node store-metadata/check-limits.js` counts the exact text of every block below (Unicode code points, including spaces, punctuation and line breaks) and fails if a limit is exceeded or a printed number is stale. Run it again after every edit and update the numbers in this file. Store consoles show their own counter; if it disagrees, the console wins. The URL placeholders (`<TERMS_URL>`, `<PRIVACY_URL>`) are counted at their placeholder length; the script also checks the descriptions with 80-character URLs.
>
> **Honesty rules used:** no prices in the text (prices come from the store through RevenueCat and differ by country), the free trial is described as "for eligible users", sign-in before the trial is stated, and the "not a medical device" disclaimer is included (SPEC N1, N2). The App Store text does not mention Android or Google Play (App Review Guideline 2.3.10); the Play text does not mention the App Store.

## Summary of limits

| Field | Store | Limit | Count |
|---|---|---|---|
| App name | App Store / Play | 30 / 30 | 7 |
| App name with descriptor (optional) | App Store / Play | 30 / 30 | 24 |
| Subtitle | App Store | 30 | 29 |
| Promotional text | App Store | 170 | 147 |
| Description | App Store | 4000 | 3854 |
| Keywords | App Store | 100 | 98 characters / 98 bytes |
| What's New (1.0) | App Store | 4000 | 315 |
| Short description | Google Play | 80 | 65 |
| Full description | Google Play | 4000 | 3752 |
| Release notes (1.0) | Google Play | 500 | 315 (same text as What's New) |

---

## App Store (App Store Connect → App Information + version page, English localization)

### Name — limit 30 · count 7
<!-- id:name -->
```text
Fitnese
```

Optional descriptor version (only if the owner wants search terms in the name; Apple and Google both reject names that are just keyword lists) — count 24:
<!-- id:name_alt -->
```text
Fitnese: Workout Planner
```

### Subtitle — limit 30 · count 29
<!-- id:as_subtitle -->
```text
Weekly gym plan & workout log
```

### Promotional text — limit 170 · count 147
(Can be changed later without a new build.)
<!-- id:as_promo -->
```text
Open the app and today's workout is already there. Plan your own week, log sets with one hand, and get a suggested next target after every session.
```

### Keywords — limit 100 · count 98 characters (98 bytes)
Comma-separated, no spaces after commas. Words already in the name or subtitle (weekly, gym, plan, workout, log) are left out because Apple already indexes them. No competitor names.
<!-- id:as_keywords -->
```text
strength,lifting,weightlifting,progressive,overload,ppl,split,routine,tracker,1rm,fitness,exercise
```

### Description — limit 4000 · count 3854
<!-- id:as_desc -->
```text
Fitnese is a strength-training planner and workout log: open the app, see today's workout, and start in a few taps.

TODAY, FIRST
• A big "Today: Push" header and a card for today's routine with a round Start button
• Changed your mind? Pick another routine, an empty session or a rest day in one or two taps, without touching your weekly plan
• Muscles trained and calories burned today at a glance

YOUR WEEK, YOUR WAY
• Any routine on any day: repeat it on several days or do two on the same day
• Tap the weekday dots, copy a day, switch the whole week to another program, or change just one date

PROGRAMS AND 143 EXERCISES
• Editable templates: Push/Pull/Legs (3 or 6 days), Upper/Lower, Full Body, Bro Split, 5×5 Beginner
• Your own programs and routines; copy or move routines between programs
• English/Thai library of 143 exercises with muscle-group icons, including bodyweight moves like push-ups and pull-ups. Add and edit your own.

FAST, ONE-HANDED WORKOUTS
• Last time and today's target side by side for every set
• Big number pad, haptic set ticks and a rest timer per exercise
• Add, swap, reorder and remove exercises and sets, or edit exercise settings, mid-workout; optional RIR/RPE targets; log a past workout

PROGRESSIVE OVERLOAD YOU CONTROL
• Per exercise: double progression (default), linear, custom weekly plan, or off
• A suggested next target after each workout: accept, adjust or skip it
• Change a target mid-workout for today only or from now on

STATS
• Day, week, month and year views
• Percentages by program, by routine type and by muscle group (sets, volume or workouts), always adding up to 100%
• History, estimated 1-rep max per exercise (Epley) and body-weight trend

TARGETS (OPTIONAL)
• Estimated BMR (Mifflin-St Jeor), TDEE, calorie target and protein, carbs and fat
• Workout calories from MET values, or enter your own numbers
• No weight-loss targets for users under 18

YOUR DATA
• Offline-first: saved on your device, then synced to your account on all your devices
• CSV export; delete your account and data in the app anytime
• Sign in with Apple or Google. No ads, no tracking.
• Dark theme with a soft glow, light mode, 8 accent colors or your own; English and Thai

MEMBERSHIP: FITNESE PRO
Fitnese Pro unlocks every feature. There is no permanently free version.
• Monthly: auto-renewing. Eligible new subscribers get a 7-day free trial, then pay the monthly price shown in the app.
• Lifetime: a one-time purchase. No free trial.
• Prices are shown in the app and come from the App Store, in your local currency.
• You sign in with Apple or Google before starting a trial or buying, so your membership belongs to your account and works on all your devices.
• Payment is charged to your Apple Account when you confirm the purchase, or when the free trial ends. The subscription renews automatically unless it is cancelled at least 24 hours before the end of the current period. Manage or cancel it anytime in your App Store account settings. Deleting the app or your Fitnese account does not cancel it.
• Switching from Monthly to Lifetime (in Settings) does not cancel the monthly plan; cancel it in your App Store settings.
• If your membership ends, features are locked but your data is kept and returns when you subscribe again.

HEALTH DISCLAIMER
Fitnese is not a medical device and does not diagnose, treat, cure or prevent any disease or condition. Its calorie, nutrition and strength numbers are estimates and general guidance, not medical advice. If you have a medical condition, are pregnant or have any doubts, talk to a doctor or registered dietitian first. Formula sources are listed on the References screen in the app: Mifflin-St Jeor (BMR), Compendium of Physical Activities (MET), ISSN position stand on protein, Epley (1RM).

Terms of Use: <TERMS_URL>
Privacy Policy: <PRIVACY_URL>
```

### What's New in this version (1.0) — count 315
App Store Connect normally does not show this field for the very first version of an app (it appears from the first update). If you do not see it, skip it and reuse the text in the 1.0.1 update. The same text is used as the Google Play release notes.
<!-- id:whats_new -->
```text
First release of Fitnese: see today's workout the moment you open the app, plan your week freely, start from 6 editable templates and 143 exercises, log sets fast with a rest timer, get progressive overload suggestions, and see stats by program and muscle. Works offline and syncs to your account. English and Thai.
```

### Other App Store fields

| Field | Value |
|---|---|
| Primary category | Health & Fitness |
| Secondary category (optional) | Sports, or leave empty (owner decides) |
| Support URL (required) | `<SUPPORT_URL>` — a public page where users can contact you |
| Marketing URL (optional) | `<MARKETING_URL>` |
| Privacy Policy URL | `<PRIVACY_URL>` (App Information) |
| Terms of Use (EULA) | Linked in the description above (`<TERMS_URL>`). Apple requires a Terms of Use link for auto-renewable subscriptions, either in the description or as a custom EULA. |
| Copyright | `© 2026 <DEVELOPER_NAME>` |
| Age rating | Answer the questionnaire truthfully (see HUMAN_TASKS item 75) |

---

## Google Play (Play Console → Grow users → Store presence → Main store listing, English)

### App name — limit 30 · count 7
Same text as the App Store name block above (`Fitnese`, or the optional descriptor version, count 24).

### Short description — limit 80 · count 65
<!-- id:play_short -->
```text
Plan your gym week, log sets fast and track progressive overload.
```

### Full description — limit 4000 · count 3752
<!-- id:play_desc -->
```text
Fitnese is a strength-training planner and workout log: open the app, see today's workout, and start in a few taps.

TODAY, FIRST
• A big "Today: Push" header and a card for today's routine with a round Start button
• Changed your mind? Pick another routine, an empty session or a rest day in one or two taps, without touching your weekly plan
• Muscles trained and calories burned today at a glance

YOUR WEEK, YOUR WAY
• Any routine on any day: repeat it on several days or do two on the same day
• Tap the weekday dots, copy a day, switch the whole week to another program, or change just one date

PROGRAMS AND 143 EXERCISES
• Editable templates: Push/Pull/Legs (3 or 6 days), Upper/Lower, Full Body, Bro Split, 5×5 Beginner
• Your own programs and routines; copy or move routines between programs
• English/Thai library of 143 exercises with muscle-group icons, including bodyweight moves like push-ups and pull-ups. Add and edit your own.

FAST, ONE-HANDED WORKOUTS
• Last time and today's target side by side for every set
• Big number pad, haptic set ticks and a rest timer per exercise
• Add, swap, reorder and remove exercises and sets, or edit exercise settings, mid-workout; optional RIR/RPE targets; log a past workout

PROGRESSIVE OVERLOAD YOU CONTROL
• Per exercise: double progression (default), linear, custom weekly plan, or off
• A suggested next target after each workout: accept, adjust or skip it
• Change a target mid-workout for today only or from now on

STATS
• Day, week, month and year views
• Percentages by program, by routine type and by muscle group (sets, volume or workouts), always adding up to 100%
• History, estimated 1-rep max per exercise (Epley) and body-weight trend

TARGETS (OPTIONAL)
• Estimated BMR (Mifflin-St Jeor), TDEE, calorie target and protein, carbs and fat
• Workout calories from MET values, or enter your own numbers
• No weight-loss targets for users under 18

YOUR DATA
• Offline-first: saved on your device, then synced to your account on all your devices
• CSV export; delete your account and data in the app anytime
• Sign in with Google or Apple. No ads, no tracking.
• Dark theme with a soft glow, light mode, 8 accent colors or your own; English and Thai

MEMBERSHIP: FITNESE PRO
Fitnese Pro unlocks every feature. There is no permanently free version.
• Monthly: auto-renewing. Eligible new subscribers get a 7-day free trial, then pay the monthly price shown in the app.
• Lifetime: a one-time purchase. No free trial.
• Prices are shown in the app and come from Google Play, in your local currency.
• You sign in with Google or Apple before starting a trial or buying, so your membership belongs to your account and works on all your devices.
• Cancel anytime in Google Play (Payments & subscriptions > Subscriptions). Cancel during the free trial and you won't be charged; access lasts until the trial or billing period ends. Uninstalling the app or deleting your Fitnese account does not cancel the subscription.
• Switching from Monthly to Lifetime (in Settings) does not cancel the monthly plan; cancel it in Google Play.
• If your membership ends, features are locked but your data is kept and returns when you subscribe again.

HEALTH DISCLAIMER
Fitnese is not a medical device and does not diagnose or treat any disease or condition. Its calorie, nutrition and strength numbers are estimates and general guidance, not medical advice. If you have a medical condition, are pregnant or have any doubts, talk to a doctor or registered dietitian first. Formula sources are listed on the References screen in the app: Mifflin-St Jeor (BMR), Compendium of Physical Activities (MET), ISSN position stand on protein, Epley (1RM).

Terms of Use: <TERMS_URL>
Privacy Policy: <PRIVACY_URL>
```

### Release notes (1.0) — limit 500 · count 315
Use the same text as "What's New" above.

### Other Play fields

| Field | Value |
|---|---|
| App category | Health & Fitness |
| Tags | Pick up to 5 of the closest tags offered by the console (for example workout or fitness tracking tags). The tag list is fixed by Google, so use the console's exact names. |
| Contact email (required) | `<CONTACT_EMAIL>` |
| Website (optional) | `<SUPPORT_URL>` |
| Privacy policy | `<PRIVACY_URL>` (App content → Privacy policy) |
| App icon / feature graphic | See [icon.md](icon.md) and [screenshots.md](screenshots.md) |

## Why this text is accurate (checked against the code)

Checked against the repository at commit `88bfff2` (HEAD of `claude/clever-bell-dxizpd`, all audit fixes merged). Every claim below exists in that commit. Before submitting, run the short verify list in [README.md](README.md) ("Verify before release", in Thai) against the build you are actually sending.

| Claim | Where it is in the code |
|---|---|
| 143 exercises, English/Thai names, 42 bodyweight | `src/data/exercises.json` (143 entries, every entry has `name.en` and `name.th`, 42 with `equipment: bodyweight`; includes Push-Up and Pull-Up) |
| 6 templates (PPL 3 and 6 days, Upper/Lower, Full Body 3, Bro Split, 5×5 Beginner) | `src/data/templates.ts` (`ppl3`, `ppl6`, `upper_lower`, `full_body3`, `bro_split`, `starter_5x5`) |
| Copy / move routines between programs | `src/app/(app)/routine/[id].tsx` (`copyTo`, `moveTo`) |
| Weekday dots, copy a day, switch whole week, week start, change one date | `src/app/(app)/week.tsx`, i18n `week.*` |
| Rest timer per exercise (default / off / custom) | `src/features/programs/ExerciseSettingsSheet.tsx` (`restSec`) |
| Progression modes (double is the default, linear, custom weekly, off) and next-target suggestions | `src/domain/progression.ts`, `workout_session.progression` (D53), i18n `programs.modes.*`, `session.nextTargets` |
| Optional RIR / RPE targets per exercise | `ExerciseSettingsSheet.tsx` (`rir`, `rpe`), i18n `programs.rir`, `programs.rpe` |
| Add, swap, reorder, remove exercises; add / remove sets mid-workout (tap a set number to remove that set) | i18n `session.addExercise`, `swap`, `moveUp`, `moveDown`, `removeExercise`, `addSet`, `removeSet`, `removeThisSet`; `src/app/(app)/session/[id].tsx` (`setMenu`), D70 |
| Edit exercise settings during a workout | `ExerciseSettingsSheet` opened from `src/app/(app)/session/[id].tsx`, i18n `session.exerciseSettings`, D70 |
| Change a target for today only / from now on | i18n `session.todayOnly`, `session.fromNowOn`, `src/features/session/TargetSheet.tsx` |
| Log a past workout (last 7 days, pick a routine from any program or an empty session) | `src/app/(app)/(tabs)/index.tsx` (menu `today.menu.logPast`, `today.menu.pickRoutine`, `startSession({ date })`) |
| Muscle-group icons | `src/components/MuscleIcon.tsx`, `src/data/muscleIcons.ts` (used in the exercise library, exercise detail and the session screen) |
| Create and edit your own exercises | `src/app/(app)/exercises/new.tsx` (`?editId` edit mode), `src/app/(app)/exercises/[id].tsx` |
| Stats: day / week / month / year; % by program, routine type and muscle; sets, volume or workouts; sum = 100 | `src/domain/stats.ts` (largest remainder, D27), i18n `stats.*` |
| Estimated 1RM (Epley), body-weight trend | `src/domain/stats.ts` (`epley1RM`), `src/features/stats/bodyWeight.ts` |
| BMR / TDEE / targets / MET; no weight-loss target under 18 | `src/domain/nutrition.ts` (`ADULT_AGE`, D28), i18n `onboarding.under18` |
| CSV export (2 files) | `src/features/settings/exportCsv.ts`, D34 |
| 8 accent colors or your own, dark / light / system theme | `src/theme/tokens.ts` (`ACCENT_PRESETS`) |
| Sign in with Google / Apple only, equal prominence | `src/services/auth/supabaseAuth.ts`, D51 |
| 7-day trial only for eligible users, lifetime without trial, prices from the store | `src/app/paywall.tsx`, `src/domain/entitlement/paywall.ts`, `src/services/purchases/mapping.ts`, i18n `paywall.*` |
| Sign in before trial or purchase | `nextStepOnSelect` in `src/domain/entitlement/paywall.ts`, SPEC B4 |
| Upgrade Monthly → Lifetime from Settings (does not cancel the monthly plan) | `src/app/(app)/(tabs)/settings.tsx` (`settings-lifetime`), i18n `paywall.upgrade.notice` |
| Features locked but data kept when membership ends | SPEC B3, `src/features/access/AccessGate.tsx` |
| Offline-first, sync to the account, delete account and data in the app | SPEC L, `src/features/sync/engine.ts`, `src/app/delete-account.tsx` |
| No ads / analytics / tracking SDKs | `package.json` (none); `app.config.ts` `NSPrivacyTracking: false` |
| References (Mifflin 1990, ISSN 2017, Compendium 2024, Epley) | `src/legal/content.ts` `REFERENCES`, screen `/references` |
