
# Safeguard ◎  
### A Crisis-Forward Child Safety Platform

🔗 **Live Site:** https://child-abuse-awareness.netlify.app/

---

Safeguard is a mission-driven digital product built for vulnerable users including children, survivors, caregivers, educators, and professionals.

It is designed as a real product system, not a brochure website.

Soft minimal design. Crisis-forward UX. Privacy by default.  
Interactive learning. Anonymous story wall. Ethical AI.

---

## The Problem

Most awareness websites stop at information.

But in moments of fear, confusion, or vulnerability, information alone is not enough.

People need:
- Clear next steps
- Gentle guidance
- Visible crisis support
- Zero identity friction

Safeguard is built around that reality.

---

## Core Product Features

### Crisis Forward UX
- Always visible crisis ribbon
- Sticky crisis CTA
- Quick Exit button (clears session + redirects)

---

### Knowledge Playground
An interactive learning engine with:

- Child (8–12), Teen/Adult, and Professional tiers
- Branching decision trees
- Reporting simulation
- Instant educational feedback
- Professional certificate generation

---

### SafeGuide AI Companion (Claude)
AI for navigation, not therapy.

Guardrails:
- Never replaces crisis support
- Detects distress signals
- No PII stored
- API key secured server-side
- Mandatory safety disclaimer

AI Capabilities:
- Context-aware guidance
- Resource matching
- Personalized learning paths
- Sentiment guard for crisis detection

---

### Heard ◎ Anonymous Story Wall
- One sentence anonymous submissions
- Moderated approval queue
- Floating card canvas design
- Private “This resonates” acknowledgement
- No accounts required

---

## Design System

Style: Soft minimalism with editorial warmth.

Palette:
- Off White: #FAF8F5
- Deep Teal: #1B3A4B
- Warm Amber: #E8A838
- Soft Neutrals: #E8E4DF, #C4BDB5
- Crisis Coral: #D95F4B

Typography:
- DM Sans / Inter
- Fraunces / Lora
- Clear typographic hierarchy

Micro-interactions:
- 200–300ms transitions
- Reduced motion respected
- No flashing or jarring UI

---

## Accessibility & Safety

WCAG 2.1 AA minimum.

- Keyboard navigable
- ARIA labeled
- Skip-to-content
- High contrast
- No graphic content
- Trauma-informed messaging

---

## Architecture

Frontend:
- HTML
- CSS (token-based design system)
- Vanilla JS (component-structured)

Backend:
- Netlify Functions
- Anthropic Claude API (secured via environment variables)

Security:
- CSP headers
- No inline API keys
- No PII persistence
- Anonymous-only logging
- HSTS + X-Frame protections

---

## Performance

- Lighthouse 90+
- LCP < 2.5s
- CLS < 0.1
- PWA enabled
- Offline crisis resource caching

---

## Deployment

Hosted on Netlify.

- Static frontend deployment
- Serverless functions for AI + moderation
- Environment variables for secret management
- Automatic redeploy on GitHub push

---

## Disclaimer

Safeguard provides educational navigation support.  
It is not a substitute for professional medical, legal, or counseling services.

If there is immediate danger, contact local emergency services.

◎
