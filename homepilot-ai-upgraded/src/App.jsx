import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, Bot, Check, CheckCircle2, ChevronDown,
  CircleHelp, Clock3, House, LampDesk, Lightbulb, LoaderCircle,
  LockKeyhole, Menu, Mic, MoonStar, Power, RotateCcw, Send,
  ShieldCheck, Sparkles, Speaker, Thermometer, WandSparkles, Wifi, X, Zap
} from 'lucide-react';

const suggestionList = [
  { label: 'Prepare for the weekend', prompt: "I'm leaving for the weekend", icon: MoonStar },
  { label: 'Make it cozy', prompt: 'Make a cozy evening', icon: LampDesk },
  { label: 'Good night', prompt: 'Good night', icon: MoonStar },
  { label: 'Save energy', prompt: 'Help me save energy', icon: Zap }
];

const iconFor = {
  light: Lightbulb,
  thermostat: Thermometer,
  lock: LockKeyhole,
  security: ShieldCheck,
  speaker: Speaker
};

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  } catch {
    return 'Just now';
  }
}

function stateLabel(device) {
  if (device.type === 'thermostat') return device.state === 'on' ? `${device.temperature}°` : 'Eco';
  if (device.type === 'lock') return device.state === 'locked' ? 'Locked' : 'Unlocked';
  if (device.type === 'security') return device.state === 'armed' ? 'Armed' : 'Standby';
  return device.state === 'on' ? 'On' : 'Off';
}

function App() {
  const [data, setData] = useState({ devices: [], activity: [], awayMode: false });
  const [prompt, setPrompt] = useState('');
  const [plan, setPlan] = useState(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [busyDevice, setBusyDevice] = useState('');
  const [notice, setNotice] = useState('');
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [connected, setConnected] = useState(false);
  const [rules, setRules] = useState({ someoneStaysHome: false, keepPathwayLightOn: true, preserveComfort: true, quietHours: true });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) throw new Error('Server unavailable');
      const nextData = await response.json();
      setData(nextData);
      setConnected(true);
    } catch {
      setConnected(false);
      setNotice('Start the app with npm run dev to connect the demo server.');
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const devices = data.devices || [];
  const lightsOn = devices.filter((device) => device.type === 'light' && device.state === 'on').length;
  const security = devices.find((device) => device.type === 'security');
  const activities = useMemo(() => (data.activity || []).slice(0, showAllActivity ? 8 : 4), [data.activity, showAllActivity]);

  async function createPlan(nextPrompt = prompt) {
    if (!nextPrompt.trim()) return;
    setIsPlanning(true);
    setNotice('');
    setPlan(null);
    try {
      const response = await fetch('/api/assistant/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: nextPrompt, rules })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create a plan.');
      setPlan(result.plan);
      setPrompt(nextPrompt);
    } catch (error) {
      setNotice(error.message || 'Something went wrong while planning.');
    } finally {
      setIsPlanning(false);
    }
  }

  async function executePlan() {
    if (!plan?.id || !plan.canExecute) return;
    setIsExecuting(true);
    setNotice('');
    try {
      const response = await fetch('/api/assistant/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: plan.id, approved: true })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not run this plan.');
      setData({ devices: result.devices, activity: result.activity, awayMode: result.awayMode });
      setPlan({ ...plan, completed: true, results: result.results, canExecute: false });
      setNotice('Plan completed in the simulated home. No physical devices were changed.');
    } catch (error) {
      setNotice(error.message || 'Could not execute the plan.');
    } finally {
      setIsExecuting(false);
    }
  }

  async function toggleDevice(deviceId) {
    setBusyDevice(deviceId);
    setNotice('');
    try {
      const response = await fetch(`/api/devices/${deviceId}/toggle`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update device.');
      setData({ devices: result.devices, activity: result.activity, awayMode: result.awayMode });
    } catch (error) {
      setNotice(error.message || 'Could not update device.');
    } finally {
      setBusyDevice('');
    }
  }

  async function resetDemo() {
    try {
      const response = await fetch('/api/reset', { method: 'POST' });
      const result = await response.json();
      setData(result);
      setPlan(null);
      setNotice('Demo devices restored to their starting state.');
    } catch {
      setNotice('Could not reset the demo home.');
    }
  }

  function toggleRule(ruleName) {
    setRules((current) => ({ ...current, [ruleName]: !current[ruleName] }));
    setPlan(null);
  }

  function onSubmit(event) {
    event.preventDefault();
    createPlan();
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><House size={21} strokeWidth={2.4} /></div>
          <div className="brand-copy"><span>homepilot</span><small>SMART LIVING</small></div>
          <button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileMenu(false)}><X size={19} /></button>
        </div>
        <div className="home-switcher">
          <div className="home-avatar"><House size={17}/></div>
          <div><strong>My Home</strong><span>Personal residence</span></div>
          <ChevronDown size={16} className="muted-icon" />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-link selected" href="#overview" onClick={() => setMobileMenu(false)}><span><House size={18}/></span>Overview <span className="nav-dot"/></a>
          <a className="nav-link" href="#devices" onClick={() => setMobileMenu(false)}><span><Power size={18}/></span>Devices <span className="nav-count">{devices.length}</span></a>
          <a className="nav-link" href="#assistant" onClick={() => setMobileMenu(false)}><span><Sparkles size={18}/></span>AI Assistant <span className="new-pill">NEW</span></a>
          <a className="nav-link" href="#activity" onClick={() => setMobileMenu(false)}><span><Activity size={18}/></span>Activity</a>
        </nav>
        <div className="sidebar-spacer"/>
        <div className="sidebar-help">
          <div className="help-orb"><Sparkles size={20}/></div>
          <strong>Make home feel effortless.</strong>
          <p>Tell HomePilot what you need. Review the plan. Stay in control.</p>
          <a href="#assistant">Try the assistant <ArrowRight size={14}/></a>
        </div>
        <div className="sidebar-profile">
          <div className="profile-avatar">HP</div>
          <div className="profile-copy"><strong>Home owner</strong><span>Demo account</span></div>
          <button className="icon-button" aria-label="Reset demo" title="Reset demo home" onClick={resetDemo}><RotateCcw size={16}/></button>
        </div>
      </aside>

      {mobileMenu && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-open" aria-label="Open menu" onClick={() => setMobileMenu(true)}><Menu size={21}/></button>
            <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
          </div>
          <div className="topbar-right">
            <div className={`connection-pill ${connected ? 'is-connected' : 'is-disconnected'}`}><span className="connection-dot"/>{connected ? 'Demo connected' : 'Connecting…'}</div>
            <button className="icon-button help-button" aria-label="About this demo" title="About this demo" onClick={() => setNotice('HomePilot AI is a simulated prototype. Device changes stay in this demo and do not affect real home equipment.')}><CircleHelp size={18}/></button>
            <div className="top-avatar">HP</div>
          </div>
        </header>

        <section className="welcome-section">
          <div className="welcome-copy">
            <div className="eyebrow"><span className="eyebrow-dot"/> YOUR HOME, IN SYNC</div>
            <h1>Automation that<br/><span>knows the rules.</span></h1>
            <p>Tell HomePilot the outcome you want. It builds a plan, checks your household rules, explains every change, and waits for your approval.</p>
            <a className="text-link" href="#assistant">Meet your home assistant <ArrowRight size={15}/></a>
          </div>
          <div className="welcome-visual" aria-hidden="true">
            <div className="visual-glow"/>
            <div className="visual-window window-one"><span/><span/><span/><div className="window-lines"/></div>
            <div className="visual-window window-two"><span/><span/><div className="window-chart"><i/><i/><i/><i/><i/><i/><i/></div></div>
            <div className="home-illustration">
              <div className="roof"/><div className="house-body"><div className="house-window window-a"/><div className="house-window window-b"/><div className="house-door"/><div className="house-side"/></div>
              <div className="plant plant-left"><i/><i/><i/><b/></div><div className="plant plant-right"><i/><i/><i/><b/></div>
              <div className="ground-shadow"/>
            </div>
            <div className="float-note"><span className="float-note-icon"><WandSparkles size={15}/></span><div><strong>Policy engine ready</strong><small>Rules checked before actions</small></div><span className="float-check"><Check size={13}/></span></div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Home summary">
          <article className="stat-card"><div className="stat-icon lavender"><House size={18}/></div><div className="stat-heading">DEVICES ONLINE <span className="tiny-chevron">↗</span></div><div className="stat-value">{devices.length}<small> / {devices.length}</small></div><div className="stat-foot"><span className="status-mini"/> All systems responding</div></article>
          <article className="stat-card"><div className="stat-icon amber"><Lightbulb size={18}/></div><div className="stat-heading">LIGHTS ON</div><div className="stat-value">{lightsOn}<small> rooms active</small></div><div className="stat-foot">Across your demo home</div></article>
          <article className="stat-card"><div className="stat-icon mint"><ShieldCheck size={18}/></div><div className="stat-heading">HOME SECURITY</div><div className="stat-value status-value">{security?.state === 'armed' ? 'Protected' : 'Standby'}</div><div className="stat-foot"><span className={`status-mini ${security?.state === 'armed' ? '' : 'status-muted'}`}/>{security?.state === 'armed' ? 'Monitoring is active' : 'Monitoring is paused'}</div></article>
          <article className="stat-card"><div className="stat-icon blue"><Zap size={18}/></div><div className="stat-heading">HOME MODE</div><div className="stat-value status-value">{data.awayMode ? 'Away' : 'At home'}</div><div className="stat-foot">{data.awayMode ? 'Energy-saving routine' : 'Comfort routine'}</div></article>
        </section>

        <section className="rules-panel" id="rules" aria-labelledby="rules-title">
          <div className="rules-header">
            <div className="rules-title-wrap">
              <div className="rules-symbol"><ShieldCheck size={20}/></div>
              <div>
                <div className="rules-eyebrow">HOUSEHOLD RULE ENGINE</div>
                <h2 id="rules-title">Your rules come before automation.</h2>
                <p>HomePilot checks each proposed plan against these preferences before you approve it.</p>
              </div>
            </div>
            <div className="hard-guardrail"><LockKeyhole size={14}/><span><strong>Always enforced</strong><small>Never auto-unlock an exterior door</small></span></div>
          </div>
          <div className="rules-grid">
            <button type="button" className={`rule-card ${rules.someoneStaysHome ? 'rule-enabled' : ''}`} aria-pressed={rules.someoneStaysHome} onClick={() => toggleRule('someoneStaysHome')}>
              <span className="rule-icon occupancy-icon"><House size={17}/></span>
              <span className="rule-copy"><strong>Someone stays home</strong><small>Adapt away plans for an occupied home</small></span>
              <span className={`rule-switch ${rules.someoneStaysHome ? 'switch-on' : ''}`}><i/></span>
            </button>
            <button type="button" className={`rule-card ${rules.keepPathwayLightOn ? 'rule-enabled' : ''}`} aria-pressed={rules.keepPathwayLightOn} onClick={() => toggleRule('keepPathwayLightOn')}>
              <span className="rule-icon light-icon"><Lightbulb size={17}/></span>
              <span className="rule-copy"><strong>Keep pathway lighting</strong><small>Leave the hallway light on if occupied</small></span>
              <span className={`rule-switch ${rules.keepPathwayLightOn ? 'switch-on' : ''}`}><i/></span>
            </button>
            <button type="button" className={`rule-card ${rules.preserveComfort ? 'rule-enabled' : ''}`} aria-pressed={rules.preserveComfort} onClick={() => toggleRule('preserveComfort')}>
              <span className="rule-icon comfort-icon"><Thermometer size={17}/></span>
              <span className="rule-copy"><strong>Preserve comfort</strong><small>Keep comfort mode when someone stays home</small></span>
              <span className={`rule-switch ${rules.preserveComfort ? 'switch-on' : ''}`}><i/></span>
            </button>
            <button type="button" className={`rule-card ${rules.quietHours ? 'rule-enabled' : ''}`} aria-pressed={rules.quietHours} onClick={() => toggleRule('quietHours')}>
              <span className="rule-icon quiet-icon"><MoonStar size={17}/></span>
              <span className="rule-copy"><strong>Quiet hours</strong><small>Keep speakers off in night routines</small></span>
              <span className={`rule-switch ${rules.quietHours ? 'switch-on' : ''}`}><i/></span>
            </button>
          </div>
          <div className="rules-footer"><ShieldCheck size={14}/><span>Policy checks are deterministic and separate from the AI planner. You approve every plan.</span><span className="rules-active-count">{Object.values(rules).filter(Boolean).length + 1} safeguards active</span></div>
        </section>

        <div className="content-grid">
          <section className="panel assistant-panel" id="assistant">
            <div className="panel-heading assistant-heading">
              <div className="assistant-title-group"><div className="assistant-symbol"><Bot size={21}/><span/></div><div><h2>Ask HomePilot</h2><p>Your personal home assistant</p></div></div>
              <span className="ai-badge"><Sparkles size={12}/> RULE-AWARE PLANNER</span>
            </div>
            <div className="assistant-chat">
              <div className="assistant-message-row"><div className="message-avatar"><Bot size={16}/></div><div className="assistant-message"><div className="message-author">HomePilot <span>· rule-aware assistant</span></div><p>Hi there! I can plan multi-device routines and check your household rules first. Try: “I'm leaving for the weekend, but someone stays home. Keep the hallway light on.”</p></div></div>
              {plan && <div className="plan-card">
                <div className="plan-topline"><span className="plan-label"><WandSparkles size={14}/> {plan.planner === 'ai-api' ? 'AI-GENERATED PLAN' : 'DEMO PLAN'}</span>{plan.completed ? <span className="completed-badge"><CheckCircle2 size={13}/> Completed</span> : <span className="review-badge">Review first</span>}</div>
                <h3>{plan.title}</h3><p className="plan-summary">{plan.summary}</p>
                {plan.actions?.length > 0 ? <div className="action-list">{plan.actions.map((action, index) => <div className="action-row" key={action.id || `${action.deviceId}-${index}`}><div className={`action-status ${plan.completed ? 'done' : ''}`}>{plan.completed ? <Check size={13}/> : <span>{index + 1}</span>}</div><div className="action-main"><strong>{action.deviceName}</strong><small>{action.reason}</small></div><div className="action-change"><span>{action.from}</span><ArrowRight size={12}/><b>{action.to}</b></div></div>)}</div> : <div className="empty-hint"><CircleHelp size={17}/><span>Choose a suggested request below to create a demo plan.</span></div>}
                {plan.policyChecks?.length > 0 && <div className="policy-audit">
                  <div className="policy-audit-heading"><div><ShieldCheck size={15}/><strong>Household rule check</strong></div><span>{plan.policyChecks.length} rules reviewed</span></div>
                  <div className="policy-check-list">{plan.policyChecks.map((check) => <div className="policy-check" key={check.id}><span className={`policy-check-icon ${check.status === 'applied' || check.status === 'enforced' ? 'policy-applied' : ''}`}><Check size={11}/></span><div><strong>{check.name}</strong><small>{check.detail}</small></div><span className={`policy-status ${check.status === 'applied' || check.status === 'enforced' ? 'policy-status-applied' : ''}`}>{check.status === 'applied' ? 'APPLIED' : check.status === 'enforced' ? 'ENFORCED' : 'CHECKED'}</span></div>)}</div>
                </div>}
                {plan.actions?.length > 0 && !plan.completed && <div className="plan-actions"><span><LockKeyhole size={13}/> Nothing runs without your approval.</span><button className="approve-button" disabled={isExecuting} onClick={executePlan}>{isExecuting ? <><LoaderCircle size={15} className="spin"/> Running…</> : <>Approve & run <ArrowRight size={15}/></>}</button></div>}
                {plan.completed && <div className="success-strip"><CheckCircle2 size={15}/> All actions were applied to the simulated home.</div>}
              </div>}
            </div>
            <div className="suggestion-area">
              <span className="suggestion-caption">QUICK REQUESTS</span>
              <div className="suggestion-chips">{suggestionList.map(({ label, prompt: value, icon: Icon }) => <button className="suggestion-chip" key={label} onClick={() => createPlan(value)} disabled={isPlanning}><Icon size={14}/>{label}</button>)}</div>
            </div>
            <form className="prompt-form" onSubmit={onSubmit}>
              <input aria-label="Ask HomePilot" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={500} placeholder="Tell me what you need…" />
              <button className="mic-button" type="button" title="Voice input is not enabled in this prototype" aria-label="Voice input unavailable" onClick={() => setNotice('Voice input is not enabled in this prototype. Type a request to continue.')}><Mic size={17}/></button>
              <button className="send-button" type="submit" disabled={isPlanning || !prompt.trim()} aria-label="Send request">{isPlanning ? <LoaderCircle size={17} className="spin"/> : <Send size={17}/>}</button>
            </form>
            <div className="assistant-footnote"><ShieldCheck size={13}/> Review every action before it runs <span>·</span> <span className="sim-label">Simulation only</span></div>
          </section>

          <section className="panel devices-panel" id="devices">
            <div className="panel-heading"><div><h2>Home devices</h2><p>Manage your connected spaces</p></div><button className="more-button" onClick={refresh} aria-label="Refresh devices" title="Refresh devices"><RotateCcw size={16}/></button></div>
            <div className="device-list">{devices.map((device) => {
              const Icon = iconFor[device.type] || Power;
              const active = ['on', 'armed', 'locked'].includes(device.state);
              return <div className="device-row" key={device.id}>
                <div className={`device-icon device-${device.type} ${active ? 'device-active' : ''}`}><Icon size={19}/></div>
                <div className="device-info"><strong>{device.name}</strong><span>{device.room} <i>·</i> {device.detail}</span></div>
                <div className="device-control"><span className={`device-state ${active ? 'on' : ''}`}>{stateLabel(device)}</span><button className={`toggle ${active ? 'toggle-on' : ''}`} aria-label={`Toggle ${device.name}`} aria-pressed={active} disabled={busyDevice === device.id} onClick={() => toggleDevice(device.id)}><span/></button></div>
              </div>;
            })}</div>
            <div className="devices-footer"><div className="wifi-indicator"><Wifi size={15}/><span>Demo network stable</span></div><button className="link-button" onClick={resetDemo}>Reset demo <RotateCcw size={13}/></button></div>
          </section>
        </div>

        <section className="panel activity-panel" id="activity">
          <div className="panel-heading activity-heading"><div><h2>Recent activity</h2><p>A transparent history of your home</p></div><button className="link-button" onClick={() => setShowAllActivity(!showAllActivity)}>{showAllActivity ? 'Show less' : 'View all'} <ArrowRight size={14}/></button></div>
          <div className="activity-table"><div className="activity-table-head"><span>EVENT</span><span>DETAILS</span><span>TIME</span><span>STATUS</span></div>{activities.map((item) => <div className="activity-row" key={item.id}><div className="activity-event"><span className="activity-check"><Check size={13}/></span><strong>{item.title}</strong></div><div className="activity-detail">{item.detail}</div><div className="activity-time"><Clock3 size={13}/>{formatTime(item.time)}</div><div><span className="activity-status"><span/> Completed</span></div></div>)}</div>
          <div className="activity-note"><ShieldCheck size={14}/> Activity is stored in memory for this local demo and resets when the server restarts.</div>
        </section>

        <footer className="footer"><span>© 2026 HomePilot AI</span><span className="footer-center"><span className="footer-dot"/> Explainable, rule-aware automation</span><span className="footer-right">A simulated smart-home experience <span>·</span> <a href="#overview">Back to top ↑</a></span></footer>
      </main>
      {notice && <div className="toast" role="status"><div className="toast-icon"><CheckCircle2 size={17}/></div><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice('')}><X size={16}/></button></div>}
    </div>
  );
}

export default App;
