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

// Open links to other websites in a new tab
document.querySelectorAll('a[href]').forEach((a) => {
  if (a.hostname && a.hostname !== location.hostname) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
});

// News page: one feed sorted by date and grouped by year, with filters
const feed = document.getElementById('feed');
if (feed) {
  const items = [...feed.children].sort((a, b) => b.dataset.date.localeCompare(a.dataset.date));
  const wrap = document.createElement('div');
  let year = null, list = null;
  items.forEach((li) => {
    const y = li.dataset.date.slice(0, 4);
    if (y !== year) {
      year = y;
      const sec = document.createElement('section');
      sec.className = 'year-group';
      sec.innerHTML = '<h2 class="year-group__year">' + y + '</h2>';
      list = document.createElement('ul');
      list.className = 'news-grid news-grid--year';
      sec.appendChild(list);
      wrap.appendChild(sec);
    }
    list.appendChild(li);
  });
  feed.replaceWith(wrap);
  const btns = document.querySelectorAll('.filters button');
  btns.forEach((btn) => btn.addEventListener('click', () => {
    btns.forEach((b) => b.setAttribute('aria-pressed', b === btn));
    wrap.querySelectorAll('.year-group').forEach((sec) => {
      let shown = 0;
      sec.querySelectorAll('.news-card').forEach((li) => {
        li.hidden = btn.dataset.filter !== 'all' && li.dataset.type !== btn.dataset.filter;
        if (!li.hidden) shown++;
      });
      sec.hidden = shown === 0;
    });
  }));
}
