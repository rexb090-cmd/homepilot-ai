# HomePilot AI

**Automation that knows the rules.**

HomePilot AI is a simulated smart-home assistant prototype built around one differentiator: **the user's household rules are checked independently of the assistant's plan**. Rather than simply generating a list of device changes, it creates a plan, applies deterministic safety and context rules, explains the checks, and asks the user to approve the remaining actions.

> **Simulation only:** no physical locks, alarms, thermostats, lights, speakers, Alexa devices, or other real home equipment are connected or controlled.

## What makes it different

Many smart-home demos stop at a chatbot and device toggles. HomePilot's core feature is an explainable rule engine that sits between the planner and execution:

1. **Plan** — translate a user request into a proposed multi-device routine.
2. **Check** — apply household preferences and hard safety rules deterministically.
3. **Explain** — show which checks were enforced, applied, or reviewed, and why.
4. **Confirm** — let the user inspect the actions before execution.
5. **Execute** — update only simulated device states after explicit approval.

### Current safeguards

- **Exterior-door safeguard:** automatic unlocking is always blocked.
- **Occupancy-aware mode:** mark that someone is staying home; away routines are softened rather than automatically arming the whole-home security routine.
- **Pathway-light preference:** keep the hallway pathway light on when someone stays home and the preference is enabled.
- **Comfort preservation:** preserve thermostat comfort mode for a remaining occupant when enabled.
- **Quiet hours:** switch the simulated speaker off for bedtime/good-night routines when enabled.
- **Approval gate:** a plan cannot execute unless the API receives explicit approval.

These features demonstrate software rules and simulated states, not certified home safety behavior.

## Feature list

- Responsive dashboard with a simulated home-device list.
- Built-in demo routines for away/weekend, cozy evening, good night, welcome home, security, and energy saving.
- Household Rules panel with four user-selectable preferences and one always-on exterior-door safeguard.
- Visible policy audit attached to every plan.
- Simulated device toggles and activity history.
- Express API with in-memory state.
- Optional OpenAI-compatible chat-completions planner.
- Node test suite for the household-rules engine.

## Tech stack

- React 18 + Vite
- JavaScript, HTML, CSS
- Node.js + Express
- Lucide React icons
- Node built-in test runner (`node:test`)

The app runs using a deterministic routine planner without an API key. That makes it reproducible for local demos, but it is **not an LLM-powered agent unless the optional AI API is configured**. If using an AI API, copy `.env.example` to `.env` and set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`. Keep the key server-side and never commit `.env`. API use may incur provider charges.

## Requirements

- Node.js 20 or newer (Node.js 22 recommended)
- npm
- Internet for the first dependency installation

## Run locally

1. Extract or clone this repository.
2. Open the `homepilot-ai` folder in VS Code.
3. Open **Terminal → New Terminal** in that folder.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the frontend and backend:

   ```bash
   npm run dev
   ```

6. Open the local address printed by Vite, usually `http://localhost:5173`.

The Express API normally runs at `http://localhost:4000`; Vite proxies `/api` requests to the backend during development.

## Test the rules engine

```bash
npm test
```

The current Node test suite covers default rule normalization, occupied-home behavior, quiet-hours enforcement, exterior-door unlocking prevention, and ensuring the pathway light is not unnecessarily forced on when nobody is home.

## Recommended demo flow

This scenario showcases the differentiator better than a generic smart-home tour:

1. Open **Household Rules**.
2. Turn on **Someone stays home**; keep **Keep pathway lighting** and **Preserve comfort** on.
3. Enter: `I'm leaving for the weekend, but someone stays home. Keep the hallway light on.`
4. Show that the plan skips automatic security arming, preserves thermostat comfort, keeps the hallway light on, and includes a visible policy audit.
5. Click **Approve & run** and show the simulated state/activity updates.
6. Reset the demo, then try `Good night` to show the quiet-hours rule.
7. Optionally try an unlocking request and point out that automatic unlocking is blocked by design.

Lead with the occupied-home scenario. It makes the difference between a generic assistant and a rule-aware planner immediately visible.

## Optional AI planner

1. Copy `.env.example` to `.env`.
2. Set a valid `AI_API_KEY`, compatible `AI_BASE_URL`, and `AI_MODEL` for a provider that supports the API shape used by the server.
3. Restart the server.

The AI response is still filtered through an allowed-device/state list and the deterministic household-rules engine. If the provider fails, the app falls back to built-in demo routines. Never put secrets in frontend code or commit them to GitHub.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health and planner mode |
| `GET` | `/api/status` | Current simulated devices and activity |
| `GET` | `/api/devices` | Simulated device list |
| `GET` | `/api/activity` | Recent activity |
| `POST` | `/api/assistant/plan` | Create a proposed plan and run it through household rules |
| `POST` | `/api/assistant/execute` | Apply a saved plan after explicit approval |
| `POST` | `/api/devices/:id/toggle` | Toggle a simulated device |
| `POST` | `/api/reset` | Restore the simulated home to defaults |

`POST /api/assistant/plan` accepts JSON with `prompt` and optional boolean `rules` keys: `someoneStaysHome`, `keepPathwayLightOn`, `preserveComfort`, and `quietHours`.

## Project structure

```text
homepilot-ai/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── GROK_PROJECT_CONTEXT.md
├── LICENSE
├── server/
│   ├── index.js
│   ├── householdRules.js
│   └── householdRules.test.js
└── src/
    ├── App.jsx
    ├── main.jsx
    └── styles.css
```

## Limitations and honest status

- No real smart-home devices are connected.
- The default planner uses finite built-in routines, not an LLM.
- The optional AI provider integration requires credentials and still needs end-to-end verification with the provider selected by the developer.
- State is kept in server memory and resets when the server restarts.
- No official Alexa+ integration or MCP server is included yet. This is a smart-home simulation inspired by agentic interaction patterns, not an Amazon-endorsed product.
- Dependency installation and a complete frontend production build still need to be run on a machine with npm registry access.

## Publishing to GitHub

Create a repository, then in the project folder:

```bash
git init
git add .
git commit -m "Build HomePilot AI rule-aware smart-home demo"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/homepilot-ai.git
git push -u origin main
```

Replace `YOUR-USERNAME` and the remote URL with the exact values shown by GitHub. Do not upload `node_modules/`, `dist/`, or `.env`. The repository includes an MIT license; check that GitHub displays it correctly after publishing.

## License

MIT. See `LICENSE`.
