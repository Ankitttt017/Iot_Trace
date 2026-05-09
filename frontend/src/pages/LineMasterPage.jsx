import React, { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "../components/common/AppLayout";
import Pagination from "../components/common/Pagination";
import {
  createLine,
  createLineMachine,
  deleteLine,
  getLineMachines,
  getLineOperations,
  getLines,
  removeLineMachine,
  updateLine,
  updateLineMachine,
} from "../services/api";

const PAGE_SIZE = 50;

const PLANTS = [
  { code: "1002", name: "Gurugram Plant" },
  { code: "1008", name: "Bawal Plant" },
];

const FALLBACK_OPERATIONS = [
  ["OP-10", "Incoming Inspection (Aluminium Alloy Ingots)"],
  ["OP-20A", "Melting of Aluminium Alloy Ingots"],
  ["OP-20B", "Degassing & Metal Treatment of Molten Metal"],
  ["OP-20C", "Holding of Molten Metal for Casting"],
  ["OP-30", "Die Casting"],
  ["OP-40", "Trimming"],
  ["OP-50", "Shot Blasting"],
  ["OP-50B", "Final Inspection (Casting)"],
  ["OP-60", "Face Milling, Drilling, Reaming, Tapping & Boring"],
  ["OP-70", "Pre-Inspection"],
  ["OP-80", "Marking (Dot Marking)"],
  ["OP-90", "Leak Testing"],
  ["OP-100", "Ultrasonic Washing"],
  ["OP-110", "Final Inspection / Visual Inspection"],
  ["OP-120", "Packaging"],
].map(([operation_no, operation_name]) => ({ operation_no, operation_name }));

const emptyLine = {
  line_code: "",
  line_name: "",
  division: "Machining",
  description: "",
  is_active: true,
};

const emptyMachine = {
  machine_code: "",
  name: "",
  category: "Machining",
  cost_center: "",
  operation_no: "OP-10",
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
    {children}
  </label>
);

const inputClass = "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50";

const TextInput = (props) => <input {...props} className={inputClass} />;
const SelectInput = (props) => <select {...props} className={inputClass} />;

const LineIllustration = () => (
  <svg viewBox="0 0 160 120" className="h-full w-full drop-shadow-sm" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="lineBody" x1="20" y1="20" x2="140" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6" />
        <stop offset="0.5" stopColor="#2563eb" />
        <stop offset="1" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    <ellipse cx="80" cy="108" rx="60" ry="7" fill="#0f172a" opacity="0.07" />
    <rect x="18" y="72" width="124" height="16" rx="8" fill="url(#lineBody)" />
    <rect x="24" y="76" width="112" height="8" rx="4" fill="#1d4ed8" opacity="0.5" />
    {[30, 50, 70, 90, 110].map((x) => (
      <rect key={x} x={x} y="76" width="12" height="8" rx="2" fill="#60a5fa" opacity="0.4" />
    ))}
    <circle cx="26" cy="80" r="10" fill="#1e40af" />
    <circle cx="26" cy="80" r="6" fill="#3b82f6" />
    <circle cx="26" cy="80" r="2" fill="#bfdbfe" />
    <circle cx="134" cy="80" r="10" fill="#1e40af" />
    <circle cx="134" cy="80" r="6" fill="#3b82f6" />
    <circle cx="134" cy="80" r="2" fill="#bfdbfe" />
    <rect x="35" y="44" width="28" height="28" rx="4" fill="#1e40af" />
    <rect x="38" y="47" width="22" height="18" rx="2" fill="#3b82f6" />
    <circle cx="49" cy="56" r="6" fill="#93c5fd" />
    <rect x="75" y="38" width="28" height="34" rx="4" fill="#1e40af" />
    <rect x="78" y="41" width="22" height="20" rx="2" fill="#3b82f6" />
    <rect x="112" y="48" width="24" height="24" rx="4" fill="#1e40af" />
    <rect x="115" y="51" width="18" height="14" rx="2" fill="#3b82f6" />
  </svg>
);

const makeMachineDraft = (machine = {}) => ({
  id: machine.id || null,
  machine_code: machine.machine_code || "",
  name: machine.name || "",
  category: machine.category || "Machining",
  asset: machine.asset || "",
  cost_center: machine.cost_center || "",
  operation_no: machine.operation_no || "OP-10",
});

const LineWorkspaceModal = ({ initialLine, initialMachines, plant, operations, saving, onClose, onSave }) => {
  const [line, setLine] = useState(initialLine || emptyLine);
  const [machines, setMachines] = useState(initialMachines.map(makeMachineDraft));
  const [machineFormOpen, setMachineFormOpen] = useState(false);
  const [editingMachineIndex, setEditingMachineIndex] = useState(null);
  const [machineDraft, setMachineDraft] = useState(makeMachineDraft(emptyMachine));
  const [deletedMachineIds, setDeletedMachineIds] = useState([]);
  const [localError, setLocalError] = useState("");
  const isEdit = Boolean(initialLine?.line_id);

  const setLineField = (key, value) => setLine((prev) => ({ ...prev, [key]: value }));
  const setMachineField = (key, value) => {
    setMachineDraft((prev) => ({ ...prev, [key]: value }));
  };

  const startAddMachine = () => {
    setEditingMachineIndex(null);
    setMachineDraft(makeMachineDraft(emptyMachine));
    setMachineFormOpen(true);
    setLocalError("");
  };

  const startEditMachine = (index) => {
    setEditingMachineIndex(index);
    setMachineDraft(makeMachineDraft(machines[index]));
    setMachineFormOpen(true);
    setLocalError("");
  };

  const cancelMachineForm = () => {
    setMachineFormOpen(false);
    setEditingMachineIndex(null);
    setMachineDraft(makeMachineDraft(emptyMachine));
  };

  const saveMachineDraft = () => {
    if (!machineDraft.machine_code.trim() || !machineDraft.name.trim() || !machineDraft.operation_no) {
      setLocalError("Machine save karne ke liye machine code, name aur operation required hai.");
      return;
    }

    setMachines((prev) => {
      if (editingMachineIndex == null) return [...prev, machineDraft];
      return prev.map((machine, index) => (index === editingMachineIndex ? machineDraft : machine));
    });
    cancelMachineForm();
    setLocalError("");
  };

  const removeMachineRow = (index) => {
    setMachines((prev) => {
      const machine = prev[index];
      if (machine?.id) setDeletedMachineIds((ids) => [...ids, machine.id]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const submit = (event) => {
    event.preventDefault();
    if (machineFormOpen) {
      setLocalError("Machine form open hai. Pehle machine save/cancel karo, phir final line setup save karo.");
      return;
    }

    setLocalError("");
    onSave({
      line: {
        ...line,
        plant: plant.name,
        plant_code: plant.code,
        is_active: Boolean(line.is_active),
      },
      machines,
      deletedMachineIds,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <form onSubmit={submit} className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-950">{isEdit ? "Edit Line Setup" : "Add Line Setup"}</h3>
            <p className="mt-1 text-sm text-slate-500">Add one line, attach multiple machines, and assign one operation to each machine.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Close</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {localError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{localError}</div>
          )}

          <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Plant">
              <TextInput value={`${plant.name} (${plant.code})`} disabled />
            </Field>
            <Field label="Line Code">
              <TextInput required value={line.line_code || ""} onChange={(e) => setLineField("line_code", e.target.value)} placeholder="LINE-01" />
            </Field>
            <Field label="Line Name">
              <TextInput required value={line.line_name || ""} onChange={(e) => setLineField("line_name", e.target.value)} placeholder="Machining Line M01" />
            </Field>
            <Field label="Division">
              <SelectInput value={line.division || ""} onChange={(e) => setLineField("division", e.target.value)}>
                {["Machining", "HPDC", "Die Casting", "Finishing", "Quality", "Packing", "Utilities"].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </SelectInput>
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Description">
                <TextInput value={line.description || ""} onChange={(e) => setLineField("description", e.target.value)} placeholder="Optional line note" />
              </Field>
            </div>
            <Field label="Status">
              <SelectInput value={line.is_active ? "1" : "0"} onChange={(e) => setLineField("is_active", e.target.value === "1")}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </SelectInput>
            </Field>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Machines Under This Line</h4>
                <p className="text-xs text-slate-400">Add one machine at a time, save it here, then final-save the line setup.</p>
              </div>
              <button type="button" onClick={startAddMachine} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700">
                Add Machine
              </button>
            </div>

            {machineFormOpen && (
              <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h5 className="text-sm font-extrabold text-slate-900">
                    {editingMachineIndex == null ? "Add Machine Details" : "Edit Machine Details"}
                  </h5>
                  <button type="button" onClick={cancelMachineForm} className="text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Machine Code">
                    <TextInput value={machineDraft.machine_code} onChange={(e) => setMachineField("machine_code", e.target.value)} placeholder="MC-001" />
                  </Field>
                  <Field label="Machine Name">
                    <TextInput value={machineDraft.name} onChange={(e) => setMachineField("name", e.target.value)} placeholder="CNC Machine" />
                  </Field>
                  <Field label="Category">
                    <TextInput value={machineDraft.category} onChange={(e) => setMachineField("category", e.target.value)} placeholder="Machining" />
                  </Field>
                  <Field label="Asset">
                    <TextInput value={machineDraft.asset} onChange={(e) => setMachineField("asset", e.target.value)} placeholder="Optional asset no." />
                  </Field>
                  <Field label="Cost Center">
                    <TextInput value={machineDraft.cost_center} onChange={(e) => setMachineField("cost_center", e.target.value)} placeholder="Optional" />
                  </Field>
                  <Field label="Operation">
                    <SelectInput value={machineDraft.operation_no} onChange={(e) => setMachineField("operation_no", e.target.value)}>
                      {operations.map((operation) => (
                        <option key={operation.operation_no} value={operation.operation_no}>
                          {operation.operation_no} - {operation.operation_name}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={saveMachineDraft} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700">
                    Save Machine
                  </button>
                </div>
              </div>
            )}

            {machines.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-bold text-slate-500">No machines added under this line yet.</p>
                <p className="mt-1 text-xs text-slate-400">Use Add Machine above, fill full details, then Save Machine.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {machines.map((machine, index) => {
                  const selectedOperation = operations.find((operation) => operation.operation_no === machine.operation_no);
                  return (
                    <div key={machine.id || `${machine.machine_code}-${index}`} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_1.5fr_1.8fr_auto]">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Machine</p>
                        <p className="mt-1 text-sm font-extrabold text-slate-950">{machine.name}</p>
                        <p className="mt-0.5 font-mono text-xs font-semibold text-slate-400">{machine.machine_code}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Details</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">{machine.category || "Uncategorized"}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {[machine.asset, machine.cost_center].filter(Boolean).join(" / ") || "No asset or cost center"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Operation</p>
                        <p className="mt-1 text-sm font-extrabold text-teal-700">{machine.operation_no}</p>
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-400">{selectedOperation?.operation_name || "Operation"}</p>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => startEditMachine(index)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                          Edit
                        </button>
                        <button type="button" onClick={() => removeMachineRow(index)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60">
            {saving ? "Saving..." : "Save Line Setup"}
          </button>
        </div>
      </form>
    </div>
  );
};

const LineCard = ({ line, onEdit, onDelete }) => (
  <article className="group flex h-full min-h-[314px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-xl hover:shadow-slate-200/80">
    <div className="mb-3 flex aspect-[1.18] w-full items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(145deg,_#f0f7ff_0%,_#e8f0fe_100%)] p-4 ring-1 ring-slate-100">
      <div className="h-full max-h-28 w-full transition-transform duration-200 group-hover:scale-105">
        <LineIllustration />
      </div>
    </div>
    <div className="min-w-0 flex-1">
      <p className="line-clamp-2 min-h-[2.25rem] text-xs font-extrabold leading-snug text-slate-950">{line.line_name}</p>
      <p className="mt-1 truncate font-mono text-[10px] font-semibold text-slate-400">{line.line_code}</p>
      <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
        {line.division || "Division"}
      </span>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
      <div>
        <p className="text-base font-extrabold leading-none text-slate-950">{line.total_machines ?? 0}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Machines</p>
      </div>
      <div>
        <p className="text-base font-extrabold leading-none text-slate-950">{line.is_active ? "Active" : "Inactive"}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
      </div>
    </div>
    <div className="mt-3 flex gap-2">
      <button onClick={() => onEdit(line)} className="flex-1 rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100">Edit Setup</button>
      <button onClick={() => onDelete(line)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
    </div>
  </article>
);

const StatBox = ({ value, label }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
    <p className="text-2xl font-extrabold leading-none text-slate-950">{value}</p>
    <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
  </div>
);

const LineMasterPage = ({ onLogout, currentUser }) => {
  const [selectedPlant, setSelectedPlant] = useState(PLANTS[0]);
  const [operations, setOperations] = useState(FALLBACK_OPERATIONS);
  const [lines, setLines] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [workspaceMachines, setWorkspaceMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadLines = useCallback(() => {
    setLoading(true);
    setError("");
    getLines({ plant: selectedPlant.code })
      .then((res) => setLines(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => setError("Unable to load lines. Please check backend connection."))
      .finally(() => setLoading(false));
  }, [selectedPlant.code]);

  useEffect(() => {
    getLineOperations()
      .then((res) => {
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        if (rows.length) setOperations(rows);
      })
      .catch(() => setOperations(FALLBACK_OPERATIONS));
  }, []);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  const openWorkspace = async (line = null) => {
    setWorkspace(line || "new");
    setWorkspaceMachines([]);
    if (!line?.line_id) return;
    setWorkspaceLoading(true);
    try {
      const res = await getLineMachines(line.line_id);
      setWorkspaceMachines(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setWorkspaceMachines([]);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const saveWorkspace = async ({ line, machines, deletedMachineIds }) => {
    setSaving(true);
    setError("");
    try {
      let lineId = line.line_id;
      if (lineId) {
        await updateLine(lineId, line);
      } else {
        const res = await createLine(line);
        lineId = res.data?.line_id;
      }

      for (const machineId of deletedMachineIds) {
        await removeLineMachine(lineId, machineId, { mode: "delete" });
      }

      for (const machine of machines) {
        if (machine.id) {
          await updateLineMachine(lineId, machine.id, machine);
        } else {
          await createLineMachine(lineId, machine);
        }
      }

      setWorkspace(null);
      setWorkspaceMachines([]);
      loadLines();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save line setup.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteLine = async (line) => {
    if (!window.confirm(`Delete ${line.line_name}? Machines will be detached from this line.`)) return;
    setSaving(true);
    try {
      await deleteLine(line.line_id);
      loadLines();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete line.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter((line) =>
      String(line.line_name || "").toLowerCase().includes(q) ||
      String(line.line_code || "").toLowerCase().includes(q) ||
      String(line.division || "").toLowerCase().includes(q)
    );
  }, [lines, search]);

  const pagedLines = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalMachines = lines.reduce((sum, line) => sum + (line.total_machines || 0), 0);
  const activeLines = lines.filter((line) => line.is_active).length;

  return (
    <AppLayout onLogout={onLogout} currentUser={currentUser}>
      {workspace && !workspaceLoading && (
        <LineWorkspaceModal
          initialLine={workspace === "new" ? null : workspace}
          initialMachines={workspaceMachines}
          plant={selectedPlant}
          operations={operations}
          saving={saving}
          onClose={() => setWorkspace(null)}
          onSave={saveWorkspace}
        />
      )}
      {workspaceLoading && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40">
          <div className="rounded-xl bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-xl">Loading line setup...</div>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-extrabold text-slate-950">Production Lines</h1>
          <span className="text-slate-300">|</span>
          <nav className="flex items-center gap-1 text-sm text-slate-500">
            <span className="app-brand-text font-medium">Organisation</span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-gray-600">Line Master</span>
          </nav>
        </div>
        <button onClick={() => openWorkspace()} className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-700">
          Add Line
        </button>
      </div>

      <div className="app-panel mb-6 w-full rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-5 flex flex-col gap-1">
          <h2 className="text-lg font-extrabold text-slate-950"></h2>
          <p className="max-w-4xl text-sm leading-relaxed text-slate-500">
            Manage one line with multiple machines, and assign one operation to every machine from the operation list.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap items-end gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <Field label="Select Plant">
            <SelectInput
              value={selectedPlant.code}
              onChange={(event) => {
                setSelectedPlant(PLANTS.find((plant) => plant.code === event.target.value) || PLANTS[0]);
                setPage(1);
              }}
            >
              {PLANTS.map((plant) => (
                <option key={plant.code} value={plant.code}>{plant.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Search Lines">
            <div className="relative w-72">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="app-field h-11 w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50"
                placeholder="Search by name, code or division..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </Field>
        </div>

        <p className="mb-4 text-xs text-gray-400">Showing {filtered.length} of {lines.length} lines for {selectedPlant.name}</p>
        <div className="border-t border-slate-100 pt-5">
          <h3 className="mb-1 text-sm font-bold text-slate-800">Overall Statistics</h3>
          <p className="mb-4 text-xs text-slate-400">Summary of production lines and mapped machines for the selected plant.</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatBox value={lines.length} label="Total Lines" />
            <StatBox value={activeLines} label="Active Lines" />
            <StatBox value={totalMachines} label="Total Machines" />
            <StatBox value={operations.length} label="Operation Options" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <svg className="h-8 w-8 animate-spin text-teal-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-400">Loading lines...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-gray-400">
          <p className="text-base font-bold">No lines found</p>
          <p className="mt-1 text-sm">Use the Add Line button at the top-right to create a new line.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {pagedLines.map((line) => (
            <LineCard key={line.line_id} line={line} onEdit={openWorkspace} onDelete={confirmDeleteLine} />
          ))}
        </div>
      )}

      {!loading && filtered.length > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} label="lines" onPageChange={setPage} />
      )}
    </AppLayout>
  );
};

export default LineMasterPage;
