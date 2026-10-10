import { ArrowUpRight, Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge.jsx";

export default function RunRow({ run }) {
  const navigate = useNavigate();
  const date = run.updatedAt || run.createdAt;
  return (
    <button className="run-row" onClick={() => navigate(`/healing/${run.id}`)}>
      <span className={`run-symbol ${run.status === "failed" ? "symbol-failed" : run.status === "needs_review" ? "symbol-review" : "symbol-healed"}`}>
        {run.status === "failed" ? "!" : run.status === "needs_review" ? "?" : "✓"}
      </span>
      <span className="run-name-cell">
        <strong>{run.testName || "Untitled test"}</strong>
        <small><Clock3 size={12} /> {date ? new Date(date).toLocaleString() : "Just now"}</small>
      </span>
      <span className="run-selector" title={run.websiteUrl || run.oldSelector || ""}>{run.websiteUrl || run.oldSelector || "—"}</span>
      <StatusBadge status={run.status} />
      <ArrowUpRight size={16} className="run-open" />
    </button>
  );
}