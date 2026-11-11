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
// Home: a luminous brain whose regions emit the five rhythms (no text; colours follow the logo)
const rhythms = document.querySelector('.rhythms__canvas');
if (rhythms) {
  const ctx = rhythms.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const D = {
    cerebrum: 'M290 57C317 58 357 61 386 68C415 75 439 83 462 97C485 111 506 128 524 150C542 172 561 207 572 232C583 257 590 279 592 300C594 321 591 342 586 358C581 374 571 388 560 398C549 408 537 413 520 416C503 419 480 414 460 414C440 414 420 413 400 414C380 415 358 418 340 422C322 426 308 435 290 438C272 441 249 443 232 442C215 441 199 436 186 430C173 424 164 413 156 404C148 395 149 382 140 376C131 370 113 371 100 368C87 365 72 362 60 356C48 350 36 341 28 330C20 319 13 306 10 290C7 274 6 251 10 232C14 213 19 196 32 176C45 156 66 132 88 115C110 98 143 86 166 77C189 68 205 65 226 62C247 59 263 56 290 57Z',
    cerebellum: 'M330 412C326 462 372 499 430 498C488 497 522 462 518 404Z',
    stem: 'M282 425C300 470 330 506 358 540C366 549 384 549 390 538C380 510 356 470 336 425Z',
  };
  const P2 = Object.fromEntries(Object.entries(D).map(([k, d]) => [k, new Path2D(d)]));
  const bands = [
    { src: [120, 215], f: 2.2, c: rgb('#00C2CB') },  // delta, frontal
    { src: [215, 105], f: 4.5, c: rgb('#7FE0D4') },  // theta, frontal midline
    { src: [548, 290], f: 8,   c: rgb('#FFE38A') },  // alpha, occipital
    { src: [345, 92],  f: 16,  c: rgb('#FF9A76') },  // beta, sensorimotor
    { src: [235, 392], f: 32,  c: rgb('#FF5D8F') },  // gamma, temporal
  ];
  // particles: dense fill plus a fine line of dots along each contour
  let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const probe = document.createElement('canvas').getContext('2d');
  const inside = (x, y) => ['cerebrum', 'cerebellum', 'stem'].some((k) => probe.isPointInPath(P2[k], x, y));
  const pts = [];
  for (let k = 0; k < 60000 && pts.length < 1500; k++) {
    const x = rnd() * 600, y = 50 + rnd() * 500;
    if (inside(x, y)) pts.push({ x, y, r: .6 + rnd() * 1.1, ph: rnd() * 6.28, z: rnd() });
  }
  const svgNS = 'http://www.w3.org/2000/svg';
  Object.values(D).forEach((d) => {
    const el = document.createElementNS(svgNS, 'path'); el.setAttribute('d', d);
    const L = el.getTotalLength();
    for (let l = 0; l < L; l += 5) { const q = el.getPointAtLength(l); if (d !== D.cerebrum && probe.isPointInPath(P2.cerebrum, q.x, q.y)) continue; pts.push({ x: q.x, y: q.y, r: .9, ph: rnd() * 6.28, z: 1, edge: true }); }
  });
  const hubs = pts.filter((p, i) => !p.edge && i % 6 === 0);
  const links = [];
  hubs.forEach((p, i) => hubs.forEach((q, j) => { if (j > i && Math.hypot(p.x - q.x, p.y - q.y) < 46) links.push([p, q]); }));

  let w = 0, h = 0, t = 0, visible = true, last = 0, S = 1, ox = 0, oy = 0, dpr = 1, mouse = null;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rhythms.clientWidth; h = rhythms.clientHeight;
    rhythms.width = w * dpr; rhythms.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.min((h * .86) / 500, (w * .38) / 600);
    ox = Math.max(w * .05, 14); oy = (h - 500 * S) / 2 - 48 * S;
  };
  const P = (x, y) => [ox + x * S, oy + y * S];
  const bez = (p0, p1, p2, p3, n) => Array.from({ length: n + 1 }, (_, k) => {
    const u = k / n, m = 1 - u;
    return [0, 1].map((d) => m*m*m*p0[d] + 3*m*m*u*p1[d] + 3*m*u*u*p2[d] + u*u*u*p3[d]);
  });
  const line = (arr) => { ctx.beginPath(); arr.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };

  const draw = () => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    const breathe = 1 + .006 * Math.sin(t * .8);
    const act = bands.map((b, i) => .5 + .5 * Math.sin(t * (.5 + i * .17) + i * 2.1));
    const right = P(600, 0)[0], xs = right + Math.max(50, w * .07), lane = h / (bands.length + .3);
    const mx = mouse && (mouse[0] - ox) / S, my = mouse && (mouse[1] - oy) / S;

    // links between hubs (very faint)
    ctx.lineWidth = .6;
    links.forEach(([p, q]) => {
      const a = P(p.x, p.y), c = P(q.x, q.y);
      ctx.strokeStyle = 'rgba(180,235,235,.06)'; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...c); ctx.stroke();
    });

    ctx.globalCompositeOperation = 'lighter';
    // blooms of activity
    bands.forEach((b, i) => {
      const [x, y] = P(...b.src), r = 120 * S * (.7 + act[i] * .5);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(b.c, .34 * act[i] + .06)); g.addColorStop(.45, rgba(b.c, .1 * act[i])); g.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
    });

    // particles, tinted and lifted near active regions and under the pointer
    pts.forEach((p) => {
      let col = [200, 236, 238], v = 0;
      bands.forEach((b, i) => {
        const d2 = (p.x - b.src[0]) ** 2 + (p.y - b.src[1]) ** 2, k = act[i] * Math.exp(-d2 / 7000);
        if (k > v) { v = k; col = b.c; }
      });
      if (mouse) { const dm = Math.exp(-((p.x - mx) ** 2 + (p.y - my) ** 2) / 3000); v = Math.max(v, dm * .9); }
      const tw = .55 + .45 * Math.sin(t * 1.6 + p.ph);
      const a = (p.edge ? .5 : .14 + p.z * .2) * tw + v * .8;
      const [x, y] = P(p.x * breathe + (1 - breathe) * 300, p.y * breathe + (1 - breathe) * 300);
      const r = (p.r + v * 1.6) * Math.max(S * 1.7, .7);
      ctx.fillStyle = rgba(v > .08 ? col : [200, 236, 238], Math.min(a, 1));
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
    });

    // rhythms: a stream of light from each region, then a ribbon of three strands
    bands.forEach((b, i) => {
      const src = P(...b.src), ly = lane * (i + .65);
      const exit = [right + 6, P(0, 140 + i * 60)[1]];
      const inner = bez(src, [src[0] + (exit[0] - src[0]) * .5, src[1]], [exit[0] - 50 * S, exit[1]], exit, 40);
      const outer = bez(exit, [exit[0] + (xs - exit[0]) * .6, exit[1]], [xs - (xs - exit[0]) * .4, ly], [xs, ly], 30);
      // particle stream inside the brain
      for (let q = 0; q < 14; q++) {
        const u = (t * .12 + q / 14 + i * .07) % 1, p = inner[Math.floor(u * (inner.length - 1))];
        ctx.fillStyle = rgba(b.c, .7 * Math.sin(u * Math.PI));
        ctx.beginPath(); ctx.arc(p[0], p[1], 1.6, 0, 6.29); ctx.fill();
      }
      const amp = lane * .38 * (1 - i * .08), span = w - xs;
      for (let strand = 0; strand < 3; strand++) {
        const wave = [];
        for (let x = xs; x <= w + 2; x += 1.5) {
          const u = (x - xs) / span, grow = Math.min(1, u * 5);
          const ph = u * b.f * 6.283 - t * (1.2 + i * .45) + strand * .35;
          const env = .78 + .22 * Math.sin(u * 5 - t * .35 + i + strand);
          wave.push([x, ly - Math.sin(ph) * amp * grow * env * (1 - strand * .12)]);
        }
        const g = ctx.createLinearGradient(exit[0], 0, w, 0);
        const a0 = [.85, .32, .16][strand];
        g.addColorStop(0, rgba(b.c, a0 * .6)); g.addColorStop(.1, rgba(b.c, a0)); g.addColorStop(.75, rgba(b.c, a0 * .9)); g.addColorStop(1, rgba(b.c, 0));
        ctx.strokeStyle = g; ctx.lineWidth = [1.6, 1, .8][strand]; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (strand === 0) { ctx.shadowColor = rgba(b.c, .8); ctx.shadowBlur = 10; }
        line(strand === 0 ? outer.concat(wave) : wave); ctx.stroke();
        ctx.shadowBlur = 0;
        if (strand === 0) {
          for (let q = 0; q < 3; q++) {
            const u = (t * .06 + q / 3 + i * .13) % 1, p = wave[Math.floor(u * (wave.length - 1))], fade = Math.sin(u * Math.PI);
            const pg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 9);
            pg.addColorStop(0, rgba(b.c, fade)); pg.addColorStop(1, rgba(b.c, 0));
            ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, 6.29); ctx.fill();
          }
        }
      }
      // pulsing source
      const pr = (4 + act[i] * 4) * Math.max(S * 1.6, .8);
      const sg = ctx.createRadialGradient(...src, 0, ...src, pr * 3);
      sg.addColorStop(0, 'rgba(255,255,255,.95)'); sg.addColorStop(.25, rgba(b.c, .9)); sg.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(...src, pr * 3, 0, 6.29); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  };
  const loop = (ms) => {
    if (visible) { t += Math.min(ms - last, 50) / 1000 * .5; draw(); }
    last = ms; requestAnimationFrame(loop);
  };
  resize(); t = 3; draw();
  window.addEventListener('resize', () => { resize(); draw(); });
  rhythms.addEventListener('pointermove', (e) => { const r = rhythms.getBoundingClientRect(); mouse = [e.clientX - r.left, e.clientY - r.top]; });
  rhythms.addEventListener('pointerleave', () => { mouse = null; });
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
