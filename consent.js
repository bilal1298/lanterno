/* Cookie consent: a small banner for Google Analytics and Microsoft Clarity.
   Defaults are set in <head> (Consent Mode v2) before Google Tag Manager loads;
   this file only asks, remembers the answer and passes it on. */
(() => {
  const KEY = 'lanterno-consent';
  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, v); } catch (e) {} };

  window.dataLayer = window.dataLayer || [];
  const gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  // Remove analytics cookies already set, so rejecting takes effect straight away
  const clearAnalyticsCookies = () => {
    const host = location.hostname;
    const domains = ['', host, '.' + host, '.' + host.split('.').slice(-2).join('.')];
    document.cookie.split(';').map((c) => c.split('=')[0].trim())
      .filter((name) => /^(_ga|_gid|_clck|_clsk)/.test(name))
      .forEach((name) => domains.forEach((d) => {
        document.cookie = `${name}=; Max-Age=0; path=/${d ? '; domain=' + d : ''}`;
      }));
  };

  const apply = (value) => {
    gtag('consent', 'update', { analytics_storage: value });
    if (typeof window.clarity === 'function') {
      try { window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: value }); } catch (e) {}
    }
    window.dataLayer.push({ event: 'consent_update', analytics_consent: value });
    if (value === 'denied') clearAnalyticsCookies();
  };

  let banner = null;

  const hide = () => {
    if (!banner) return;
    banner.dataset.state = 'leaving';
    setTimeout(() => { banner.hidden = true; delete banner.dataset.state; }, 200);
  };

  const choose = (value) => {
    save(value);
    apply(value);
    hide();
  };

  const build = () => {
    banner = document.createElement('section');
    banner.className = 'consent';
    banner.setAttribute('aria-label', 'Cookie choices');
    banner.hidden = true;
    banner.innerHTML =
      '<p class="consent-text">We use cookies to analyse site traffic and improve your experience. <a href="/privacy/#cookies">Learn more</a></p>' +
      '<div class="consent-actions">' +
        '<button type="button" class="consent-btn consent-reject" data-choice="denied">Reject</button>' +
        '<button type="button" class="consent-btn consent-accept" data-choice="granted">Accept</button>' +
      '</div>';
    banner.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-choice]');
      if (btn) choose(btn.dataset.choice);
    });
    document.body.appendChild(banner);
  };

  const show = () => {
    if (!banner) build();
    banner.hidden = false;
    requestAnimationFrame(() => { banner.dataset.state = 'open'; });
  };

  // "Cookie settings" links reopen the banner
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-cookie-settings]')) return;
    e.preventDefault();
    show();
    const current = read();
    const target = banner.querySelector(`[data-choice="${current === 'denied' ? 'denied' : 'granted'}"]`);
    if (target) target.focus({ preventScroll: true });
  });

  if (!read()) show();
})();
