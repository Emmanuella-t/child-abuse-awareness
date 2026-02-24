/* =========================
   playground.js
   Knowledge Playground engine
   - Tier selection + URL params
   - Branching scenario engine (3 choices max)
   - Reporting simulation
   - Quizzes with instant feedback
   - Local progress tracking (privacy-first)
   - Printable certificate (Save as PDF via browser print)
   ========================= */

   (function () {
    "use strict";
  
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  
    const STORAGE_KEY = "safeguard_playground_progress_v1";
  
    // -------------------------
    // State
    // -------------------------
    const state = {
      tier: null, // "child" | "teen" | "pro"
      scenarioNodeId: null,
      progress: {
        tier: null,
        scenarioCompleted: false,
        reportingCompleted: false,
        quizzesCompleted: false,
        completionMarks: 0, // simple counter to compute progress
      },
    };
  
    // -------------------------
    // Scenario content (safe messaging)
    // No graphic detail. No blame. Calm choices.
    // -------------------------
    const SCENARIOS = {
      child: {
        id: "child",
        title: "Child (8–12)",
        nodes: {
          start: {
            stepLabel: "Scenario 1 of 4",
            prompt: "You feel uncomfortable around an adult and you don’t know if it’s okay to tell someone.",
            support: "You are not in trouble. If something feels wrong, it matters. You deserve a safe adult.",
            choices: [
              { id: "c1", label: "Tell a trusted adult at school", next: "trustedAdult" },
              { id: "c2", label: "Keep it to yourself so nobody gets upset", next: "keepQuiet" },
              { id: "c3", label: "Ask a friend for help telling an adult", next: "friendHelp" },
            ],
          },
          trustedAdult: {
            stepLabel: "Scenario 2 of 4",
            prompt: "You decide to tell a trusted adult. What can you say?",
            support: "You can keep it simple. You do not need every detail to be believed.",
            choices: [
              { id: "c4", label: "“I don’t feel safe. I need help.”", next: "affirm1", good: true },
              { id: "c5", label: "“Never mind. It’s nothing.”", next: "affirm2" },
              { id: "c6", label: "“Promise you won’t tell anyone.”", next: "affirm3" },
            ],
          },
          keepQuiet: {
            stepLabel: "Scenario 2 of 4",
            prompt: "You keep it to yourself. The feeling doesn’t go away.",
            support: "Keeping it inside can feel heavy. You deserve support.",
            choices: [
              { id: "c7", label: "Tell a trusted adult now", next: "trustedAdult" },
              { id: "c8", label: "Use Quick Exit and come back later", next: "pauseReturn" },
              { id: "c9", label: "Write down “I need help” for later", next: "noteForLater" },
            ],
          },
          friendHelp: {
            stepLabel: "Scenario 2 of 4",
            prompt: "You ask a friend for help telling an adult. Your friend agrees.",
            support: "Asking for help is brave. You still deserve a safe adult who can act.",
            choices: [
              { id: "c10", label: "Go together to a school counselor", next: "trustedAdult", good: true },
              { id: "c11", label: "Only tell your friend and no adult", next: "keepQuiet" },
              { id: "c12", label: "Tell an adult you trust outside school", next: "trustedAdult" },
            ],
          },
          pauseReturn: {
            stepLabel: "Scenario 3 of 4",
            prompt: "You pause and return later. What is a safe next step when you return?",
            support: "You can move at your pace. Safety is the goal.",
            choices: [
              { id: "c13", label: "Choose one safe adult and tell them", next: "trustedAdult", good: true },
              { id: "c14", label: "Try to handle it alone forever", next: "affirm2" },
              { id: "c15", label: "Ask another trusted adult to help you talk", next: "friendHelp", good: true },
            ],
          },
          noteForLater: {
            stepLabel: "Scenario 3 of 4",
            prompt: "You write a short note so you can speak later.",
            support: "That is a smart way to protect yourself. Keep it simple.",
            choices: [
              { id: "c16", label: "Show the note to a trusted adult", next: "trustedAdult", good: true },
              { id: "c17", label: "Throw it away and forget it", next: "keepQuiet" },
              { id: "c18", label: "Keep it until you feel ready", next: "pauseReturn" },
            ],
          },
          affirm1: {
            stepLabel: "Scenario 4 of 4",
            prompt: "You said: “I don’t feel safe. I need help.”",
            support: "That is a strong, safe sentence. You did the right thing by speaking up.",
            choices: [{ id: "done", label: "Finish scenario", next: "done" }],
            complete: true,
          },
          affirm2: {
            stepLabel: "Scenario 4 of 4",
            prompt: "It’s okay to feel scared or unsure.",
            support: "You still deserve help. If you can, choose one trusted adult and try again.",
            choices: [{ id: "back", label: "Try a safer next step", next: "trustedAdult" }],
          },
          affirm3: {
            stepLabel: "Scenario 4 of 4",
            prompt: "Wanting secrecy can feel safe, but it can limit protection.",
            support: "A safe adult may need to get help. A better request is: “Please stay with me while we get help.”",
            choices: [{ id: "finish", label: "Finish scenario", next: "done" }],
            complete: true,
          },
          done: {
            stepLabel: "Complete",
            prompt: "Scenario complete",
            support: "You practiced a safe next step. You can restart or try a different tier.",
            choices: [{ id: "restart", label: "Restart scenario", next: "start" }],
            complete: true,
          },
        },
      },
  
      teen: {
        id: "teen",
        title: "Teen / Adult",
        nodes: {
          start: {
            stepLabel: "Scenario 1 of 4",
            prompt: "You’re worried about a child but you feel unsure what counts as “serious enough.”",
            support: "You don’t need proof to take a protective step. Reasonable concern is enough to seek help.",
            choices: [
              { id: "t1", label: "Write down what you noticed (general, factual)", next: "document", good: true },
              { id: "t2", label: "Confront the suspected person directly", next: "confront" },
              { id: "t3", label: "Wait and see if it gets better", next: "wait" },
            ],
          },
          document: {
            stepLabel: "Scenario 2 of 4",
            prompt: "You document what you observed in a calm way.",
            support: "Focus on observable facts and dates. Avoid assumptions. Keep privacy in mind.",
            choices: [
              { id: "t4", label: "Use a reporting resource or hotline for guidance", next: "reportGuidance", good: true },
              { id: "t5", label: "Post about it online to get opinions", next: "online" },
              { id: "t6", label: "Ask the child for detailed explanations", next: "interrogate" },
            ],
          },
          confront: {
            stepLabel: "Scenario 2 of 4",
            prompt: "Confronting directly can increase risk for the child.",
            support: "A safer path is to use an appropriate reporting resource that can handle it safely.",
            choices: [
              { id: "t7", label: "Switch to a safer plan (resource guidance)", next: "reportGuidance", good: true },
              { id: "t8", label: "Keep confronting anyway", next: "wait" },
              { id: "t9", label: "Tell a trained professional at school", next: "reportGuidance", good: true },
            ],
          },
          wait: {
            stepLabel: "Scenario 2 of 4",
            prompt: "You wait. Your concern grows.",
            support: "Delaying can increase harm risk. You can act without certainty.",
            choices: [
              { id: "t10", label: "Use Resource Locator for next steps", next: "reportGuidance", good: true },
              { id: "t11", label: "Do nothing", next: "stuck" },
              { id: "t12", label: "Talk to a trusted professional (counselor/teacher)", next: "reportGuidance", good: true },
            ],
          },
          reportGuidance: {
            stepLabel: "Scenario 3 of 4",
            prompt: "You reach out for guidance using a reporting resource.",
            support: "You can say what you observed and ask what the safest next step is.",
            choices: [
              { id: "t13", label: "Keep your report factual and brief", next: "finish", good: true },
              { id: "t14", label: "Add names and addresses into random forms", next: "privacy" },
              { id: "t15", label: "Decide it’s too hard and stop", next: "stuck" },
            ],
          },
          online: {
            stepLabel: "Scenario 3 of 4",
            prompt: "Posting online can expose the child and create harm.",
            support: "A safer path is private reporting guidance and trusted professionals.",
            choices: [{ id: "t16", label: "Switch to reporting guidance", next: "reportGuidance", good: true }],
          },
          interrogate: {
            stepLabel: "Scenario 3 of 4",
            prompt: "Detailed questioning can feel like interrogation and can retraumatize.",
            support: "A safer approach is belief, calm support, and connecting to trained help.",
            choices: [{ id: "t17", label: "Switch to reporting guidance", next: "reportGuidance", good: true }],
          },
          privacy: {
            stepLabel: "Scenario 4 of 4",
            prompt: "Privacy matters.",
            support: "Avoid typing identifying details into tools that are not official reporting channels.",
            choices: [{ id: "t18", label: "Finish scenario", next: "done" }],
            complete: true,
          },
          stuck: {
            stepLabel: "Scenario 4 of 4",
            prompt: "It’s normal to feel overwhelmed.",
            support: "You can take a small step: use a hotline for guidance or tell a trusted professional.",
            choices: [{ id: "t19", label: "Take a small safe step now", next: "reportGuidance", good: true }],
          },
          finish: {
            stepLabel: "Scenario 4 of 4",
            prompt: "You chose a factual, calm report path.",
            support: "That protects the child and reduces risk. You did the right thing by acting.",
            choices: [{ id: "done", label: "Finish scenario", next: "done" }],
            complete: true,
          },
          done: {
            stepLabel: "Complete",
            prompt: "Scenario complete",
            support: "You practiced a safe decision path. You can restart or try another tier.",
            choices: [{ id: "restart", label: "Restart scenario", next: "start" }],
            complete: true,
          },
        },
      },
  
      pro: {
        id: "pro",
        title: "Professional",
        nodes: {
          start: {
            stepLabel: "Scenario 1 of 4",
            prompt: "A student shares a concerning statement. You want to respond safely and follow protocol.",
            support:
              "Your role is not to investigate. Your role is to stay calm, document appropriately, and follow mandated reporting protocol.",
            choices: [
              { id: "p1", label: "Thank them, stay calm, and ensure immediate safety", next: "calm", good: true },
              { id: "p2", label: "Promise complete secrecy", next: "secrecy" },
              { id: "p3", label: "Ask for detailed specifics immediately", next: "details" },
            ],
          },
          calm: {
            stepLabel: "Scenario 2 of 4",
            prompt: "You respond calmly and prioritize safety.",
            support: "A safe response includes belief, reassurance, and clear next steps within policy.",
            choices: [
              { id: "p4", label: "Say: “I’m glad you told me. I will help keep you safe.”", next: "document", good: true },
              { id: "p5", label: "Say: “Are you sure? That’s serious.”", next: "shame" },
              { id: "p6", label: "Say: “I can’t help unless you explain everything.”", next: "pressure" },
            ],
          },
          secrecy: {
            stepLabel: "Scenario 2 of 4",
            prompt: "Promising secrecy can block protection.",
            support:
              "A safer message is: “I will respect you and share only with people whose job is to help keep you safe.”",
            choices: [{ id: "p7", label: "Switch to safer language and proceed", next: "document", good: true }],
          },
          details: {
            stepLabel: "Scenario 2 of 4",
            prompt: "Detailed questioning can feel like interrogation.",
            support: "Gather only what is necessary for immediate safety. Follow your training and policy.",
            choices: [{ id: "p8", label: "Switch to a protocol-aligned approach", next: "document", good: true }],
          },
          document: {
            stepLabel: "Scenario 3 of 4",
            prompt: "You document the concern using observable facts and follow the proper channel.",
            support: "You don’t need proof. Reasonable suspicion is enough to report in most mandated frameworks.",
            choices: [
              { id: "p9", label: "Contact the appropriate reporting channel now", next: "report", good: true },
              { id: "p10", label: "Wait for more certainty", next: "delay" },
              { id: "p11", label: "Discuss details widely with colleagues", next: "privacy" },
            ],
          },
          report: {
            stepLabel: "Scenario 4 of 4",
            prompt: "You follow protocol and report through the correct channel.",
            support: "That protects the child and protects you. You acted responsibly and compassionately.",
            choices: [{ id: "done", label: "Finish scenario", next: "done" }],
            complete: true,
          },
          delay: {
            stepLabel: "Scenario 4 of 4",
            prompt: "Delaying can increase risk.",
            support: "It is okay to report with reasonable concern. Your responsibility is to act, not to prove.",
            choices: [{ id: "p12", label: "Take the protocol step now", next: "report", good: true }],
          },
          privacy: {
            stepLabel: "Scenario 4 of 4",
            prompt: "Confidentiality matters.",
            support: "Share only with people who must know within policy and reporting requirements.",
            choices: [{ id: "p13", label: "Finish scenario", next: "done" }],
            complete: true,
          },
          shame: {
            stepLabel: "Scenario 3 of 4",
            prompt: "A reaction of shock can increase shame.",
            support: "A calm, steady tone helps the student feel safe.",
            choices: [{ id: "p14", label: "Reset with supportive language", next: "document", good: true }],
          },
          pressure: {
            stepLabel: "Scenario 3 of 4",
            prompt: "Pressure can shut down disclosure.",
            support: "You can say: “Tell me only what you feel ready to share. We can still get help.”",
            choices: [{ id: "p15", label: "Reset with supportive language", next: "document", good: true }],
          },
          done: {
            stepLabel: "Complete",
            prompt: "Scenario complete",
            support: "You completed the professional scenario path. Next: reporting simulation and certificate.",
            choices: [{ id: "restart", label: "Restart scenario", next: "start" }],
            complete: true,
          },
        },
      },
    };
  
    // -------------------------
    // Reporting simulation steps (tier-aware)
    // -------------------------
    const REPORT_FLOW = [
      {
        title: "Step 1: Ground yourself",
        body:
          "Take one steady breath. Your calm helps the person feel safer. In a real report, you can speak slowly and focus on safety.",
        choices: [
          { label: "Continue", next: 1, good: true },
          { label: "I need a pause", next: 0, note: "Pausing is okay. Safety first." },
        ],
      },
      {
        title: "Step 2: Share a brief concern",
        body:
          "Practice a simple statement: “I’m calling to report a concern about a child’s safety. I observed behaviors that worry me.”",
        choices: [
          { label: "Continue", next: 2, good: true },
          { label: "Add graphic detail", next: 2, warn: true },
        ],
      },
      {
        title: "Step 3: Stick to observable facts",
        body:
          "In practice, focus on what you observed and when. Avoid guessing motives. Keep it factual and respectful.",
        choices: [
          { label: "Continue", next: 3, good: true },
          { label: "Speculate about intentions", next: 3, warn: true },
        ],
      },
      {
        title: "Step 4: Ask for next steps",
        body:
          "Practice asking: “What information is most helpful? What is the next step I should take after this call?”",
        choices: [
          { label: "Finish simulation", next: 4, good: true },
          { label: "Stop here", next: 4, note: "Stopping is okay. You can return anytime." },
        ],
      },
      {
        title: "Reporting simulation complete",
        body:
          "You completed the practice flow. Remember: in a real situation, use official channels and follow your local policy.",
        choices: [{ label: "Close", next: 4, good: true }],
        done: true,
      },
    ];
  
    // -------------------------
    // Progress helpers (privacy-first)
    // -------------------------
    function loadProgress() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          state.progress = { ...state.progress, ...parsed };
        }
      } catch (_) {}
    }
  
    function saveProgress() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
      } catch (_) {}
    }
  
    function computeProgressPercent() {
      // 4 milestones: tier selected, scenario completed, reporting completed, quizzes completed
      const milestones = [
        Boolean(state.progress.tier),
        Boolean(state.progress.scenarioCompleted),
        Boolean(state.progress.reportingCompleted),
        Boolean(state.progress.quizzesCompleted),
      ];
      const done = milestones.filter(Boolean).length;
      return Math.round((done / milestones.length) * 100);
    }
  
    function updateProgressUI() {
      const bar = $("#pgProgressBar");
      const txt = $("#pgProgressText");
      if (!bar || !txt) return;
  
      const pct = computeProgressPercent();
      bar.style.width = `${pct}%`;
      txt.textContent = `${pct}% complete`;
  
      // Show certificate if professional tier is complete enough
      const cert = $("#certificateBlock");
      if (cert) {
        const shouldShow =
          state.progress.tier === "pro" &&
          state.progress.scenarioCompleted &&
          state.progress.reportingCompleted;
        cert.style.display = shouldShow ? "block" : "none";
      }
    }
  
    // -------------------------
    // Tier selection + URL params
    // -------------------------
    function getTierFromURL() {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tier");
      if (t === "child" || t === "teen" || t === "pro") return t;
      return null;
    }
  
    function setTier(tier) {
      state.tier = tier;
      state.progress.tier = tier;
      saveProgress();
  
      // Update hint + show scenario card
      const hint = $("#pgTierHint");
      const card = $("#scenarioCard");
      const chip = $("#scenarioTierChip");
      if (hint) hint.style.display = "none";
      if (card) card.style.display = "block";
      if (chip) chip.textContent = SCENARIOS[tier].title;
  
      // Start scenario
      state.scenarioNodeId = "start";
      renderScenario();
  
      updateProgressUI();
    }
  
    // -------------------------
    // Scenario rendering
    // -------------------------
    function renderScenario() {
      const card = $("#scenarioCard");
      const prompt = $("#scenarioPrompt");
      const support = $("#scenarioSupport");
      const choicesWrap = $("#scenarioChoices");
      const feedback = $("#scenarioFeedback");
      const stepLabel = $("#scenarioStepLabel");
  
      if (!state.tier || !card || !prompt || !support || !choicesWrap || !feedback || !stepLabel) return;
  
      const scenario = SCENARIOS[state.tier];
      const node = scenario.nodes[state.scenarioNodeId];
      if (!node) return;
  
      stepLabel.textContent = node.stepLabel || "";
      prompt.textContent = node.prompt || "";
      support.textContent = node.support || "";
  
      feedback.style.display = "none";
      feedback.className = "alert alert--info";
      feedback.innerHTML = "";
  
      choicesWrap.innerHTML = "";
  
      // Guarantee max 3 choices
      const choices = (node.choices || []).slice(0, 3);
  
      choices.forEach((c) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = c.good ? "btn btn--secondary" : "btn btn--ghost";
        btn.textContent = c.label;
  
        btn.addEventListener("click", () => {
          // Affirming feedback: never shame-based
          let msg = "Thank you for choosing a step. Let’s learn what makes it safer.";
          if (c.good) {
            msg = "That choice supports safety. You’re practicing a protective next step.";
            feedback.className = "alert alert--info";
          } else {
            msg =
              "It makes sense that this choice might feel easier. Here’s a safer alternative that protects more.";
            feedback.className = "alert alert--warning";
          }
  
          feedback.style.display = "block";
          feedback.innerHTML = `<p class="small" style="margin:0;">${msg}</p>`;
  
          // Move next after a brief pause for readability
          window.setTimeout(() => {
            state.scenarioNodeId = c.next;
            renderScenario();
  
            // Completion check
            const newNode = scenario.nodes[state.scenarioNodeId];
            if (newNode && newNode.complete) {
              state.progress.scenarioCompleted = true;
              saveProgress();
              updateProgressUI();
            }
          }, 350);
        });
  
        choicesWrap.appendChild(btn);
      });
    }
  
    function setupScenarioControls() {
      const restart = $("#scenarioRestartBtn");
      restart?.addEventListener("click", () => {
        if (!state.tier) return;
        state.scenarioNodeId = "start";
        renderScenario();
      });
    }
  
    // -------------------------
    // Reporting simulation
    // -------------------------
    let reportIndex = 0;
  
    function renderReportStep() {
      const flow = $("#reportFlow");
      const title = $("#reportStepTitle");
      const body = $("#reportStepBody");
      const choicesWrap = $("#reportChoices");
      const feedback = $("#reportFeedback");
  
      if (!flow || !title || !body || !choicesWrap || !feedback) return;
  
      const step = REPORT_FLOW[reportIndex];
      if (!step) return;
  
      title.textContent = step.title;
      body.textContent = step.body;
  
      feedback.style.display = "none";
      feedback.className = "alert alert--info";
      feedback.innerHTML = "";
  
      choicesWrap.innerHTML = "";
      const choices = (step.choices || []).slice(0, 3);
  
      choices.forEach((c) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = c.good ? "btn btn--secondary" : "btn btn--ghost";
        btn.textContent = c.label;
  
        btn.addEventListener("click", () => {
          // Feedback
          let msg = "Okay. Let’s continue safely.";
          let className = "alert alert--info";
  
          if (c.warn) {
            msg =
              "In real reporting, avoid graphic detail when not required. Focus on safety and observable facts.";
            className = "alert alert--warning";
          }
          if (c.note) {
            msg = c.note;
            className = "alert alert--info";
          }
  
          feedback.className = className;
          feedback.style.display = "block";
          feedback.innerHTML = `<p class="small" style="margin:0;">${msg}</p>`;
  
          // Move next
          reportIndex = typeof c.next === "number" ? c.next : reportIndex;
  
          // Completion
          if (REPORT_FLOW[reportIndex]?.done) {
            state.progress.reportingCompleted = true;
            saveProgress();
            updateProgressUI();
          }
  
          renderReportStep();
        });
  
        choicesWrap.appendChild(btn);
      });
  
      flow.style.display = "block";
      flow.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  
    function setupReportControls() {
      const start = $("#reportStartBtn");
      const reset = $("#reportResetBtn");
  
      start?.addEventListener("click", () => {
        reportIndex = 0;
        renderReportStep();
      });
  
      reset?.addEventListener("click", () => {
        reportIndex = 0;
        const flow = $("#reportFlow");
        if (flow) flow.style.display = "none";
        const fb = $("#reportFeedback");
        if (fb) fb.style.display = "none";
      });
    }
  
    // -------------------------
    // Quizzes
    // -------------------------
    const QUIZ_ANSWERS = {
      q1: "b",
      q2: "b",
    };
  
    function setupQuizzes() {
      const buttons = $$("[data-quiz]");
      if (!buttons.length) return;
  
      const completed = { q1: false, q2: false };
  
      function showQuizFeedback(qid, correct) {
        const box = $(`#quizFeedback${qid.toUpperCase()}`);
        if (!box) return;
  
        box.style.display = "block";
        box.className = correct ? "alert alert--info" : "alert alert--warning";
  
        box.innerHTML = correct
          ? `<p class="small" style="margin:0;">Correct. That response supports safety and reduces shame. You’re practicing a protective approach.</p>`
          : `<p class="small" style="margin:0;">Not quite, and it’s okay. The safest first move is calm belief and support. Avoid interrogation or doubt, and connect to trained help when needed.</p>`;
      }
  
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const qid = btn.getAttribute("data-quiz");
          const ans = btn.getAttribute("data-answer");
          const correct = QUIZ_ANSWERS[qid] === ans;
  
          showQuizFeedback(qid, correct);
  
          completed[qid] = true;
  
          // If all quizzes clicked at least once, mark completed
          const allDone = Object.values(completed).every(Boolean);
          if (allDone) {
            state.progress.quizzesCompleted = true;
            saveProgress();
            updateProgressUI();
          }
        });
      });
    }
  
    // -------------------------
    // Completion controls
    // -------------------------
    function setupCompletionButtons() {
      const markBtn = $("#markCompleteBtn");
      const resetBtn = $("#resetProgressBtn");
  
      markBtn?.addEventListener("click", () => {
        // Mark one missing milestone if exists
        if (!state.progress.tier && state.tier) state.progress.tier = state.tier;
        else if (!state.progress.scenarioCompleted) state.progress.scenarioCompleted = true;
        else if (!state.progress.reportingCompleted) state.progress.reportingCompleted = true;
        else if (!state.progress.quizzesCompleted) state.progress.quizzesCompleted = true;
  
        saveProgress();
        updateProgressUI();
      });
  
      resetBtn?.addEventListener("click", () => {
        state.progress = {
          tier: null,
          scenarioCompleted: false,
          reportingCompleted: false,
          quizzesCompleted: false,
          completionMarks: 0,
        };
        saveProgress();
        updateProgressUI();
  
        // Reset UI state
        const hint = $("#pgTierHint");
        const card = $("#scenarioCard");
        if (hint) hint.style.display = "block";
        if (card) card.style.display = "none";
        state.tier = null;
        state.scenarioNodeId = null;
      });
    }
  
    // -------------------------
    // Certificate generation
    // We generate a print-friendly document in a new window.
    // The user can choose "Save as PDF" from the print dialog.
    // No external libraries, no uploads, privacy-first.
    // -------------------------
    function setupCertificate() {
      const btn = $("#downloadCertBtn");
      const nameInput = $("#certName");
  
      if (!btn) return;
  
      btn.addEventListener("click", () => {
        const name = (nameInput?.value || "").trim();
        const today = new Date();
        const dateStr = today.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  
        const safeName = name ? escapeHTML(name) : "Participant";
  
        const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
        if (!win) return;
  
        win.document.open();
        win.document.write(`
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>Safeguard Certificate</title>
              <style>
                :root {
                  --base: #FAF8F5;
                  --teal: #1B3A4B;
                  --amber: #E8A838;
                  --neutral: #C4BDB5;
                }
                body {
                  margin: 0;
                  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
                  background: var(--base);
                  color: #10212A;
                }
                .wrap {
                  padding: 40px;
                  display: grid;
                  place-items: center;
                  min-height: 100vh;
                }
                .cert {
                  width: min(900px, 100%);
                  background: #fff;
                  border: 2px solid var(--neutral);
                  border-radius: 18px;
                  padding: 48px;
                }
                .brand {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  margin-bottom: 28px;
                }
                .logo {
                  font-weight: 800;
                  letter-spacing: 0.02em;
                  color: var(--teal);
                }
                .badge {
                  display: inline-block;
                  padding: 6px 10px;
                  border-radius: 999px;
                  border: 1px solid rgba(27,58,75,0.25);
                  background: rgba(232,168,56,0.14);
                  color: var(--teal);
                  font-weight: 700;
                  font-size: 12px;
                }
                h1 {
                  margin: 0 0 12px;
                  font-size: 36px;
                  color: var(--teal);
                }
                .sub {
                  margin: 0 0 28px;
                  color: #4B5B63;
                  font-size: 14px;
                }
                .name {
                  font-size: 28px;
                  font-weight: 800;
                  margin: 10px 0 8px;
                }
                .line {
                  height: 1px;
                  background: #E8E4DF;
                  margin: 26px 0;
                }
                .meta {
                  display: flex;
                  justify-content: space-between;
                  gap: 16px;
                  flex-wrap: wrap;
                  font-size: 14px;
                  color: #4B5B63;
                }
                .note {
                  margin-top: 18px;
                  font-size: 12px;
                  color: #4B5B63;
                }
                @media print {
                  body { background: #fff; }
                  .wrap { padding: 0; }
                  .cert { border: 2px solid #999; border-radius: 0; }
                  .note { page-break-inside: avoid; }
                }
              </style>
            </head>
            <body>
              <div class="wrap">
                <div class="cert">
                  <div class="brand">
                    <div class="logo">Safeguard</div>
                    <div class="badge">Professional Completion</div>
                  </div>
  
                  <h1>Certificate of Completion</h1>
                  <p class="sub">
                    This certificate confirms completion of the Safeguard Professional Knowledge Playground module,
                    including scenario practice and reporting simulation.
                  </p>
  
                  <div class="name">${safeName}</div>
                  <p class="sub" style="margin-bottom: 0;">has completed the module on</p>
                  <div style="font-size: 18px; font-weight: 700; color: var(--teal); margin-top: 6px;">${escapeHTML(dateStr)}</div>
  
                  <div class="line"></div>
  
                  <div class="meta">
                    <div><strong>Module:</strong> Safeguard Knowledge Playground</div>
                    <div><strong>Tier:</strong> Professional</div>
                    <div><strong>Format:</strong> Self-paced, privacy-first</div>
                  </div>
  
                  <p class="note">
                    Privacy note: This certificate is generated on your device. Nothing is uploaded or stored by Safeguard.
                  </p>
  
                  <div class="row" style="margin-top: 22px;">
                    <button onclick="window.print()" style="
                      padding: 12px 16px;
                      border-radius: 12px;
                      border: 1px solid rgba(27,58,75,0.25);
                      background: rgba(232,168,56,0.18);
                      cursor: pointer;
                      font-weight: 700;
                      color: #1B3A4B;
                    ">Print / Save as PDF</button>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `);
        win.document.close();
        win.focus();
      });
  
      function escapeHTML(str) {
        return String(str)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }
    }
  
    // -------------------------
    // Init
    // -------------------------
    function init() {
      loadProgress();
  
      // Tier buttons
      $$("[data-tier]").forEach((btn) => {
        btn.addEventListener("click", () => setTier(btn.getAttribute("data-tier")));
      });
  
      // Apply URL tier if present
      const tFromURL = getTierFromURL();
      if (tFromURL) setTier(tFromURL);
      else if (state.progress.tier) setTier(state.progress.tier);
  
      setupScenarioControls();
      setupReportControls();
      setupQuizzes();
      setupCompletionButtons();
      setupCertificate();
  
      updateProgressUI();
    }
  
    init();
  })();