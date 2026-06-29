import React, { useCallback, useMemo, useState } from 'react';

export function CommunityLogo({ src, alt, borderRadius = 100 }) {
  const [flipping, setFlipping] = useState(false);
  const logoRadius = useMemo(() => `${(Number(borderRadius) / 100) * 50}%`, [borderRadius]);

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
      style={{ '--community-logo-radius': logoRadius }}
    >
      <span className="community-logo-flip">
        <img className="banner community-logo-img" src={src} alt="" />
      </span>
    </button>
  );
}
