import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { useSidebar } from "../../context/SidebarContext";

const pageMeta = {
  "/parts":      { title: "Part Master",       subtitle: "Material, traceability and process master data" },
  "/machines":   { title: "Machine Tracking",  subtitle: "Live machine state and active operation view" },
  "/operations": { title: "Operation Master",  subtitle: "Part routing, process steps and logs" },
};

const DAYS   = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DatePicker = ({ selectedDate, onChange, onClose }) => {
  const today = new Date();
  const [view, setView] = useState({
    year:  selectedDate ? selectedDate.getFullYear()  : today.getFullYear(),
    month: selectedDate ? selectedDate.getMonth()     : today.getMonth(),
  });

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const prevMonth = () =>
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () =>
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });

  const selectDay = (day) => { onChange(new Date(view.year, view.month, day)); onClose(); };

  const isSelected = (day) =>
    selectedDate &&
    selectedDate.getFullYear() === view.year &&
    selectedDate.getMonth()    === view.month &&
    selectedDate.getDate()     === day;

  const isToday = (day) =>
    today.getFullYear() === view.year &&
    today.getMonth()    === view.month &&
    today.getDate()     === day;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-bold text-slate-800">{MONTHS[view.month]} {view.year}</span>
        <button type="button" onClick={nextMonth} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => <span key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) =>
          day === null ? <span key={`empty-${idx}`} /> : (
            <button key={day} type="button" onClick={() => selectDay(day)}
              className={`h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isSelected(day) ? "bg-[#7667ff] text-white font-bold"
                : isToday(day) ? "border border-[#7667ff] text-[#7667ff] font-bold hover:bg-purple-50"
                : "text-slate-700 hover:bg-slate-100"
              }`}
            >{day}</button>
          )
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <button type="button" onClick={() => { onChange(new Date()); onClose(); }} className="text-xs font-semibold text-[#7667ff] hover:underline">Today</button>
        <button type="button" onClick={() => { onChange(null); onClose(); }} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
      </div>
    </div>
  );
};

const IconButton = ({ title, active, onClick, children }) => (
  <button type="button" onClick={onClick} title={title}
    className={`flex h-10 w-10 items-center justify-center rounded-lg border text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100 ${
      active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white hover:bg-slate-50"
    }`}
  >{children}</button>
);

const Navbar = ({ onLogout, currentUser }) => {
  const navigate                        = useNavigate();
  const location                        = useLocation();
  const { locale, t }                   = useI18n();
  const { collapsed }                   = useSidebar(); // ← NEW
  const [search, setSearch]             = useState("");
  const [dark, setDark]                 = useState(() => localStorage.getItem("rico-theme") === "dark");
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const pickerRef                       = useRef(null);

  const meta = useMemo(() => {
    if (location.pathname.startsWith("/part/"))    return { title: "Part Profile",    subtitle: "Configuration, operations and document control" };
    if (location.pathname.startsWith("/machine/")) return { title: "Machine Profile", subtitle: "Live state, configuration and maintenance view" };
    return pageMeta[location.pathname] || pageMeta["/parts"];
  }, [location.pathname]);

  const displayDate = useMemo(() => {
    const d = selectedDate || new Date();
    return d.toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  }, [selectedDate, locale]);

  const user = currentUser || { name: "Admin", role: "Administrator" };
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "AD";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("rico-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const value = search.trim();
    navigate(value ? `/parts?search=${encodeURIComponent(value)}` : "/parts");
  };

  return (
    // ← KEY CHANGE: dynamic left offset based on collapsed state
    <header className={`app-topbar fixed right-0 top-0 z-50 h-[78px] border-b px-4 shadow-sm backdrop-blur transition-all duration-300 ease-in-out lg:px-6 ${
      collapsed ? "lg:left-[72px]" : "lg:left-72"
    }`}>
      <div className="flex h-full items-center justify-between gap-4">
        {/* Left: page title */}
        <div className="min-w-0">
          <div className="mt-0.5 flex min-w-0 items-center gap-3">
            <span className="hidden h-9 w-1 rounded-full bg-teal-600 sm:block" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold text-slate-950">{meta.title}</h1>
              <p className="hidden truncate text-sm text-slate-500 md:block">{meta.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="h-10 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-50"
              placeholder={t("searchPartPlaceholder")} />
          </form>

          <div className="relative hidden sm:block" ref={pickerRef}>
            <button type="button" onClick={() => setPickerOpen(prev => !prev)} title="Pick a date"
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-100 ${
                pickerOpen ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300"
              }`}>
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{displayDate}</span>
            </button>
            {pickerOpen && <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} onClose={() => setPickerOpen(false)} />}
          </div>

          <IconButton title={dark ? t("lightMode") : t("darkMode")} active={dark} onClick={() => setDark(!dark)}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </IconButton>

          <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 md:flex">
            <div className="text-right leading-tight">
              <p className="text-sm font-bold capitalize text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">{user.role}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#102a43] text-sm font-bold text-white ring-4 ring-slate-100">
              {initials}
            </div>
          </div>

          <button type="button" onClick={onLogout} title={t("logout")}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M17 16l4-4m0 0l-4-4m4 4H9m4 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;