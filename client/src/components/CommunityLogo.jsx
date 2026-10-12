import React, { useCallback, useMemo, useState } from 'react';
import { assetUrl } from '../lib/asset-url';

function logoBackgroundClass(logoBackground) {
  if (logoBackground === 'white') return ' has-logo-bg-white';
  if (logoBackground === 'black') return ' has-logo-bg-black';
  return '';
}

export function CommunityLogo({ src, alt, borderRadius = 100, logoBackground = '' }) {
  const [flipping, setFlipping] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);
  const logoRadius = useMemo(() => `${(Number(borderRadius) / 100) * 50}%`, [borderRadius]);

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
      className={`community-logo-btn${flipping ? ' is-flipping' : ''}${logoBackgroundClass(logoBackground)}`}
      onClick={goToAdmin}
      aria-label={alt || 'Community logo'}
      title="Admin"
      style={{ '--community-logo-radius': logoRadius }}
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
