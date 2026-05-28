# Dual test environments

Two public URLs point at the **same** app on this server (port 3000).

| Environment | Use for | Board URL pattern |
|-------------|---------|-------------------|
| **Cloudflare** | Testing with VPN / outside Russia | `https://….trycloudflare.com/s/novosibirsk` |
| **Russia-friendly (Serveo)** | Testing from Russia without VPN | `https://….serveousercontent.com/s/novosibirsk` |

Current URLs are written to `/tmp/kadish-public-urls.txt` when tunnels are started.

## Start / restart both tunnels

```bash
# App must be running first:
PORT=3000 SESSION_SECRET=your-secret node app.js

./scripts/start-dual-tunnels.sh
```

## Production in Russia (Amvera)

Temporary tunnels are for demos only. For a stable Russian host:

1. [Amvera Cloud](https://amvera.ru) + `amvera.yaml` in repo  
2. Set `MONGODB_URI`, `SESSION_SECRET`, `NODE_ENV=production`  
3. URL: `https://<project>.amvera.io/s/novosibirsk`

See [DEPLOYMENT-RU.md](./DEPLOYMENT-RU.md).
