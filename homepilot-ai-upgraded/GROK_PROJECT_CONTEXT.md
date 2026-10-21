# Grok Project Handoff: HomePilot AI

Use this context alongside `homepilot-ai-grok-prompt.txt` when continuing the repository in a coding workspace.

## Conversation and project history

- The user is a beginner learning programming and website development, mainly using VS Code on Windows. Give exact commands and beginner-friendly explanations.
- The project name is **HomePilot AI**, tagline **“One request. A smarter home.”** It started as a smart-home assistant dashboard idea for a possible Alexa+ style simulated experience.
- The generic dashboard was too ordinary, so we chose an **explainable household-rules engine** as the differentiator.
- Central flow: `Plan → Check rules → Explain decisions → Ask for approval → Execute simulated actions`.
- This is a learning/portfolio prototype. Do not call it officially integrated with Alexa+, the Amazon ecosystem, or real smart-home hardware unless an actual integration is implemented and tested.
- The code has not yet been published to GitHub. Do not say it has been pushed unless a GitHub push actually succeeds.

## Differentiator

HomePilot should not compete as “another smart-home dashboard.” Household rules are checked deterministically after a planner proposes actions and before any action executes:

1. An exterior door is never automatically unlocked.
2. If “Someone stays home” is enabled, a weekend-away plan is changed to occupied-home mode: it does not automatically arm the whole-home security routine, keeps lights that are already on unchanged, and avoids switching off thermostat comfort when that preference is enabled.
3. If pathway lighting is enabled while someone stays home, keep the hallway pathway light on.
4. Quiet hours switch the speaker off for bedtime/good-night routines when enabled.
5. A visible policy audit explains which rules were enforced, applied, or reviewed.
6. No simulated actions run until the user explicitly approves the plan.

Best demo request: `I'm leaving for the weekend, but someone stays home. Keep the hallway light on.` Enable “Someone stays home,” keep pathway lighting and preserve-comfort enabled, show the policy audit, then approve. Next demonstrate `Good night` to show quiet-hours enforcement. Make clear all devices are simulated.

## Tech stack

- React 18, Vite, JavaScript, HTML, CSS, Lucide React.
- Node.js + Express backend.
- Optional OpenAI-compatible chat-completions planner configured via environment variables.
- Built-in deterministic routines work without an AI key, but they are **not** an LLM or autonomous agent. Even with an AI API, all actions must be validated by the deterministic rule engine.
- Node built-in test runner for rule tests.

## File layout

```text
homepilot-ai/
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
├── GROK_PROJECT_CONTEXT.md
├── homepilot-ai-grok-prompt.txt
├── index.html
├── package.json
├── vite.config.js
├── server/
│   ├── index.js
│   ├── householdRules.js
│   └── householdRules.test.js
└── src/
    ├── App.jsx
    ├── main.jsx
    └── styles.css
```

## Test status at handoff

- `node --check server/index.js`: passed.
- `node --check server/householdRules.js`: passed.
- `npm test`: 5 rule-engine tests passed (default normalization, occupied-home behavior, quiet-hours rule, automatic-unlock prevention, and not forcing pathway lighting on when the home is empty).
- `npm install --no-audit --no-fund` timed out in the build environment. A frontend production build and full browser run are **not yet verified**. Do not call the full application tested until `npm install`, `npm test`, and `npm run build` succeed in a network-enabled environment and the app is manually checked.

## Truthfulness and safety constraints

- Never commit `.env`, API keys, tokens, or credentials. `.env` must remain ignored.
- Do not claim simulated states changed real locks, alarms, thermostats, lights, speakers, or physical devices.
- Do not market deterministic routines as live AI. Accurately label planner mode in UI and README.
- Do not claim Amazon/Alexa+ integration, an Alexa Skill, or MCP compatibility until it exists and has been tested.
- The current event's official eligibility rules may require participants to be at least the legal age of majority. Do not help bypass age or eligibility requirements. Continue treating this as a learning/portfolio project unless eligibility is established.
