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
  const BW = 1004, BH = 694;
  let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const mk = (f) => Array.from({ length: 4 }, () => ({ f: f * (.82 + rnd() * .36), ph: rnd() * 6.28, a: .6 + rnd() * .4, sp: .7 + rnd() * .6 }));
  const bands = [
    { src: [88, 300],  f: 2.2, c: rgb('#00A9B2'), w: 1 },    // delta, frontal
    { src: [300, 150],  f: 4.5, c: rgb('#2FB5A8'), w: .7 },   // theta, frontal midline
    { src: [922, 358], f: 8.5, c: rgb('#E0A800'), w: .85 },  // alpha, occipital
    { src: [520, 100],  f: 17,  c: rgb('#FF7F50'), w: .32 },  // beta, sensorimotor
    { src: [464, 562], f: 34,  c: rgb('#FF4F86'), w: .16 },  // gamma, temporal
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
    S = Math.min((h * .78) / BH, (w * .34) / BW);
    ox = Math.max(w * .035, 10); oy = (h - BH * S) / 2;
    layer = document.createElement('canvas'); layer.width = Math.ceil(BW * S * dpr); layer.height = Math.ceil(BH * S * dpr);
    lctx = layer.getContext('2d');
  };
  const P = (x, y) => [ox + x * S, oy + y * S];

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const off = t * 70;
    const act = bands.map((b, i) => (data ? .2 + .8 * Math.max(0, at(data.env[i], off)) : .6));
    const xb = P(BW, 0)[0], x0 = xb - 40, span = w - x0;
    const unit = h / (1.6 + bands.length + .2), eegY = unit * .85, laneY = (i) => unit * (2.1 + i);

    // the full EEG starts at the back of the brain
    const strokeTrace = (arr, ly, amp, color, width, alpha) => {
      const N = arr.length / 2;
      ctx.beginPath();
      for (let x = x0; x <= w + 2; x += 1.5) { const y = ly - Math.tanh(at(arr, off - (x - x0) / span * N)) * amp; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      const g = ctx.createLinearGradient(x0, 0, w, 0);
      g.addColorStop(0, rgba(color, 0)); g.addColorStop(Math.min(90 / span, .3), rgba(color, alpha)); g.addColorStop(.9, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
      ctx.strokeStyle = g; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    // each rhythm leaves its source region, travels over the cortex and settles into its lane
    const route = (src, ly) => {
      const xs = xb + Math.max(24, w * .03), pts = [];
      for (let k = 0; k <= 60; k++) {
        const u = k / 60, m = 1 - u, c1 = [src[0] + (xs - src[0]) * .55, src[1]], c2 = [xs - (xs - src[0]) * .3, ly];
        pts.push([m*m*m*src[0] + 3*m*m*u*c1[0] + 3*m*u*u*c2[0] + u*u*u*xs, m*m*m*src[1] + 3*m*m*u*c1[1] + 3*m*u*u*c2[1] + u*u*u*ly]);
      }
      for (let x = xs + 2; x <= w + 2; x += 2) pts.push([x, ly]);
      let sacc = 0; const out = pts.map((p, k) => {
        if (k) sacc += Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]);
        const q = pts[Math.min(k + 1, pts.length - 1)], r = pts[Math.max(k - 1, 0)], dx = q[0] - r[0], dy = q[1] - r[1], L = Math.hypot(dx, dy) || 1;
        return { x: p[0], y: p[1], s: sacc, nx: -dy / L, ny: dx / L };
      });
      return { pts: out, curve: out[60].s };
    };
    const xs = xb + Math.max(26, w * .03);
    const link = (from, ly, color, alpha) => {
      ctx.beginPath(); ctx.moveTo(...from);
      ctx.bezierCurveTo(from[0] + (xs - from[0]) * .55, from[1], xs - (xs - from[0]) * .3, ly, xs, ly);
      ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = .7; ctx.stroke();
    };
    const laneTrace = (arr, ly, amp, color, width, alpha) => {
      const N = arr.length / 2, sp = w - xs;
      ctx.beginPath();
      for (let x = xs; x <= w + 2; x += 1.5) {
        const u = (x - xs) / sp, taper = Math.min(1, u * 9);
        const y = ly - Math.tanh(at(arr, off - u * N) * 1.15) * amp * taper;
        x === xs ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(xs, 0, w, 0);
      g.addColorStop(0, rgba(color, alpha * .6)); g.addColorStop(.08, rgba(color, alpha)); g.addColorStop(.9, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
      ctx.strokeStyle = g; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    const travellers = (arr, ly, amp, color, i) => {
      const N = arr.length / 2, sp = w - xs;
      for (let q = 0; q < 4; q++) {
        const u = (t * .045 + q / 4 + i * .11) % 1, x = xs + u * sp;
        const y = ly - Math.tanh(at(arr, off - u * N) * 1.15) * amp * Math.min(1, u * 9);
        const fade = Math.sin(Math.PI * u), g = ctx.createRadialGradient(x, y, 0, x, y, 6);
        g.addColorStop(0, rgba(color, .9 * fade)); g.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.29); ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${.9 * fade})`; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, 6.29); ctx.fill();
      }
    };
    const drawTraces = () => {
      if (!data) return;
      // the full EEG is linked to the brain as a whole (its upper posterior contour)
      link(P(760, 78), eegY, INK, .35);
      data.eeg.slice().reverse().forEach((arr, k, all) => { const main = k === all.length - 1; laneTrace(arr, eegY, unit * .74, INK, main ? 1.6 : .6, main ? .95 : .3); });
      travellers(data.eeg[0], eegY, unit * .74, INK, 5);
      bands.forEach((b, i) => {
        link(P(...b.src), laneY(i), b.c, .5);
        const amp = unit * .4 * [1.9, 1.25, 1, 1, 1][i];
        data.bands[i].slice().reverse().forEach((arr, k, all) => { const main = k === all.length - 1; laneTrace(arr, laneY(i), amp, b.c, main ? 1.5 : .6, main ? .95 : .35); });
        travellers(data.bands[i][0], laneY(i), amp, b.c, i);
      });
    };
    // a fine network along the sulci, and small coloured points linked along the gyral crowns
    const grow = (px, py) => (mouse ? 1 + 2.2 * Math.exp(-((px - mouse[0]) ** 2 + (py - mouse[1]) ** 2) / 2600) : 1);
    const PAL = ['#00C2CB', '#7FE0D4', '#E8B923', '#FF9A76', '#FF5D8F'].map(rgb);
    const drawNet = () => {
      if (!data || !data.nodes) return;
      if (data.dots) {
        if (!data.dotBand) data.dotBand = data.dots.map(([x, y]) => {
          let best = 0, bi = 0; bands.forEach((b, i) => { const k = Math.exp(-((x - b.src[0]) ** 2 + (y - b.src[1]) ** 2) / 50000); if (k > best) { best = k; bi = i; } });
          return [bi, best];
        });
        data.dots.forEach(([x, y], k) => {
          const [bi, near] = data.dotBand[k], a = act[bi], v = near * (.25 + .75 * a);
          if (v < .04) return;
          const [px, py] = P(x, y), tw = .7 + .3 * Math.sin(t * 2.2 + k * .7);
          const gm = grow(px, py); ctx.fillStyle = rgba(bands[bi].c, Math.min(1, (.25 + v) * tw * (gm > 1.05 ? 1.4 : 1))); ctx.beginPath(); ctx.arc(px, py, (.6 + v * 2.2) * tw * gm, 0, 6.29); ctx.fill();
        });
      }
      if (data.gyri) {
        ctx.lineWidth = .45;
        data.gyriEdges.forEach(([i, j]) => {
          const a = P(...data.gyri[i]), c = P(...data.gyri[j]);
          ctx.strokeStyle = rgba(PAL[data.gyriCol[i]], .22); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...c); ctx.stroke();
        });
        data.gyri.forEach(([x, y], k) => {
          const [px, py] = P(x, y), tw = .55 + .45 * Math.sin(t * 1.7 + k * 1.3);
          ctx.fillStyle = rgba(PAL[data.gyriCol[k]], .7 * tw); ctx.beginPath(); ctx.arc(px, py, (.9 + .5 * tw) * grow(px, py), 0, 6.29); ctx.fill();
        });
      }
      const heat = data.nodes.map(([x, y]) => {
        let v = 0, c = INK;
        bands.forEach((b, i) => { const k = act[i] * Math.exp(-((x - b.src[0]) ** 2 + (y - b.src[1]) ** 2) / 26000); if (k > v) { v = k; c = b.c; } });
        return [v, c];
      });
      ctx.lineWidth = .5;
      data.edges.forEach(([i, j]) => {
        const a = P(...data.nodes[i]), c = P(...data.nodes[j]), v = Math.min(heat[i][0], heat[j][0]);
        ctx.strokeStyle = v > .2 ? rgba(heat[i][1], .15 + v * .4) : rgba(INK, .17);
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...c); ctx.stroke();
      });
      data.nodes.forEach(([x, y], k) => {
        const [px, py] = P(x, y), [v, c] = heat[k], tw = .75 + .25 * Math.sin(t * 2 + k);
        ctx.fillStyle = v > .2 ? rgba(c, (.45 + v * .5) * tw) : rgba(INK, .4 * tw);
        ctx.beginPath(); ctx.arc(px, py, (1 + v * 1.4) * grow(px, py), 0, 6.29); ctx.fill();
      });
    };

    if (!brain.complete || !brain.naturalWidth) { drawTraces(); return; }
    // cortex with a soft drop shadow
    ctx.save(); ctx.shadowColor = 'rgba(18,51,59,.18)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.drawImage(brain, ox, oy, BW * S, BH * S); ctx.restore();
    // activity painted on a layer, cut to the cortex, then multiplied so the folds stay visible
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, layer.width, layer.height); lctx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
    bands.forEach((b, i) => {
      for (let k = 0; k < 3; k++) {
        const ph = t * .6 + i + k * 2.1, x = b.src[0] + Math.cos(ph) * 32 * k, y = b.src[1] + Math.sin(ph * 1.3) * 24 * k;
        const r = (72 + 40 * act[i] - k * 14) * 2, g = lctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(b.c, (.85 - k * .2) * act[i])); g.addColorStop(.5, rgba(b.c, .25 * act[i])); g.addColorStop(1, rgba(b.c, 0));
        lctx.fillStyle = g; lctx.beginPath(); lctx.arc(x, y, r, 0, 6.29); lctx.fill();
      }
    });
    lctx.globalCompositeOperation = 'destination-in'; lctx.drawImage(brain, 0, 0, BW, BH);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, ox * dpr, oy * dpr); ctx.restore();
    ctx.save(); ctx.globalAlpha = .35; ctx.globalCompositeOperation = 'screen'; ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, ox * dpr, oy * dpr); ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawNet();
    drawTraces();
    bands.forEach((b, i) => {
      const src = P(...b.src), pr = 2 + act[i] * 2.5;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(...src, pr + 1.8, 0, 6.29); ctx.fill();
      ctx.fillStyle = rgba(b.c, 1); ctx.beginPath(); ctx.arc(...src, pr, 0, 6.29); ctx.fill();
    });
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
