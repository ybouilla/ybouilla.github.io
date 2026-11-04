// Opening animation of the home pages, played once per browser session: the animation runs,
// fades out while the profile appears under the name, then the name moves onto the page title
// while the rest of the page fades in.
// To change it, edit INTRO_STYLE: "signal" (heartbeat line) or "graph" (network of nodes).
// To preview it again without editing anything, add ?intro=signal or ?intro=graph to the page URL.
(function () {
  const INTRO_STYLE = "graph";
  const DURATION = 5000;      // animation, in milliseconds
  const PROFILE_TIME = 2800;  // how long the profile stays on screen, including its fade-in
  const FLIGHT = 1000;        // move of the name onto the page title (same value as in style.css)
  const PROFILE = {
    en: "Data Scientist · AI Engineer<small>Machine Learning and generative AI for healthcare data</small>",
    fr: "Data Scientist · Ingénieur IA<small>Machine Learning et IA générative pour les données de santé</small>",
  };

  const forced = new URLSearchParams(location.search).get("intro");
  const style = forced === "graph" || forced === "signal" ? forced : INTRO_STYLE;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // sessionStorage can be blocked: the animation then simply plays on each page
  try {
    if (!forced && sessionStorage.getItem("introSeen")) return;
    sessionStorage.setItem("introSeen", "1");
  } catch (e) { /* nothing to remember */ }

  const CYAN = "34,211,238";
  const VIOLET = "167,139,250";

  const gauss = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
  // Stylized heartbeat (P wave, QRS complex, T wave) over one period [0, 1)
  const ecg = (p) =>
    0.12 * gauss(p, 0.14, 0.025) - 0.12 * gauss(p, 0.245, 0.008) + gauss(p, 0.27, 0.01)
    - 0.25 * gauss(p, 0.295, 0.01) + 0.25 * gauss(p, 0.48, 0.04);

  const overlay = document.createElement("div");
  overlay.className = "intro";
  overlay.setAttribute("aria-hidden", "true");
  const lang = document.documentElement.lang === "en" ? "en" : "fr";
  overlay.innerHTML = '<canvas></canvas><div class="intro-text"><p class="intro-name">Yannick <span>Bouillard</span></p>'
    + `<p class="intro-profile">${PROFILE[lang]}</p></div>`;
  // The body does not exist yet: this script runs in the <head>, so nothing shows before the overlay
  document.documentElement.appendChild(overlay);

  const canvas = overlay.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  function drawSignal(k) {
    const base = h * 0.46;
    const amp = Math.min(h * 0.2, 130);
    const period = Math.max(w / 3, 220);
    const head = w * k;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(${CYAN},0.95)`;
    ctx.shadowColor = `rgba(${CYAN},0.8)`;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    let y = base;
    for (let x = 0; x <= head; x += 2) {
      y = base - amp * ecg((x / period) % 1);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(head, y, 3.5, 0, 6.28); ctx.fill();
  }

  // Nodes are placed once, on a ring above the name, each linked to its next two neighbours
  const nodes = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * 6.28 + Math.random() * 0.3;
    const r = 0.65 + Math.random() * 0.35;
    return { x: w / 2 + Math.cos(a) * r * Math.min(w * 0.42, 420), y: h * 0.34 + Math.sin(a) * r * h * 0.26 };
  });

  function drawGraph(k) {
    nodes.forEach((a, i) => {
      const start = (i / nodes.length) * 0.7;
      const s = Math.max(0, Math.min(1, (k - start) / 0.3));
      if (!s) return;
      [1, 2].forEach((step) => {
        const b = nodes[(i + step) % nodes.length];
        ctx.strokeStyle = `rgba(${step === 1 ? CYAN : VIOLET},0.5)`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + (b.x - a.x) * s, a.y + (b.y - a.y) * s);
        ctx.stroke();
      });
      ctx.fillStyle = `rgba(${CYAN},${s})`;
      ctx.beginPath(); ctx.arc(a.x, a.y, 2 + 3 * s, 0, 6.28); ctx.fill();
    });
  }

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    const title = document.querySelector(".hero h1");
    const range = document.createRange();
    if (title) range.selectNodeContents(title);
    // No title to land on, or a title on several lines: a plain fade
    if (!title || range.getClientRects().length !== 1) {
      overlay.classList.add("done");
      setTimeout(() => overlay.remove(), 800);
      return;
    }
    // Freeze the text where it is, in case the visitor skips while it is still moving
    const text = overlay.querySelector(".intro-text");
    const name = overlay.querySelector(".intro-name");
    text.style.transform = getComputedStyle(text).transform;
    text.style.transition = "none";
    name.style.animation = "none";
    const from = name.getBoundingClientRect();
    const to = range.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    title.style.visibility = "hidden";
    overlay.classList.add("landing");
    name.style.transform = `translate(${dx}px, ${dy}px) scale(${to.width / from.width})`;
    setTimeout(() => {
      title.style.visibility = "";
      overlay.remove();
    }, FLIGHT);
  }

  let t0 = null;
  function frame(now) {
    if (closed) return;
    if (t0 === null) t0 = now;
    const k = Math.min(1, (now - t0) / DURATION);
    ctx.clearRect(0, 0, w, h);
    (style === "graph" ? drawGraph : drawSignal)(k);
    if (k < 1) requestAnimationFrame(frame);
    else {
      overlay.classList.add("profile");
      setTimeout(close, PROFILE_TIME);
    }
  }
  requestAnimationFrame(frame);

  // Visitors can skip it, and it can never stay on screen if animation frames are paused
  overlay.addEventListener("click", close);
  window.addEventListener("keydown", close, { once: true });
  setTimeout(close, DURATION + PROFILE_TIME + 1500);
})();
