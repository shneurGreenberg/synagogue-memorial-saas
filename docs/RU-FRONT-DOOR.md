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

Uploads stored under `/data` (photos and images) are local to each deployment. A file uploaded on one host is not copied to the other. That gap is not solved here.
