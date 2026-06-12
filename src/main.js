const menuButton = document.querySelector("[data-menu-button]");
const mobileMenu = document.querySelector("[data-mobile-menu]");

function setMenu(open) {
  if (!menuButton || !mobileMenu) return;
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute(
    "aria-label",
    open ? "Close mobile navigation" : "Open mobile navigation"
  );
  mobileMenu.hidden = !open;
  document.body.classList.toggle("menu-open", open);
}

menuButton?.addEventListener("click", () => {
  setMenu(menuButton.getAttribute("aria-expanded") !== "true");
});

mobileMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

const header = document.querySelector("[data-header]");
const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 12);
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const reveals = document.querySelectorAll(".reveal");

if (reduceMotion || !("IntersectionObserver" in window)) {
  reveals.forEach((element) => element.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px" }
  );
  reveals.forEach((element) => observer.observe(element));
}

const gameWindow = document.querySelector("[data-game-window]");
const fullscreenButton = document.querySelector("[data-fullscreen-button]");

function setPageFullscreen(active) {
  if (!gameWindow) return;
  gameWindow.classList.toggle("is-page-fullscreen", active);
  document.body.classList.toggle("game-fullscreen-open", active);
}

function updateFullscreenButton() {
  if (!fullscreenButton || !gameWindow) return;
  const isFullscreen =
    document.fullscreenElement === gameWindow ||
    gameWindow.classList.contains("is-page-fullscreen");
  fullscreenButton.setAttribute("aria-pressed", String(isFullscreen));
  fullscreenButton.setAttribute(
    "aria-label",
    isFullscreen ? "Exit game full screen" : "Enter game full screen"
  );
  fullscreenButton.innerHTML = isFullscreen
    ? 'Exit full screen <span aria-hidden="true">×</span>'
    : 'Full screen <span aria-hidden="true">⛶</span>';
}

if (fullscreenButton && gameWindow) {
  fullscreenButton.addEventListener("click", async () => {
    if (document.fullscreenElement === gameWindow) {
      await document.exitFullscreen();
      return;
    }

    if (gameWindow.classList.contains("is-page-fullscreen")) {
      setPageFullscreen(false);
      updateFullscreenButton();
      return;
    }

    try {
      if (document.fullscreenEnabled && gameWindow.requestFullscreen) {
          await gameWindow.requestFullscreen();
      } else {
        setPageFullscreen(true);
      }
    } catch {
      setPageFullscreen(true);
    }
    updateFullscreenButton();
  });

  document.addEventListener("fullscreenchange", updateFullscreenButton);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && gameWindow.classList.contains("is-page-fullscreen")) {
      setPageFullscreen(false);
      updateFullscreenButton();
    }
  });
  updateFullscreenButton();
}

const year = document.querySelector("[data-year]");
if (year) year.textContent = new Date().getFullYear().toString();
