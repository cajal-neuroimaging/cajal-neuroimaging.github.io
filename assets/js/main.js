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
// Home: a brain network with active regions sending out five rhythms
const rhythms = document.querySelector('.rhythms__canvas');
if (rhythms) {
  const ctx = rhythms.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INK = [18, 51, 59];
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  // Brain outline from the group logo (logo coordinates)
  const CEREBRUM = new Path2D('M150 206C120 214 78 210 56 192C34 172 32 136 48 108C70 70 122 46 186 42C244 38 302 52 336 86C364 114 372 152 360 186C352 208 336 222 316 228C290 242 252 258 214 260C184 262 158 252 148 236C142 226 142 214 150 206Z');
  const CEREBELLUM = new Path2D('M232 236C236 276 290 298 334 286C368 276 374 240 346 212Z');
  const SULCUS = new Path2D('M150 206C184 198 220 186 250 164');
  // delta, theta, alpha, beta, gamma: source region (logo coords), cycles across the lane, colour
  const bands = [
    { name: 'Delta', g: 'δ', src: [175, 74], f: 2.2, c: rgb('#00C2CB') },
    { name: 'Theta', g: 'θ', src: [100, 135],  f: 4.5, c: rgb('#3CC9BE') },
    { name: 'Alpha', g: 'α', src: [270, 140], f: 8,   c: rgb('#E8B923') },
    { name: 'Beta',  g: 'β', src: [335, 180], f: 15,  c: rgb('#FF9A76') },
    { name: 'Gamma', g: 'γ', src: [305, 262], f: 28,  c: rgb('#FF5D8F') },
  ];
  // Network nodes sampled inside the brain, seeded so the layout is stable
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const probe = document.createElement('canvas').getContext('2d');
  const nodes = [];
  while (nodes.length < 150) {
    const x = 36 + rnd() * 336, y = 38 + rnd() * 256;
    if (probe.isPointInPath(CEREBRUM, x, y) || probe.isPointInPath(CEREBELLUM, x, y)) {
      if (nodes.every((n) => Math.hypot(n[0] - x, n[1] - y) > 13)) nodes.push([x, y, rnd() * 6.28]);
    }
  }
  const edges = [];
  nodes.forEach((a, i) => nodes.forEach((b, j) => { if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 30) edges.push([i, j]); }));

  let w = 0, h = 0, t = 0, visible = true, last = 0, S = 1, ox = 0, oy = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rhythms.clientWidth; h = rhythms.clientHeight;
    rhythms.width = w * dpr; rhythms.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.min((h * .86) / 270, (w * .34) / 340);
    ox = Math.max(w * .04, 12) - 30 * S; oy = (h - 270 * S) / 2 - 36 * S;
  };
  const P = (x, y) => [ox + x * S, oy + y * S];

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const brainRight = P(372, 0)[0], xs = brainRight + Math.max(30, w * .05);
    const lane = h / (bands.length + .6);
    // activation level of each source region
    const act = bands.map((b, i) => .55 + .45 * Math.sin(t * (0.7 + i * .23) + i * 1.7));

    // soft glow under each active region
    bands.forEach((b, i) => {
      const [x, y] = P(...b.src), r = 58 * S * (0.7 + act[i] * .5);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(b.c, .38 * act[i])); g.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
    });

    // brain outline
    ctx.save(); ctx.translate(ox, oy); ctx.scale(S, S);
    ctx.lineWidth = 2.2 / S * 1.1; ctx.strokeStyle = rgba(INK, .22); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke(CEREBRUM); ctx.stroke(CEREBELLUM); ctx.lineWidth = 1.6 / S; ctx.stroke(SULCUS);
    ctx.restore();

    // network: edges and nodes tinted by the nearest active region
    const heat = nodes.map(([x, y, ph]) => {
      let best = 0, col = INK;
      bands.forEach((b, i) => {
        const d = Math.hypot(x - b.src[0], y - b.src[1]);
        const v = act[i] * Math.exp(-(d * d) / 2600);
        if (v > best) { best = v; col = b.c; }
      });
      return [best * (.75 + .25 * Math.sin(t * 2 + ph)), col];
    });
    ctx.lineWidth = 1;
    edges.forEach(([i, j]) => {
      const [a, b] = [P(nodes[i][0], nodes[i][1]), P(nodes[j][0], nodes[j][1])];
      const v = (heat[i][0] + heat[j][0]) / 2;
      ctx.strokeStyle = v > .15 ? rgba(heat[i][1], .12 + v * .45) : rgba(INK, .08);
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
    });
    nodes.forEach(([x, y], k) => {
      const [px, py] = P(x, y), v = heat[k][0];
      ctx.fillStyle = v > .15 ? rgba(heat[k][1], .45 + v * .55) : rgba(INK, .22);
      ctx.beginPath(); ctx.arc(px, py, (1.3 + v * 2.2) * Math.max(S, .7), 0, 6.29); ctx.fill();
    });

    // signals leaving each region and settling into their own lane
    ctx.font = '600 11px system-ui, sans-serif';
    bands.forEach((b, i) => {
      const [sx, sy] = P(...b.src), ly = lane * (i + .8);
      const pts = [];
      // smooth exit curve from the source to the lane
      for (let k = 0; k <= 40; k++) {
        const u = k / 40, m = 1 - u;
        const c1 = [sx + (xs - sx) * .55, sy], c2 = [xs - (xs - sx) * .25, ly];
        pts.push([m*m*m*sx + 3*m*m*u*c1[0] + 3*m*u*u*c2[0] + u*u*u*xs, m*m*m*sy + 3*m*m*u*c1[1] + 3*m*u*u*c2[1] + u*u*u*ly]);
      }
      // the rhythm, growing in amplitude as it leaves the brain
      const amp = lane * .36 * (1 - i * .1), span = w - xs;
      for (let x = xs + 2; x <= w; x += 2) {
        const u = (x - xs) / span, grow = Math.min(1, u * 5);
        const ph = u * b.f * 6.283 - t * (1.4 + i * .5);
        pts.push([x, ly - Math.sin(ph) * amp * grow * (.8 + .2 * Math.sin(u * 7 - t * .5 + i))]);
      }
      const g = ctx.createLinearGradient(sx, 0, w, 0);
      g.addColorStop(0, rgba(b.c, .15)); g.addColorStop((xs - sx) / (w - sx), rgba(b.c, .9)); g.addColorStop(.85, rgba(b.c, .85)); g.addColorStop(1, rgba(b.c, 0));
      ctx.strokeStyle = g; ctx.lineWidth = 1.7; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.stroke();
      // a few bright pulses travelling outwards
      for (let q = 0; q < 2; q++) {
        const pos = ((t * .09 + q * .5 + i * .13) % 1), p = pts[Math.floor(pos * (pts.length - 1))];
        const fade = Math.sin(pos * Math.PI), r = 7;
        const pg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
        pg.addColorStop(0, rgba(b.c, .9 * fade)); pg.addColorStop(1, rgba(b.c, 0));
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.29); ctx.fill();
      }
      // source dot and label
      ctx.fillStyle = rgba(b.c, 1); ctx.beginPath(); ctx.arc(sx, sy, 3.2 * Math.max(S, .8), 0, 6.29); ctx.fill();
      if (w > 560) {
        ctx.fillStyle = rgba(INK, .55); ctx.textAlign = 'right';
        ctx.fillText(`${b.g}  ${b.name.toUpperCase()}`, w - 12, ly - lane * .32);
      }
    });
  };
  const loop = (ms) => {
    if (visible) { t += Math.min(ms - last, 50) / 1000 * .55; draw(); }
    last = ms; requestAnimationFrame(loop);
  };
  resize(); t = 2; draw();
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
