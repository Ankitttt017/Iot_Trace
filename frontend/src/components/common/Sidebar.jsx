import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import { getMachines, getStats } from "../../services/api";
import { useSidebar } from "../../context/SidebarContext";

const iconClass = "h-5 w-5";

const ricoOrganisationItems = [
  { label: "Machines", to: "/machines", icon: "M4 7h16M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2m-9 4h4m-7 8h10a3 3 0 003-3v-5H4v5a3 3 0 003 3z", countKey: "machines" },
];

const ricoPartOperationItems = [
  { label: "Part Master", to: "/parts", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", countKey: "parts" },
  { label: "Operation Master", to: "/operations", icon: "M9 5H7a2 2 0 00-2 2v12h14V7a2 2 0 00-2-2h-2m-6 0a3 3 0 016 0m-6 0h6m-7 7h8m-8 4h5", exact: true },
];

const traceabilityItems = [
  { label: "Dashboard", to: "/traceability/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { label: "Operator View", to: "/traceability/operator-view", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { label: "Production", to: "/traceability/production", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { label: "Traceability", to: "/traceability/traceability", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { label: "Component Journey", to: "/traceability/component-journey", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { label: "Packing", to: "/traceability/packing", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { label: "I/O Monitor", to: "/traceability/io-monitor", icon: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" },
  { label: "Scanner Monitor", to: "/traceability/scanner-monitor", icon: "M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" },
];

const traceConfigItems = [
  { label: "Machines", to: "/traceability/machines", icon: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" },
  { label: "PLC Config", to: "/traceability/plc-configuration", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { label: "Scanners", to: "/traceability/scanners", icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" },
  { label: "Shifts", to: "/traceability/shifts", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Users", to: "/traceability/users", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { label: "Master Settings", to: "/traceability/master-settings", icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
];

const isItemActive = (item, location) => {
  const [pathname, search = ""] = item.to.split("?");
  const searchStr = search ? `?${search}` : "";
  if (searchStr) return location.pathname === pathname && location.search === searchStr;
  if (item.exact) return location.pathname === pathname && !location.search;
  return location.pathname === pathname;
};

const NavRow = ({ item, count, collapsed }) => {
  const location = useLocation();
  const active = isItemActive(item, location);
  return (
    <NavLink to={item.to} title={item.label}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${collapsed ? "justify-center" : ""} ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-400 hover:bg-white/6 hover:text-white"}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? "bg-white/20 text-white" : "text-slate-400 group-hover:text-white"}`}>
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={item.icon} />
        </svg>
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {typeof count === "number" && count > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"}`}>
              {count}
            </span>
          )}
        </>
      )}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 z-50">
          {item.label}
        </span>
      )}
    </NavLink>
  );
};

const Section = ({ title, items, counts = {}, collapsed, accent }) => {
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const hasActive = items.some((item) => isItemActive(item, location));
  useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);
  return (
    <div className={collapsed ? "px-2" : "px-3"}>
      {!collapsed && (
        <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-3 py-1.5">
          <p className={`text-[10px] font-extrabold uppercase tracking-[0.18em] ${accent || "text-slate-500"}`}>{title}</p>
          <svg className={`h-3 w-3 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
      {collapsed && <div className="my-2 border-t border-white/10" />}
      {(open || collapsed) && (
        <div className="mt-1 space-y-1">
          {items.map((item) => (
            <NavRow key={item.label} item={item} count={counts[item.countKey]} collapsed={collapsed} />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = () => {
  const { collapsed, setCollapsed } = useSidebar();
  const [counts, setCounts] = useState({ parts: 0, machines: 0, operations: 0 });

  useEffect(() => {
    let active = true;
    Promise.allSettled([getStats(), getMachines()]).then(([sr, mr]) => {
      if (!active) return;
      const stats = sr.status === "fulfilled" ? sr.value.data?.data : {};
      const machines = mr.status === "fulfilled" ? mr.value.data : [];
      setCounts({
        parts: Number(stats?.total_parts || 0),
        machines: Array.isArray(machines) ? machines.length : 0,
        operations: 0
      });
    });
    return () => { active = false; };
  }, []);

  const formattedCounts = useMemo(() => counts, [counts]);

  return (
    <aside className={`app-sidebar fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-white/8 lg:flex transition-all duration-300 ease-in-out ${collapsed ? "w-[72px]" : "w-72"}`}>

      {/* ✅ HEADER — Logo Fixed */}
      <div className={`flex items-center border-b border-white/8 ${collapsed ? "justify-center px-3 py-3" : "justify-between px-4 py-3"}`}>
        {!collapsed && (
          <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white shadow-lg"
            style={{ height: '64px', minWidth: '180px', maxWidth: '200px', padding: '8px 20px', overflow: 'hidden' }}>
            <BrandLogo
              compact
              style={{ height: '52px', width: 'auto', maxWidth: '180px', objectFit: 'contain', display: 'block' }}
            />
          </div>
        )}

        {/* Collapse Button */}
        <button
          type="button"
          title={collapsed ? "Expand" : "Collapse"}
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-3">
        <Section title="Organisation" items={ricoOrganisationItems} counts={formattedCounts} collapsed={collapsed} />
        <Section title="Parts & Operations" items={ricoPartOperationItems} counts={formattedCounts} collapsed={collapsed} />
        {!collapsed && <div className="mx-5 border-t border-white/10" />}
        {!collapsed && <p className="px-6 text-[9px] font-black uppercase tracking-[0.2em] text-teal-500/70">Traceability Module</p>}
        <Section title="Live & Monitor" items={traceabilityItems} collapsed={collapsed} accent="text-teal-400" />
        <Section title="Configuration" items={traceConfigItems} collapsed={collapsed} accent="text-teal-400" />
      </div>

      {/* Footer */}
    </aside>
  );
};

export default Sidebar;