# Russian front door

The same application runs as two Amvera deployments that share one MongoDB:

- International (Warsaw), the current production host.
- Russian, a second host for communities that cannot reach the Warsaw URL.

Both deployments use the same `MONGODB_URI`, `SESSION_SECRET`, and VAPID keys. Board and admin links that are built from the incoming request stay on whichever host the visitor used.

Links built without a request (auto-generated add-name and donation-setup QR codes) use the community's public link region:

| Variable | Role |
| --- | --- |
| `PUBLIC_BASE_URL` | Existing international base. Warsaw URL when unset. |
| `PUBLIC_BASE_URL_INTL` | International base. Defaults to `PUBLIC_BASE_URL`, then the Warsaw URL. |
| `PUBLIC_BASE_URL_RU` | Russian base. Optional. While it is empty, every community keeps the international URL. |

Per community, admin settings offer **Auto**, **Russian server**, or **International server** (only when `PUBLIC_BASE_URL_RU` is set). Auto follows the community timezone: a Russian zone uses the Russian host, anything else uses the international host. Saving the setting regenerates auto-generated QR images when the encoded URL changes. Uploaded QR images are left as they are.

The post-deploy workflow keeps checking `PROD_URL`. If the repository variable `PROD_URL_RU` is set, it also checks that host's `/healthz` version and `/s/<slug>` pages.

Uploads stored under `/data` (photos and images) are local to each deployment until shared storage is turned on.

## Shared uploads

Set `IMAGE_STORE=db` on a deployment to keep user uploads in MongoDB GridFS (bucket `uploads`) as well as on that host's disk. `/images/…` and `/photos/…` stay the same URLs. The database is checked first; a miss falls through to the persistent disk and then the files shipped in the repo. `/images/provisioning` is unchanged. Derived files (resized photo cache, favicons) are not stored in the database.

Leave `IMAGE_STORE` unset to keep today's disk-only behaviour: no GridFS reads or writes.

Migration (run on Warsaw, which has the persistent disk):

1. Dry-run and review the JSON counts and database size. Either `POST /master/api/uploads-migration` with `{ "mode": "dry-run" }` as master admin, or start once with `UPLOADS_MIGRATION=dry-run`.
2. Apply on Warsaw: `{ "mode": "apply", "confirm": "APPLY" }`, or `UPLOADS_MIGRATION=apply` together with `UPLOADS_MIGRATION_CONFIRM=APPLY`. Note the `runId` (`up-…`).
3. Set `IMAGE_STORE=db` on Warsaw and on Moscow, then start Moscow.

Restore that apply with `{ "mode": "restore", "runId": "up-…", "confirm": "APPLY" }`. The run removes files it inserted and puts replaced files back from the `uploads_backup` bucket.

On the Moscow deployment set `DISABLE_PUSH_SCHEDULER=1` so only Warsaw sends yahrzeit push notifications.
