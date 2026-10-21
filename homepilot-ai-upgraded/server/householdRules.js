import { randomUUID } from 'node:crypto';

export const defaultHouseholdRules = {
  someoneStaysHome: false,
  keepPathwayLightOn: true,
  preserveComfort: true,
  quietHours: true
};

export function normalizeHouseholdRules(input) {
  const rules = {};
  for (const [key, fallback] of Object.entries(defaultHouseholdRules)) {
    rules[key] = typeof input?.[key] === 'boolean' ? input[key] : fallback;
  }
  return rules;
}

export function applyHouseholdRules(plan, incomingRules, deviceList, requestText = '') {
  const rules = normalizeHouseholdRules(incomingRules);
  const text = String(requestText || plan.prompt || '').toLowerCase();
  const actions = Array.isArray(plan.actions) ? plan.actions.map((action) => ({ ...action })) : [];

  // Add or update a planned action so policy enforcement is deterministic and explainable.
  function enforce(deviceId, targetState, reason) {
    const device = deviceList.find((item) => item.id === deviceId);
    if (!device) return;
    const existingIndex = actions.findIndex((action) => action.deviceId === deviceId);
    if (device.state === targetState) {
      if (existingIndex >= 0) actions.splice(existingIndex, 1);
      return;
    }
    const replacement = {
      id: existingIndex >= 0 ? actions[existingIndex].id : randomUUID(),
      deviceId,
      deviceName: device.name,
      room: device.room,
      from: device.state,
      to: targetState,
      reason,
      status: 'pending'
    };
    if (existingIndex >= 0) actions[existingIndex] = replacement;
    else actions.push(replacement);
  }

  // Hard safety rule: the assistant never plans automatic exterior-door unlocking.
  const blockedUnlocks = actions.filter((action) => action.deviceId === 'front-lock' && action.to === 'unlocked').length;
  const safeActions = actions.filter((action) => !(action.deviceId === 'front-lock' && action.to === 'unlocked'));
  actions.length = 0;
  actions.push(...safeActions);

  const isNightRoutine = plan.scene === 'night' || /good night|bedtime|going to sleep|sleep/.test(text);
  const isAwayRoutine = plan.scene === 'away' || /weekend|leaving|leave home|going out|out of town|travel|vacation|away mode/.test(text);

  if (rules.someoneStaysHome && isAwayRoutine) {
    // Avoid turning an occupied home into an away/armed state or switching off lights already in use.
    for (let index = actions.length - 1; index >= 0; index -= 1) {
      const action = actions[index];
      const device = deviceList.find((item) => item.id === action.deviceId);
      if ((action.deviceId === 'security' && action.to === 'armed') ||
          ((device?.type === 'light' || device?.type === 'speaker') && action.to === 'off' && device.state === 'on')) {
        actions.splice(index, 1);
      }
    }
    plan.scene = 'home';
    plan.title = 'Away plan adapted for an occupied home';
    plan.summary = 'HomePilot noticed that someone will stay home. It keeps active lights and the speaker unchanged, skips the automatic away-arming step, preserves comfort if enabled, and applies your pathway-light preference. Review every action before running it.';
  }

  if (rules.someoneStaysHome && rules.preserveComfort) {
    enforce('thermostat', 'on', 'Preserve the comfort setting because someone is staying home');
  }

  if (rules.someoneStaysHome && rules.keepPathwayLightOn) {
    enforce('hallway-light', 'on', 'Keep a pathway light available while someone is home');
  }

  if (rules.quietHours && isNightRoutine) {
    enforce('speaker', 'off', 'Quiet-hours rule: keep the speaker off during the night routine');
  }

  plan.actions = actions;
  plan.canExecute = actions.length > 0;
  plan.householdRules = rules;
  plan.policyChecks = [
    {
      id: 'door-lock',
      name: 'Exterior-door safeguard',
      status: 'enforced',
      detail: blockedUnlocks > 0
        ? 'An automatic unlock suggestion was blocked. The assistant will never unlock the exterior door for you.'
        : 'Automatic exterior-door unlocking is blocked by design.'
    },
    {
      id: 'occupancy',
      name: 'Occupancy context',
      status: rules.someoneStaysHome && isAwayRoutine ? 'applied' : 'checked',
      detail: rules.someoneStaysHome && isAwayRoutine
        ? 'Someone is marked as staying home, so the full away/security routine was softened.'
        : rules.someoneStaysHome
          ? 'Someone is marked as staying home; occupancy-aware rules are active.'
          : 'No occupant is marked as staying home for this plan.'
    },
    {
      id: 'pathway',
      name: 'Pathway-light preference',
      status: rules.someoneStaysHome && rules.keepPathwayLightOn ? 'applied' : 'checked',
      detail: rules.someoneStaysHome && rules.keepPathwayLightOn
        ? 'The hallway pathway light is kept on while someone remains home.'
        : 'The pathway-light preference applies when someone is marked as staying home.'
    },
    {
      id: 'comfort',
      name: 'Comfort preference',
      status: rules.someoneStaysHome && rules.preserveComfort ? 'applied' : 'checked',
      detail: rules.someoneStaysHome && rules.preserveComfort
        ? 'The thermostat is preserved in comfort mode for the remaining occupant.'
        : 'Comfort preservation applies when someone is marked as staying home.'
    },
    {
      id: 'quiet-hours',
      name: 'Quiet-hours preference',
      status: rules.quietHours && isNightRoutine ? 'applied' : 'checked',
      detail: rules.quietHours && isNightRoutine
        ? 'The speaker will be off as part of the night routine.'
        : 'Quiet hours apply to bedtime and good-night routines.'
    }
  ];
  return plan;
}

