# GlowUp MVP Release Checklist

## 1) Product
- [ ] Final content moderation rules for teen-safe health guidance.
- [ ] Confirm paywall copy and pricing (Free/Plus/Pro).
- [ ] Finalize onboarding wording and age confirmation UX.

## 2) Backend
- [ ] Apply `supabase/schema.sql` in project.
- [ ] Verify RLS policies with test users.
- [ ] Add server-side webhook handler for RevenueCat events.

## 3) Mobile (Flutter)
- [ ] Auth flow (email/OTP + optional social).
- [ ] Sync profile + daily progress with Supabase.
- [ ] Integrate RevenueCat purchase and restore flow.
- [ ] Push reminders for plan tasks.

## 4) Compliance
- [ ] Privacy Policy + Terms of Use.
- [ ] Medical disclaimer in onboarding/settings.
- [ ] Store metadata with age ratings.

## 5) QA & Release
- [ ] Regression test subscription gating.
- [ ] Test backup import/export edge cases.
- [ ] Run TestFlight + Google Internal Testing.
- [ ] Submit App Store + Play Store builds.
