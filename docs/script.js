const THEME_KEY = "kanban.theme.v1";

const themeToggleButton = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const themeLabel = document.getElementById("theme-label");

initTheme();
setupCopyButtons();
setupActiveSectionNav();
setupChangelogToggle();

themeToggleButton?.addEventListener("click", toggleTheme);

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(stored === "light" ? "light" : "dark");
}

function toggleTheme() {
  const isDark = document.body.classList.contains("dark");
  applyTheme(isDark ? "light" : "dark");
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");

  if (themeIcon) themeIcon.textContent = isDark ? "dark_mode" : "light_mode";
  if (themeLabel) themeLabel.textContent = isDark ? "Dark" : "Light";
  if (themeToggleButton) themeToggleButton.setAttribute("aria-pressed", String(isDark));
}

function setupCopyButtons() {
  const codeBlocks = document.querySelectorAll(".doc-card pre > code");
  codeBlocks.forEach((code) => {
    const pre = code.parentElement;
    if (!pre || pre.parentElement?.classList.contains("code-wrap")) return;

    const wrap = document.createElement("div");
    wrap.className = "code-wrap";
    pre.parentElement.insertBefore(wrap, pre);
    wrap.appendChild(pre);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-btn";
    button.textContent = "Copy";

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.textContent || "");
        const old = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = old;
        }, 1200);
      } catch {
        const old = button.textContent;
        button.textContent = "Error";
        setTimeout(() => {
          button.textContent = old;
        }, 1200);
      }
    });

    wrap.appendChild(button);
  });
}

function setupActiveSectionNav() {
  const links = Array.from(document.querySelectorAll('.doc-nav a[href^="#"]'));
  if (links.length === 0) return;
  let lockedActiveLink = null;
  let unlockTimerId = null;

  const bySection = links
    .map((link) => {
      const selector = link.getAttribute("href");
      if (!selector) return null;
      const section = document.querySelector(selector);
      if (!section) return null;
      return { link, section };
    })
    .filter(Boolean);

  if (bySection.length === 0) return;

  function setActive(targetLink) {
    links.forEach((l) => l.classList.remove("active"));
    targetLink.classList.add("active");
  }

  function updateActiveByScroll() {
    if (lockedActiveLink) return;

    const offset = 140;
    let active = bySection[0];

    bySection.forEach((entry) => {
      const top = entry.section.getBoundingClientRect().top;
      if (top - offset <= 0) {
        active = entry;
      }
    });

    if (active) setActive(active.link);
  }

  function lockActive(link) {
    lockedActiveLink = link;
    if (unlockTimerId) {
      clearTimeout(unlockTimerId);
    }
    unlockTimerId = setTimeout(() => {
      lockedActiveLink = null;
      updateActiveByScroll();
    }, 900);
  }

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setActive(link);
      lockActive(link);

      const selector = link.getAttribute("href");
      if (!selector) return;
      const target = document.querySelector(selector);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  window.addEventListener("scrollend", () => {
    if (!lockedActiveLink) return;
    lockedActiveLink = null;
    updateActiveByScroll();
  });

  window.addEventListener("scroll", updateActiveByScroll, { passive: true });
  updateActiveByScroll();
}

function setupChangelogToggle() {
  const button = document.getElementById("changelogs-toggle");
  const content = document.getElementById("changelogs-content");
  if (!button || !content) return;

  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    const nextExpanded = !expanded;
    button.setAttribute("aria-expanded", String(nextExpanded));
    button.textContent = nextExpanded ? "Ocultar" : "Mostrar";
    content.hidden = !nextExpanded;
  });
}
