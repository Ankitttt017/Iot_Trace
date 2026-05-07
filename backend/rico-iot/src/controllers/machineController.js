const db = require("../config/db");

const TABLES = {
  parts: "iot_parts",
  machines: "iot_machines",
  machineStatus: "iot_machine_status",
};

const allowedStatuses = new Set(["RUNNING", "STOPPED", "IDLE"]);

function cleanStatus(status) {
  const normalized = String(status || "IDLE").trim().toUpperCase();
  return allowedStatuses.has(normalized) ? normalized : "IDLE";
}

function cleanMachine(row) {
  return {
    id: row.id,
    name: row.name || "Unknown machine",
    category: row.category || "Uncategorized",
    status: cleanStatus(row.status),
    part: row.part || "No part assigned",
    operation_no: row.operation_no || null,
    last_updated: row.last_updated || null,
  };
}

// GET /api/machines
const getMachines = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        m.id,
        COALESCE(m.name, m.machine_code, CONCAT('Machine ', m.id)) AS name,
        COALESCE(m.category, 'Uncategorized') AS category,
        COALESCE(ms.status, 'IDLE') AS status,
        COALESCE(p.description, ms.part_code, 'No part assigned') AS part,
        ms.operation_no,
        ms.updated_at AS last_updated
      FROM ${TABLES.machines} m
      LEFT JOIN (
        SELECT ranked.*
        FROM (
          SELECT
            machine_status.*,
            ROW_NUMBER() OVER (
              PARTITION BY machine_id
              ORDER BY
                CASE WHEN updated_at IS NULL THEN 1 ELSE 0 END,
                updated_at DESC,
                CASE WHEN created_at IS NULL THEN 1 ELSE 0 END,
                created_at DESC,
                id DESC
            ) AS rn
          FROM ${TABLES.machineStatus} machine_status
        ) ranked
        WHERE ranked.rn = 1
      ) ms ON ms.machine_id = m.id
      LEFT JOIN ${TABLES.parts} p ON p.material_code = ms.part_code
      ORDER BY name ASC
    `);

    res.json(rows.map(cleanMachine));
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Unable to load machines",
      error: err.message,
    });
  }
};

// GET /api/machines/:id/status-history
const getMachineStatusHistory = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         id,
         machine_id,
         status,
         part_code,
         operation_no,
         updated_at,
         created_at
       FROM ${TABLES.machineStatus}
       WHERE machine_id = ?
       ORDER BY
         CASE WHEN updated_at IS NULL THEN 1 ELSE 0 END,
         updated_at ASC,
         CASE WHEN created_at IS NULL THEN 1 ELSE 0 END,
         created_at ASC,
         id ASC`,
      [req.params.id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Unable to load machine status history",
      error: err.message,
    });
  }
};

module.exports = { getMachines, getMachineStatusHistory };
