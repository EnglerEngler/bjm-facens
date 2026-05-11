const APP_URL = "https://COLOCAR-LINK-DA-APLICACAO-VERCEL-AQUI";
const FORM_URL = "https://forms.gle/TurChnHe3JHtMyYw6";

const setLinkTargets = () => {
  document.querySelectorAll("[data-app-link]").forEach((link) => {
    link.setAttribute("href", APP_URL);
  });

  document.querySelectorAll("[data-form-link]").forEach((link) => {
    link.setAttribute("href", FORM_URL);
  });
};

const setupMobileMenu = () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");

  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
};

const setupReveal = () => {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  items.forEach((item) => observer.observe(item));
};

const setCurrentYear = () => {
  const year = document.getElementById("current-year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
};

setLinkTargets();
setupMobileMenu();
setupReveal();
setCurrentYear();
