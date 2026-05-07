const Machine = require("../models/Machine");
const PlcRegisterRange = require("../models/PlcRegisterRange");
const plcService = require("../services/plcCommunicationService");
const {
  readModbusRegisters,
  readSlmpRegisters,
  writeModbusRegister,
  writeSlmpRegister,
} = require("../services/plcIoService");
const { getMachineBypass, isMachineBypassEnabled } = require("../services/machineBypassService");

function toInt(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function toPositiveInt(value, fallback = null) {
  const parsed = toInt(value, fallback);
  return parsed !== null && parsed > 0 ? parsed : fallback;
}

function toText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normalizeProtocol(value, fallback = "TCP_TEXT") {
  const protocol = String(value || "").trim().toUpperCase();
  if (protocol === "MODBUS" || protocol === "MODBUS_TCP") return "MODBUS_TCP";
  if (protocol === "SLMP") return "SLMP";
  if (["TCP", "TEXT", "TCP_TEXT"].includes(protocol)) return "TCP_TEXT";
  return fallback;
}

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE";
}

function createMachineNumber(payload = {}, existing = null) {
  const requested = toText(payload.machineNumber || payload.machine_number);
  if (requested) return requested;
  if (existing?.machine_number) return existing.machine_number;

  const base = [
    toText(payload.lineName || payload.line_name),
    toText(payload.operationNo || payload.operation_no),
    toText(payload.machineName || payload.machine_name),
  ]
    .filter(Boolean)
    .join("_")
    .replace(/[^A-Z0-9_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return base || `MC_${Date.now()}`;
}

async function getRangeDefaults(rangeId) {
  const id = toPositiveInt(rangeId);
  if (!id) return null;
  const range = await PlcRegisterRange.findByPk(id);
  if (!range) return null;
  return {
    row: range,
    defaults: parseJsonField(range.default_register_map, {}),
  };
}

async function resolveMachineFromRequest(body = {}) {
  const machineId = toPositiveInt(body.machineId || body.id);
  if (!machineId) return null;
  return Machine.findByPk(machineId);
}

function buildPlcConfig(payload = {}, existing = null, rangeDefaults = {}) {
  const incoming = payload.plcConfig && typeof payload.plcConfig === "object" ? payload.plcConfig : {};
  const existingConfig = parseJsonField(existing?.plc_registers, {});
  const base = { ...rangeDefaults, ...existingConfig, ...incoming };

  const statusRegister =
    toInt(base.statusRegister) ??
    toInt(base.runningRegister) ??
    toInt(payload.plcStatusRegister) ??
    existing?.plc_status_register ??
    null;

  const config = {
    rangeId: toPositiveInt(payload.plcRangeId ?? base.rangeId ?? existing?.plc_range_id),
    startRegister: toInt(base.startRegister, existing?.plc_start_register ?? null),
    statusRegister,
    runningRegister: toInt(base.runningRegister, existing?.plc_status_register ?? null),
    blockRegister: toInt(base.blockRegister),
    endOkRegister: toInt(base.endOkRegister),
    endNgRegister: toInt(base.endNgRegister),
    partRegister: toInt(base.partRegister, existing?.plc_part_register ?? null),
    stationRegister: toInt(base.stationRegister, existing?.plc_station_register ?? null),
    resetRegister: toInt(base.resetRegister, existing?.plc_reset_register ?? null),
    heartbeatRegister: toInt(base.heartbeatRegister, existing?.plc_heartbeat_register ?? null),
    bypassRegister: toInt(base.bypassRegister),
    startValue: toInt(base.startValue, existing?.plc_start_value ?? 1),
    startedValue: toInt(base.startedValue, existing?.plc_started_value ?? 2),
    endOkValue: toInt(base.endOkValue, existing?.plc_end_ok_value ?? 3),
    endNgValue: toInt(base.endNgValue, existing?.plc_end_ng_value ?? 4),
    blockValue: toInt(base.blockValue, existing?.plc_block_value ?? 2),
    resetValue: toInt(base.resetValue, existing?.plc_reset_value ?? 9),
    handshakeMap: Array.isArray(base.handshakeMap) ? base.handshakeMap : [],
    slmpFrameMode: toText(
      payload.plcSlmpFrameMode ?? base.slmpFrameMode ?? existing?.plc_slmp_frame_mode,
      "AUTO"
    ).toUpperCase(),
  };

  return config;
}

async function buildMachineWritePayload(payload = {}, existing = null) {
  const rangeMeta = await getRangeDefaults(payload.plcRangeId ?? payload.plcConfig?.rangeId ?? existing?.plc_range_id);
  const plcConfig = buildPlcConfig(payload, existing, rangeMeta?.defaults || {});
  const protocol = normalizeProtocol(payload.plcProtocol ?? rangeMeta?.row?.plc_protocol ?? existing?.plc_protocol);
  const machineIp = toText(payload.machineIp ?? payload.machine_ip ?? payload.plcIp ?? payload.plc_ip, existing?.machine_ip || "");
  const machinePort = toInt(payload.machinePort ?? payload.machine_port ?? payload.plcPort ?? payload.plc_port, existing?.machine_port ?? null);
  const plcIp = toText(payload.plcIp ?? payload.plc_ip ?? machineIp, existing?.plc_ip || machineIp);
  const plcPort = toInt(payload.plcPort ?? payload.plc_port ?? machinePort, existing?.plc_port ?? machinePort);
  const plcSignalMap = Array.isArray(payload.plcSignalMap) ? payload.plcSignalMap : parseJsonField(existing?.plc_signal_map, []);

  return {
    machine_number: createMachineNumber(payload, existing),
    line_name: toText(payload.lineName ?? payload.line_name, existing?.line_name || ""),
    sequence_no: toPositiveInt(payload.sequenceNo ?? payload.sequence_no, existing?.sequence_no ?? null),
    operation_no: toText(payload.operationNo ?? payload.operation_no, existing?.operation_no || "").toUpperCase(),
    machine_name: toText(payload.machineName ?? payload.machine_name, existing?.machine_name || ""),
    machine_ip: machineIp,
    machine_port: machinePort,
    qr_scanner_ip: toText(payload.qrScannerIp ?? payload.qr_scanner_ip, existing?.qr_scanner_ip || "") || null,
    plc_ip: plcIp || null,
    plc_port: plcPort,
    plc_range_id: plcConfig.rangeId,
    plc_protocol: protocol,
    plc_registers: JSON.stringify(plcConfig),
    plc_signal_map: JSON.stringify(plcSignalMap),
    plc_unit_id: toPositiveInt(payload.plcUnitId ?? payload.plc_unit_id, existing?.plc_unit_id ?? 1) || 1,
    plc_start_register: plcConfig.startRegister,
    plc_status_register: plcConfig.statusRegister,
    plc_part_register: plcConfig.partRegister,
    plc_station_register: plcConfig.stationRegister,
    plc_reset_register: plcConfig.resetRegister,
    plc_start_value: plcConfig.startValue,
    plc_started_value: plcConfig.startedValue,
    plc_end_ok_value: plcConfig.endOkValue,
    plc_end_ng_value: plcConfig.endNgValue,
    plc_block_value: plcConfig.blockValue,
    plc_reset_value: plcConfig.resetValue,
    plc_slmp_device: toText(payload.plcSlmpDevice ?? payload.plc_slmp_device, existing?.plc_slmp_device || "") || null,
    plc_heartbeat_register: plcConfig.heartbeatRegister,
    daily_target_qty: Math.max(toInt(payload.dailyTargetQty ?? payload.daily_target_qty, existing?.daily_target_qty ?? 0) || 0, 0),
    status: normalizeStatus(payload.status ?? existing?.status),
    is_active: normalizeStatus(payload.status ?? existing?.status) === "ACTIVE",
  };
}

function formatMachineRow(row) {
  const json = row.toJSON();
  const plcConfig = parseJsonField(json.plc_registers, {});
  const plcSignalMap = parseJsonField(json.plc_signal_map, []);
  const bypassState = getMachineBypass(json.id);

  return {
    id: json.id,
    machineNumber: json.machine_number,
    machineName: json.machine_name,
    lineName: json.line_name,
    sequenceNo: json.sequence_no,
    operationNo: json.operation_no,
    cycleTimeSec: 0,
    loadingTimeSec: 0,
    dailyTargetQty: json.daily_target_qty ?? 0,
    status: json.status || (json.is_active ? "ACTIVE" : "INACTIVE"),
    isActive: Boolean(json.is_active),
    isRunning: Boolean(json.is_running),
    runningPartId: json.running_part_id || null,
    runningStationNo: json.running_station_no || null,
    runningStartedAt: json.running_started_at || null,
    machineIp: json.machine_ip,
    machinePort: json.machine_port,
    qrScannerIp: json.qr_scanner_ip,
    plcIp: json.plc_ip,
    plcPort: json.plc_port,
    plcRangeId: json.plc_range_id,
    plcProtocol: json.plc_protocol || "TCP_TEXT",
    plcUnitId: json.plc_unit_id || 1,
    plcStartRegister: json.plc_start_register,
    plcStatusRegister: json.plc_status_register,
    plcPartRegister: json.plc_part_register,
    plcStationRegister: json.plc_station_register,
    plcResetRegister: json.plc_reset_register,
    plcStartValue: json.plc_start_value,
    plcStartedValue: json.plc_started_value,
    plcEndOkValue: json.plc_end_ok_value,
    plcEndNgValue: json.plc_end_ng_value,
    plcBlockValue: json.plc_block_value,
    plcResetValue: json.plc_reset_value,
    plcSlmpDevice: json.plc_slmp_device,
    plcHeartbeatRegister: json.plc_heartbeat_register,
    plcHeartbeatStaleMs: json.plc_heartbeat_stale_ms,
    plcSignalMap,
    plcConfig,
    spcConfig: plcConfig?.spcConfig || {},
    machineBypassEnabled: isMachineBypassEnabled(json.id),
    machineBypassReason: bypassState?.reason || null,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
}

function requireMachinePayload(payload) {
  const missing = [];
  if (!toText(payload.machineName)) missing.push("machineName");
  if (!toText(payload.lineName)) missing.push("lineName");
  if (!toText(payload.operationNo)) missing.push("operationNo");
  if (!toPositiveInt(payload.sequenceNo)) missing.push("sequenceNo");
  if (!toText(payload.machineIp ?? payload.plcIp)) missing.push("plcIp");
  if (!toInt(payload.machinePort ?? payload.plcPort)) missing.push("plcPort");
  if (missing.length) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  }
}

async function resolveRequestMachine(body = {}) {
  const machine = await resolveMachineFromRequest(body);
  if (!machine) {
    throw new Error("Machine not found");
  }
  return machine;
}

function getEndpointFromMachine(machine, body = {}) {
  const protocol = normalizeProtocol(body.protocol ?? body.plcProtocol ?? body.plc_protocol ?? machine.plc_protocol);
  const plcConfig = parseJsonField(machine.plc_registers, {});
  return {
    protocol,
    ip: toText(body.plcIp ?? body.plc_ip, machine.plc_ip || machine.machine_ip),
    port: toInt(body.plcPort ?? body.plc_port, machine.plc_port || machine.machine_port),
    machine: {
      ...machine.toJSON(),
      plc_protocol: protocol,
      plc_registers: machine.plc_registers,
      plc_slmp_device: body.plcSlmpDevice || machine.plc_slmp_device,
      plc_slmp_frame_mode: body.plcSlmpFrameMode || plcConfig.slmpFrameMode || "AUTO",
    },
    plcConfig,
  };
}

async function readProbeRegister({ protocol, ip, port, machine, body, plcConfig }) {
  const requestedRegister =
    toInt(body.registerNo) ??
    toInt(body.plcStatusRegister) ??
    toInt(plcConfig.statusRegister) ??
    toInt(plcConfig.runningRegister) ??
    machine.plc_status_register;

  if (!Number.isFinite(requestedRegister)) return null;

  if (protocol === "MODBUS_TCP") {
    const probe = await readModbusRegisters({
      ip,
      port,
      unitId: machine.plc_unit_id || 1,
      registers: [requestedRegister],
      timeoutMs: toPositiveInt(body.timeoutMs, 5000) || 5000,
    });
    return {
      register: requestedRegister,
      statusValue: probe.values?.[requestedRegister] ?? null,
      errors: probe.errors || [],
    };
  }

  if (protocol === "SLMP") {
    const device = toText(body.plcSlmpDevice || machine.plc_slmp_device, "D").toUpperCase();
    const frameMode = toText(body.plcSlmpFrameMode || plcConfig.slmpFrameMode, "AUTO").toUpperCase();
    const probe = await readSlmpRegisters({
      ip,
      port,
      registers: [{ register: requestedRegister, device }],
      defaultDevice: device,
      frameMode,
      timeoutMs: toPositiveInt(body.timeoutMs, 5000) || 5000,
    });
    return {
      register: requestedRegister,
      device,
      frameMode,
      statusValue: probe.values?.[requestedRegister] ?? null,
      errors: probe.errors || [],
    };
  }

  return null;
}

exports.getMachines = async (_req, res) => {
  try {
    const rows = await Machine.findAll({ order: [["sequence_no", "ASC"], ["id", "ASC"]] });
    res.json(rows.map(formatMachineRow));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMachineById = async (req, res) => {
  try {
    const machine = await Machine.findByPk(toPositiveInt(req.params.id));
    if (!machine) {
      return res.status(404).json({ error: "Machine not found" });
    }
    res.json(formatMachineRow(machine));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createMachine = async (req, res) => {
  try {
    requireMachinePayload(req.body || {});
    const payload = await buildMachineWritePayload(req.body || {});
    const row = await Machine.create(payload);
    res.status(201).json(formatMachineRow(row));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateMachine = async (req, res) => {
  try {
    const machine = await Machine.findByPk(toPositiveInt(req.params.id));
    if (!machine) {
      return res.status(404).json({ error: "Machine not found" });
    }

    requireMachinePayload({ ...formatMachineRow(machine), ...(req.body || {}) });
    const payload = await buildMachineWritePayload(req.body || {}, machine);
    await machine.update(payload);
    res.json(formatMachineRow(machine));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteMachine = async (req, res) => {
  try {
    const machine = await Machine.findByPk(toPositiveInt(req.params.id));
    if (!machine) {
      return res.status(404).json({ error: "Machine not found" });
    }
    await machine.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMachineTarget = async (req, res) => {
  try {
    const machine = await Machine.findByPk(toPositiveInt(req.params.id));
    if (!machine) {
      return res.status(404).json({ error: "Machine not found" });
    }
    const dailyTargetQty = Math.max(toInt(req.body?.dailyTargetQty ?? req.body?.targetQty, 0) || 0, 0);
    await machine.update({ daily_target_qty: dailyTargetQty });
    res.json(formatMachineRow(machine));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.testPlc = async (req, res) => {
  try {
    const machine = await resolveRequestMachine(req.body || {});
    const { protocol, ip, port, plcConfig } = getEndpointFromMachine(machine, req.body || {});
    const probe = await plcService.testPlcConnection({
      ip,
      port,
      protocol,
      machine: {
        ...machine.toJSON(),
        plc_protocol: protocol,
        plc_slmp_device: req.body?.plcSlmpDevice || machine.plc_slmp_device,
        plc_slmp_frame_mode: req.body?.plcSlmpFrameMode || plcConfig.slmpFrameMode || "AUTO",
      },
    });
    const registerProbe = await readProbeRegister({ protocol, ip, port, machine, body: req.body || {}, plcConfig });

    res.json({
      ok: true,
      message: "PLC connection test passed.",
      probe: {
        ...probe,
        ...(registerProbe || {}),
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.resetPlc = async (req, res) => {
  try {
    const machine = await resolveRequestMachine(req.body || {});
    const { protocol, ip, port, plcConfig } = getEndpointFromMachine(machine, req.body || {});
    const reset = await plcService.resetPlcState({
      ip,
      port,
      protocol,
      stationNo: toText(req.body?.stationNo, machine.operation_no),
      machine: {
        ...machine.toJSON(),
        plc_protocol: protocol,
        plc_slmp_frame_mode: req.body?.plcSlmpFrameMode || plcConfig.slmpFrameMode || "AUTO",
      },
    });
    res.json({ ok: true, reset });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.sendPlcCommand = async (req, res) => {
  try {
    const machine = await resolveRequestMachine(req.body || {});
    const { protocol, ip, port, plcConfig } = getEndpointFromMachine(machine, req.body || {});
    const command = toText(req.body?.command).toUpperCase();
    if (!command) {
      throw new Error("command is required");
    }
    const result = await plcService.sendPlcCommand({
      ip,
      port,
      protocol,
      command,
      stationNo: toText(req.body?.stationNo, machine.operation_no),
      partId: toText(req.body?.partId, null),
      machine: {
        ...machine.toJSON(),
        plc_protocol: protocol,
        plc_slmp_frame_mode: req.body?.plcSlmpFrameMode || plcConfig.slmpFrameMode || "AUTO",
      },
    });
    res.json({ ok: true, result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.writePlcValue = async (req, res) => {
  try {
    const machine = await resolveRequestMachine(req.body || {});
    const { protocol, ip, port, plcConfig } = getEndpointFromMachine(machine, req.body || {});
    const registerNo = toInt(req.body?.registerNo);
    const value = toInt(req.body?.value);

    if (!Number.isFinite(registerNo)) throw new Error("registerNo is required");
    if (!Number.isFinite(value)) throw new Error("value is required");

    let write;
    if (protocol === "MODBUS_TCP") {
      write = await writeModbusRegister({
        ip,
        port,
        unitId: machine.plc_unit_id || 1,
        register: registerNo,
        value,
        timeoutMs: toPositiveInt(req.body?.timeoutMs, 5000) || 5000,
      });
    } else if (protocol === "SLMP") {
      write = await writeSlmpRegister({
        ip,
        port,
        register: registerNo,
        value,
        device: toText(req.body?.plcSlmpDevice || machine.plc_slmp_device, "D").toUpperCase(),
        frameMode: toText(req.body?.plcSlmpFrameMode || plcConfig.slmpFrameMode, "AUTO").toUpperCase(),
        timeoutMs: toPositiveInt(req.body?.timeoutMs, 5000) || 5000,
      });
    } else {
      throw new Error("Manual register write is supported for MODBUS_TCP and SLMP only");
    }

    res.json({ ok: true, write });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
