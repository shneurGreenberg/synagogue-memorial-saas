# GitHub Pages Emergency Fallback

This directory contains static JSON snapshots of the memorial board data for emergency fallback hosting on GitHub Pages when the primary Amvera.io hosting is unavailable.

## Files

- `novosibirsk.json` - Board data snapshot for Novosibirsk Synagogue
- `tomsk.json` - Board data snapshot for Tomsk Synagogue

## Data Export

These snapshots are automatically exported from MongoDB via GitHub Actions workflow on:
- Every push to `main` branch
- Daily at 2 AM UTC (cron schedule)
- Manual workflow dispatch

The export is performed by `scripts/export-static-snapshot.js`, which uses the same data filtering logic as the live API (`lib/public-board.js`) to ensure no private data is included.

## Format

Each snapshot contains:
- All public board fields (title, theme, location, features, etc.)
- People array with public person data (name, dates, photos, titles, text)
- Community events (visible only)
- Board configuration and settings
- Export metadata (contentVersion, exportedAt timestamp)

## Security

- All sensitive fields (admin users, passwords, contacts, etc.) are filtered out by `toPublicBoardPayload()` before export
- Snapshots are committed to the repository and publicly accessible
- No MongoDB credentials are committed (they exist only as GitHub Actions secrets)

## Usage

These snapshots are consumed by the GitHub Pages static build (`scripts/build-github-pages-fallback.js`) to generate a read-only memorial board that works without a backend server.

The static site supports hash routing for multiple tenants:
- https://shneurgreenberg.github.io/synagogue-memorial-saas/#/s/novosibirsk
- https://shneurgreenberg.github.io/synagogue-memorial-saas/#/s/tomsk
