/* Hair Transplant Answers — homepage/common interactions
   Progressive enhancement only. All critical content is server-rendered;
   nothing here is required to read the page. */
(function () {
  'use strict';

  /* ---- Mobile nav toggle ---- */
  var nav = document.querySelector('[data-nav]');
  var toggle = document.querySelector('[data-nav-toggle]');
  var header = document.querySelector('.site-header');

  // Anchor the open menu directly below the navbar (accounts for the
  // disclosure bar at scroll-top and the sticky header once scrolled).
  function setMenuTop() {
    if (header) {
      var bottom = Math.max(0, header.getBoundingClientRect().bottom);
      document.documentElement.style.setProperty('--menu-top', bottom + 'px');
    }
  }
  setMenuTop();
  window.addEventListener('resize', setMenuTop);
  window.addEventListener('scroll', function () {
    if (nav && nav.classList.contains('is-open')) setMenuTop();
  }, { passive: true });

  var triggers = document.querySelectorAll('.nav__trigger');

  function closeAllSubmenus(except) {
    triggers.forEach(function (t) {
      if (t !== except) t.setAttribute('aria-expanded', 'false');
    });
  }

  function closeMenu() {
    if (!nav) return;
    nav.classList.remove('is-open');
    closeAllSubmenus();
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    }
  }

  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open) setMenuTop();
    });
    // Close when a menu link is tapped
    nav.querySelectorAll('.nav__links a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        closeMenu();
        toggle.focus();
      }
    });
  }

  /* ---- Navbar dropdowns (desktop menus + mobile accordions) ---- */
  triggers.forEach(function (trig) {
    trig.addEventListener('click', function (e) {
      e.preventDefault();
      var isOpen = trig.getAttribute('aria-expanded') === 'true';
      closeAllSubmenus(trig);
      trig.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  });
  // Close open dropdowns on Escape (return focus to the trigger)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var open = document.querySelector('.nav__trigger[aria-expanded="true"]');
      closeAllSubmenus();
      if (open) open.focus();
    }
  });
  // Close dropdowns when clicking outside the nav
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav__item--has-menu')) closeAllSubmenus();
  });

  /* ---- FAQ accordion (keyboard + screen-reader friendly) ---- */
  document.querySelectorAll('[data-faq-item]').forEach(function (item) {
    var btn = item.querySelector('.faq__q');
    var panel = item.querySelector('.faq__a');
    if (!btn || !panel) return;
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () {
      var isOpen = item.getAttribute('aria-expanded') === 'true';
      item.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      panel.style.maxHeight = isOpen ? null : panel.scrollHeight + 'px';
    });
  });

  /* ---- Search field: route to /guides/ search (placeholder behavior) ---- */
  var search = document.querySelector('[data-search]');
  if (search) {
    search.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (search.querySelector('input') || {}).value || '';
      // TODO: wire to real search endpoint / results page
      window.location.href = '/search/?q=' + encodeURIComponent(q.trim());
    });
  }

  /* ---- Quote form: inline validation + success state ---- */
  var quoteForm = document.querySelector('[data-quote-form]');
  if (quoteForm) {
    var card = quoteForm.closest('[data-quote-card]');
    var success = card ? card.querySelector('[data-quote-success]') : null;

    function fieldOf(el) { return el.closest('.form-field'); }
    function setError(el, on) {
      var f = fieldOf(el);
      if (f) f.classList.toggle('has-error', on);
    }
    function validField(el) {
      if (el.type === 'checkbox') return el.checked;
      var v = (el.value || '').trim();
      if (!v) return false;
      if (el.getAttribute('data-type') === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (el.getAttribute('data-type') === 'phone') return (v.replace(/\D/g, '').length >= 10);
      return true;
    }
    var required = quoteForm.querySelectorAll('[data-required]');

    // Clear a field's error as the user fixes it
    required.forEach(function (el) {
      var ev = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
      el.addEventListener(ev, function () { if (validField(el)) setError(el, false); });
    });

    function showSuccess() {
      if (card && success) {
        card.classList.add('is-submitted');
        success.classList.add('is-visible');
        success.setAttribute('tabindex', '-1');
        success.focus();
        success.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
    function showFormError(msg) {
      var box = quoteForm.querySelector('[data-form-error]');
      if (!box) {
        box = document.createElement('p');
        box.setAttribute('data-form-error', '');
        box.style.cssText = 'color:var(--color-destructive);font-size:.9rem;margin-top:12px;text-align:center';
        quoteForm.appendChild(box);
      }
      box.textContent = msg || 'Something went wrong. Please try again or call us.';
    }

    // Endpoint: set data-endpoint="https://…" on the form (e.g. a Formspree URL,
    // your CRM webhook, or an /api/lead route). Empty = demo mode (shows success, sends nothing).
    var ENDPOINT = quoteForm.getAttribute('data-endpoint') || '';

    quoteForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      required.forEach(function (el) {
        var ok = validField(el);
        setError(el, !ok);
        if (!ok && !firstBad) firstBad = el;
      });
      if (firstBad) { firstBad.focus(); return; }

      if (!ENDPOINT) { showSuccess(); return; } // demo mode until an endpoint is set

      var submitBtn = quoteForm.querySelector('[type="submit"]');
      var origText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      var data = {};
      new FormData(quoteForm).forEach(function (v, k) { data[k] = v; });
      data.source = window.location.pathname;

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error('bad status');
        showSuccess();
      }).catch(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
        showFormError('We couldn’t send that. Please try again, or call (234) 567-8909.');
      });
    });
  }

  /* ---- Cost calculator ---- */
  var calc = document.querySelector('[data-calc]');
  if (calc) {
    var range = calc.querySelector('[data-calc-grafts]');
    var graftVal = calc.querySelector('[data-calc-graftval]');
    var lowOut = calc.querySelector('[data-calc-low]');
    var highOut = calc.querySelector('[data-calc-high]');
    var PER_LOW = 3, PER_HIGH = 8; // typical US per-graft range (illustrative)
    var usd = function (n) { return '$' + n.toLocaleString('en-US'); };
    var update = function () {
      var g = parseInt(range.value, 10) || 0;
      if (graftVal) graftVal.textContent = g.toLocaleString('en-US');
      if (lowOut) lowOut.textContent = usd(g * PER_LOW);
      if (highOut) highOut.textContent = usd(g * PER_HIGH);
    };
    range.addEventListener('input', update);
    update();
  }

  /* ---- State index filter ---- */
  var stateFilter = document.querySelector('[data-state-filter]');
  if (stateFilter) {
    var stateItems = document.querySelectorAll('[data-state-item]');
    var emptyMsg = document.querySelector('[data-filter-empty]');
    stateFilter.addEventListener('input', function () {
      var q = stateFilter.value.trim().toLowerCase();
      var shown = 0;
      stateItems.forEach(function (el) {
        var match = el.textContent.toLowerCase().indexOf(q) !== -1;
        el.style.display = match ? '' : 'none';
        if (match) shown++;
      });
      if (emptyMsg) emptyMsg.style.display = shown === 0 ? 'block' : 'none';
    });
  }

  /* ---- Scroll reveal (respects reduced-motion) ---- */
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = document.querySelectorAll('.reveal');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }
})();
