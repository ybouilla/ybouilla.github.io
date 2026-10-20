(function () {
  const lang = document.documentElement.lang === "en" ? "en" : "fr";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Apparition des blocs au défilement
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
    }
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // Rotation des intitulés de poste dans le bandeau
  const roleEl = document.querySelector("[data-roles]");
  if (roleEl && !reduceMotion) {
    const roles = JSON.parse(roleEl.dataset.roles);
    let i = 0;
    setInterval(() => {
      roleEl.classList.add("swap");
      setTimeout(() => {
        i = (i + 1) % roles.length;
        roleEl.textContent = roles[i];
        roleEl.classList.remove("swap");
      }, 350);
    }, 2600);
  }

  // Compteurs animés
  const counters = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      counters.unobserve(e.target);
      const target = Number(e.target.dataset.count);
      if (reduceMotion) { e.target.textContent = target; continue; }
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 1200);
        e.target.textContent = Math.round(target * (1 - (1 - k) ** 3));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  });
  document.querySelectorAll("[data-count]").forEach((el) => counters.observe(el));

  // Filtres de la page Projets
  const buttons = document.querySelectorAll(".filters button");
  const cards = document.querySelectorAll("#projects .card");
  buttons.forEach((btn) => btn.addEventListener("click", () => {
    const f = btn.dataset.filter;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    cards.forEach((c) => { c.hidden = f !== "all" && !c.dataset.cat.split(" ").includes(f); });
  }));

  // Données GitHub en direct : étoiles et date de dernière mise à jour de chaque dépôt
  const metas = document.querySelectorAll(".gh-meta[data-repo]");
  if (metas.length) {
    const fmt = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", { month: "short", year: "numeric" });
    const label = lang === "en" ? "updated" : "mis à jour";
    const show = (repo) => {
      document.querySelectorAll(`.gh-meta[data-repo="${repo.full_name}"]`).forEach((el) => {
        const stars = repo.stargazers_count > 0 ? `★ ${repo.stargazers_count} · ` : "";
        el.textContent = `${stars}${label} ${fmt.format(new Date(repo.pushed_at))}`;
      });
    };
    const get = (url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
    get("https://api.github.com/users/ybouilla/repos?per_page=100")
      .then((repos) => repos.forEach(show))
      .catch(() => {});
    if (document.querySelector('.gh-meta[data-repo="fedbiomed/fedbiomed"]')) {
      get("https://api.github.com/repos/fedbiomed/fedbiomed").then(show).catch(() => {});
    }
  }
})();
