import React, { useCallback, useState } from 'react';
import { assetUrl } from '../lib/asset-url';

// 1.37.0 I75: the logo is display-only — clicking/tapping it no longer navigates to the admin.
export function CommunityLogo({ src, alt }) {
  const [imgSrc, setImgSrc] = useState(src);

  const handleImageError = useCallback(() => {
    setImgSrc(assetUrl('images/kaddish-official-logo.svg'));
  }, []);

  return (
    <div
      className="community-logo-btn community-logo-static"
      role="img"
      aria-label={alt || 'Community logo'}
    >
      <span className="community-logo-flip">
        <img
          className="banner community-logo-img"
          src={imgSrc}
          alt=""
          onError={handleImageError}
        />
      </span>
    </div>
  );
}
