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
// Home: five brain rhythms flowing slowly, drawn on a canvas
const rhythms = document.querySelector('.rhythms__canvas');
if (rhythms) {
  const ctx = rhythms.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // delta, theta, alpha, beta, gamma: cycles across the width, amplitude, colour
  const bands = [
    { f: 3,  a: .34, c: '#00C2CB' },
    { f: 7,  a: .30, c: '#45CFC3' },
    { f: 12, a: .27, c: '#E8B923' },
    { f: 24, a: .20, c: '#FF9A76' },
    { f: 48, a: .14, c: '#FF5D8F' },
  ];
  let w = 0, h = 0, t = 0, visible = true, last = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rhythms.clientWidth; h = rhythms.clientHeight;
    rhythms.width = w * dpr; rhythms.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const lane = h / bands.length, x0 = Math.min(150, w * .16);
    bands.forEach((b, i) => {
      const mid = lane * (i + .5), amp = lane * .38 * (b.a / .34);
      // faint baseline
      ctx.strokeStyle = 'rgba(18,51,59,.06)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(w, mid); ctx.stroke();
      const grad = ctx.createLinearGradient(x0, 0, w, 0);
      grad.addColorStop(0, b.c + '00'); grad.addColorStop(.12, b.c); grad.addColorStop(.88, b.c); grad.addColorStop(1, b.c + '00');
      ctx.strokeStyle = grad; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = x0; x <= w; x += 2) {
        const u = (x - x0) / (w - x0), ph = u * b.f * Math.PI * 2 - t * (1.2 + i * .35);
        // main rhythm with a slow amplitude envelope and a little harmonic texture
        const env = .75 + .25 * Math.sin(u * 2.2 * Math.PI - t * .4 + i);
        const y = (Math.sin(ph) * env + .1 * Math.sin(ph * 2.3 + i)) / 1.1;
        x === x0 ? ctx.moveTo(x, mid - y * amp) : ctx.lineTo(x, mid - y * amp);
      }
      ctx.stroke();
    });
  };
  const loop = (ms) => {
    if (visible) { t += Math.min(ms - last, 50) / 1000 * .6; draw(); }
    last = ms; requestAnimationFrame(loop);
  };
  resize(); draw();
  window.addEventListener('resize', () => { resize(); draw(); });
  if (!still) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(rhythms);
    requestAnimationFrame((ms) => { last = ms; loop(ms); });
  }
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

// Team page: show everyone, current members or alumni
const teamBtns = document.querySelectorAll('.team-filters button');
teamBtns.forEach((btn) => btn.addEventListener('click', () => {
  teamBtns.forEach((b) => b.setAttribute('aria-pressed', b === btn));
  document.querySelectorAll('[data-group]').forEach((sec) => {
    sec.hidden = btn.dataset.show !== 'all' && sec.dataset.group !== btn.dataset.show;
  });
}));
