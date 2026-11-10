// Mobile menu
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
  });
}

// Draw the brain-rhythm traces once, unless the visitor prefers less motion
const signal = document.querySelector('.signal');
if (signal && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  signal.classList.add('is-drawing');
}

// Media filters
const filters = document.querySelectorAll('.filters button');
filters.forEach((btn) => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.filter;
    filters.forEach((b) => b.setAttribute('aria-pressed', b === btn));
    document.querySelectorAll('#media-list .media-item').forEach((item) => {
      item.hidden = type !== 'all' && item.dataset.type !== type;
    });
  });
});
