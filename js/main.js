/* ====================================================
   RACHEL SEPULVEDA — main.js
   Hero slider · Gallery filter · Lightbox ·
   Nav scroll · Mobile menu · Color themes · Animations
   ==================================================== */

(function () {
  'use strict';

  /* ── Hero Slider ────────────────────────────────────── */
  const heroSlides = document.querySelectorAll('.hero-slide');
  const heroDotsContainer = document.querySelector('.hero-dots');
  const progressFill = document.querySelector('.hero-progress-fill');
  const progressStart = document.querySelector('.hero-progress-start');
  const progressEnd = document.querySelector('.hero-progress-end');

  let currentSlide = 0;
  let slideTimer = null;
  const SLIDE_INTERVAL = 5000;

  function initSlider() {
    if (!heroSlides.length) return;

    // Build dots
    if (heroDotsContainer) {
      heroSlides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dot.addEventListener('click', () => goToSlide(i));
        heroDotsContainer.appendChild(dot);
      });
    }

    if (progressEnd) progressEnd.textContent = String(heroSlides.length).padStart(2, '0');

    goToSlide(0);
    startTimer();

    // Arrow buttons
    const prevBtn = document.querySelector('.hero-arrow-prev');
    const nextBtn = document.querySelector('.hero-arrow-next');
    if (prevBtn) prevBtn.addEventListener('click', () => { resetTimer(); goToSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length); });
    if (nextBtn) nextBtn.addEventListener('click', () => { resetTimer(); goToSlide((currentSlide + 1) % heroSlides.length); });

    // Touch swipe
    let touchStartX = 0;
    const heroEl = document.querySelector('.hero');
    if (heroEl) {
      heroEl.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
      heroEl.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50) {
          resetTimer();
          goToSlide((currentSlide + (dx < 0 ? 1 : -1) + heroSlides.length) % heroSlides.length);
        }
      });
    }
  }

  function goToSlide(index) {
    heroSlides.forEach((s, i) => s.classList.toggle('active', i === index));
    const dots = document.querySelectorAll('.hero-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
    currentSlide = index;

    if (progressFill) {
      const pct = ((index + 1) / heroSlides.length) * 100;
      progressFill.style.width = pct + '%';
    }
    if (progressStart) progressStart.textContent = String(index + 1).padStart(2, '0');
  }

  function startTimer() {
    slideTimer = setInterval(() => {
      goToSlide((currentSlide + 1) % heroSlides.length);
    }, SLIDE_INTERVAL);
  }

  function resetTimer() {
    clearInterval(slideTimer);
    startTimer();
  }

  /* ── Navigation scroll behavior ─────────────────────── */
  function initNav() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;
    function onScroll() {
      nav.classList.toggle('scrolled', window.scrollY > 30);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Active link
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if (href === currentPath || (currentPath === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });
  }

  /* ── Mobile menu ─────────────────────────────────────── */
  function initMobileMenu() {
    const menuBtn = document.querySelector('.nav-menu-btn');
    const overlay = document.querySelector('.nav-mobile-overlay');
    const closeBtn = document.querySelector('.nav-close-btn');
    if (!menuBtn || !overlay) return;

    menuBtn.addEventListener('click', () => {
      overlay.classList.add('open');
      menuBtn.setAttribute('aria-expanded', 'true');
    });
    if (closeBtn) closeBtn.addEventListener('click', () => {
      overlay.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
    overlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        overlay.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── Gallery / Project Filter ────────────────────────── */
  function initFilter() {
    const tabs = document.querySelectorAll('.filter-tab[data-filter]');
    if (!tabs.length) return;

    const apply = (filter) => {
      const items = document.querySelectorAll('.gallery-item[data-category]');
      items.forEach(item => {
        const match = filter === 'all' || item.dataset.category.includes(filter);
        item.classList.toggle('hidden', !match);
      });
    };

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        apply(tab.dataset.filter);
      });
    });

    // Allow ?filter=<value> in URL to set the active tab on load
    const params = new URLSearchParams(window.location.search);
    const urlFilter = params.get('filter');
    if (urlFilter) {
      const match = Array.from(tabs).find(t => t.dataset.filter === urlFilter);
      if (match) {
        tabs.forEach(t => t.classList.remove('active'));
        match.classList.add('active');
      }
    }

    // Apply the active tab's filter on page load (so default isn't all-visible)
    const active = document.querySelector('.filter-tab.active[data-filter]');
    if (active) apply(active.dataset.filter);
  }

  /* ── Color Theme Switcher ────────────────────────────── */
  const themes = {
    navy:  { '--bg': '#0c1820', '--bg-2': '#111f2e', '--green-accent': '#8eaa3a' },
    green: { '--bg': '#0e1a10', '--bg-2': '#132018', '--green-accent': '#a0c040' },
    mauve: { '--bg': '#1a0e18', '--bg-2': '#251520', '--green-accent': '#c070a0' },
    cream: { '--bg': '#1a1810', '--bg-2': '#221e14', '--green-accent': '#c8a060' },
  };

  function initColorThemes() {
    const dots = document.querySelectorAll('.color-dot[data-theme]');
    if (!dots.length) return;

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        dots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');

        const theme = themes[dot.dataset.theme];
        if (!theme) return;
        const root = document.documentElement;
        Object.entries(theme).forEach(([prop, val]) => root.style.setProperty(prop, val));
      });
    });
  }

  /* ── Lightbox ────────────────────────────────────────── */
  let lbImages = [];
  let lbIndex = 0;

  function initLightbox() {
    const lb = document.querySelector('.lightbox');
    if (!lb) return;

    const lbImg = lb.querySelector('.lightbox-img');
    const lbClose = lb.querySelector('.lightbox-close');
    const lbPrev = lb.querySelector('.lightbox-arrow.prev');
    const lbNext = lb.querySelector('.lightbox-arrow.next');

    // Collect all lightbox-triggerable images
    document.querySelectorAll('[data-lightbox]').forEach((el, i) => {
      el.addEventListener('click', () => openLightbox(i));
      el.style.cursor = 'zoom-in';
    });

    lbImages = Array.from(document.querySelectorAll('[data-lightbox]')).map(el => ({
      src: el.dataset.lightbox || el.querySelector('img')?.src,
      alt: el.dataset.alt || '',
    }));

    function openLightbox(index) {
      lbIndex = index;
      showLbImage();
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lb.classList.remove('open');
      document.body.style.overflow = '';
    }

    function showLbImage() {
      if (!lbImages[lbIndex]) return;
      lbImg.src = lbImages[lbIndex].src;
      lbImg.alt = lbImages[lbIndex].alt;
    }

    if (lbClose) lbClose.addEventListener('click', closeLightbox);
    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
    if (lbPrev) lbPrev.addEventListener('click', () => { lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length; showLbImage(); });
    if (lbNext) lbNext.addEventListener('click', () => { lbIndex = (lbIndex + 1) % lbImages.length; showLbImage(); });

    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') { lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length; showLbImage(); }
      if (e.key === 'ArrowRight') { lbIndex = (lbIndex + 1) % lbImages.length; showLbImage(); }
    });
  }

  /* ── Scroll animations ───────────────────────────────── */
  function initScrollAnimations() {
    const els = document.querySelectorAll('.fade-up');
    if (!els.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => observer.observe(el));
  }

  /* ── Contact form ────────────────────────────────────── */
  function initContactForm() {
    const form = document.querySelector('.contact-form form');
    if (!form) return;

    const wrap = form.parentElement;
    const success = wrap.querySelector('.form-success');
    const errorEl = wrap.querySelector('.form-error');
    const btn = form.querySelector('button[type="submit"]');
    const btnLabel = btn ? btn.textContent : '';

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (success) success.style.display = 'none';
      if (errorEl) errorEl.style.display = 'none';
      if (btn) { btn.disabled = true; btn.textContent = 'SENDING…'; }

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });
        if (!res.ok) throw new Error('Submission failed');
        form.reset();
        if (success) {
          success.style.display = 'block';
          setTimeout(() => { success.style.display = 'none'; }, 6000);
        }
      } catch (err) {
        if (errorEl) errorEl.style.display = 'block';
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
      }
    });
  }

  /* ── Glitchify headers — ransom-note per-char font swap ─ */
  function glitchifyHeaders() {
    const selectors = [
      '.hero-title',
      '.page-hero-inner h1',
      '.section-header h2',
      '.case-hero-text h1',
      '.about-text-col h1',
      '.contact-info h2',
      '.philosophy-card h3',
      '.case-text h3',
      '.models-sidebar h2',
      '.nav-logo',
      '.footer-logo',
      '.hero-currently .cur-label',
      '.model-card-name',
      '.model-card-large .name',
      '.case-intro',
      '.philosophy-card .card-num',
      '.stat-num',
    ];
    const headers = document.querySelectorAll(selectors.join(','));
    const splitTextNode = (textNode) => {
      const text = textNode.textContent;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === ' ' || ch === '\n' || ch === '\t') {
          frag.appendChild(document.createTextNode(ch));
        } else {
          const span = document.createElement('span');
          span.className = 'glitch-char';
          span.textContent = ch;
          frag.appendChild(span);
        }
      }
      textNode.parentNode.replaceChild(frag, textNode);
    };
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.trim()) splitTextNode(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // skip if already glitched
        if (node.classList && node.classList.contains('glitch-char')) return;
        Array.from(node.childNodes).forEach(walk);
      }
    };
    headers.forEach(h => {
      if (h.dataset.glitched) return;
      h.dataset.glitched = '1';
      Array.from(h.childNodes).forEach(walk);
    });
  }

  /* ── Boot ────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    glitchifyHeaders();
    initSlider();
    initNav();
    initMobileMenu();
    initFilter();
    initColorThemes();
    initLightbox();
    initScrollAnimations();
    initContactForm();
  });

})();
