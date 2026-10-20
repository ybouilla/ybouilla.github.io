// Animated "AI × biomedical" backgrounds, drawn on <canvas>.
// To change the background of the whole site, edit DEFAULT_BG: "neural", "dna" or "monitor".
// To preview a background without editing anything, add ?bg=dna to the page URL.
(function () {
  const DEFAULT_BG = "neural";

  const CYAN = "34,211,238";
  const VIOLET = "167,139,250";
  const TEAL = "45,212,191";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const gauss = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
  // Stylized heartbeat (P wave, QRS complex, T wave) over one period [0, 1)
  const ecg = (p) =>
    0.12 * gauss(p, 0.14, 0.025) - 0.12 * gauss(p, 0.245, 0.008) + gauss(p, 0.27, 0.01)
    - 0.25 * gauss(p, 0.295, 0.01) + 0.25 * gauss(p, 0.48, 0.04);
  const pleth = (p) => gauss(p, 0.22, 0.08) + 0.35 * gauss(p, 0.48, 0.06);
  const resp = (p) => Math.sin(2 * Math.PI * p) * 0.5 + Math.sin(4 * Math.PI * p) * 0.08;
  const frac = (x) => x - Math.floor(x);

  function trace(ctx, w, base, amp, fn, period, offset, color, from, to) {
    ctx.beginPath();
    for (let x = from; x <= to; x += 2) {
      const y = base - amp * fn(frac((x + offset) / period));
      x === from ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  // ---------- Showcase: a different animation every SHOWCASE_PERIOD seconds ----------
  const SHOWCASE_PERIOD = 30;
  const MONO = "13px ui-monospace, SFMono-Regular, Consolas, monospace";

  const SNIPPETS = [
    [
      "docs = retriever.search(query, k=20)",
      "ranked = reranker.rank(query, docs)[:5]",
      "answer = llm.generate(build_prompt(ranked))",
      "result = Answer.model_validate_json(answer)",
      ""
    ],
    [
      "from fedbiomed import Experiment",
      "exp = Experiment(model=UNet3D(),",
      "    nodes=[\"hospital_fr\", \"hospital_de\"])",
      "exp.run(rounds=50)",
    ],
    [
      "for epoch in range(100):",
      "    loss = criterion(model(x), y)",
      "    loss.backward()",
      "    optimizer.step()",
    ],
  ];
  const KEYWORDS = /^(from|import|for|in|def|return|assert|range)$/;

  // Seeded pseudo-random generator, so each graph stays stable during its cycle
  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function region(w, h) {
    if (w >= 760) return { x: w * 0.56, y: h * 0.16, w: w * 0.38, h: h * 0.68, alpha: 1 };
    return { x: 16, y: h * 0.64, w: w - 32, h: h * 0.28, alpha: 0.35 };
  }

  function drawCode(ctx, r, p, cycle) {
    const lines = SNIPPETS[cycle % SNIPPETS.length];
    const total = lines.reduce((n, l) => n + l.length, 0);
    let left = Math.floor(Math.min(1, p / 0.7) * total);
    const lh = 22, top = r.y + r.h / 2 - (lines.length * lh) / 2 - 20;
    const panelW = Math.min(r.w, 470);
    ctx.fillStyle = "rgba(15,23,42,0.72)";
    ctx.strokeStyle = "rgba(148,163,184,0.25)";
    ctx.beginPath(); ctx.roundRect(r.x, top, panelW, lines.length * lh + 44, 10); ctx.fill(); ctx.stroke();
    ["#f87171", "#fbbf24", "#34d399"].forEach((c, i) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(r.x + 16 + i * 14, top + 14, 4, 0, 6.28); ctx.fill();
    });
    ctx.font = MONO;
    let caret = null;
    lines.forEach((line, i) => {
      const y = top + 42 + i * lh;
      ctx.fillStyle = "rgba(100,116,139,0.8)";
      ctx.fillText(String(i + 1), r.x + 12, y);
      const shown = line.slice(0, Math.max(0, left));
      left -= line.length;
      let x = r.x + 34;
      for (const tok of shown.split(/(\s+|[()[\],.=:]|"[^"]*"?)/)) {
        if (!tok) continue;
        ctx.fillStyle = KEYWORDS.test(tok) ? "#22d3ee" : tok.startsWith("\"") ? "#a78bfa" : /^\d+$/.test(tok) ? "#fbbf24" : "#e2e8f0";
        ctx.fillText(tok, x, y);
        x += ctx.measureText(tok).width;
      }
      if (shown.length < line.length && !caret) caret = { x, y };
      if (i === lines.length - 1 && !caret) caret = { x, y };
    });
    if (caret && Math.floor(p * 12) % 2 === 0) {
      ctx.fillStyle = "#22d3ee"; ctx.fillRect(caret.x + 1, caret.y - 11, 7, 14);
    }
  }

  function drawGraph(ctx, r, p, cycle, t) {
    const rand = rng(cycle * 7919 + 13);
    const n = 9;
    const nodes = Array.from({ length: n }, () => ({
      x: r.x + 20 + rand() * (r.w - 40), y: r.y + 20 + rand() * (r.h - 40),
    }));
    const edges = [];
    nodes.forEach((a, i) => {
      nodes.map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
        .filter((o) => o.j > i).sort((u, v) => u.d - v.d).slice(0, 2)
        .forEach((o) => edges.push([i, o.j]));
    });
    // Build during the first half of the cycle, take apart during the second half
    const k = p < 0.55 ? p / 0.55 : 1 - (p - 0.55) / 0.45;
    ctx.lineWidth = 1.5;
    edges.forEach(([i, j], e) => {
      const f = Math.max(0, Math.min(1, k * edges.length * 1.15 - e));
      if (!f) return;
      const a = nodes[i], b = nodes[j];
      ctx.strokeStyle = `rgba(${CYAN},0.55)`;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f); ctx.stroke();
      if (f === 1) {
        const q = frac(t * 0.8 + e * 0.37);
        ctx.fillStyle = `rgba(${VIOLET},0.95)`;
        ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * q, a.y + (b.y - a.y) * q, 2.2, 0, 6.28); ctx.fill();
      }
    });
    nodes.forEach((a, i) => {
      const f = Math.max(0, Math.min(1, k * n * 1.1 - i));
      if (!f) return;
      ctx.fillStyle = `rgba(${i % 3 ? CYAN : VIOLET},${f})`;
      ctx.beginPath(); ctx.arc(a.x, a.y, 3 + 4 * f, 0, 6.28); ctx.fill();
      ctx.strokeStyle = `rgba(${CYAN},${0.25 * f})`;
      ctx.beginPath(); ctx.arc(a.x, a.y, 9 + 4 * f, 0, 6.28); ctx.stroke();
    });
  }

  function drawChart(ctx, r, p, cycle) {
    const rand = rng(cycle * 104729 + 7);
    const x0 = r.x + 10, y0 = r.y + r.h - 16, cw = r.w - 30, ch = r.h - 40;
    ctx.strokeStyle = "rgba(148,163,184,0.45)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, r.y + 10); ctx.lineTo(x0, y0); ctx.lineTo(x0 + cw, y0); ctx.stroke();
    const noise = Array.from({ length: 61 }, () => rand() - 0.5);
    const curve = (fn, color, label) => {
      const end = Math.floor(Math.min(1, p / 0.75) * 60);
      ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath();
      let last = null;
      for (let i = 0; i <= end; i++) {
        const u = i / 60, x = x0 + u * cw, y = y0 - fn(u, noise[i]) * ch;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        last = { x, y };
      }
      ctx.stroke();
      if (last) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(last.x, last.y, 3.5, 0, 6.28); ctx.fill();
        ctx.font = "600 11px system-ui, sans-serif"; ctx.fillText(label, last.x + 8, last.y + 4);
      }
    };
    curve((u, e) => 0.12 + 0.8 * Math.exp(-4 * u) + 0.03 * e, "#22d3ee", "loss");
    curve((u, e) => 0.2 + 0.7 * Math.exp(-3.2 * u) + 0.012 * u * 10 * (u > 0.6) + 0.04 * e, "#a78bfa", "val");
    ctx.fillStyle = "rgba(148,163,184,0.7)"; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("epochs", x0 + cw - 40, y0 + 14);
  }

  function drawEcg(ctx, r, t) {
    ctx.lineWidth = 2;
    ctx.shadowColor = `rgba(${TEAL},0.9)`; ctx.shadowBlur = 10;
    trace(ctx, 0, r.y + r.h * 0.62, Math.min(70, r.h * 0.4), ecg, 240, t * 110, `rgba(${TEAL},0.85)`, r.x, r.x + r.w);
    ctx.shadowBlur = 0;
  }

  // Reuse the full-size DNA and monitor scenes, clipped to the showcase area
  const NO_MOUSE = { x: -9999, y: -9999 };
  let dnaState = null;
  function drawScene(ctx, r, t, kind) {
    ctx.save();
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12); ctx.clip();
    ctx.translate(r.x, r.y);
    if (kind === "dna" && (!dnaState || dnaState.w !== r.w || dnaState.h !== r.h)) {
      dnaState = { w: r.w, h: r.h, s: scenes.dna.init(r.w, r.h) };
    }
    scenes[kind].draw(ctx, r.w, r.h, t, kind === "dna" ? dnaState.s : {}, NO_MOUSE);
    ctx.restore();
    if (kind === "monitor") {
      ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
    }
  }

  // Animations shown in turn; remove a line to drop one, reorder lines to change the order
  const SHOWCASE = {
    code: (ctx, r, p, c) => drawCode(ctx, r, p, c),
    dna: (ctx, r, p, c, t) => drawScene(ctx, r, t, "dna"),
    graph: (ctx, r, p, c, t) => drawGraph(ctx, r, p, c, t),
    ecg: (ctx, r, p, c, t) => drawEcg(ctx, r, t),
    chart: (ctx, r, p, c) => drawChart(ctx, r, p, c),
    monitor: (ctx, r, p, c, t) => drawScene(ctx, r, t, "monitor"),
  };
  // Add ?showcase=monitor (or code, dna, graph, ecg, chart) to the URL to pin a single animation
  const pinned = SHOWCASE[new URLSearchParams(location.search).get("showcase")];
  const ORDER = pinned ? [pinned] : Object.values(SHOWCASE);

  function showcase(ctx, w, h, t) {
    const r = region(w, h);
    const cycle = Math.floor(t / SHOWCASE_PERIOD);
    const p = frac(t / SHOWCASE_PERIOD);
    const fade = pinned ? 1 : Math.max(0, Math.min(1, p / 0.12, (1 - p) / 0.12));
    ctx.save();
    ctx.globalAlpha = fade * r.alpha;
    ORDER[cycle % ORDER.length](ctx, r, pinned ? 0.6 : p, Math.floor(cycle / ORDER.length), t);
    ctx.restore();
  }

  const scenes = {
    // Moving neural network linked to the mouse, with a showcase animation that changes every 3 s
    neural: {
      init(w, h) {
        const n = Math.max(28, Math.min(110, Math.round((w * h) / 9000)));
        return {
          nodes: Array.from({ length: n }, () => ({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
            r: 1.2 + Math.random() * 1.6, c: Math.random() < 0.7 ? CYAN : VIOLET,
            ph: Math.random() * 6.28,
          })),
        };
      },
      draw(ctx, w, h, t, s, mouse) {
        const max = 120;
        for (const n of s.nodes) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
        ctx.lineWidth = 1;
        for (let i = 0; i < s.nodes.length; i++) {
          const a = s.nodes[i];
          for (let j = i + 1; j < s.nodes.length; j++) {
            const b = s.nodes[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < max) {
              ctx.strokeStyle = `rgba(${CYAN},${(1 - d / max) * 0.28})`;
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          }
          const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          if (dm < 170) {
            ctx.strokeStyle = `rgba(${VIOLET},${(1 - dm / 170) * 0.6})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
        for (const n of s.nodes) {
          const glow = 0.55 + 0.45 * Math.sin(t * 1.6 + n.ph);
          ctx.fillStyle = `rgba(${n.c},${0.5 + 0.5 * glow})`;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + glow, 0, 6.28); ctx.fill();
        }
        if (h >= 360) {
          showcase(ctx, w, h, t);
        } else {
          // Short banners on secondary pages: plain ECG trace
          ctx.lineWidth = 2;
          ctx.shadowColor = `rgba(${TEAL},0.9)`; ctx.shadowBlur = 10;
          trace(ctx, w, h * 0.82, Math.min(70, h * 0.12), ecg, 280, t * 110, `rgba(${TEAL},0.75)`, 0, w);
          ctx.shadowBlur = 0;
        }
      },
    },

    // Rotating, tilted DNA double helix among floating particles
    dna: {
      init(w, h) {
        return {
          dust: Array.from({ length: 60 }, () => ({
            x: Math.random() * w, y: Math.random() * h, v: 0.1 + Math.random() * 0.3, r: Math.random() * 1.4 + 0.3,
          })),
        };
      },
      draw(ctx, w, h, t, s, mouse) {
        for (const p of s.dust) {
          p.x -= p.v; if (p.x < 0) p.x = w;
          ctx.fillStyle = `rgba(${CYAN},0.35)`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
        }
        const spacing = 16;
        const amp = Math.min(h * 0.2, 90);
        const pts = [];
        for (let x = -20; x < w + 20; x += spacing) {
          const cy = h * 0.5 + (x - w / 2) * -0.18;
          const near = Math.max(0, 1 - Math.abs(x - mouse.x) / 220);
          const a = x * 0.022 + t * 0.9;
          const A = amp * (1 + 0.25 * near);
          pts.push({ x, y1: cy + A * Math.sin(a), y2: cy + A * Math.sin(a + Math.PI), z: Math.cos(a) });
        }
        ctx.lineWidth = 1.5;
        for (const p of pts) {
          ctx.strokeStyle = `rgba(148,163,184,${0.12 + 0.12 * Math.abs(p.z)})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y1); ctx.lineTo(p.x, p.y2); ctx.stroke();
        }
        for (const p of pts) {
          const k1 = (p.z + 1) / 2, k2 = 1 - k1;
          ctx.fillStyle = `rgba(${CYAN},${0.35 + 0.65 * k1})`;
          ctx.beginPath(); ctx.arc(p.x, p.y1, 2 + 2.5 * k1, 0, 6.28); ctx.fill();
          ctx.fillStyle = `rgba(${VIOLET},${0.35 + 0.65 * k2})`;
          ctx.beginPath(); ctx.arc(p.x, p.y2, 2 + 2.5 * k2, 0, 6.28); ctx.fill();
        }
      },
    },

    // ICU monitor: grid and three swept physiological signals (ECG, respiration, SpO2)
    monitor: {
      init() { return {}; },
      draw(ctx, w, h, t) {
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 24) {
          ctx.strokeStyle = x % 120 === 0 ? "rgba(34,211,238,0.10)" : "rgba(34,211,238,0.04)";
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 24) {
          ctx.strokeStyle = y % 120 === 0 ? "rgba(34,211,238,0.10)" : "rgba(34,211,238,0.04)";
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        const cursor = (t * 140) % w;
        const gap = 36;
        const rows = [
          { label: "ECG", base: h * 0.3, amp: h * 0.13, fn: ecg, period: 230, color: TEAL },
          { label: "RESP", base: h * 0.58, amp: h * 0.07, fn: resp, period: 520, color: CYAN },
          { label: "SpO₂", base: h * 0.86, amp: h * 0.1, fn: pleth, period: 230, color: VIOLET },
        ];
        ctx.lineWidth = 2;
        ctx.font = "600 11px system-ui, sans-serif";
        for (const r of rows) {
          ctx.shadowColor = `rgba(${r.color},0.9)`; ctx.shadowBlur = 8;
          trace(ctx, w, r.base, r.amp, r.fn, r.period, 0, `rgba(${r.color},0.85)`, 0, cursor);
          if (cursor + gap < w) trace(ctx, w, r.base, r.amp, r.fn, r.period, 0, `rgba(${r.color},0.35)`, cursor + gap, w);
          const yHead = r.base - r.amp * r.fn(frac(cursor / r.period));
          ctx.fillStyle = `rgba(${r.color},1)`;
          ctx.beginPath(); ctx.arc(cursor, yHead, 3, 0, 6.28); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(${r.color},0.7)`;
          ctx.fillText(r.label, w - 48, r.base - r.amp - 6);
        }
      },
    },
  };

  function start(canvas, kind) {
    const scene = scenes[kind] || scenes[DEFAULT_BG];
    const ctx = canvas.getContext("2d");
    const mouse = { x: -9999, y: -9999 };
    let w = 0, h = 0, state = null, running = false, onScreen = true;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = scene.init(w, h);
      if (reduceMotion) frame(2000);
    }
    function frame(ms) {
      ctx.clearRect(0, 0, w, h);
      scene.draw(ctx, w, h, ms / 1000, state, mouse);
    }
    function loop(ms) {
      if (!onScreen || document.hidden) { running = false; return; }
      frame(ms);
      requestAnimationFrame(loop);
    }
    function wake() {
      if (!reduceMotion && !running && onScreen && !document.hidden) { running = true; requestAnimationFrame(loop); }
    }

    const host = canvas.parentElement;
    host.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    host.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; wake(); }).observe(canvas);
    document.addEventListener("visibilitychange", wake);
    resize();
    wake();
  }

  const param = new URLSearchParams(location.search).get("bg");
  document.querySelectorAll("canvas.hero-bg").forEach((c) => {
    start(c, c.dataset.bg || (scenes[param] ? param : DEFAULT_BG));
  });
})();
