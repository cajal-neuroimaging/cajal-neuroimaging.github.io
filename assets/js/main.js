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
// Home: a shaded cortex whose regions light up and drive the five rhythms and the EEG they add up to
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
    sylvian: 'M146 376C176 350 216 334 262 328',
  };
  const P2 = Object.fromEntries(Object.entries(D).map(([k, d]) => [k, new Path2D(d)]));
  const BRAIN = new Path2D(); BRAIN.addPath(P2.cerebrum); BRAIN.addPath(P2.cerebellum);
  let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  // a rhythm is a bundle of nearby frequencies with drifting amplitude, never a pure sine
  const mk = (f) => Array.from({ length: 4 }, () => ({ f: f * (.82 + rnd() * .36), ph: rnd() * 6.28, a: .6 + rnd() * .4, sp: .7 + rnd() * .6 }));
  const bands = [
    { src: [120, 215], f: 2.2, c: rgb('#00A9B2'), w: 1 },    // delta, frontal
    { src: [215, 110], f: 4.5, c: rgb('#2FB5A8'), w: .7 },   // theta, frontal midline
    { src: [548, 290], f: 8.5, c: rgb('#E0A800'), w: .85 },  // alpha, occipital
    { src: [345, 95],  f: 17,  c: rgb('#FF7F50'), w: .32 },  // beta, sensorimotor
    { src: [235, 392], f: 34,  c: rgb('#FF4F86'), w: .16 },  // gamma, temporal
  ].map((b) => ({ ...b, comp: mk(b.f), strands: Array.from({ length: 4 }, (_, k) => ({ dph: k ? (k * .55 + gauss() * .25) * (k % 2 ? 1 : -1) : 0, sc: k ? .55 + rnd() * .35 : 1, dy: k ? gauss() * 4 : 0 })) }));
  const eegStrands = Array.from({ length: 5 }, (_, k) => ({ dph: k ? (k * .3 + gauss() * .2) * (k % 2 ? 1 : -1) : 0, sc: k ? .6 + rnd() * .3 : 1, dy: k ? gauss() * 5 : 0, n: Array.from({ length: 5 }, () => ({ f: 40 + rnd() * 60, ph: rnd() * 6.28, sp: 2 + rnd() * 2 })) }));
  const soft = (v) => Math.tanh(v);
  const val = (comp, u, t, speed, dph = 0) => {
    let v = 0, n = 0;
    comp.forEach((k) => { v += k.a * Math.sin(u * k.f * 6.283 - t * speed * k.sp + k.ph + dph) * (.7 + .3 * Math.sin(u * 2.3 + t * .3 * k.sp + k.ph)); n += k.a; });
    return v / n * 2.6;
  };
  // cortical relief: wavy contour lines that follow the shape of the cerebrum
  const probe = document.createElement('canvas').getContext('2d');
  const outline = (() => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path'); el.setAttribute('d', D.cerebrum);
    const L = el.getTotalLength(); return Array.from({ length: 180 }, (_, k) => { const q = el.getPointAtLength(k / 180 * L); return [q.x, q.y]; });
  })();
  const rings = Array.from({ length: 9 }, (_, k) => {
    const sc = 1 - (k + 1) * .095, c = [300, 250], ph = rnd() * 6.28, fr = 9 + Math.floor(rnd() * 6);
    return outline.map(([x, y], j) => {
      const wob = 1 + .035 * Math.sin(j / 180 * fr * 6.283 + ph);
      return [c[0] + (x - c[0]) * sc * wob, c[1] + (y - c[1]) * sc * wob];
    });
  });
  let w = 0, h = 0, t = 0, visible = true, last = 0, S = 1, ox = 0, oy = 0, dpr = 1, mouse = null, base = null;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rhythms.clientWidth; h = rhythms.clientHeight;
    rhythms.width = w * dpr; rhythms.height = h * dpr;
    S = Math.min((h * .86) / 500, (w * .36) / 600);
    ox = Math.max(w * .04, 12); oy = (h - 500 * S) / 2 - 48 * S;
    // pre-render the static shaded brain
    base = document.createElement('canvas'); base.width = w * dpr; base.height = h * dpr;
    const b = base.getContext('2d'); b.setTransform(dpr * S, 0, 0, dpr * S, dpr * ox, dpr * oy);
    const shade = (path, c0, c1, gx, gy) => {
      const g = b.createRadialGradient(gx, gy, 10, gx + 60, gy + 120, 420); g.addColorStop(0, c0); g.addColorStop(1, c1);
      b.fillStyle = g; b.fill(path); b.strokeStyle = 'rgba(18,51,59,.30)'; b.lineWidth = 2.2 / S; b.stroke(path);
    };
    b.save(); b.shadowColor = 'rgba(18,51,59,.16)'; b.shadowBlur = 36 * S * dpr; b.shadowOffsetY = 14 * S * dpr;
    b.fillStyle = '#fff'; b.fill(P2.stem); b.fill(P2.cerebellum); b.fill(P2.cerebrum); b.restore();
    shade(P2.stem, '#F3FAF9', '#CFE3E2', 320, 440);
    shade(P2.cerebellum, '#F6FBFB', '#D3E7E6', 400, 420);
    b.save(); b.clip(P2.cerebellum); b.lineCap = 'round';
    for (let k = 0; k < 7; k++) { b.strokeStyle = 'rgba(18,51,59,.10)'; b.lineWidth = 4; b.beginPath(); b.moveTo(330, 425 + k * 11); b.quadraticCurveTo(425, 455 + k * 12, 525, 415 + k * 11); b.stroke(); }
    b.restore();
    shade(P2.cerebrum, '#FFFFFF', '#D5E9E8', 230, 120);
    b.save(); b.clip(P2.cerebrum); b.lineCap = 'round'; b.lineJoin = 'round';
    b.lineWidth = 1.6;
    rings.forEach((r, k) => {
      b.strokeStyle = `rgba(18,51,59,${.05 + k * .004})`; b.beginPath(); r.forEach((p, j) => (j ? b.lineTo(...p) : b.moveTo(...p))); b.closePath(); b.stroke();
    });
    b.strokeStyle = 'rgba(18,51,59,.16)'; b.lineWidth = 3; b.beginPath(); b.moveTo(335, 62); b.bezierCurveTo(318, 140, 345, 200, 300, 300); b.stroke();
    b.strokeStyle = 'rgba(18,51,59,.28)'; b.lineWidth = 4; b.stroke(P2.sylvian);
    b.restore();
  };
  const P = (x, y) => [ox + x * S, oy + y * S];

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const act = bands.map((b, i) => .62 + .38 * Math.sin(t * (.5 + i * .17) + i * 2.1));
    const xb = P(600, 0)[0], x0 = xb - 24, span = w - x0;
    // layout: the full EEG gets a taller lane on top
    const unit = h / (1.6 + bands.length + .2), eegY = unit * .85;
    const laneY = (i) => unit * (1.6 + i + .5);

    const strokeTrace = (fn, ly, amp, color, width, alpha) => {
      ctx.beginPath();
      for (let x = x0; x <= w + 2; x += 1.5) {
        const y = ly - soft(fn((x - x0) / span)) * amp;
        x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(x0, 0, w, 0);
      g.addColorStop(0, rgba(color, 0)); g.addColorStop(Math.min(80 / span, .3), rgba(color, alpha)); g.addColorStop(.9, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
      ctx.strokeStyle = g; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    // full EEG: five channels of the summed rhythms with broadband noise
    eegStrands.forEach((st, k) => {
      strokeTrace((u) => {
        let v = 0; bands.forEach((b, i) => { v += b.w * val(b.comp, u, t, 1.2 + i * .45, st.dph * (1 + i * .3)); });
        st.n.forEach((q) => { v += .12 * Math.sin(u * q.f * 6.283 - t * q.sp + q.ph); });
        return v / 2.4 * st.sc;
      }, eegY + st.dy, unit * .6, INK, k ? .7 : 1.9, k ? .28 : .95);
    });
    // each rhythm: four channels around a main one
    bands.forEach((b, i) => {
      b.strands.slice().reverse().forEach((st, k) => {
        const main = st.dph === 0;
        strokeTrace((u) => val(b.comp, u, t, 1.2 + i * .45, st.dph) * (.78 + .22 * act[i]) * st.sc, laneY(i) + st.dy, unit * .4, b.c, main ? 1.7 : .7, main ? .95 : .35);
      });
    });

    // shaded brain
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(base, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // source activity, spreading over the cortex like a dSPM map
    ctx.save(); ctx.translate(ox, oy); ctx.scale(S, S); ctx.clip(BRAIN); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bands.forEach((b, i) => {
      for (let k = 0; k < 3; k++) {
        const ph = t * .6 + i + k * 2.1;
        const [x, y] = P(b.src[0] + Math.cos(ph) * 18 * k, b.src[1] + Math.sin(ph * 1.3) * 14 * k);
        const r = (70 + 40 * act[i] - k * 14) * S;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(b.c, (.55 - k * .12) * act[i] + .05)); g.addColorStop(.55, rgba(b.c, .14 * act[i])); g.addColorStop(1, rgba(b.c, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
      }
    });
    if (mouse) {
      const g = ctx.createRadialGradient(...mouse, 0, ...mouse, 60 * S);
      g.addColorStop(0, 'rgba(0,194,203,.35)'); g.addColorStop(1, 'rgba(0,194,203,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(...mouse, 60 * S, 0, 6.29); ctx.fill();
    }
    ctx.restore();
    // pulsing sources
    bands.forEach((b, i) => {
      const src = P(...b.src), pr = (2.6 + act[i] * 2.4) * Math.max(S * 1.6, .8);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(...src, pr + 1.6, 0, 6.29); ctx.fill();
      ctx.fillStyle = rgba(b.c, 1); ctx.beginPath(); ctx.arc(...src, pr, 0, 6.29); ctx.fill();
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
