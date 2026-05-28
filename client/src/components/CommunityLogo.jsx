import React, { useCallback, useRef, useState } from 'react';
import { getBoardData } from '../lib/board-data';

export function CommunityLogo({ src, alt }) {
  const [transitioning, setTransitioning] = useState(false);
  const imgRef = useRef(null);

  const goToAdmin = useCallback(() => {
    if (transitioning) {
      return;
    }

    const data = getBoardData();
    const slug = data.slug;
    const target = slug ? `/admin/${slug}/dashboard` : '/admin/login';

    setTransitioning(true);
    document.body.classList.add('logo-admin-transition-active');

    const img = imgRef.current;
    document.documentElement.style.setProperty('--logo-bg', `url("${src}")`);

    if (img) {
      const rect = img.getBoundingClientRect();
      document.documentElement.style.setProperty('--logo-x', `${rect.left + rect.width / 2}px`);
      document.documentElement.style.setProperty('--logo-y', `${rect.top + rect.height / 2}px`);
      document.documentElement.style.setProperty('--logo-size', `${Math.max(rect.width, rect.height)}px`);
    }

    window.setTimeout(() => {
      window.location.href = target;
    }, 1100);
  }, [transitioning]);

  return (
    <button
      type="button"
      className={`community-logo-btn${transitioning ? ' is-transitioning' : ''}`}
      onClick={goToAdmin}
      aria-label={alt || 'Community logo'}
      title="Admin"
    >
      <img ref={imgRef} className="banner community-logo-img" src={src} alt="" />
      <span className="community-logo-hint" aria-hidden="true" />
    </button>
  );
}
