/* =========================
   ai.js
   AI-powered features (client)
   - SafeGuide AI Companion UI
   - Resource Matcher UI
   - Content Sentiment Guard (client-first)
   IMPORTANT: API key is NEVER in browser.
   This file calls Netlify Functions endpoints instead.
   ========================= */

   (function () {
    "use strict";
  
    const $ = (sel, root = document) => root.querySelector(sel);
  
    // -------------------------
    // Configuration (client-safe)
    // -------------------------
    const ENDPOINTS = {
      safeguide: "/.netlify/functions/claude-safeguide",
      resources: "/.netlify/functions/claude-resource-matcher",
      sentiment: "/.netlify/functions/claude-sentiment-guard",
      learningPath: "/.netlify/functions/claude-learning-path",
    };
  
    // Non-negotiable message shown with every AI response
    const AI_DISCLAIMER =
      "This is not a substitute for professional support. If someone is in immediate danger, contact local emergency services now.";
  
    // -------------------------
    // Content Sentiment Guard
    // Client-first heuristic checks for distress / danger signals.
    // If triggered: show crisis CTA immediately and pause AI.
    // -------------------------
    const DISTRESS_PATTERNS = [
      // danger / immediate
      "in danger",
      "immediate danger",
      "hurt right now",
      "he is hurting me",
      "she is hurting me",
      "someone is hurting",
      "unsafe right now",
      "i am not safe",
      "threat",
      "weapon",
      // self-harm / hopelessness signals (we do not counsel; we escalate)
      "i want to die",
      "kill myself",
      "self harm",
      "self-harm",
      "suicide",
      "end it",
      "i can't go on",
      // abuse hints (we still keep tone safe)
      "touching me",
      "grooming",
      "molest",
      "rape",
      "forced",
    ];
  
    function looksDistressed(text) {
      if (!text) return false;
      const t = String(text).toLowerCase();
      return DISTRESS_PATTERNS.some((p) => t.includes(p));
    }
  
    function showCrisisNudge() {
      // Scroll user to crisis section if present
      const crisis = document.getElementById("crisis");
      if (crisis) {
        crisis.scrollIntoView({ behavior: "smooth", block: "start" });
      }
  
      // Create or update a visible alert near AI panel
      const aiPanel = document.querySelector(".ai-panel");
      if (!aiPanel) return;
  
      let alert = document.getElementById("sentimentCrisisAlert");
      if (!alert) {
        alert = document.createElement("div");
        alert.id = "sentimentCrisisAlert";
        alert.className = "alert alert--crisis";
        alert.setAttribute("role", "alert");
        alert.style.marginBottom = "16px";
        aiPanel.parentElement.insertBefore(alert, aiPanel);
      }
  
      alert.innerHTML = `
        <p class="small" style="margin:0;">
          Your message sounds like it may involve danger or urgent harm.
          <strong>Please use crisis resources now.</strong>
          ${AI_DISCLAIMER}
        </p>
        <div class="row" style="margin-top: 12px;">
          <a class="btn btn--coral" href="#crisis">Go to crisis resources</a>
          <a class="btn btn--ghost" href="https://www.google.com/search?q=weather">Quick Exit</a>
        </div>
      `;
    }
  
    // -------------------------
    // Safe fetch wrapper (no PII logging)
    // -------------------------
    async function postJSON(url, payload) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Never include credentials; keep it privacy-first
        body: JSON.stringify(payload),
      });
  
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Request failed (${res.status}). ${msg}`);
      }
      return res.json();
    }
  
    // -------------------------
    // SafeGuide Chat
    // -------------------------
    function setupSafeGuide() {
      const form = $("#aiChatForm");
      const input = $("#aiInput");
      const messages = $("#aiMessages");
      const clearBtn = $("#clearAiChatBtn");
  
      if (!form || !input || !messages) return;
  
      // Session-only chat history (never persisted)
      const chat = [];
  
      function addMessage(role, text) {
        const node = document.createElement("div");
        node.className = `ai-message ai-message--${role === "user" ? "user" : "assistant"}`;
        node.textContent = text;
        messages.appendChild(node);
        messages.scrollTop = messages.scrollHeight;
      }
  
      function addAssistantBlock(text) {
        // Always append disclaimer
        addMessage("assistant", `${text}\n\n${AI_DISCLAIMER}`);
      }
  
      function clearChatUI() {
        messages.innerHTML = "";
        chat.length = 0;
        try {
          sessionStorage.removeItem("safeguard_chat"); // just in case; we do not rely on it
        } catch (_) {}
      }
  
      // Friendly initial message
      addAssistantBlock(
        "Hi. I can help you find the safest next step on this site. Please keep details general. If there is immediate danger, use crisis resources."
      );
  
      clearBtn?.addEventListener("click", clearChatUI);
  
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
  
        // Never store PII. Encourage safe input.
        if (text.length > 240) return;
  
        // Local sentiment guard first
        if (looksDistressed(text)) {
          addMessage("user", text);
          input.value = "";
          showCrisisNudge();
          addAssistantBlock(
            "I’m pausing here because your message may involve danger or urgent harm. Please use the crisis resources above or contact local emergency services now."
          );
          return;
        }
  
        addMessage("user", text);
        input.value = "";
  
        // Minimal, non-identifying history sent (no names, no addresses)
        // We keep it short to avoid accidental oversharing.
        chat.push({ role: "user", content: text });
  
        // Optional: call server sentiment guard for stronger check
        // If it flags, we stop and show crisis
        try {
          const sentiment = await postJSON(ENDPOINTS.sentiment, { text });
          if (sentiment?.flag === "crisis") {
            showCrisisNudge();
            addAssistantBlock(
              "I’m pausing because this may involve urgent danger. Please use crisis resources now."
            );
            return;
          }
        } catch (err) {
          // If sentiment endpoint fails, continue with caution
        }
  
        // Call SafeGuide server function
        try {
          addAssistantBlock("One moment. I’m finding the safest next step.");
  
          const result = await postJSON(ENDPOINTS.safeguide, {
            // Send only last 3 turns max (privacy + safety)
            messages: chat.slice(-3),
            context: {
              page: "get-help",
            },
          });
  
          // Remove the "one moment" message by clearing last assistant node
          // Simple approach: if last message contains "One moment", remove it
          const last = messages.lastElementChild;
          if (last && last.textContent && last.textContent.includes("One moment")) {
            last.remove();
          }
  
          if (result?.crisis === true) {
            showCrisisNudge();
          }
  
          const reply = result?.reply || "I’m here with you. Please use the Crisis resources if there is immediate danger.";
          addAssistantBlock(reply);
          chat.push({ role: "assistant", content: reply });
        } catch (err) {
          // Remove "one moment" if present
          const last = messages.lastElementChild;
          if (last && last.textContent && last.textContent.includes("One moment")) {
            last.remove();
          }
  
          addAssistantBlock(
            "I couldn’t reach the assistant right now. Please use the crisis resources above if anything is urgent. You can also use the Resource Locator for safe options."
          );
        }
      });
    }
  
    // -------------------------
    // Resource Matcher
    // Returns max 3 relevant local resources
    // -------------------------
    function setupResourceMatcher() {
      const form = $("#resourceMatcherForm");
      const locationInput = $("#locationInput");
      const detailsInput = $("#detailsInput");
      const situationSelect = $("#situationSelect");
  
      const resultsWrap = $("#resourceResults");
      const list = $("#resourceResultsList");
  
      if (!form || !resultsWrap || !list) return;
  
      function renderResults(items) {
        list.innerHTML = "";
  
        const safeItems = Array.isArray(items) ? items.slice(0, 3) : [];
        safeItems.forEach((item) => {
          const li = document.createElement("div");
          li.className = "card";
          li.style.boxShadow = "none";
          li.style.background = "var(--surface)";
          li.style.border = "1px solid var(--neutral-100)";
          li.style.marginTop = "12px";
  
          const name = item?.name || "Resource option";
          const why = item?.why || "A relevant option based on your situation.";
          const contact = item?.contact || "Visit the official site or call the local office.";
          const url = item?.url || "";
  
          li.innerHTML = `
            <h4 class="h4" style="margin:0 0 6px;">${escapeHTML(name)}</h4>
            <p class="small" style="margin:0 0 10px;">${escapeHTML(why)}</p>
            <p class="small" style="margin:0 0 12px;"><strong>Next step:</strong> ${escapeHTML(contact)}</p>
            ${
              url
                ? `<a class="btn btn--small btn--secondary" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">Open official resource</a>`
                : `<a class="btn btn--small btn--ghost" href="#crisis">If urgent, go to crisis resources</a>`
            }
          `;
  
          list.appendChild(li);
        });
  
        resultsWrap.style.display = "block";
        resultsWrap.scrollIntoView({ behavior: "smooth", block: "start" });
      }
  
      function escapeHTML(str) {
        return String(str)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }
  
      function escapeAttr(str) {
        return escapeHTML(str).replaceAll(" ", "%20");
      }
  
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const location = (locationInput?.value || "").trim();
        const details = (detailsInput?.value || "").trim();
        const situation = situationSelect?.value || "concerned_about_child";
  
        // Local distress check on free text
        if (looksDistressed(details)) {
          showCrisisNudge();
          resultsWrap.style.display = "block";
          list.innerHTML = `
            <div class="alert alert--crisis" role="alert">
              <p class="small" style="margin:0;">
                Your message may involve urgent danger. Please use crisis resources now.
                ${AI_DISCLAIMER}
              </p>
            </div>
          `;
          return;
        }
  
        // Minimal validation
        if (!location && !details) {
          resultsWrap.style.display = "block";
          list.innerHTML = `
            <div class="alert alert--warning" role="note">
              <p class="small" style="margin:0;">Please enter a location or a short description of what you need. Keep it non identifying.</p>
            </div>
          `;
          return;
        }
  
        // Render loading state
        resultsWrap.style.display = "block";
        list.innerHTML = `
          <div class="alert alert--info" role="status" aria-live="polite">
            <p class="small" style="margin:0;">Finding the most relevant options. Please wait.</p>
          </div>
        `;
  
        try {
          const result = await postJSON(ENDPOINTS.resources, {
            location: location || "unknown",
            situation,
            details: details || "general support",
          });
  
          if (result?.crisis === true) {
            showCrisisNudge();
          }
  
          renderResults(result?.resources || []);
        } catch (err) {
          list.innerHTML = `
            <div class="alert alert--warning" role="note">
              <p class="small" style="margin:0;">
                I couldn’t fetch local resources right now. Please use crisis resources above if urgent.
                You can also try again with a city and state.
              </p>
            </div>
          `;
        }
      });
    }
  
    // -------------------------
    // Anonymous reporting flow feedback (non-AI, deterministic)
    // -------------------------
    function setupAnonymousFlow() {
      const buttons = document.querySelectorAll("[data-anon-step]");
      if (!buttons.length) return;
  
      const state = { step1: null, step2: null, step3: null };
  
      function setFeedback(step, choice) {
        const box = document.getElementById(`anonFeedback${step}`);
        if (!box) return;
  
        box.style.display = "block";
  
        if (step === 1) {
          if (choice === "immediate_danger") {
            box.className = "alert alert--crisis";
            box.innerHTML = `<p class="small" style="margin:0;"><strong>Immediate danger:</strong> The safest step is to use crisis resources now. ${AI_DISCLAIMER}</p>`;
          } else if (choice === "not_immediate") {
            box.className = "alert alert--info";
            box.innerHTML = `<p class="small" style="margin:0;">You can still get help even if it’s not happening this second. We’ll build a safe next step.</p>`;
          } else {
            box.className = "alert alert--warning";
            box.innerHTML = `<p class="small" style="margin:0;">It’s okay to be unsure. If your concern is persistent, it matters. We can still choose a protective next step.</p>`;
          }
        }
  
        if (step === 2) {
          box.className = "alert alert--info";
          if (choice === "child") {
            box.innerHTML = `<p class="small" style="margin:0;">If you’re a child or teen: you deserve a safe adult. A teacher, counselor, coach, or trusted family member can help.</p>`;
          } else if (choice === "caregiver") {
            box.innerHTML = `<p class="small" style="margin:0;">As a caregiver: your role is to protect, not investigate. You can contact local child safety resources for guidance.</p>`;
          } else {
            box.innerHTML = `<p class="small" style="margin:0;">As a professional: follow your mandated reporting protocol. You don’t need proof to report a reasonable concern.</p>`;
          }
        }
  
        if (step === 3) {
          box.className = "alert alert--info";
          if (choice === "call") {
            box.innerHTML = `<p class="small" style="margin:0;">Calling a trusted hotline or local resource can be a strong next step. Keep notes general and focus on safety.</p>`;
          } else if (choice === "tell_trusted") {
            box.innerHTML = `<p class="small" style="margin:0;">Telling a trusted adult in person can be safest. Choose someone who can act and protect you.</p>`;
          } else {
            box.innerHTML = `<p class="small" style="margin:0;">Making a private plan first is valid. Choose a safe time. Write down a few key points without names if you need privacy.</p>`;
          }
        }
      }
  
      function updateSummaryIfReady() {
        const summary = document.getElementById("anonSummary");
        const text = document.getElementById("anonSummaryText");
        if (!summary || !text) return;
  
        const ready = state.step1 && state.step2 && state.step3;
        if (!ready) return;
  
        summary.style.display = "block";
  
        const urgent = state.step1 === "immediate_danger";
        if (urgent) {
          text.textContent =
            "Based on your choices, start with crisis resources now. If possible, move to a safer place and contact local emergency services.";
          return;
        }
  
        // Calm summary
        text.textContent =
          "A protective next step is to use the Resource Locator with your city and choose a safe helper. If you want practice, use the Playground to rehearse what to say.";
      }
  
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const step = Number(btn.getAttribute("data-anon-step"));
          const choice = btn.getAttribute("data-choice");
  
          if (step === 1) state.step1 = choice;
          if (step === 2) state.step2 = choice;
          if (step === 3) state.step3 = choice;
  
          setFeedback(step, choice);
          updateSummaryIfReady();
        });
      });
    }
  
    // -------------------------
    // Init
    // -------------------------
    setupSafeGuide();
    setupResourceMatcher();
    setupAnonymousFlow();
  })();