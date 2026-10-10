import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, CirclePlay, FlaskConical, RefreshCw, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard.jsx";
import RunRow from "../components/RunRow.jsx";
import { getDashboard, getRuns, startRun } from "../services/api.js";

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [scenario, setScenario] = useState("healable");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [goal, setGoal] = useState("");
  const [openApiSpecUrl, setOpenApiSpecUrl] = useState("");
  const [openApiSpecFile, setOpenApiSpecFile] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [dash, runList] = await Promise.all([getDashboard(), getRuns()]);
      setDashboard(dash);
      setRuns(runList);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!runs.some((r) => r.status === "running" || r.status === "queued")) return;
    const timer = setInterval(load, 1200);
    return () => clearInterval(timer);
  }, [runs, load]);

  async function handleRun(event) {
    event.preventDefault();
    try {
      setRunning(true);
      setError("");
      if (openApiSpecUrl && openApiSpecFile) {
        throw new Error("Provide an OpenAPI spec URL or upload a file, not both.");
      }
      if (openApiSpecFile && openApiSpecFile.size > 50000) {
        throw new Error("The OpenAPI spec file must be 50 KB or smaller.");
      }
      if (openApiSpecFile && openApiSpecFile.size === 0) {
        throw new Error("The OpenAPI spec file cannot be empty.");
      }
      const openApiSpecText = openApiSpecFile ? await openApiSpecFile.text() : null;
      const result = await startRun({
        websiteUrl,
        goal,
        openApiSpecUrl: openApiSpecUrl || undefined,
        openApiSpecText: openApiSpecText || undefined,
        openApiSpecName: openApiSpecFile?.name
      });
      await load();
      if (result.id) window.history.replaceState(null, "", window.location.pathname);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  async function handleDemoRun() {
    try {
      setRunning(true);
      setError("");
      await startRun(scenario);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  const stats = dashboard?.stats || {};
  return (
    <div className="page-wrap">
      <header className="topbar">
        <div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>Dashboard</strong></div>
        <div className="topbar-right"><span className="live-indicator"><i /> API connected when available</span><div className="avatar">RK</div></div>
      </header>

      <section className="welcome-row">
        <div>
          <div className="eyebrow"><Sparkles size={14} /> INTELLIGENT TEST AUTOMATION</div>
          <h1>Test any website <span>by goal.</span></h1>
          <p className="page-description">Describe what should work; the browser agent checks the public site and reports the visible evidence.</p>
        </div>
      </section>

      <form className="test-input-panel" onSubmit={handleRun}>
        <label className="test-field">
          <span>Website URL</span>
          <input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" required />
        </label>
        <label className="test-field">
          <span>What should the test check?</span>
          <textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="For example: Open the pricing page and verify the plans are visible." maxLength={2000} rows={3} required />
        </label>
        <details className="openapi-options">
          <summary>Optional OpenAPI spec (browser context only)</summary>
          <label className="test-field">
            <span>Spec URL</span>
            <input type="url" value={openApiSpecUrl} onChange={(event) => setOpenApiSpecUrl(event.target.value)} placeholder="https://example.com/openapi.json" disabled={Boolean(openApiSpecFile)} />
          </label>
          <label className="test-field upload-field">
            <span><Upload size={14} /> Or upload a JSON/YAML spec (max 50 KB)</span>
            <input type="file" accept=".json,.yaml,.yml,application/json,text/yaml,application/yaml" onChange={(event) => {
              setOpenApiSpecFile(event.target.files?.[0] || null);
              if (event.target.files?.[0]) setOpenApiSpecUrl("");
            }} />
          </label>
        </details>
        <p className="test-safety-note">Page content, your goal, and any spec are sent to the configured OpenAI API. Public pages only; the agent won’t log in, submit forms, purchase, delete, or perform other consequential actions.</p>
        <button className="primary-button" type="submit" disabled={running}>
          {running ? <RefreshCw className="spin" size={17} /> : <CirclePlay size={17} />}
          {running ? "Starting test…" : "Run website test"}
        </button>
      </form>

      <div className="scenario-bar">
        <div><FlaskConical size={16} /><span>Demo scenario</span></div>
        <select value={scenario} onChange={(e) => setScenario(e.target.value)} aria-label="Choose demo scenario">
          <option value="healable">UI changed — attempt healing</option>
          <option value="app-failure">Application failure — should fail</option>
          <option value="ambiguous">Ambiguous replacement — review</option>
        </select>
        <button className="text-button" onClick={handleDemoRun} disabled={running}><CirclePlay size={14} /> Run demo</button>
        <button className="text-button" onClick={load}><RefreshCw size={14} /> Refresh data</button>
      </div>

      {error && <div className="error-banner"><AlertTriangle size={17} /><span>{error}</span><button onClick={load}>Retry</button></div>}

      <section className="section-block">
        <div className="section-heading"><div><h2>Overview</h2><p>Calculated from backend test-run history</p></div><span className="subtle-label"><Activity size={14} /> Live data</span></div>
        {loading ? <div className="loading-panel">Loading dashboard data…</div> : (
          <div className="stats-grid">
            <StatCard title="Total test runs" value={stats.totalTests ?? 0} subtitle="All recorded runs" icon={FlaskConical} accent="violet" />
            <StatCard title="Passed / healed" value={stats.successfulTests ?? stats.healedTests ?? 0} subtitle="Demo or AI-reported pass" icon={Sparkles} accent="green" />
            <StatCard title="Failed tests" value={stats.failedTests ?? 0} subtitle="Application or test failure" icon={AlertTriangle} accent="red" />
            <StatCard title="Pass rate" value={`${stats.healingRate ?? 0}%`} subtitle={`${stats.needsReview ?? 0} need review` } icon={ShieldCheck} accent="blue" />
          </div>
        )}
      </section>

      <section className="section-block runs-section">
        <div className="section-heading"><div><h2>Recent test runs</h2><p>Open a run to inspect selectors, logs, and verification</p></div><Link to="/healing/latest" className="inline-link">Healing Studio <ArrowRight size={15} /></Link></div>
        <div className="run-table">
          <div className="run-table-head"><span>TEST RUN</span><span>SELECTOR / WEBSITE</span><span>STATUS</span><span /></div>
          {loading ? <div className="empty-state">Loading recent runs…</div> : runs.length ? runs.slice(0, 8).map((run) => <RunRow key={run.id} run={run} />) : (
            <div className="empty-state"><div className="empty-icon"><CheckCircle2 size={22} /></div><strong>No test runs yet</strong><p>Choose a scenario above and click “Run test suite” to create your first real run.</p></div>
          )}
        </div>
      </section>
      <footer className="page-footer">HealTest AI <span>·</span> Repairs are only accepted after outcome verification.</footer>
    </div>
  );
}