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
// Home: a brain made of particles; its regions drive the five rhythms and the EEG they add up to
const rhythms = document.querySelector('.rhythms__canvas');
if (rhythms) {
  const ctx = rhythms.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INK = [18, 51, 59];
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const D = {
    cerebrum: 'M290 57C317 58 357 61 386 68C415 75 439 83 462 97C485 111 506 128 524 150C542 172 561 207 572 232C583 257 590 279 592 300C594 321 591 342 586 358C581 374 571 388 560 398C549 408 537 413 520 416C503 419 480 414 460 414C440 414 420 413 400 414C380 415 358 418 340 422C322 426 308 435 290 438C272 441 249 443 232 442C215 441 199 436 186 430C173 424 164 413 156 404C148 395 149 382 140 376C131 370 113 371 100 368C87 365 72 362 60 356C48 350 36 341 28 330C20 319 13 306 10 290C7 274 6 251 10 232C14 213 19 196 32 176C45 156 66 132 88 115C110 98 143 86 166 77C189 68 205 65 226 62C247 59 263 56 290 57Z',
    cerebellum: 'M330 412C326 462 372 499 430 498C488 497 522 462 518 404Z',
    stem: 'M282 425C300 470 330 506 358 540C366 549 384 549 390 538C380 510 356 470 336 425Z',
  };
  const P2 = Object.fromEntries(Object.entries(D).map(([k, d]) => [k, new Path2D(d)]));
  let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // each rhythm is a small bundle of nearby frequencies with slowly drifting amplitude, so it never looks like a pure sine
  const mk = (f) => Array.from({ length: 4 }, () => ({ f: f * (.82 + rnd() * .36), ph: rnd() * 6.28, a: .6 + rnd() * .4, sp: .7 + rnd() * .6 }));
  const bands = [
    { src: [120, 215], f: 2.2, c: rgb('#00A9B2'), w: 1 },    // delta, frontal
    { src: [215, 105], f: 4.5, c: rgb('#39BFB2'), w: .7 },   // theta, frontal midline
    { src: [548, 290], f: 8.5, c: rgb('#E0A800'), w: .8 },   // alpha, occipital
    { src: [345, 92],  f: 17,  c: rgb('#FF8A5C'), w: .32 },  // beta, sensorimotor
    { src: [235, 392], f: 34,  c: rgb('#FF5D8F'), w: .16 },  // gamma, temporal
  ].map((b) => ({ ...b, comp: mk(b.f) }));
  const noise = Array.from({ length: 6 }, () => ({ f: 40 + rnd() * 50, ph: rnd() * 6.28, a: .05 + rnd() * .05, sp: 2 + rnd() * 2 }));
  const val = (comp, u, t, speed) => {
    let v = 0, n = 0;
    comp.forEach((k) => { v += k.a * Math.sin(u * k.f * 6.283 - t * speed * k.sp + k.ph) * (.7 + .3 * Math.sin(u * 2.3 + t * .3 * k.sp + k.ph)); n += k.a; });
    return Math.max(-1.25, Math.min(1.25, v / n * 2.3));
  };

  // particles: dense fill plus a single dotted contour per structure
  const probe = document.createElement('canvas').getContext('2d');
  const inAny = (x, y) => ['cerebrum', 'cerebellum', 'stem'].some((k) => probe.isPointInPath(P2[k], x, y));
  const pts = [];
  for (let k = 0; k < 60000 && pts.length < 1300; k++) {
    const x = rnd() * 600, y = 50 + rnd() * 500;
    if (inAny(x, y)) pts.push({ x, y, r: .6 + rnd() * 1, ph: rnd() * 6.28, z: rnd() });
  }
  const svgNS = 'http://www.w3.org/2000/svg';
  const covers = { cerebrum: [], cerebellum: ['cerebrum'], stem: ['cerebrum', 'cerebellum'] };
  Object.entries(D).forEach(([name, d]) => {
    const el = document.createElementNS(svgNS, 'path'); el.setAttribute('d', d);
    const L = el.getTotalLength();
    for (let l = 0; l < L; l += 4.5) {
      const q = el.getPointAtLength(l);
      if (covers[name].some((k) => probe.isPointInPath(P2[k], q.x, q.y))) continue;
      pts.push({ x: q.x, y: q.y, r: .85, ph: rnd() * 6.28, z: 1, edge: true });
    }
  });

  let w = 0, h = 0, t = 0, visible = true, last = 0, S = 1, ox = 0, oy = 0, dpr = 1, mouse = null;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rhythms.clientWidth; h = rhythms.clientHeight;
    rhythms.width = w * dpr; rhythms.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.min((h * .86) / 500, (w * .36) / 600);
    ox = Math.max(w * .05, 14); oy = (h - 500 * S) / 2 - 48 * S;
  };
  const P = (x, y) => [ox + x * S, oy + y * S];
  const line = (arr) => { ctx.beginPath(); arr.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const act = bands.map((b, i) => .5 + .5 * Math.sin(t * (.5 + i * .17) + i * 2.1));
    const xb = P(600, 0)[0], x0 = xb - 30, lanes = bands.length + 1, lane = h / (lanes + .2);
    const mx = mouse && (mouse[0] - ox) / S, my = mouse && (mouse[1] - oy) / S;

    // traces run from behind the brain to the right edge; they fade in as they leave it
    const trace = (ly, amp, fn, color, width, alpha) => {
      const arr = []; const span = w - x0;
      for (let x = x0; x <= w + 2; x += 1.5) arr.push([x, ly - fn((x - x0) / span) * amp]);
      const g = ctx.createLinearGradient(x0, 0, w, 0), k = (xb - x0) / span;
      g.addColorStop(0, rgba(color, 0)); g.addColorStop(Math.min(90 / span, .3), rgba(color, alpha));
      g.addColorStop(.9, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
      ctx.strokeStyle = g; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      line(arr); ctx.stroke();
      return arr;
    };
    // the full EEG: all rhythms summed with a little broadband noise
    const eegAmp = lane * .55;
    trace(lane * .62, eegAmp, (u) => {
      let v = 0; bands.forEach((b, i) => { v += b.w * val(b.comp, u, t, 1.2 + i * .45); });
      noise.forEach((k) => { v += k.a * 3 * Math.sin(u * k.f * 6.283 - t * k.sp + k.ph); });
      return v / 2.2;
    }, INK, 1.4, .85);
    bands.forEach((b, i) => {
      const ly = lane * (i + 1.62), amp = lane * .4 * (1 - i * .06);
      const arr = trace(ly, amp, (u) => val(b.comp, u, t, 1.2 + i * .45) * (.75 + .25 * act[i]), b.c, 1.6, .9);
      // a soft glint travelling along each rhythm
      const u = (t * .05 + i * .17) % 1, p = arr[Math.floor((.25 + u * .7) * (arr.length - 1))];
      const pg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 8);
      pg.addColorStop(0, rgba(b.c, .55 * Math.sin(u * Math.PI))); pg.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, 6.29); ctx.fill();
    });

    // brain body on top of the start of the traces
    ctx.save(); ctx.translate(ox, oy); ctx.scale(S, S);
    const fill = ctx.createRadialGradient(260, 220, 20, 300, 300, 360);
    fill.addColorStop(0, 'rgba(255,255,255,.96)'); fill.addColorStop(1, 'rgba(236,248,246,.94)');
    ctx.shadowColor = 'rgba(18,51,59,.12)'; ctx.shadowBlur = 40 * S; ctx.shadowOffsetY = 14 * S;
    ctx.fillStyle = fill; ctx.fill(P2.stem); ctx.fill(P2.cerebellum); ctx.fill(P2.cerebrum);
    ctx.restore();

    // regional activity
    bands.forEach((b, i) => {
      const [x, y] = P(...b.src), r = 110 * S * (.7 + act[i] * .5);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(b.c, .3 * act[i] + .06)); g.addColorStop(.5, rgba(b.c, .08 * act[i])); g.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
    });

    // particles
    pts.forEach((p) => {
      let col = INK, v = 0;
      bands.forEach((b, i) => {
        const k = act[i] * Math.exp(-((p.x - b.src[0]) ** 2 + (p.y - b.src[1]) ** 2) / 7000);
        if (k > v) { v = k; col = b.c; }
      });
      if (mouse) v = Math.max(v, .9 * Math.exp(-((p.x - mx) ** 2 + (p.y - my) ** 2) / 3000));
      const tw = .6 + .4 * Math.sin(t * 1.6 + p.ph);
      const a = (p.edge ? .42 : .1 + p.z * .16) * tw + v * .75;
      const [x, y] = P(p.x, p.y), r = (p.r + v * 1.5) * Math.max(S * 1.7, .7);
      ctx.fillStyle = rgba(v > .08 ? col : INK, Math.min(a, 1));
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
    });
    // sources
    bands.forEach((b, i) => {
      const src = P(...b.src), pr = (3 + act[i] * 3) * Math.max(S * 1.6, .8);
      const sg = ctx.createRadialGradient(...src, 0, ...src, pr * 2.6);
      sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(.3, rgba(b.c, 1)); sg.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(...src, pr * 2.6, 0, 6.29); ctx.fill();
    });
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
