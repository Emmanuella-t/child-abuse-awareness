/* =========================
   main.js
   Global behaviors for Safeguard
   ========================= */

   (function () {
    "use strict";
  
    // -------------------------
    // Helpers
    // -------------------------
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  
    const STORAGE_KEYS = {
      lang: "safeguard_lang",
      quickExitUsed: "safeguard_quick_exit_used",
    };
  
    // -------------------------
    // Quick Exit
    // Clears session storage and navigates away.
    // Note: We clear sessionStorage only (privacy-first).
    // -------------------------
    function setupQuickExit() {
      const btn = $("#quickExitBtn");
      if (!btn) return;
  
      btn.addEventListener("click", () => {
        try {
          sessionStorage.clear();
          // Optional marker in localStorage to show a subtle note on return
          localStorage.setItem(STORAGE_KEYS.quickExitUsed, "1");
        } catch (e) {
          // No-op if storage is blocked
        }
        // Neutral destination (no suspicion). Google Weather is common.
        window.location.href = "https://www.google.com/search?q=weather";
      });
  
      // Optional keyboard shortcut: Alt + Q (not advertised loudly)
      document.addEventListener("keydown", (e) => {
        if (e.altKey && (e.key === "q" || e.key === "Q")) {
          btn.click();
        }
      });
    }
  
    // -------------------------
    // Mobile Nav
    // -------------------------
    function setupMobileNav() {
      const toggle = $(".nav-toggle");
      const menu = $("#navMenu");
      if (!toggle || !menu) return;
  
      function openMenu() {
        toggle.setAttribute("aria-expanded", "true");
        menu.classList.add("nav-menu--open");
        // Focus first item for keyboard users
        const firstLink = menu.querySelector("a");
        if (firstLink) firstLink.focus();
      }
  
      function closeMenu() {
        toggle.setAttribute("aria-expanded", "false");
        menu.classList.remove("nav-menu--open");
        toggle.focus();
      }
  
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        expanded ? closeMenu() : openMenu();
      });
  
      // Close on Escape
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu.classList.contains("nav-menu--open")) {
          closeMenu();
        }
      });
  
      // Close on outside click
      document.addEventListener("click", (e) => {
        const target = e.target;
        if (!menu.classList.contains("nav-menu--open")) return;
        if (toggle.contains(target) || menu.contains(target)) return;
        closeMenu();
      });
  
      // Close on navigation
      menu.addEventListener("click", (e) => {
        const a = e.target.closest("a");
        if (!a) return;
        closeMenu();
      });
    }
  
    // -------------------------
    // Language / i18n
    // Minimal, safe client-side dictionary
    // -------------------------
    const DICT = {
      en: {
        crisisRibbon: "If you or a child is in immediate danger, call your local emergency number now.",
        crisisButton: "Crisis resources",
        navLearn: "Learn",
        navGetHelp: "Get Help",
        navPlayground: "Playground",
        navPros: "For Professionals",
        navAbout: "About",
        headerCrisis: "Get crisis help",
        homeEyebrow: "A calm place to learn, get support, and take the next safe step.",
        homeTitle: "You deserve safety. You deserve to be heard.",
        homeLead:
          "This site is built for children, survivors, parents, educators, and professionals. If something feels wrong, you’re not overreacting. Let’s find a safe next step.",
        homeCtaHelp: "Help me find support",
        homeCtaPlayground: "Practice what to do",
        homeNote: "Your privacy matters. We do not store personal identities. You can Quick Exit anytime.",
        homePathTitle: "Choose what fits you right now",
        pathChildTitle: "I’m a child",
        pathChildDesc: "I need help or I’m worried about someone.",
        pathSurvivorTitle: "I’m a survivor",
        pathSurvivorDesc: "I want support options and safe resources.",
        pathProTitle: "I’m an educator or professional",
        pathProDesc: "I need mandated reporter guidance and tools.",
        aiTeaserTitle: "SafeGuide AI Companion",
        aiTeaserDesc: "can help you navigate content. It is not counseling and always prioritizes human help in crises.",
        aiTeaserCta: "Open SafeGuide",
        homeLearnTitle: "Learn the signs, without fear-based messaging",
        homeLearnBody:
          "Clear, gentle education on types of abuse, warning signs, and how to talk to children. Written to protect vulnerable readers.",
        homeLearnBullet1: "Types of abuse explained in safe language",
        homeLearnBullet2: "Warning signs and what they can mean",
        homeLearnBullet3: "How to respond without blame",
        homeLearnCta: "Go to Learn",
        homePlayTitle: "Knowledge Playground",
        homePlayBody:
          "Practice realistic situations with “What would you do?” decision trees. Get affirming feedback that teaches, never shames.",
        homePlayBullet1: "Three tiers: Child, Teen/Adult, Professional",
        homePlayBullet2: "Progress tracking and completion states",
        homePlayBullet3: "Professional certificate available",
        homePlayCta: "Start Playground",
        homeHeardTitle: "Heard — an anonymous story wall",
        homeHeardBody:
          "Survivors can share one sentence anonymously. Softly animated. Moderated before public display. No accounts. No public like counts.",
        homeHeardCta: "View Heard",
        homeHeardSubmit: "Submit a sentence",
        analyticsNote: "Privacy-first analytics (Plausible-style) is included as a mock integration. No invasive tracking.",
        footerDisclaimerStrong: "Important:",
        footerDisclaimerBody: "This website provides education and navigation support. It is not a substitute for professional services.",
        footerCrisis: "Crisis resources",
        footerAbout: "About",
        footerPrivacy: "Privacy",
      },
      es: {
        crisisRibbon: "Si tú o un niño están en peligro inmediato, llama ahora al número de emergencias local.",
        crisisButton: "Recursos de crisis",
        navLearn: "Aprender",
        navGetHelp: "Obtener ayuda",
        navPlayground: "Práctica",
        navPros: "Para profesionales",
        navAbout: "Acerca de",
        headerCrisis: "Ayuda de crisis",
        homeEyebrow: "Un lugar tranquilo para aprender, recibir apoyo y dar un paso seguro.",
        homeTitle: "Mereces seguridad. Mereces ser escuchado.",
        homeLead:
          "Este sitio está hecho para niños, sobrevivientes, padres, educadores y profesionales. Si algo se siente mal, no estás exagerando. Busquemos un siguiente paso seguro.",
        homeCtaHelp: "Ayúdame a encontrar apoyo",
        homeCtaPlayground: "Practicar qué hacer",
        homeNote: "Tu privacidad importa. No guardamos identidades personales. Puedes salir rápido en cualquier momento.",
        homePathTitle: "Elige lo que te queda ahora",
        pathChildTitle: "Soy un niño",
        pathChildDesc: "Necesito ayuda o me preocupa alguien.",
        pathSurvivorTitle: "Soy sobreviviente",
        pathSurvivorDesc: "Quiero opciones de apoyo y recursos seguros.",
        pathProTitle: "Soy educador o profesional",
        pathProDesc: "Necesito guía y herramientas de reporte obligatorio.",
        aiTeaserTitle: "Compañero IA SafeGuide",
        aiTeaserDesc: "puede ayudarte a navegar el contenido. No es consejería y prioriza ayuda humana en crisis.",
        aiTeaserCta: "Abrir SafeGuide",
        homeLearnTitle: "Aprende las señales, sin mensajes basados en miedo",
        homeLearnBody:
          "Educación clara y cuidadosa sobre tipos de abuso, señales de alerta y cómo hablar con los niños. Escrito para proteger a lectores vulnerables.",
        homeLearnBullet1: "Tipos de abuso en lenguaje seguro",
        homeLearnBullet2: "Señales de alerta y lo que pueden indicar",
        homeLearnBullet3: "Cómo responder sin culpar",
        homeLearnCta: "Ir a Aprender",
        homePlayTitle: "Práctica de Conocimiento",
        homePlayBody:
          "Practica situaciones reales con decisiones de “¿Qué harías?”. Retroalimentación afirmativa que enseña, nunca avergüenza.",
        homePlayBullet1: "Tres niveles: Niños, Adolescentes/Adultos, Profesional",
        homePlayBullet2: "Progreso y estados de finalización",
        homePlayBullet3: "Certificado profesional disponible",
        homePlayCta: "Empezar práctica",
        homeHeardTitle: "Heard — muro anónimo de historias",
        homeHeardBody:
          "Los sobrevivientes pueden compartir una oración de forma anónima. Animación suave. Moderación antes de publicar. Sin cuentas. Sin conteos públicos.",
        homeHeardCta: "Ver Heard",
        homeHeardSubmit: "Enviar una oración",
        analyticsNote: "Analítica privada (estilo Plausible) incluida como integración simulada. Sin rastreo invasivo.",
        footerDisclaimerStrong: "Importante:",
        footerDisclaimerBody: "Este sitio ofrece educación y orientación. No sustituye servicios profesionales.",
        footerCrisis: "Recursos de crisis",
        footerAbout: "Acerca de",
        footerPrivacy: "Privacidad",
      },
    };
  
    function applyLanguage(lang) {
      const safeLang = DICT[lang] ? lang : "en";
      document.documentElement.lang = safeLang;
      document.documentElement.setAttribute("data-lang", safeLang);
  
      // Update toggle aria-pressed
      $$(".lang-toggle button").forEach((b) => {
        b.setAttribute("aria-pressed", b.dataset.lang === safeLang ? "true" : "false");
      });
  
      // Translate marked nodes
      $$("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const val = DICT[safeLang][key];
        if (typeof val === "string") el.textContent = val;
      });
  
      try {
        localStorage.setItem(STORAGE_KEYS.lang, safeLang);
      } catch (e) {
        // ignore
      }
    }
  
    function setupLanguageToggle() {
      const buttons = $$(".lang-toggle button");
      if (!buttons.length) return;
  
      let initial = "en";
      try {
        initial = localStorage.getItem(STORAGE_KEYS.lang) || "en";
      } catch (e) {
        // ignore
      }
  
      applyLanguage(initial);
  
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => applyLanguage(btn.dataset.lang));
      });
    }
  
    // -------------------------
    // Service worker for PWA
    // -------------------------
    function setupServiceWorker() {
      if (!("serviceWorker" in navigator)) return;
  
      window.addEventListener("load", async () => {
        try {
          await navigator.serviceWorker.register("/sw.js");
        } catch (err) {
          // Silent fail. PWA is helpful, but not critical.
        }
      });
    }
  
    // -------------------------
    // Privacy-first analytics mock
    // -------------------------
    function setupAnalyticsMock() {
      // This is a placeholder. In production you can swap with Plausible.
      // No cookies. No PII. Just basic pageview + button events.
      window.safeguardAnalytics = {
        track(eventName, props = {}) {
          try {
            // Anonymous, local-only log for dev. In prod, send to your privacy-first endpoint.
            // IMPORTANT: never send free-text user input here.
            console.info("[analytics]", eventName, props);
          } catch (e) {
            // ignore
          }
        },
      };
  
      // Track a basic pageview
      window.safeguardAnalytics.track("pageview", { path: location.pathname });
    }
  
    // -------------------------
    // Global anonymous error capture (dev-friendly)
    // No PII. No input content captured.
    // -------------------------
    function setupGlobalErrorCapture() {
      window.addEventListener("error", (e) => {
        try {
          console.warn("[error]", {
            message: e.message,
            file: e.filename,
            line: e.lineno,
            col: e.colno,
          });
        } catch (_) {}
      });
  
      window.addEventListener("unhandledrejection", (e) => {
        try {
          console.warn("[unhandledrejection]", { reason: String(e.reason) });
        } catch (_) {}
      });
    }
  
    // -------------------------
    // Init
    // -------------------------
    setupQuickExit();
    setupMobileNav();
    setupLanguageToggle();
    setupServiceWorker();
    setupAnalyticsMock();
    setupGlobalErrorCapture();
  })();