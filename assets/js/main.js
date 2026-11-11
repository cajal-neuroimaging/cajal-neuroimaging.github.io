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
// Home: brain network; each rhythm leaves from the region where it is most typical
const rhythms = document.querySelector('.rhythms__canvas');
if (rhythms) {
  const ctx = rhythms.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INK = [18, 51, 59];
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  // Brain from the group logo (logo coordinates, viewBox -6 40 612 524; frontal lobe on the left)
  const CEREBRUM = new Path2D('M290 57C317 58 357 61 386 68C415 75 439 83 462 97C485 111 506 128 524 150C542 172 561 207 572 232C583 257 590 279 592 300C594 321 591 342 586 358C581 374 571 388 560 398C549 408 537 413 520 416C503 419 480 414 460 414C440 414 420 413 400 414C380 415 358 418 340 422C322 426 308 435 290 438C272 441 249 443 232 442C215 441 199 436 186 430C173 424 164 413 156 404C148 395 149 382 140 376C131 370 113 371 100 368C87 365 72 362 60 356C48 350 36 341 28 330C20 319 13 306 10 290C7 274 6 251 10 232C14 213 19 196 32 176C45 156 66 132 88 115C110 98 143 86 166 77C189 68 205 65 226 62C247 59 263 56 290 57Z');
  const CEREBELLUM = new Path2D('M330 412C326 462 372 499 430 498C488 497 522 462 518 404Z');
  const STEM = new Path2D('M282 425C300 470 330 506 358 540C366 549 384 549 390 538C380 510 356 470 336 425Z');
  const SULCUS = new Path2D('M146 376C176 350 216 334 262 328');
  const bands = [
    { name: 'Delta', g: 'δ', where: 'frontal',         src: [120, 215], f: 2.2, c: rgb('#00C2CB') },
    { name: 'Theta', g: 'θ', where: 'frontal midline', src: [215, 105], f: 4.5, c: rgb('#2FB8AD') },
    { name: 'Alpha', g: 'α', where: 'occipital',       src: [548, 290], f: 8,   c: rgb('#E0A800') },
    { name: 'Beta',  g: 'β', where: 'sensorimotor',    src: [345, 92],  f: 16,  c: rgb('#FF8A5C') },
    { name: 'Gamma', g: 'γ', where: 'temporal',        src: [235, 392], f: 32,  c: rgb('#FF5D8F') },
  ];
  // stable pseudo-random network inside the brain
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const probe = document.createElement('canvas').getContext('2d');
  const nodes = [];
  for (let k = 0; k < 20000 && nodes.length < 230; k++) {
    const x = 6 + rnd() * 590, y = 52 + rnd() * 450;
    if ((probe.isPointInPath(CEREBRUM, x, y) || probe.isPointInPath(CEREBELLUM, x, y)) && nodes.every((n) => Math.hypot(n[0] - x, n[1] - y) > 22)) nodes.push([x, y, rnd() * 6.28]);
  }
  const edges = [];
  nodes.forEach((p, i) => nodes.forEach((q, j) => { if (j > i && Math.hypot(p[0] - q[0], p[1] - q[1]) < 50) edges.push([i, j]); }));

  let w = 0, h = 0, t = 0, visible = true, last = 0, S = 1, ox = 0, oy = 0, dpr = 1;
  const BRAIN = new Path2D(); BRAIN.addPath(CEREBRUM); BRAIN.addPath(CEREBELLUM);
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rhythms.clientWidth; h = rhythms.clientHeight;
    rhythms.width = w * dpr; rhythms.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.min((h * .9) / 500, (w * .36) / 600);
    ox = Math.max(w * .035, 10) + 6 * S; oy = (h - 500 * S) / 2 - 50 * S;
  };
  const P = (x, y) => [ox + x * S, oy + y * S];
  const bez = (p0, p1, p2, p3, n) => Array.from({ length: n + 1 }, (_, k) => {
    const u = k / n, m = 1 - u;
    return [0, 1].map((d) => m*m*m*p0[d] + 3*m*m*u*p1[d] + 3*m*u*u*p2[d] + u*u*u*p3[d]);
  });

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const right = P(600, 0)[0], xs = right + Math.max(36, w * .06), lane = h / (bands.length + .5);
    const act = bands.map((b, i) => .5 + .5 * Math.sin(t * (.55 + i * .18) + i * 1.9));

    // brain volume
    ctx.save(); ctx.translate(ox, oy); ctx.scale(S, S);
    const fill = ctx.createLinearGradient(0, 60, 0, 520);
    fill.addColorStop(0, '#FFFFFF'); fill.addColorStop(1, '#E6F6F3');
    ctx.shadowColor = 'rgba(18,51,59,.10)'; ctx.shadowBlur = 30 * S; ctx.shadowOffsetY = 10 * S;
    ctx.fillStyle = fill; ctx.fill(STEM); ctx.fill(CEREBELLUM); ctx.fill(CEREBRUM);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = rgba(INK, .28); ctx.lineWidth = 2.4 / S; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke(STEM); ctx.stroke(CEREBELLUM); ctx.fillStyle = fill; ctx.fill(CEREBRUM); ctx.stroke(CEREBRUM);
    ctx.lineWidth = 1.8 / S; ctx.stroke(SULCUS);
    // everything inside the brain is clipped to its outline
    ctx.clip(BRAIN); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // regional activity: glow and ripples
    bands.forEach((b, i) => {
      const [x, y] = P(...b.src), r = 95 * S * (.75 + act[i] * .45);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(b.c, .42 * act[i] + .08)); g.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
      for (let k = 0; k < 2; k++) {
        const ph = ((t * .35 + k * .5 + i * .2) % 1);
        ctx.strokeStyle = rgba(b.c, .45 * (1 - ph)); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, (6 + ph * 60) * S, 0, 6.29); ctx.stroke();
      }
    });

    // network
    const heat = nodes.map(([x, y, ph]) => {
      let best = 0, col = INK;
      bands.forEach((b, i) => {
        const d = Math.hypot(x - b.src[0], y - b.src[1]), v = act[i] * Math.exp(-(d * d) / 9000);
        if (v > best) { best = v; col = b.c; }
      });
      return [best * (.8 + .2 * Math.sin(t * 2.4 + ph)), col];
    });
    ctx.lineWidth = .8;
    edges.forEach(([i, j]) => {
      const a = P(nodes[i][0], nodes[i][1]), c = P(nodes[j][0], nodes[j][1]), v = Math.min(heat[i][0], heat[j][0]);
      ctx.strokeStyle = v > .12 ? rgba(heat[i][1], .1 + v * .5) : rgba(INK, .07);
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...c); ctx.stroke();
    });
    nodes.forEach(([x, y], k) => {
      const [px, py] = P(x, y), v = heat[k][0];
      ctx.fillStyle = v > .12 ? rgba(heat[k][1], .5 + v * .5) : rgba(INK, .2);
      ctx.beginPath(); ctx.arc(px, py, (1.1 + v * 2) * Math.max(S * 1.6, .8), 0, 6.29); ctx.fill();
    });
    ctx.restore();

    // each rhythm: leaves its region, exits the brain in order and settles into its lane
    bands.forEach((b, i) => {
      const src = P(...b.src), ly = lane * (i + .75);
      const exit = [right + 4, P(0, 130 + i * 62)[1]];
      const inner = bez(src, [src[0] + (exit[0] - src[0]) * .5, src[1]], [exit[0] - 40 * S, exit[1]], exit, 30);
      const outer = bez(exit, [exit[0] + (xs - exit[0]) * .6, exit[1]], [xs - (xs - exit[0]) * .4, ly], [xs, ly], 24);
      ctx.strokeStyle = rgba(b.c, .35); ctx.lineWidth = 1.1; ctx.setLineDash([2, 4]);
      ctx.beginPath(); inner.forEach((p, k) => (k ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.stroke(); ctx.setLineDash([]);
      const wave = [], amp = lane * .34 * (1 - i * .09), span = w - xs;
      for (let x = xs; x <= w; x += 1.5) {
        const u = (x - xs) / span, grow = Math.min(1, u * 6);
        const ph = u * b.f * 6.283 - t * (1.3 + i * .45);
        wave.push([x, ly - Math.sin(ph) * amp * grow * (.82 + .18 * Math.sin(u * 6 - t * .4 + i))]);
      }
      const path = outer.concat(wave);
      const g = ctx.createLinearGradient(exit[0], 0, w, 0);
      g.addColorStop(0, rgba(b.c, .5)); g.addColorStop(.08, rgba(b.c, .95)); g.addColorStop(.86, rgba(b.c, .9)); g.addColorStop(1, rgba(b.c, 0));
      ctx.save(); ctx.shadowColor = rgba(b.c, .35); ctx.shadowBlur = 6;
      ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); path.forEach((p, k) => (k ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.stroke(); ctx.restore();
      // pulses travelling from the region outwards
      const all = inner.concat(path);
      for (let q = 0; q < 3; q++) {
        const pos = (t * .07 + q / 3 + i * .11) % 1, p = all[Math.floor(pos * (all.length - 1))], fade = Math.sin(pos * Math.PI);
        const pg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 6);
        pg.addColorStop(0, rgba(b.c, fade)); pg.addColorStop(1, rgba(b.c, 0));
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 6.29); ctx.fill();
      }
      // source
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(...src, 4.2, 0, 6.29); ctx.fill();
      ctx.fillStyle = rgba(b.c, 1); ctx.beginPath(); ctx.arc(...src, 2.8, 0, 6.29); ctx.fill();
      // label
      if (w > 600) {
        ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        ctx.font = '600 12px "Source Sans 3", system-ui, sans-serif'; ctx.fillStyle = rgba(INK, .75);
        const lbl = `${b.g}  ${b.name}`, y0 = ly - lane * .36;
        ctx.fillText(lbl, w - 14 - ctx.measureText(`  ·  ${b.where}`).width, y0);
        ctx.font = '400 12px "Source Sans 3", system-ui, sans-serif'; ctx.fillStyle = rgba(INK, .45);
        ctx.fillText(`  ·  ${b.where}`, w - 14, y0);
      }
    });
  };
  const loop = (ms) => {
    if (visible) { t += Math.min(ms - last, 50) / 1000 * .5; draw(); }
    last = ms; requestAnimationFrame(loop);
  };
  resize(); t = 3; draw();
  window.addEventListener('resize', () => { resize(); draw(); });
  if (document.fonts) document.fonts.ready.then(draw);
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
