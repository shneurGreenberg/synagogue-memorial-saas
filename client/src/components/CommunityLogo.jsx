import React, { useCallback, useState } from 'react';
import { assetUrl } from '../lib/asset-url';

export function CommunityLogo({ src, alt }) {
  const [flipping, setFlipping] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);

  const handleImageError = useCallback(() => {
    setImgSrc(assetUrl('images/kaddish-official-logo.svg'));
  }, []);

  const goToAdmin = useCallback(() => {
    if (flipping) {
      return;
    }

    const data = window.data || {};
    const slug = data.slug;
    const target = slug ? `/admin/${slug}/dashboard` : '/admin/login';

    setFlipping(true);

    window.setTimeout(() => {
      window.location.href = target;
    }, 560);
  }, [flipping]);

  return (
    <button
      type="button"
      className={`community-logo-btn${flipping ? ' is-flipping' : ''}`}
      onClick={goToAdmin}
      aria-label={alt || 'Community logo'}
      title="Admin"
    >
      <span className="community-logo-flip">
        <img 
          className="banner community-logo-img" 
          src={imgSrc} 
          alt="" 
          onError={handleImageError}
        />
      </span>
    </button>
  );
}
