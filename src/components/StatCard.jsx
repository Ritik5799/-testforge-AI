import { ArrowUpRight } from "lucide-react";

export default function StatCard({ title, value, subtitle, icon: Icon, accent = "violet" }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span className={`stat-icon ${accent}`}><Icon size={19} /></span>
        <ArrowUpRight className="stat-arrow" size={16} />
      </div>
      <p className="stat-title">{title}</p>
      <div className="stat-value">{value}</div>
      <p className="stat-subtitle">{subtitle}</p>
    </article>
  );
}