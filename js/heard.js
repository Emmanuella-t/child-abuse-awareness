/* =========================
   heard.js
   "Heard" anonymous story wall
   - Floating cards on dark canvas
   - Private "This resonates" (no public counts)
   - Submission -> Netlify Function
   - Moderation queue -> Netlify Function
   - Safe validation (one sentence, no PII)
   ========================= */

   (function () {
    "use strict";
  
    const $ = (sel, root = document) => root.querySelector(sel);
  
    const ENDPOINTS = {
      list: "/.netlify/functions/heard-list",
      submit: "/.netlify/functions/heard-submit",
      queue: "/.netlify/functions/heard-queue",
      moderate: "/.netlify/functions/heard-moderate",
    };
  
    const RESONATES_KEY = "safeguard_heard_resonates_v1";
  
    const prefersReducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
    // -------------------------
    // Safety validation helpers
    // -------------------------
    const PII_PATTERNS = [
      /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, // SSN-like
      /\b\d{10}\b/g, // 10-digit number
      /\b(\+?\d{1,2}[\s-]?)?(\(?\d{3}\)?[\s-]?)\d{3}[\s-]?\d{4}\b/g, // phone
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // email
      /\b\d{1,5}\s+\w+(\s+\w+){0,3}\s+(st|street|ave|avenue|rd|road|blvd|lane|ln|dr|drive)\b/gi, // rough address
    ];
  
    const TOO_GRAPHIC = [
      "rape",
      "molest",
      "penetrat",
      "forced",
      "blood",
      "graphic",
    ];
  
    function hasPII(text) {
      return PII_PATTERNS.some((re) => re.test(text));
    }
  
    function looksGraphic(text) {
      const t = String(text).toLowerCase();
      return TOO_GRAPHIC.some((w) => t.includes(w));
    }
  
    function isOneSentence(text) {
      // One sentence: allow 0-1 terminal punctuation marks.
      // Prevent long multi-sentence.
      const t = String(text).trim();
      const hits = (t.match(/[.!?]/g) || []).length;
      return hits <= 1;
    }
  
    function sanitizeText(text) {
      return String(text)
        .replace(/\s+/g, " ")
        .trim();
    }
  
    function escapeHTML(str) {
      return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
  
    async function postJSON(url, payload) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Request failed (${res.status}). ${msg}`);
      }
      return res.json();
    }
  
    async function getJSON(url) {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Request failed (${res.status}). ${msg}`);
      }
      return res.json();
    }
  
    // -------------------------
    // Resonates (local only)
    // -------------------------
    function loadResonatesSet() {
      try {
        const raw = localStorage.getItem(RESONATES_KEY);
        if (!raw) return new Set();
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return new Set();
        return new Set(arr);
      } catch (_) {
        return new Set();
      }
    }
  
    function saveResonatesSet(set) {
      try {
        localStorage.setItem(RESONATES_KEY, JSON.stringify(Array.from(set)));
      } catch (_) {}
    }
  
    // -------------------------
    // Floating wall
    // -------------------------
    function createCard(story, resonatesSet) {
      const card = document.createElement("div");
      card.className = "heard-float-card";
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "article");
  
      const id = story.id || `${Math.random()}`;
      const tag = story.tag || "theme";
      const text = story.text || "";
      const tone = story.tone || "gentle";
  
      const isResonated = resonatesSet.has(id);
  
      card.innerHTML = `
        <div class="heard-float-card__meta">
          <span class="chip chip--dark">${escapeHTML(formatTag(tag))}</span>
          <span class="chip chip--dark chip--tone">${escapeHTML(tone)}</span>
        </div>
        <p class="heard-float-card__text">“${escapeHTML(text)}”</p>
        <button class="btn btn--small btn--ghost btn--ghost-dark heard-resonate-btn" type="button" aria-pressed="${isResonated}">
          ${isResonated ? "Resonates (saved)" : "This resonates"}
        </button>
      `;
  
      // Private resonate
      const resonateBtn = card.querySelector(".heard-resonate-btn");
      resonateBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const now = resonateBtn.getAttribute("aria-pressed") === "true";
        const next = !now;
  
        resonateBtn.setAttribute("aria-pressed", String(next));
        resonateBtn.textContent = next ? "Resonates (saved)" : "This resonates";
  
        if (next) resonatesSet.add(id);
        else resonatesSet.delete(id);
  
        saveResonatesSet(resonatesSet);
      });
  
      // Pause on click
      card.addEventListener("click", () => {
        card.classList.toggle("is-paused");
      });
  
      // Keyboard pause
      card.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          card.classList.toggle("is-paused");
        }
      });
  
      return card;
    }
  
    function formatTag(tag) {
      const map = {
        i_was_believed: "I was believed",
        it_wasnt_my_fault: "It wasn’t my fault",
        i_found_help: "I found help",
        i_am_healing: "I am healing",
        someone_listened: "Someone listened",
      };
      return map[tag] || tag;
    }
  
    function placeCardRandomly(card, canvas) {
      const pad = 24;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
  
      const x = Math.max(pad, Math.floor(Math.random() * (w - pad * 2)));
      const y = Math.max(pad, Math.floor(Math.random() * (h - pad * 2)));
  
      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
  
      // Random drift vector, very gentle
      const vx = (Math.random() - 0.5) * 0.18; // px per frame-ish
      const vy = (Math.random() - 0.5) * 0.14;
  
      card.dataset.vx = String(vx);
      card.dataset.vy = String(vy);
  
      // Random float animation delay
      card.style.animationDelay = `${Math.random() * 1.5}s`;
    }
  
    function animateCards(canvas) {
      if (prefersReducedMotion) return;
  
      const cards = Array.from(canvas.querySelectorAll(".heard-float-card"));
      const tick = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
  
        cards.forEach((card) => {
          if (card.classList.contains("is-paused")) return;
  
          const vx = parseFloat(card.dataset.vx || "0");
          const vy = parseFloat(card.dataset.vy || "0");
  
          const rect = card.getBoundingClientRect();
          const cRect = canvas.getBoundingClientRect();
  
          // Current pos relative to canvas
          const x = rect.left - cRect.left;
          const y = rect.top - cRect.top;
  
          let nx = x + vx;
          let ny = y + vy;
  
          // bounce softly
          const margin = 14;
          if (nx < margin || nx > w - rect.width - margin) {
            card.dataset.vx = String(-vx);
            nx = Math.max(margin, Math.min(w - rect.width - margin, nx));
          }
          if (ny < margin || ny > h - rect.height - margin) {
            card.dataset.vy = String(-vy);
            ny = Math.max(margin, Math.min(h - rect.height - margin, ny));
          }
  
          card.style.left = `${nx}px`;
          card.style.top = `${ny}px`;
        });
  
        window.requestAnimationFrame(tick);
      };
  
      window.requestAnimationFrame(tick);
    }
  
    async function loadApprovedStories(canvas) {
      // Fallback sample stories if endpoint fails (for local dev demo)
      const fallback = [
        { id: "s1", tag: "i_was_believed", tone: "steady", text: "I was believed, and that changed everything." },
        { id: "s2", tag: "it_wasnt_my_fault", tone: "gentle", text: "It wasn’t my fault, even if it felt like it was." },
        { id: "s3", tag: "someone_listened", tone: "hopeful", text: "Someone listened without rushing me." },
        { id: "s4", tag: "i_am_healing", tone: "steady", text: "Healing looks small some days, but it is real." },
      ];
  
      let stories = fallback;
  
      try {
        const data = await getJSON(ENDPOINTS.list);
        if (Array.isArray(data?.stories) && data.stories.length) {
          stories = data.stories;
        }
      } catch (_) {}
  
      // Render
      canvas.innerHTML = "";
      const resonatesSet = loadResonatesSet();
  
      stories.slice(0, 18).forEach((s) => {
        const card = createCard(s, resonatesSet);
        canvas.appendChild(card);
        placeCardRandomly(card, canvas);
      });
  
      // Start animation
      animateCards(canvas);
    }
  
    // -------------------------
    // Submission
    // -------------------------
    function setupSubmission() {
      const form = $("#heardSubmitForm");
      const sentence = $("#heardSentence");
      const tag = $("#heardTag");
      const tone = $("#heardTone");
      const status = $("#heardSubmitStatus");
  
      if (!form || !sentence || !tag || !status) return;
  
      function setStatus(kind, msg) {
        status.style.display = "block";
        status.className =
          kind === "ok" ? "alert alert--info" : kind === "warn" ? "alert alert--warning" : "alert alert--crisis";
        status.innerHTML = `<p class="small" style="margin:0;">${escapeHTML(msg)}</p>`;
      }
  
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const textRaw = sanitizeText(sentence.value);
        const tagVal = tag.value;
        const toneVal = tone?.value || "gentle";
  
        if (!textRaw) {
          setStatus("warn", "Please write one short sentence.");
          return;
        }
  
        if (textRaw.length < 8) {
          setStatus("warn", "Please add a little more so it reads as a complete sentence.");
          return;
        }
  
        if (!isOneSentence(textRaw)) {
          setStatus("warn", "Please keep it to one sentence only.");
          return;
        }
  
        if (hasPII(textRaw)) {
          setStatus("warn", "Please remove identifying details like phone numbers, emails, or addresses.");
          return;
        }
  
        if (looksGraphic(textRaw)) {
          setStatus("warn", "Please remove graphic details. Keep it safe and general.");
          return;
        }
  
        // Post to server function
        setStatus("ok", "Submitting for review…");
  
        try {
          await postJSON(ENDPOINTS.submit, {
            text: textRaw,
            tag: tagVal,
            tone: toneVal,
          });
  
          sentence.value = "";
          setStatus("ok", "Submitted. Thank you. Your sentence will appear after moderation.");
        } catch (err) {
          setStatus("warn", "Could not submit right now. Please try again later.");
        }
      });
    }
  
    // -------------------------
    // Admin moderation (demo UI)
    // -------------------------
    function setupAdminPanel() {
      const toggleBtn = $("#toggleAdminBtn");
      const closeBtn = $("#closeAdminBtn");
      const panel = $("#adminPanel");
      const passInput = $("#adminPass");
      const loadBtn = $("#loadQueueBtn");
      const queueWrap = $("#moderationQueue");
      const queueStatus = $("#queueStatus");
  
      if (!toggleBtn || !panel || !loadBtn || !queueWrap || !queueStatus) return;
  
      function setQueueStatus(kind, msg) {
        queueStatus.style.display = "block";
        queueStatus.className = kind === "ok" ? "alert alert--info" : "alert alert--warning";
        queueStatus.innerHTML = `<p class="small" style="margin:0;">${escapeHTML(msg)}</p>`;
      }
  
      toggleBtn.addEventListener("click", () => {
        panel.style.display = panel.style.display === "none" ? "block" : "none";
        if (panel.style.display === "block") panel.scrollIntoView({ behavior: "smooth" });
      });
  
      closeBtn?.addEventListener("click", () => {
        panel.style.display = "none";
      });
  
      function renderQueue(items, adminPass) {
        queueWrap.innerHTML = "";
  
        if (!items.length) {
          queueWrap.innerHTML = `<div class="alert alert--info"><p class="small" style="margin:0;">Queue is empty.</p></div>`;
          return;
        }
  
        items.forEach((item) => {
          const card = document.createElement("div");
          card.className = "card";
          card.style.background = "rgba(250,248,245,0.96)";
          card.style.border = "1px solid rgba(196,189,181,0.6)";
          card.style.boxShadow = "none";
          card.style.marginTop = "12px";
  
          card.innerHTML = `
            <div class="row" style="justify-content: space-between; align-items:center; margin-top:0;">
              <span class="chip chip--teal">${escapeHTML(formatTag(item.tag || "theme"))}</span>
              <span class="small">ID: ${escapeHTML(item.id || "")}</span>
            </div>
            <p style="margin:12px 0 10px;"><strong>“${escapeHTML(item.text || "")}”</strong></p>
            <p class="small" style="margin:0 0 14px;">Tone: ${escapeHTML(item.tone || "gentle")}</p>
            <div class="row">
              <button class="btn btn--secondary" type="button" data-action="approve">Approve</button>
              <button class="btn btn--ghost" type="button" data-action="reject">Reject</button>
            </div>
          `;
  
          const approve = card.querySelector('[data-action="approve"]');
          const reject = card.querySelector('[data-action="reject"]');
  
          async function moderate(action) {
            try {
              setQueueStatus("ok", "Updating…");
              await postJSON(ENDPOINTS.moderate, {
                adminPass,
                id: item.id,
                action,
              });
              card.remove();
              setQueueStatus("ok", `Item ${action}d.`);
            } catch (err) {
              setQueueStatus("warn", "Could not update item. Check admin settings.");
            }
          }
  
          approve.addEventListener("click", () => moderate("approve"));
          reject.addEventListener("click", () => moderate("reject"));
  
          queueWrap.appendChild(card);
        });
      }
  
      loadBtn.addEventListener("click", async () => {
        const adminPass = (passInput?.value || "").trim();
        if (!adminPass) {
          setQueueStatus("warn", "Enter the admin passphrase first.");
          return;
        }
  
        setQueueStatus("ok", "Loading queue…");
  
        try {
          const data = await postJSON(ENDPOINTS.queue, { adminPass });
          const items = Array.isArray(data?.queue) ? data.queue : [];
          renderQueue(items, adminPass);
          setQueueStatus("ok", "Queue loaded.");
        } catch (err) {
          setQueueStatus("warn", "Could not load queue. Check passphrase and server function setup.");
        }
      });
    }
  
    // -------------------------
    // Init
    // -------------------------
    async function init() {
      const canvas = $("#heardCanvas");
      if (canvas) {
        await loadApprovedStories(canvas);
        // Re-place cards on resize for better bounds
        window.addEventListener("resize", () => {
          Array.from(canvas.querySelectorAll(".heard-float-card")).forEach((card) => placeCardRandomly(card, canvas));
        });
      }
  
      setupSubmission();
      setupAdminPanel();
    }
  
    init();
  })();