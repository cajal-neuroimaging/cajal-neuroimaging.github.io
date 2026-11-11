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
// Home: the group's cortex (from a Brainstorm render) lights up where each rhythm is typical
// and drives the five rhythms and the EEG they add up to
const rhythms = document.querySelector('.rhythms__canvas');
if (rhythms) {
  const ctx = rhythms.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INK = [18, 51, 59];
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const brain = new Image(); brain.src = rhythms.dataset.brain;
  // real MEG channels from a Brainstorm recording, and the same channels band-passed into each rhythm
  let data = null;
  fetch(rhythms.dataset.signals).then((r) => r.json()).then((j) => { data = j; draw(); }).catch(() => {});
  const at = (arr, pos) => { const n = arr.length, i = Math.floor(pos), f = pos - i, a = arr[((i % n) + n) % n], b = arr[(((i + 1) % n) + n) % n]; return (a + (b - a) * f) / data.scale; };
  const BW = 506, BH = 352;
  let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const mk = (f) => Array.from({ length: 4 }, () => ({ f: f * (.82 + rnd() * .36), ph: rnd() * 6.28, a: .6 + rnd() * .4, sp: .7 + rnd() * .6 }));
  const bands = [
    { src: [82, 172],  f: 2.2, c: rgb('#00A9B2'), w: 1 },    // delta, frontal
    { src: [150, 62],  f: 4.5, c: rgb('#2FB5A8'), w: .7 },   // theta, frontal midline
    { src: [462, 178], f: 8.5, c: rgb('#E0A800'), w: .85 },  // alpha, occipital
    { src: [268, 58],  f: 17,  c: rgb('#FF7F50'), w: .32 },  // beta, sensorimotor
    { src: [232, 282], f: 34,  c: rgb('#FF4F86'), w: .16 },  // gamma, temporal
  ].map((b) => ({ ...b, comp: mk(b.f), strands: Array.from({ length: 4 }, (_, k) => ({ dph: k ? (k * .55 + gauss() * .25) * (k % 2 ? 1 : -1) : 0, sc: k ? .55 + rnd() * .35 : 1, dy: k ? gauss() * 4 : 0 })) }));
  const eegStrands = Array.from({ length: 5 }, (_, k) => ({ dph: k ? (k * .3 + gauss() * .2) * (k % 2 ? 1 : -1) : 0, sc: k ? .6 + rnd() * .3 : 1, dy: k ? gauss() * 5 : 0, n: Array.from({ length: 5 }, () => ({ f: 40 + rnd() * 60, ph: rnd() * 6.28, sp: 2 + rnd() * 2 })) }));
  const val = (comp, u, t, speed, dph = 0) => {
    let v = 0, n = 0;
    comp.forEach((k) => { v += k.a * Math.sin(u * k.f * 6.283 - t * speed * k.sp + k.ph + dph) * (.7 + .3 * Math.sin(u * 2.3 + t * .3 * k.sp + k.ph)); n += k.a; });
    return v / n * 2.6;
  };

  let w = 0, h = 0, t = 0, visible = true, last = 0, S = 1, ox = 0, oy = 0, dpr = 1, mouse = null, layer = null, lctx = null;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rhythms.clientWidth; h = rhythms.clientHeight;
    rhythms.width = w * dpr; rhythms.height = h * dpr;
    S = Math.min((h * .8) / BH, (w * .38) / BW);
    ox = Math.max(w * .035, 10); oy = (h - BH * S) / 2;
    layer = document.createElement('canvas'); layer.width = Math.ceil(BW * S * dpr); layer.height = Math.ceil(BH * S * dpr);
    lctx = layer.getContext('2d');
  };
  const P = (x, y) => [ox + x * S, oy + y * S];

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const act = bands.map((b, i) => .62 + .38 * Math.sin(t * (.5 + i * .17) + i * 2.1));
    const xb = P(BW, 0)[0], x0 = xb - 40, span = w - x0;
    const unit = h / (1.6 + bands.length + .2), eegY = unit * .85, laneY = (i) => unit * (2.1 + i);

    const strokeTrace = (arr, ly, amp, color, width, alpha) => {
      const N = arr.length / 2, off = t * 70;
      ctx.beginPath();
      for (let x = x0; x <= w + 2; x += 1.5) { const y = ly - at(arr, off + (x - x0) / span * N) * amp; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      const g = ctx.createLinearGradient(x0, 0, w, 0);
      g.addColorStop(0, rgba(color, 0)); g.addColorStop(Math.min(90 / span, .3), rgba(color, alpha)); g.addColorStop(.9, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
      ctx.strokeStyle = g; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    if (data) {
      data.eeg.slice().reverse().forEach((arr, k, all) => { const main = k === all.length - 1; strokeTrace(arr, eegY, unit * .74, INK, main ? 1.8 : .7, main ? .95 : .25); });
      bands.forEach((b, i) => data.bands[i].slice().reverse().forEach((arr, k, all) => {
        const main = k === all.length - 1; strokeTrace(arr, laneY(i), unit * .42, b.c, main ? 1.7 : .7, main ? .95 : .32);
      }));
    }

    if (!brain.complete || !brain.naturalWidth) return;
    // cortex with a soft drop shadow
    ctx.save(); ctx.shadowColor = 'rgba(18,51,59,.18)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.drawImage(brain, ox, oy, BW * S, BH * S); ctx.restore();
    // activity painted on a layer, cut to the cortex, then multiplied so the folds stay visible
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, layer.width, layer.height); lctx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
    bands.forEach((b, i) => {
      for (let k = 0; k < 3; k++) {
        const ph = t * .6 + i + k * 2.1, x = b.src[0] + Math.cos(ph) * 16 * k, y = b.src[1] + Math.sin(ph * 1.3) * 12 * k;
        const r = 72 + 34 * act[i] - k * 14, g = lctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(b.c, (.85 - k * .2) * act[i])); g.addColorStop(.5, rgba(b.c, .25 * act[i])); g.addColorStop(1, rgba(b.c, 0));
        lctx.fillStyle = g; lctx.beginPath(); lctx.arc(x, y, r, 0, 6.29); lctx.fill();
      }
    });
    if (mouse) {
      const [mx, my] = [(mouse[0] - ox) / S, (mouse[1] - oy) / S], g = lctx.createRadialGradient(mx, my, 0, mx, my, 60);
      g.addColorStop(0, 'rgba(0,194,203,.7)'); g.addColorStop(1, 'rgba(0,194,203,0)');
      lctx.fillStyle = g; lctx.beginPath(); lctx.arc(mx, my, 60, 0, 6.29); lctx.fill();
    }
    lctx.globalCompositeOperation = 'destination-in'; lctx.drawImage(brain, 0, 0, BW, BH);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, ox * dpr, oy * dpr); ctx.restore();
    ctx.save(); ctx.globalAlpha = .35; ctx.globalCompositeOperation = 'screen'; ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, ox * dpr, oy * dpr); ctx.restore();
  };
  const loop = (ms) => {
    if (visible) { t += Math.min(ms - last, 50) / 1000 * .5; draw(); }
    last = ms; requestAnimationFrame(loop);
  };
  resize(); t = 3; draw();
  brain.onload = draw;
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
