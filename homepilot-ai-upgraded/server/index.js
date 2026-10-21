import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { applyHouseholdRules, normalizeHouseholdRules } from './householdRules.js';

const app = express();
const PORT = process.env.PORT || 4000;
const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

app.use(express.json({ limit: '32kb' }));

const initialDevices = [
  { id: 'living-light', name: 'Living room lights', room: 'Living room', type: 'light', state: 'on', detail: 'Warm white · 78%', brightness: 78 },
  { id: 'bedroom-light', name: 'Bedroom lights', room: 'Bedroom', type: 'light', state: 'off', detail: 'Soft white · 0%', brightness: 0 },
  { id: 'hallway-light', name: 'Hallway pathway light', room: 'Hallway', type: 'light', state: 'off', detail: 'Pathway light · 0%', brightness: 0 },
  { id: 'thermostat', name: 'Thermostat', room: 'Hallway', type: 'thermostat', state: 'on', detail: 'Comfort mode · 22°C', temperature: 22 },
  { id: 'front-lock', name: 'Front door lock', room: 'Entryway', type: 'lock', state: 'locked', detail: 'Secure · Auto-lock on' },
  { id: 'security', name: 'Security system', room: 'Whole home', type: 'security', state: 'disarmed', detail: 'Monitoring paused' },
  { id: 'speaker', name: 'Smart speaker', room: 'Living room', type: 'speaker', state: 'on', detail: 'Ready to play' }
];

let devices = structuredClone(initialDevices);
let awayMode = false;
let savedPlans = new Map();
let activity = [
  { id: crypto.randomUUID(), title: 'HomePilot is ready', detail: 'Demo home connected · no physical devices required', time: new Date().toISOString(), status: 'complete' },
  { id: crypto.randomUUID(), title: 'Evening scene activated', detail: 'Living room lights set to warm white', time: new Date(Date.now() - 1000 * 60 * 26).toISOString(), status: 'complete' },
  { id: crypto.randomUUID(), title: 'Front door checked', detail: 'Current status: locked', time: new Date(Date.now() - 1000 * 60 * 94).toISOString(), status: 'complete' }
];

function getDevice(id) {
  return devices.find((device) => device.id === id);
}

function setState(id, state) {
  const device = getDevice(id);
  if (!device) return null;
  device.state = state;
  if (device.type === 'light') {
    device.brightness = state === 'on' ? (device.brightness || 78) : 0;
    device.detail = `${state === 'on' ? 'Warm white' : 'Off'} · ${device.brightness}%`;
  } else if (device.type === 'thermostat') {
    device.detail = `${state === 'on' ? 'Comfort mode' : 'Eco mode'} · ${device.temperature}°C`;
  } else if (device.type === 'lock') {
    device.detail = state === 'locked' ? 'Secure · Auto-lock on' : 'Unlocked · Demo only';
  } else if (device.type === 'security') {
    device.detail = state === 'armed' ? 'Motion sensors active' : 'Monitoring paused';
  } else if (device.type === 'speaker') {
    device.detail = state === 'on' ? 'Ready to play' : 'Standby';
  }
  return device;
}

function desiredAction(deviceId, to, reason) {
  const device = getDevice(deviceId);
  if (!device || device.state === to) return null;
  return {
    id: crypto.randomUUID(),
    deviceId,
    deviceName: device.name,
    room: device.room,
    from: device.state,
    to,
    reason,
    status: 'pending'
  };
}

function makePlan(prompt) {
  const text = String(prompt || '').trim().toLowerCase();
  const actions = [];
  let title = 'A plan for your home';
  let summary = 'Here is a suggested set of changes. Review everything before running it.';
  let scene = 'custom';

  const add = (deviceId, to, reason) => {
    const action = desiredAction(deviceId, to, reason);
    if (action) actions.push(action);
  };

  if (/weekend|leaving|leave home|going out|away mode|out of town|travel|vacation/.test(text)) {
    scene = 'away';
    title = 'Prepare your home for away mode';
    summary = 'A simple energy-saving checklist while you are away. These are simulated devices, so no real home equipment will be changed.';
    add('living-light', 'off', 'Turn off lights that are not needed');
    add('bedroom-light', 'off', 'Save energy while nobody is home');
    add('thermostat', 'off', 'Pause comfort heating/cooling in this demo');
    add('front-lock', 'locked', 'Keep the entry secured');
    add('security', 'armed', 'Enable the simulated security system');
    add('speaker', 'off', 'Put the speaker into standby');
  } else if (/good night|bedtime|going to sleep|sleep/.test(text)) {
    scene = 'night';
    title = 'Set up your good-night routine';
    summary = 'Dim the home for bedtime while keeping the entry secure.';
    add('living-light', 'off', 'Switch off the living room lights');
    add('bedroom-light', 'on', 'Keep a bedroom light available');
    add('thermostat', 'on', 'Keep the thermostat in comfort mode');
    add('front-lock', 'locked', 'Confirm the front door is locked');
    add('security', 'armed', 'Arm night-time monitoring');
    add('speaker', 'off', 'Stop speaker playback');
  } else if (/cozy|movie|movie night|relax|evening/.test(text)) {
    scene = 'cozy';
    title = 'Create a cozy evening';
    summary = 'Set up a comfortable evening scene. Review the device changes before applying them.';
    add('living-light', 'on', 'Keep warm living room lighting on');
    add('bedroom-light', 'off', 'Keep unused room lights off');
    add('thermostat', 'on', 'Use the normal comfort setting');
    add('speaker', 'on', 'Make the speaker ready for music');
  } else if (/i('?m| am) home|arrived|back home|welcome home/.test(text)) {
    scene = 'home';
    title = 'Welcome-home scene';
    summary = 'Prepare a comfortable arrival without automatically unlocking doors.';
    add('living-light', 'on', 'Turn on the living room lights');
    add('thermostat', 'on', 'Restore comfort mode');
    add('speaker', 'on', 'Make the speaker ready');
    add('security', 'disarmed', 'Pause the simulated away monitoring');
  } else if (/secure|lock.*door|check.*door/.test(text)) {
    scene = 'secure';
    title = 'Check home security';
    summary = 'Review the entry lock and simulated security state.';
    add('front-lock', 'locked', 'Make sure the front door is locked');
    add('security', 'armed', 'Arm the simulated security system');
  } else if (/energy|save power|save electricity|eco/.test(text)) {
    scene = 'energy';
    title = 'Save energy at home';
    summary = 'Turn off idle devices and reduce unnecessary energy use in this demo.';
    add('living-light', 'off', 'Switch off a light that is not needed');
    add('bedroom-light', 'off', 'Switch off a light that is not needed');
    add('speaker', 'off', 'Put the speaker into standby');
  } else {
    return {
      id: crypto.randomUUID(),
      prompt: String(prompt || ''),
      title: 'Let’s make that actionable',
      summary: 'For this prototype, try “prepare my home for the weekend”, “make a cozy evening”, “good night”, “I’m home”, or “save energy”. These example routines run against simulated devices.',
      scene: 'suggestions',
      planner: 'demo-rules',
      actions: [],
      canExecute: false,
      createdAt: new Date().toISOString()
    };
  }

  const plan = {
    id: crypto.randomUUID(),
    prompt: String(prompt || ''),
    title,
    summary,
    scene,
    planner: 'demo-rules',
    actions,
    canExecute: actions.length > 0,
    createdAt: new Date().toISOString()
  };
  return plan;
}

async function makePlanWithAI(prompt, rules = {}) {
  if (!AI_API_KEY) return null;

  const deviceContext = devices.map(({ id, name, room, type, state }) => ({ id, name, room, type, currentState: state }));
  const systemPrompt = `You are the planning engine for HomePilot AI, a simulated smart-home assistant. Return only valid JSON with this shape: {"title":"short title","summary":"one or two sentences","scene":"away|night|cozy|home|secure|energy|custom","actions":[{"deviceId":"known id","to":"allowed state","reason":"short reason"}]}. Only use these devices and states: living-light=on/off; bedroom-light=on/off; hallway-light=on/off; thermostat=on/off; front-lock=locked only; security=armed/disarmed; speaker=on/off. Never unlock the front door as an automated action; when asked, leave it locked and explain why in the summary. Do not include an action if the device is already in that state. Do not invent devices, claim real devices are connected, or propose more than 8 actions. If the request is unrelated or too vague, return scene=custom with an empty actions array and a helpful summary. This is only a simulator; keep actions benign and practical.`;

  const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Current simulated devices: ${JSON.stringify(deviceContext)}\nActive household context and preferences: ${JSON.stringify(rules)}\nUser request: ${prompt}` }
      ]
    })
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI provider returned an empty response');
  const parsed = JSON.parse(content);
  const allowed = {
    'living-light': ['on', 'off'],
    'bedroom-light': ['on', 'off'],
    'hallway-light': ['on', 'off'],
    thermostat: ['on', 'off'],
    'front-lock': ['locked'],
    security: ['armed', 'disarmed'],
    speaker: ['on', 'off']
  };
  const actions = (Array.isArray(parsed.actions) ? parsed.actions : []).slice(0, 8).flatMap((item) => {
    const device = getDevice(item?.deviceId);
    const to = String(item?.to || '').toLowerCase();
    if (!device || !allowed[device.id]?.includes(to) || device.state === to) return [];
    return [{
      id: crypto.randomUUID(),
      deviceId: device.id,
      deviceName: device.name,
      room: device.room,
      from: device.state,
      to,
      reason: String(item.reason || 'Apply the requested home setting').slice(0, 140),
      status: 'pending'
    }];
  });
  const scenes = ['away', 'night', 'cozy', 'home', 'secure', 'energy', 'custom'];
  return {
    id: crypto.randomUUID(),
    prompt,
    title: String(parsed.title || 'A plan for your home').slice(0, 100),
    summary: String(parsed.summary || 'Review these proposed changes before running them.').slice(0, 500),
    scene: scenes.includes(parsed.scene) ? parsed.scene : 'custom',
    planner: 'ai-api',
    actions,
    canExecute: actions.length > 0,
    createdAt: new Date().toISOString()
  };
}

function snapshot() {
  return { devices, activity: activity.slice(0, 8), awayMode };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, mode: 'simulated-smart-home', planner: AI_API_KEY ? 'optional-ai-api-enabled' : 'built-in-demo-rules', householdRules: true }));
app.get('/api/status', (_req, res) => res.json(snapshot()));
app.get('/api/devices', (_req, res) => res.json({ devices }));
app.get('/api/activity', (_req, res) => res.json({ activity: activity.slice(0, 20) }));

app.post('/api/assistant/plan', async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'Please enter a request first.' });
  if (prompt.length > 500) return res.status(400).json({ error: 'Please keep your request under 500 characters.' });
  const rules = normalizeHouseholdRules(req.body?.rules);
  let plan;
  try {
    plan = await makePlanWithAI(prompt, rules);
  } catch (error) {
    console.warn(`AI planner unavailable; using built-in demo rules (${error.message})`);
  }
  if (!plan) plan = makePlan(prompt);
  plan = applyHouseholdRules(plan, rules, devices, prompt);
  savedPlans.set(plan.id, plan);
  if (savedPlans.size > 50) savedPlans.delete(savedPlans.keys().next().value);
  return res.json({ plan });
});

app.post('/api/assistant/execute', (req, res) => {
  const planId = String(req.body?.planId || '');
  const approved = req.body?.approved === true;
  const plan = savedPlans.get(planId);
  if (!plan) return res.status(404).json({ error: 'This plan expired. Please create it again.' });
  if (!approved) return res.status(400).json({ error: 'Approval is required before a plan can run.' });
  if (plan.actions.length === 0) return res.status(400).json({ error: 'This plan has no actions to run.' });

  const results = plan.actions.map((action) => {
    const device = setState(action.deviceId, action.to);
    return { ...action, status: device ? 'complete' : 'failed' };
  });
  awayMode = plan.scene === 'away' ? true : plan.scene === 'home' ? false : awayMode;
  const successful = results.filter((item) => item.status === 'complete').length;
  activity.unshift({
    id: crypto.randomUUID(),
    title: plan.title,
    detail: `${successful} simulated action${successful === 1 ? '' : 's'} completed; ${plan.policyChecks?.length || 0} household checks recorded`,
    time: new Date().toISOString(),
    status: 'complete'
  });
  savedPlans.delete(planId);
  return res.json({ results, ...snapshot() });
});

app.post('/api/devices/:id/toggle', (req, res) => {
  const device = getDevice(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found.' });
  let next;
  if (device.type === 'lock') next = device.state === 'locked' ? 'unlocked' : 'locked';
  else if (device.type === 'security') next = device.state === 'armed' ? 'disarmed' : 'armed';
  else next = device.state === 'on' ? 'off' : 'on';
  setState(device.id, next);
  activity.unshift({
    id: crypto.randomUUID(),
    title: `${device.name} updated`,
    detail: `Set to ${next} using the dashboard`,
    time: new Date().toISOString(),
    status: 'complete'
  });
  return res.json({ device, ...snapshot() });
});

app.post('/api/reset', (_req, res) => {
  devices = structuredClone(initialDevices);
  awayMode = false;
  savedPlans.clear();
  activity.unshift({ id: crypto.randomUUID(), title: 'Demo home reset', detail: 'All simulated devices returned to their starting state', time: new Date().toISOString(), status: 'complete' });
  return res.json(snapshot());
});

// Serve the built frontend in production; Vite serves it separately during development.
const distDir = path.join(rootDir, 'dist');
app.use(express.static(distDir));
app.get('/{*path}', (_req, res, next) => {
  res.sendFile(path.join(distDir, 'index.html'), (error) => {
    if (error) next();
  });
});

app.listen(PORT, () => {
  console.log(`HomePilot AI server running at http://localhost:${PORT}`);
});
