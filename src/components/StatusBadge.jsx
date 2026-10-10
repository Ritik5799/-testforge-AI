const config = {
  healed: { label: "Healed", className: "healed" },
  passed: { label: "Passed", className: "healed" },
  failed: { label: "Failed", className: "failed" },
  needs_review: { label: "Needs review", className: "review" },
  running: { label: "Running", className: "running" },
  queued: { label: "Queued", className: "running" }
};

export default function StatusBadge({ status = "queued" }) {
  const item = config[status] || { label: status.replaceAll("_", " "), className: "neutral" };
  return <span className={`status-badge ${item.className}`}><i />{item.label}</span>;
}