import { Activity, FlaskConical, LayoutDashboard, ShieldCheck, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/" className="brand">
        <span className="brand-mark"><Sparkles size={21} /></span>
        <span><strong>HealTest<span className="brand-ai"> AI</span></strong><small>SELF-HEALING TESTS</small></span>
      </NavLink>

      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <LayoutDashboard size={18} /> <span>Dashboard</span>
        </NavLink>
        <NavLink to="/healing/latest" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <FlaskConical size={18} /> <span>Healing Studio</span>
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-status-icon"><ShieldCheck size={18} /></div>
        <div><strong>Test integrity</strong><p>Verify before healing</p></div>
        <span className="status-dot" />
      </div>
      <div className="sidebar-footer"><Activity size={14} /> HealTest AI <span>v1.0</span></div>
    </aside>
  );
}