# Community onboarding — existing functionality (pre-implementation)

## Findings

| Area | Status |
|------|--------|
| Public token link for new communities | **Did not exist** — only master-authenticated flow at `/master/new`. |
| Master “new community” wizard | **Exists** — multi-step wizard (`views/master/new.handlebars`, `public/js/master-wizard.js`, `lib/master-provisioning.js`) creates a synagogue immediately on submit (`POST /master/add`). |
| Pending approval queue | **Did not exist** — communities were created directly by the master admin. |
| `provisioning/` uploads | **Exists** — used inside the master wizard for donation QR, contact files, and notes; served at `/images/provisioning/...`. Not a public onboarding flow. |
| Deceased / people import | **Exists** — tenant admin **People → Import** (`POST /admin/:slug/people/import`, modal in `views/admin/people.handlebars`) for JSON import when `peopleImport` permission is granted. |

## What was added

- Master-generated invite links (`/join/:token`) opening a **public** multi-step onboarding wizard.
- Submissions stored as **pending** `CommunityOnboardingRequest` documents; master reviews at `/master/onboarding`.
- Approve creates the synagogue (and login password from the submission); reject archives the request.
- Optional step in the wizard points applicants to people import **after** approval (admin panel).
- Community logos may be uploaded as **SVG** (sanitized server-side); optional **white/black** plate behind the logo on board, admin preview, and public submission pages.
