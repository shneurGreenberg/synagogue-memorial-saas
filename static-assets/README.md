# Static Assets for GitHub Pages

This directory contains assets that should be included in the GitHub Pages build but are not part of the main codebase.

## Usage

Files placed in this directory are automatically copied into the `site/` build output during the Pages build process (`scripts/build-github-pages-fallback.js`).

The directory structure is preserved, so:
- `static-assets/images/logo.png` → `site/images/logo.png`
- `static-assets/photos/photo.jpg` → `site/photos/photo.jpg`

## Missing Tenant Assets

The following tenant images were uploaded to Amvera's `/data` mount and are not in git. If you have these files, place them in the appropriate subdirectory:

### Novosibirsk
- `static-assets/images/1788836694583-opt.webp` - Novosibirsk logo

### Tomsk  
- `static-assets/images/1782449503623.webp` - Tomsk logo
- `static-assets/images/1782461400617-opt.png` - Tomsk donation QR code

## Graceful Fallback

The client code handles missing images gracefully:
- Tenant logos fall back to `kaddish-official-logo.svg` if the image fails to load
- No broken image icons are shown to users
