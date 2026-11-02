(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Big lines fill their measure exactly: measure each at 100px, then scale */
  const fits = document.querySelectorAll('[data-fit]');
  const fit = () => fits.forEach((el) => {
    const box = el.closest('.wrap') || el;
    const cs = getComputedStyle(box);
    const width = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    el.style.fontSize = '100px';
    el.style.whiteSpace = 'nowrap';
    const lines = el.querySelectorAll('[data-line], [data-cta]');
    const widest = lines.length
      ? Math.max(...[...lines].map((l) => { const r = document.createRange(); r.selectNodeContents(l); return r.getBoundingClientRect().width; }))
      : (() => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; })();
    el.style.whiteSpace = '';
    el.style.fontSize = `${Math.floor((width / widest) * 100 * 0.995)}px`;
  });
  const refit = () => requestAnimationFrame(fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  addEventListener('resize', refit);
  refit();

  /* Entrances, once each */
  const targets = document.querySelectorAll('[data-reveal], .deal-line, .cta');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add('is-in'));
  }
  document.querySelectorAll('.included-list li').forEach((li, i) => { li.style.transitionDelay = `${i * 45}ms`; });

  /* Hovering a browser mock scrolls the whole site inside it */
  const views = document.querySelectorAll('.browser-view');
  const measure = () => views.forEach((view) => {
    const img = view.querySelector('img');
    const travel = Math.max(0, img.offsetHeight - view.offsetHeight);
    view.closest('.mock').style.setProperty('--scroll-to', `-${travel}px`);
  });
  addEventListener('load', measure);
  addEventListener('resize', measure);
  views.forEach((v) => v.querySelector('img').addEventListener('load', measure));

  /* Contact popup: every "get in touch" opens it; the mailto stays as the no-script fallback */
  const dialog = document.getElementById('contact');
  if (dialog && typeof dialog.showModal === 'function') {
    const form = dialog.querySelector('form');
    const views = { form: dialog.querySelector('[data-view="form"]'), done: dialog.querySelector('[data-view="done"]') };
    const submit = form.querySelector('[type="submit"]');
    const submitLabel = submit.querySelector('.submit-label');
    const status = form.querySelector('.form-status');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    let closing = 0;

    const open = () => {
      clearTimeout(closing);
      if (!dialog.open) {
        if (!views.done.hidden) reset();
        dialog.showModal();
        root.classList.add('has-dialog');
      }
      dialog.scrollTop = 0;
      requestAnimationFrame(() => {
        dialog.dataset.state = 'open';
        // On touch screens, don't throw the keyboard up before the visitor has seen the form
        if (finePointer && !views.form.hidden) form.elements.firstName.focus({ preventScroll: true });
        dialog.scrollTop = 0;
      });
    };
    const close = () => {
      if (!dialog.open) return;
      dialog.dataset.state = 'closing';
      closing = setTimeout(() => {
        dialog.close();
        root.classList.remove('has-dialog');
        delete dialog.dataset.state;
      }, reduced ? 0 : 230);
    };
    const reset = () => {
      form.reset();
      form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
      form.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
      status.textContent = '';
      views.form.hidden = false;
      views.done.hidden = true;
    };

    document.querySelectorAll('[data-contact]').forEach((el) => el.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      open();
    }));
    dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    // A click on the dim area around the panel closes it
    dialog.addEventListener('mousedown', (e) => { if (e.target === dialog) close(); });

    const rules = {
      firstName: (v) => (v ? '' : 'Please add your first name.'),
      lastName: (v) => (v ? '' : 'Please add your last name.'),
      email: (v) => (!v ? 'Please add your email so we can reply.' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'That email doesn’t look quite right.'),
      website: (v) => (!v || /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(v) ? '' : 'That doesn’t look like a web address. Leave it blank if you don’t have one.'),
      message: (v) => (v.length >= 10 ? '' : v ? 'A little more detail would help us reply properly.' : 'Tell us a little about your business.'),
    };
    const check = (input) => {
      const msg = rules[input.name](input.value.trim());
      const err = document.getElementById(input.getAttribute('aria-describedby'));
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      err.textContent = msg;
      return !msg;
    };
    Object.keys(rules).forEach((name) => {
      const input = form.elements[name];
      input.addEventListener('blur', () => { if (input.value.trim() || input.hasAttribute('aria-invalid')) check(input); });
      input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) check(input); });
    });

    const showDone = (data, viaEmail) => {
      dialog.querySelector('[data-done-name]').textContent = data.firstName;
      const text = dialog.querySelector('[data-done-text]');
      if (viaEmail) {
        text.textContent = 'Your email app should have opened with your message ready to go. Hit send there and we’ll reply soon.';
      } else {
        dialog.querySelector('[data-done-email]').textContent = data.email;
      }
      views.form.hidden = true;
      views.done.hidden = false;
      dialog.querySelector('[data-done-title]').focus({ preventScroll: true });
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      const fields = Object.keys(rules).map((n) => form.elements[n]);
      const results = fields.map((input) => check(input));
      const firstBad = fields[results.indexOf(false)];
      if (firstBad) { firstBad.focus(); return; }
      if (form.elements.company.value) return; // bots fill the hidden field

      const data = Object.fromEntries(fields.map((i) => [i.name, i.value.trim()]));
      const endpoint = form.dataset.endpoint;

      if (!endpoint) {
        const body = `${data.message}\n\n${data.firstName} ${data.lastName}\n${data.email}${data.website ? `\n${data.website}` : ''}`;
        location.href = `mailto:hello@lanternostudio.com?subject=${encodeURIComponent(`Website enquiry from ${data.firstName} ${data.lastName}`)}&body=${encodeURIComponent(body)}`;
        showDone(data, true);
        return;
      }

      submit.setAttribute('aria-busy', 'true');
      submitLabel.textContent = 'Sending…';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...data, submittedAt: new Date().toISOString(), page: location.href }),
        });
        if (!res.ok) throw new Error(res.status);
        showDone(data, false);
      } catch {
        status.textContent = 'That didn’t send. Please try again, or email hello@lanternostudio.com.';
      } finally {
        submit.removeAttribute('aria-busy');
        submitLabel.textContent = 'Send message';
      }
    });
  }

  /* A monthly fee, added up against one payment */
  const fee = document.getElementById('fee');
  if (fee) {
    const ONCE = 995;
    const out = document.getElementById('fee-out');
    const sum = document.getElementById('tally-sum');
    const rows = [...document.querySelectorAll('.tally-rows li')];
    const money = (n) => 'US$' + n.toLocaleString('en-US');

    const update = () => {
      const monthly = Number(fee.value);
      const five = monthly * 60;
      const max = Math.max(five, ONCE);
      fee.style.setProperty('--p', `${(monthly / Number(fee.max)) * 100}%`);
      out.innerHTML = `${money(monthly)}<span>/mo</span>`;
      rows.forEach((row) => {
        const val = row.querySelector('.t-val');
        const bar = row.querySelector('.t-track i');
        const years = Number(val.dataset.years || 0);
        const total = years ? monthly * 12 * years : ONCE;
        if (years) val.textContent = money(total);
        bar.style.setProperty('--w', (total / max).toFixed(4));
      });
      if (monthly === 0) {
        sum.innerHTML = 'No monthly fee? Good. Ours doesn’t have one either: <strong>US$995</strong>, once.';
      } else if (five <= ONCE) {
        sum.innerHTML = `Over five years, that’s <strong>${money(five)}</strong>. Ours is <strong>US$995</strong>, once, and the website is yours.`;
      } else {
        sum.innerHTML = `Over five years, that’s <strong>${money(five)}</strong> in fees. Ours is <strong>US$995</strong>, once.`;
      }
    };
    fee.addEventListener('input', update);
    update();
  }
})();
