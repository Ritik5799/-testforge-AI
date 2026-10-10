import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock3, Code2, Copy, FileSearch, RefreshCw, ShieldCheck, Sparkles, TerminalSquare } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "../components/StatusBadge.jsx";
import { getRun, getRuns } from "../services/api.js";

export default function HealingStudio() {
  const { runId } = useParams();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      if (runId === "latest") {
        const runs = await getRuns();
        if (!runs.length) { setRun(null); setLoading(false); return; }
        setRun(await getRun(runs[0].id));
      } else {
        setRun(await getRun(runId));
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [runId]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => {
    if (!run || !["running", "queued"].includes(run.status)) return;
    const timer = setInterval(load, 1000);
    return () => clearInterval(timer);
  }, [run, load]);

  async function copy(text) {
    try { await navigator.clipboard.writeText(text || ""); }
    catch { setError("Clipboard access is unavailable in this browser."); }
  }

  if (loading) return <div className="page-wrap"><div className="loading-panel">Loading test run…</div></div>;

  return (
    <div className="page-wrap">
      <header className="topbar"><div className="breadcrumbs"><Link to="/">Workspace</Link><span>/</span><strong>Healing Studio</strong></div><div className="topbar-right"><div className="avatar">RK</div></div></header>
      <div className="studio-back"><Link to="/"><ArrowLeft size={15} /> Back to dashboard</Link><button className="icon-button" onClick={load} aria-label="Refresh run"><RefreshCw size={16} /></button></div>

      {error && <div className="error-banner"><CircleAlert size={17} /><span>{error}</span></div>}
      {!run ? (
        <div className="empty-state studio-empty"><div className="empty-icon"><FileSearch size={24} /></div><strong>No run selected</strong><p>Run a test from the dashboard, then open it here to inspect its repair details.</p><Link className="primary-button" to="/">Go to dashboard</Link></div>
      ) : (
        <>
          <section className="studio-title-row">
            <div><div className="eyebrow"><Sparkles size={14} /> REPAIR INSPECTOR</div><h1>{run.testName}</h1><p className="page-description">Review the failure, proposed replacement, and final verification.</p></div>
            <StatusBadge status={run.status} />
          </section>

          <div className="studio-meta">
            <div><span>RUN ID</span><strong title={run.id}>{run.id.slice(0, 8)}…</strong><button className="tiny-icon" onClick={() => copy(run.id)} aria-label="Copy run ID"><Copy size={13} /></button></div>
            <div><span>STARTED</span><strong>{run.createdAt ? new Date(run.createdAt).toLocaleString() : "—"}</strong></div>
            <div><span>CONFIDENCE</span><strong>{typeof run.confidence === "number" ? `${Math.round(run.confidence * 100)}%` : "—"}</strong></div>
          </div>

          <div className="studio-grid">
            <section className="panel">
              <div className="panel-heading"><div className="panel-icon red"><CircleAlert size={17} /></div><div><h2>Original failure</h2><p>What caused the test to stop?</p></div></div>
              <div className="detail-label">FAILURE REASON</div><div className="detail-box">{run.failureReason || (run.status === "healed" ? "No outstanding failure. Test outcome verified." : "Waiting for runner result.")}</div>
              <div className="detail-label">ORIGINAL SELECTOR</div>
              <div className="code-box"><code>{run.oldSelector || "—"}</code><button onClick={() => copy(run.oldSelector)} aria-label="Copy original selector"><Copy size={14} /></button></div>
            </section>

            <section className="panel">
              <div className="panel-heading"><div className="panel-icon violet"><Sparkles size={17} /></div><div><h2>Healing proposal</h2><p>Candidate selected by the runner</p></div></div>
              <div className="detail-label">REPLACEMENT SELECTOR</div>
              <div className="code-box"><code>{run.newSelector || "No replacement applied"}</code>{run.newSelector && <button onClick={() => copy(run.newSelector)} aria-label="Copy replacement selector"><Copy size={14} /></button>}</div>
              <div className="confidence-row"><span>Candidate confidence</span><strong>{typeof run.confidence === "number" ? `${Math.round(run.confidence * 100)}%` : "Pending"}</strong></div>
              <p className="helper-note">Confidence is not proof of success. The expected outcome must pass too.</p>
            </section>

            <section className="panel verification-panel">
              <div className="panel-heading"><div className={`panel-icon ${run.verified ? "green" : "blue"}`}>{run.verified ? <CheckCircle2 size={17} /> : <ShieldCheck size={17} />}</div><div><h2>Outcome verification</h2><p>Did the intended behavior actually succeed?</p></div></div>
              <div className={`verification-result ${run.verified ? "verified" : "not-verified"}`}>
                {run.verified ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}
                <div><strong>{run.verified ? "Verified" : run.status === "running" ? "Verification in progress" : "Not verified"}</strong><p>{run.summary || "Waiting for test runner."}</p></div>
              </div>
            </section>

            <section className="panel logs-panel">
              <div className="panel-heading"><div className="panel-icon blue"><TerminalSquare size={17} /></div><div><h2>Execution logs</h2><p>Chronological events from the backend runner</p></div><span className="log-count">{run.logs?.length || 0} events</span></div>
              <div className="log-list">
                {(run.logs || []).map((item, index) => (
                  <div className="log-item" key={`${item.at}-${index}`}>
                    <span className={`log-level ${item.level || "info"}`} />
                    <span className="log-time">{item.at ? new Date(item.at).toLocaleTimeString() : "--:--"}</span>
                    <span className="log-message">{item.message}</span>
                  </div>
                ))}
                {!run.logs?.length && <p className="muted-text">No logs recorded yet.</p>}
              </div>
            </section>
          </div>
        </>
      )}
      <footer className="page-footer">HealTest AI <span>·</span> Inspect the evidence before accepting a repair.</footer>
    </div>
  );
}