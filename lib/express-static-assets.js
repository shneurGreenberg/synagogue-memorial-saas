const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  BUNDLED_IMAGES_DIR,
  BUNDLED_PHOTOS_DIR,
  IMAGES_DIR,
  PHOTOS_DIR,
  isPersistent,
} = require('./storage-paths');

function registerStaticAssets(app, { isProduction }) {
  const cssDirectory = path.join(__dirname, '..', 'css');
  if (!fs.existsSync(cssDirectory)) {
    fs.mkdirSync(cssDirectory);
  }

  const staticAssetMaxAge = isProduction ? '7d' : 0;
  const cssJsMaxAge = isProduction ? '7d' : 0;

  const provisioningDir = path.join(__dirname, '..', 'provisioning');
  if (!fs.existsSync(provisioningDir)) {
    fs.mkdirSync(provisioningDir, { recursive: true });
  }

  function setCommunityImageHeaders(res, filePath) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (String(filePath).toLowerCase().endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    }
  }

  app.use('/css', express.static(cssDirectory, {
    maxAge: cssJsMaxAge,
    immutable: isProduction,
  }));

  app.use('/js', express.static(path.join(__dirname, '..', 'public', 'js'), {
    maxAge: cssJsMaxAge,
    immutable: isProduction,
  }));

  app.use('/images', express.static(IMAGES_DIR, {
    maxAge: staticAssetMaxAge,
    setHeaders: setCommunityImageHeaders,
  }));
  app.use('/images', express.static(BUNDLED_IMAGES_DIR, {
    maxAge: staticAssetMaxAge,
    setHeaders: setCommunityImageHeaders,
  }));
  app.use('/images/provisioning', express.static(provisioningDir, {
    maxAge: staticAssetMaxAge,
    fallthrough: true,
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }));

  app.use('/photos', express.static(PHOTOS_DIR, { maxAge: staticAssetMaxAge }));
  app.use('/photos', express.static(BUNDLED_PHOTOS_DIR, { maxAge: staticAssetMaxAge }));

  app.use('/board', express.static(path.join(__dirname, '..', 'public', 'board'), {
    setHeaders(res, filePath) {
      const base = path.basename(filePath);
      if (/^memorial\.(js|css)$/.test(base)) {
        res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
        return;
      }
      if (isProduction && /-[A-Za-z0-9_-]{4,}\.(js|css)$/.test(base)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

  app.use('/downloads', express.static(path.join(__dirname, '..', 'public', 'downloads'), {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.apk')) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', 'attachment; filename="kaddish-sidebar.apk"');
      }
    },
  }));

  return { isPersistent, staticAssetMaxAge };
}

module.exports = {
  registerStaticAssets,
};
