import test from 'node:test';
import assert from 'node:assert/strict';
import { applyHouseholdRules, normalizeHouseholdRules } from './householdRules.js';

const devices = [
  { id: 'living-light', name: 'Living room lights', room: 'Living room', type: 'light', state: 'on' },
  { id: 'bedroom-light', name: 'Bedroom lights', room: 'Bedroom', type: 'light', state: 'off' },
  { id: 'hallway-light', name: 'Hallway pathway light', room: 'Hallway', type: 'light', state: 'off' },
  { id: 'thermostat', name: 'Thermostat', room: 'Hallway', type: 'thermostat', state: 'on' },
  { id: 'front-lock', name: 'Front door lock', room: 'Entryway', type: 'lock', state: 'locked' },
  { id: 'security', name: 'Security system', room: 'Whole home', type: 'security', state: 'disarmed' },
  { id: 'speaker', name: 'Smart speaker', room: 'Living room', type: 'speaker', state: 'on' }
];

function action(deviceId, to, from = 'off') {
  const device = devices.find((item) => item.id === deviceId);
  return { id: `action-${deviceId}`, deviceId, deviceName: device.name, room: device.room, from, to, reason: 'test action', status: 'pending' };
}

function plan(scene, actions, prompt = '') {
  return { id: 'plan-1', prompt, title: 'Test plan', summary: 'Test summary', scene, actions, canExecute: actions.length > 0 };
}

test('normalizes missing rules to safe defaults', () => {
  assert.deepEqual(normalizeHouseholdRules({}), {
    someoneStaysHome: false,
    keepPathwayLightOn: true,
    preserveComfort: true,
    quietHours: true
  });
});

test('occupied-home rule preserves comfort and pathway light and skips away arming', () => {
  const input = plan('away', [
    action('living-light', 'off', 'on'),
    action('thermostat', 'off', 'on'),
    action('security', 'armed', 'disarmed'),
    action('front-lock', 'unlocked', 'locked')
  ], "I'm leaving for the weekend, but someone stays home.");
  const result = applyHouseholdRules(input, {
    someoneStaysHome: true,
    keepPathwayLightOn: true,
    preserveComfort: true,
    quietHours: true
  }, structuredClone(devices));

  assert.equal(result.scene, 'home');
  assert.equal(result.title, 'Away plan adapted for an occupied home');
  assert.ok(!result.actions.some((item) => item.deviceId === 'security' && item.to === 'armed'));
  assert.ok(!result.actions.some((item) => item.deviceId === 'living-light' && item.to === 'off'), 'keep an already-on living room light on while someone remains home');
  assert.ok(!result.actions.some((item) => item.deviceId === 'speaker' && item.to === 'off'), 'do not silence an active speaker when someone remains home');
  assert.ok(!result.actions.some((item) => item.deviceId === 'thermostat' && item.to === 'off'));
  assert.ok(result.actions.some((item) => item.deviceId === 'hallway-light' && item.to === 'on'));
  assert.ok(!result.actions.some((item) => item.deviceId === 'front-lock' && item.to === 'unlocked'));
  assert.equal(result.canExecute, true);
  assert.ok(result.policyChecks.some((item) => item.id === 'occupancy' && item.status === 'applied'));
});

test('quiet-hours rule forces the speaker off for a good-night plan', () => {
  const input = plan('night', [action('speaker', 'on', 'on')], 'Good night');
  const result = applyHouseholdRules(input, { quietHours: true }, structuredClone(devices));
  assert.ok(result.actions.some((item) => item.deviceId === 'speaker' && item.to === 'off'));
  assert.ok(result.policyChecks.some((item) => item.id === 'quiet-hours' && item.status === 'applied'));
});

test('automatic exterior-door unlocking is always blocked', () => {
  const input = plan('custom', [action('front-lock', 'unlocked', 'locked')], 'Unlock the front door');
  const result = applyHouseholdRules(input, {}, structuredClone(devices));
  assert.ok(!result.actions.some((item) => item.deviceId === 'front-lock' && item.to === 'unlocked'));
  assert.ok(result.policyChecks.some((item) => item.id === 'door-lock' && item.status === 'enforced'));
});

test('a normal away plan does not force the pathway light on when the home is empty', () => {
  const input = plan('away', [action('living-light', 'off', 'on')], "I'm leaving for the weekend");
  const result = applyHouseholdRules(input, { someoneStaysHome: false, keepPathwayLightOn: true }, structuredClone(devices));
  assert.ok(!result.actions.some((item) => item.deviceId === 'hallway-light' && item.to === 'on'));
  assert.equal(result.scene, 'away');
});
