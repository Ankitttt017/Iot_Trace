import React, { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import { getMachines } from "../../services/api";
import MachineCard from "./components/MachineCard";
import { useSidebar } from "../../context/SidebarContext";

// ── Static filter data ────────────────────────────────────────────────────────
const PLANTS = [
  { label: "Gurugram Plant", value: "1002" },
  { label: "Bawal Plant",    value: "1001" },
  { label: "Pathredi Plant", value: "1003" },
  { label: "Chennai Plant",  value: "1004" },
];

const DIVISIONS = [
  { label: "All Divisions", value: "" },
  { label: "HPDC",          value: "HPDC" },
  { label: "Machining",     value: "Machining" },
];

const LINES_BY_DIVISION = {
  "": [
    { label: "All Lines", value: "" },
    { label: "HPDC Line C01 (135T–250T)", value: "C01" },
    { label: "HPDC Line C02 (350T–420T)", value: "C02" },
    { label: "HPDC Line C03 (500T–660T)", value: "C03" },
    { label: "HPDC Line C04 (800T)",      value: "C04" },
    { label: "HPDC Line C05 (1050T)",     value: "C05" },
    { label: "HPDC Line C06 (1400T–1800T)", value: "C06" },
    { label: "Trimming & Vibro",          value: "C33" },
    { label: "Furnace",                   value: "F01" },
    { label: "Machining Line M01",        value: "M01" },
    { label: "Machining Line M03",        value: "M03" },
    { label: "Machining Line M04",        value: "M04" },
    { label: "Machining Line M05",        value: "M05" },
    { label: "Machining Line M07",        value: "M07" },
    { label: "Machining Line M09",        value: "M09" },
    { label: "Machining Line M10",        value: "M10" },
    { label: "Machining Line M11",        value: "M11" },
    { label: "Machining Line M14",        value: "M14" },
    { label: "Machining Line M15",        value: "M15" },
    { label: "Machining Line M18",        value: "M18" },
    { label: "Machining Line M20",        value: "M20" },
    { label: "Machining Line M61",        value: "M61" },
    { label: "Machining Line M62",        value: "M62" },
    { label: "Paint Shop",                value: "P01" },
  ],
  HPDC: [
    { label: "All Lines",                   value: "" },
    { label: "HPDC Line C01 (135T–250T)",   value: "C01" },
    { label: "HPDC Line C02 (350T–420T)",   value: "C02" },
    { label: "HPDC Line C03 (500T–660T)",   value: "C03" },
    { label: "HPDC Line C04 (800T)",        value: "C04" },
    { label: "HPDC Line C05 (1050T)",       value: "C05" },
    { label: "HPDC Line C06 (1400T–1800T)", value: "C06" },
    { label: "Trimming & Vibro",            value: "C33" },
    { label: "Furnace",                     value: "F01" },
  ],
  Machining: [
    { label: "All Lines",          value: "" },
    { label: "Machining Line M01", value: "M01" },
    { label: "Machining Line M03", value: "M03" },
    { label: "Machining Line M04", value: "M04" },
    { label: "Machining Line M05", value: "M05" },
    { label: "Machining Line M07", value: "M07" },
    { label: "Machining Line M09", value: "M09" },
    { label: "Machining Line M10", value: "M10" },
    { label: "Machining Line M11", value: "M11" },
    { label: "Machining Line M14", value: "M14" },
    { label: "Machining Line M15", value: "M15" },
    { label: "Machining Line M18", value: "M18" },
    { label: "Machining Line M20", value: "M20" },
    { label: "Machining Line M61", value: "M61" },
    { label: "Machining Line M62", value: "M62" },
    { label: "Paint Shop",         value: "P01" },
  ],
};

const MACHINE_TYPES = [
  { label: "All Types",    value: "" },
  { label: "HPDC Machine", value: "hpdc" },
  { label: "CNC",          value: "cnc" },
  { label: "Broaching",    value: "broach" },
  { label: "Boring",       value: "boring" },
  { label: "Grinding",     value: "grind" },
  { label: "Furnace",      value: "furnace" },
  { label: "Crane / EOT",  value: "crane" },
  { label: "Trimming",     value: "trim" },
];

// ── Derive division & line from machine name ─────────────────────────────────
function getDivision(name = "") {
  const n = name.toUpperCase();
  if (n.includes("H.P.D.C") || n.includes("HPDC") || n.includes("TILTING") ||
      n.includes("FURNACE") || n.includes("DOSING") || n.includes("DEGASSING") ||
      n.includes("TRIMMING PRESS") || n.includes("VIBRO") ||
      n.includes("COOLING TOWER") || n.includes("E.O.T") || n.includes("EOT") ||
      n.includes("ROBO")) {
    return "HPDC";
  }
  return "Machining";
}

function getLineCode(name = "") {
  const n = name.toUpperCase();
  if (n.includes("FURNACE") || n.includes("TILTING") || n.includes("DOSING")) return "F01";
  if (n.includes("TRIMMING") || n.includes("VIBRO")) return "C33";
  if (n.includes("1800T")) return "C06";
  if (n.includes("1400T")) return "C06";
  if (n.includes("1050T")) return "C05";
  if (n.includes("800T"))  return "C04";
  if (n.includes("660T") || n.includes("560T") || n.includes("500T")) return "C03";
  if (n.includes("420T") || n.includes("350T")) return "C02";
  if (n.includes("250T") || n.includes("150T") || n.includes("135T")) return "C01";
  if (n.includes("BROACH")) return "M01";
  if (n.includes("BORING") && n.includes("SPM")) return "M03";
  if (n.includes("PAINT") || n.includes("ADHESIVE") || n.includes("COATING") || n.includes("BAKING")) return "P01";
  if (n.includes("DEGASSING")) return "M20";
  return "";
}

function getLineName(code) {
  const all = LINES_BY_DIVISION[""];
  return all.find(l => l.value === code)?.label || "—";
}

function matchesMachineType(name = "", type = "") {
  if (!type) return true;
  const n = name.toUpperCase();
  if (type === "hpdc")    return n.includes("H.P.D.C") || n.includes("HPDC");
  if (type === "cnc")     return n.includes("CNC") || n.includes("VMC") || n.includes("HMC");
  if (type === "broach")  return n.includes("BROACH");
  if (type === "boring")  return n.includes("BORING");
  if (type === "grind")   return n.includes("GRIND");
  if (type === "furnace") return n.includes("FURNACE");
  if (type === "crane")   return n.includes("CRANE") || n.includes("E.O.T") || n.includes("EOT");
  if (type === "trim")    return n.includes("TRIMM") || n.includes("VIBRO");
  return true;
}

// ── Dropdown component ────────────────────────────────────────────────────────
const Select = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-50"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const MachineDashboard = ({ onLogout, currentUser }) => {
  const { collapsed } = useSidebar();
  const [machines, setMachines]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  // Filters
  const [plant, setPlant]               = useState("1002");
  const [division, setDivision]         = useState("");
  const [line, setLine]                 = useState("");
  const [search, setSearch]             = useState("");
  const [machineType, setMachineType]   = useState("");

  const fetchMachines = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await getMachines();
      const payload = Array.isArray(response.data) ? response.data : response.data?.data;
      setMachines(Array.isArray(payload) ? payload : []);
    } catch {
      setError("Unable to load machine data. Is the backend running?");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMachines();
    const id = setInterval(() => fetchMachines({ silent: true }), 10000);
    return () => clearInterval(id);
  }, [fetchMachines]);

  // Reset line when division changes
  const handleDivisionChange = (val) => {
    setDivision(val);
    setLine("");
  };

  const lineOptions = LINES_BY_DIVISION[division] || LINES_BY_DIVISION[""];

  const enriched = useMemo(() =>
    machines.map(m => ({
      ...m,
      _division: getDivision(m.name),
      _lineCode: getLineCode(m.name),
      _lineName: getLineName(getLineCode(m.name)),
    })),
    [machines]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(m => {
      if (division && m._division !== division) return false;
      if (line && m._lineCode !== line)         return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (!matchesMachineType(m.name, machineType)) return false;
      return true;
    });
  }, [enriched, division, line, search, machineType]);

  const stats = useMemo(() => enriched.reduce(
    (a, m) => {
      const s = String(m.status || "IDLE").toUpperCase();
      a.total++;
      if (s === "RUNNING") a.running++;
      else if (s === "STOPPED") a.stopped++;
      else a.idle++;
      return a;
    },
    { total: 0, running: 0, stopped: 0, idle: 0 }
  ), [enriched]);

  return (
    <div className="min-h-screen app-page">
      <Navbar onLogout={onLogout} currentUser={currentUser} />
      <Sidebar />

      <main className={`pt-[94px] transition-all duration-300 ease-in-out ${
        collapsed ? "lg:pl-[72px]" : "lg:pl-72"
      }`}>
        <div className="p-4 sm:p-6">

          {/* Breadcrumb */}
          <div className="mb-5 flex items-center gap-2 text-sm">
            <span className="font-bold text-slate-900">Organisation Master</span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-teal-700">Machines</span>
          </div>

          {/* Header card */}
          <div className="app-panel mb-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-5 flex flex-col gap-1">
              <h2 className="text-lg font-extrabold text-slate-950">Machine Master</h2>
              <p className="max-w-5xl text-sm leading-relaxed text-slate-500">
              Machine Master is a list of all the machines in factory. This is a single point from where the machine history can be tracked and data pertaining to a specific machine can be availed. Machine Master also enables you to view overall statistics of the selected machine.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <Select
                label="Select Plant"
                value={plant}
                onChange={setPlant}
                options={PLANTS}
              />
              <Select
                label="Select Division"
                value={division}
                onChange={handleDivisionChange}
                options={DIVISIONS}
              />
              <Select
                label="Select Lines"
                value={line}
                onChange={setLine}
                options={lineOptions}
              />

              {/* Search */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search Machine</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search Machine..."
                    className="h-11 w-52 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-50"
                  />
                </div>
              </div>

              <Select
                label="Select Machine Type"
                value={machineType}
                onChange={setMachineType}
                options={MACHINE_TYPES}
              />
            </div>
          </div>

          {/* Stats bar */}
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total",   value: stats.total,   color: "text-slate-950",   bg: "bg-white", accent: "bg-slate-400" },
              { label: "Running", value: stats.running, color: "text-emerald-700", bg: "bg-emerald-50", accent: "bg-emerald-500" },
              { label: "Stopped", value: stats.stopped, color: "text-red-700",     bg: "bg-red-50", accent: "bg-red-500" },
              { label: "Idle",    value: stats.idle,    color: "text-amber-700",   bg: "bg-amber-50", accent: "bg-amber-500" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} app-panel rounded-2xl border border-slate-100 px-5 py-4`}>
                <div className="flex items-center justify-between">
                  <span className={`text-3xl font-extrabold ${s.color}`}>{s.value}</span>
                  <span className={`h-10 w-1.5 rounded-full ${s.accent}`} />
                </div>
                <span className="mt-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Showing {filtered.length} of {machines.length} machines
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <svg className="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-gray-400">Loading machines...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <p className="text-base font-medium">No machines found for selected filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map(machine => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  division={machine._division}
                  line={machine._lineName}
                />
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default MachineDashboard;
