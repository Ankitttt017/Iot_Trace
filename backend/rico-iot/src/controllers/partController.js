const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');
const TABLES = {
  plants: 'iot_plants',
  materials: 'iot_materials',
  parts: 'iot_parts',
  operations: 'iot_operations',
  machines: 'iot_machines',
  machineStatus: 'iot_machine_status',
  processFlow: 'iot_process_flow_diagrams',
  inspection: 'iot_inspection_sheets',
  controlPlan: 'iot_control_plan_charts',
};

function nullSafeEquals(column, placeholder = '?') {
  return `EXISTS (SELECT ${column} INTERSECT SELECT ${placeholder})`;
}

// GET /api/plants
const getAllPlants = async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM ${TABLES.plants} ORDER BY name`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parts?plant=GURUGRAM&search=brake&group=FINISHED&status=ENABLED&page=1&limit=50
const getPartsByPlant = async (req, res) => {
  try {
    const { plant, search, group, status, page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];

    let whereClauses = [];

    if (plant) {
      whereClauses.push('p.plant_code = ?');
      params.push(plant);
    }
    if (search) {
      whereClauses.push('(LOWER(p.description) LIKE ? OR p.material_code LIKE ?)');
      params.push(`%${search.toLowerCase()}%`, `%${search}%`);
    }
    if (group) {
      whereClauses.push('p.material_group = ?');
      params.push(group);
    }
    if (status) {
      whereClauses.push('UPPER(COALESCE(p.status, ?)) = ?');
      params.push('ENABLED', String(status).toUpperCase());
    }

    const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Fetch parts
    const { rows } = await db.query(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM ${TABLES.operations} o WHERE o.part_code = p.material_code) AS operation_count
       FROM ${TABLES.parts} p ${where}
       ORDER BY p.sl_no ASC
       OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
      [...params, offset, parseInt(limit)]
    );

    // Count totals
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) as total FROM ${TABLES.parts} p ${where}`, params
    );

    // Stats
    const { rows: statsRows } = await db.query(
      `SELECT 
         COUNT(DISTINCT material_group) as part_types,
         SUM(CASE WHEN COALESCE(operation_counts.operation_count, 0) > 0 THEN 1 ELSE 0 END) as linked,
         SUM(CASE WHEN COALESCE(operation_counts.operation_count, 0) = 0 THEN 1 ELSE 0 END) as unlinked
       FROM ${TABLES.parts} p
       LEFT JOIN (
         SELECT part_code, COUNT(*) AS operation_count
         FROM ${TABLES.operations}
         GROUP BY part_code
       ) operation_counts ON operation_counts.part_code = p.material_code
       ${where}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      total: countRows[0]?.total || 0,
      stats: statsRows[0] || { part_types: 0, linked: 0, unlinked: 0 },
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parts/:id
const getPartById = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM ${TABLES.parts} WHERE material_code = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Part not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/parts/:id
const updatePartById = async (req, res) => {
  try {
    const allowedFields = [
      'final_opn_code',
      'opn_number',
      'customer',
      'plant_code',
      'manufacturing_type',
      'status',
      'traceability_status',
    ];
    const updates = allowedFields.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));

    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No editable fields supplied' });
    }

    const params = updates.map((field) => {
      if (field === 'status') {
        return String(req.body[field] || 'ENABLED').toUpperCase() === 'DISABLED' ? 'DISABLED' : 'ENABLED';
      }
      if (field === 'traceability_status') {
        return String(req.body[field] || 'ENABLED').toUpperCase() === 'DISABLED' ? 'DISABLED' : 'ENABLED';
      }
      return req.body[field] || null;
    });
    await db.run(
      `UPDATE ${TABLES.parts} SET ${updates.map((field) => `${field} = ?`).join(', ')} WHERE material_code = ?`,
      [...params, req.params.id]
    );

    const { rows } = await db.query(`SELECT * FROM ${TABLES.parts} WHERE material_code = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Part not found' });

    res.json({ success: true, data: rows[0], message: 'Part updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parts/:id/operations
const getPartOperations = async (req, res) => {
  try {
    const { rows } = await db.query(
      `WITH status_operations AS (
         SELECT
           part_code,
           operation_no,
           MIN(id) AS status_id,
           MAX(updated_at) AS last_seen
         FROM ${TABLES.machineStatus}
         WHERE part_code = ?
           AND NULLIF(TRIM(operation_no), '') IS NOT NULL
         GROUP BY part_code, operation_no
       ),
       deduped_operations AS (
         SELECT
           MIN(id) AS id,
           part_code,
           sr_no,
           name,
           type,
           label,
           rework,
           MIN(created_at) AS created_at
         FROM ${TABLES.operations}
         WHERE part_code = ?
         GROUP BY part_code, sr_no, name, type, label, rework
       ),
       ranked_operations AS (
         SELECT
           COALESCE(o.id, so.status_id) AS id,
           so.part_code,
           o.sr_no,
           COALESCE(o.name, CONCAT('Operation ', so.operation_no)) AS name,
           COALESCE(o.type, 'RECORDED') AS type,
           COALESCE(o.label, so.operation_no) AS label,
           COALESCE(o.rework, 'No rework assigned') AS rework,
           so.operation_no,
           so.last_seen,
           o.created_at,
           ROW_NUMBER() OVER (
             PARTITION BY so.operation_no
             ORDER BY CASE WHEN o.sr_no IS NULL THEN 1 ELSE 0 END, o.sr_no, o.id
           ) AS rn
         FROM status_operations so
         LEFT JOIN deduped_operations o
           ON o.part_code = so.part_code
          AND (
            UPPER(TRIM(so.operation_no)) = UPPER(TRIM(o.label))
            OR UPPER(TRIM(so.operation_no)) = UPPER(TRIM(CAST(o.sr_no AS VARCHAR(50))))
            OR REPLACE(REPLACE(UPPER(TRIM(so.operation_no)), 'OP-', ''), 'OP', '') =
               REPLACE(REPLACE(UPPER(TRIM(COALESCE(o.label, CAST(o.sr_no AS VARCHAR(50))))), 'OP-', ''), 'OP', '')
          )
       ),
       mapped_operations AS (
         SELECT id, part_code, sr_no, name, type, label, rework, operation_no, last_seen, created_at
         FROM ranked_operations
         WHERE rn = 1
       )
       SELECT
         o.*,
         ISNULL(machine_json.machines, '[]') AS machines
       FROM mapped_operations o
       OUTER APPLY (
         SELECT
           m.id,
           m.machine_code AS machineCode,
           COALESCE(m.name, m.machine_code) AS name,
           ms.status,
           ms.updated_at AS lastSeen
         FROM ${TABLES.machineStatus} ms
         LEFT JOIN ${TABLES.machines} m ON m.id = ms.machine_id
         WHERE m.id IS NOT NULL
           AND ms.part_code = o.part_code
           AND (
             UPPER(TRIM(ms.operation_no)) = UPPER(TRIM(o.operation_no))
             OR UPPER(TRIM(ms.operation_no)) = UPPER(TRIM(o.label))
             OR REPLACE(REPLACE(UPPER(TRIM(ms.operation_no)), 'OP-', ''), 'OP', '') =
                REPLACE(REPLACE(UPPER(TRIM(o.label)), 'OP-', ''), 'OP', '')
           )
         FOR JSON PATH
       ) machine_json(machines)
       ORDER BY
         CASE WHEN o.last_seen IS NULL THEN 1 ELSE 0 END,
         o.last_seen DESC,
         CASE WHEN o.sr_no IS NULL THEN 1 ELSE 0 END,
         o.sr_no,
         CASE WHEN o.label IS NULL THEN 1 ELSE 0 END,
         o.label,
         o.id`,
      [req.params.id, req.params.id]
    );
    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        machines: normalizeMachinesJson(row.machines),
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/operations?plant=1002&part=80000000&search=die&page=1&limit=10
const getOperationMaster = async (req, res) => {
  try {
    const { plant, part, search, page = 1, limit = 10 } = req.query;
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNumber - 1) * pageSize;
    const params = [];
    const whereClauses = [];

    if (plant) {
      whereClauses.push('p.plant_code = ?');
      params.push(plant);
    }
    if (part) {
      whereClauses.push('o.part_code = ?');
      params.push(part);
    }
    if (search) {
      whereClauses.push(`(
        LOWER(COALESCE(o.name, '')) LIKE ?
        OR LOWER(COALESCE(o.label, '')) LIKE ?
        OR LOWER(COALESCE(o.type, '')) LIKE ?
        OR LOWER(COALESCE(p.description, '')) LIKE ?
        OR LOWER(COALESCE(o.part_code, '')) LIKE ?
      )`);
      const term = `%${String(search).toLowerCase()}%`;
      params.push(term, term, term, term, term);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const baseQuery = `
      WITH filtered_operations AS (
        SELECT
          MIN(o.id) AS id,
          o.part_code,
          o.sr_no,
          o.label AS operation_id,
          o.name AS operation_name,
          o.type,
          o.rework,
          MIN(o.created_at) AS created_at
        FROM ${TABLES.operations} o
        LEFT JOIN ${TABLES.parts} p ON p.material_code = o.part_code
        ${where}
        GROUP BY o.part_code, o.sr_no, o.label, o.name, o.type, o.rework
      )
    `;

    const { rows: countRows } = await db.query(
      `${baseQuery} SELECT COUNT(*) AS total FROM filtered_operations`,
      params
    );

    const { rows: statsRows } = await db.query(
      `${baseQuery}
       SELECT
         COUNT(*) AS total,
         COUNT(DISTINCT CASE WHEN type IS NOT NULL AND type <> '' THEN type END) AS types,
         SUM(CASE WHEN part_code IS NOT NULL AND part_code <> '' THEN 1 ELSE 0 END) AS linked,
         0 AS unlinked
       FROM filtered_operations`,
      params
    );

    const { rows } = await db.query(
      `${baseQuery}
       SELECT
         d.id,
         d.sr_no,
         d.operation_id,
         d.operation_name,
         d.type,
         d.rework,
         d.part_code,
         p.description AS linked_part,
         p.plant_code,
         d.created_at AS modified_at,
         COALESCE(machine_counts.machine_count, 0) AS machine_count
       FROM filtered_operations d
       LEFT JOIN ${TABLES.parts} p ON p.material_code = d.part_code
       LEFT JOIN (
         SELECT part_code, operation_no, COUNT(DISTINCT machine_id) AS machine_count
         FROM ${TABLES.machineStatus}
         GROUP BY part_code, operation_no
       ) machine_counts
         ON machine_counts.part_code = d.part_code
       AND (
          UPPER(TRIM(machine_counts.operation_no)) = UPPER(TRIM(d.operation_id))
          OR UPPER(TRIM(machine_counts.operation_no)) = UPPER(TRIM(CAST(d.sr_no AS VARCHAR(50))))
          OR REPLACE(REPLACE(UPPER(TRIM(machine_counts.operation_no)), 'OP-', ''), 'OP', '') =
             REPLACE(REPLACE(UPPER(TRIM(COALESCE(d.operation_id, CAST(d.sr_no AS VARCHAR(50))))), 'OP-', ''), 'OP', '')
        )
       ORDER BY
         CASE WHEN d.sr_no IS NULL THEN 1 ELSE 0 END,
         d.sr_no,
         CASE WHEN d.operation_id IS NULL THEN 1 ELSE 0 END,
         d.operation_id,
         d.id
       OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
      [...params, offset, pageSize]
    );

    res.json({
      success: true,
      data: rows,
      total: Number(countRows[0]?.total || 0),
      stats: {
        total: Number(statsRows[0]?.total || 0),
        types: Number(statsRows[0]?.types || 0),
        linked: Number(statsRows[0]?.linked || 0),
        unlinked: Number(statsRows[0]?.unlinked || 0),
      },
      page: pageNumber,
      limit: pageSize,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/parts/:id/operations/:operationId
const updatePartOperation = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM ${TABLES.operations} WHERE id = ? AND part_code = ?`,
      [req.params.operationId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Operation not found' });

    const current = rows[0];
    const next = {
      sr_no: req.body.sr_no === '' || req.body.sr_no == null ? null : Number(req.body.sr_no),
      name: req.body.name || null,
      type: req.body.type || null,
      label: req.body.label || null,
      rework: req.body.rework || 'No rework assigned',
    };

    await db.run(
      `UPDATE ${TABLES.operations}
       SET sr_no = ?, name = ?, type = ?, label = ?, rework = ?
       WHERE part_code = ?
         AND ${nullSafeEquals('sr_no')}
         AND ${nullSafeEquals('name')}
         AND ${nullSafeEquals('type')}
         AND ${nullSafeEquals('label')}
         AND ${nullSafeEquals('rework')}`,
      [
        next.sr_no,
        next.name,
        next.type,
        next.label,
        next.rework,
        req.params.id,
        current.sr_no,
        current.name,
        current.type,
        current.label,
        current.rework,
      ]
    );

    res.json({ success: true, message: 'Operation updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/parts/:id/operations/:operationId
const deletePartOperation = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM ${TABLES.operations} WHERE id = ? AND part_code = ?`,
      [req.params.operationId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Operation not found' });

    const current = rows[0];
    await db.run(
      `DELETE FROM ${TABLES.operations}
       WHERE part_code = ?
         AND ${nullSafeEquals('sr_no')}
         AND ${nullSafeEquals('name')}
         AND ${nullSafeEquals('type')}
         AND ${nullSafeEquals('label')}
         AND ${nullSafeEquals('rework')}`,
      [req.params.id, current.sr_no, current.name, current.type, current.label, current.rework]
    );

    res.json({ success: true, message: 'Operation removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const sheetTables = {
  processFlow: TABLES.processFlow,
  inspection: TABLES.inspection,
  controlPlan: TABLES.controlPlan,
};

const sheetSelect = `
  SELECT
    id,
    upload_date AS uploadDate,
    version,
    file_name AS fileName,
    file_path AS filePath,
    updated_by AS updatedBy
`;

function safeFileName(fileName) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function saveUploadedFile(partCode, type, fileName, fileData) {
  if (!fileData) return null;

  const base64 = String(fileData).includes(',')
    ? String(fileData).split(',').pop()
    : String(fileData);
  const dir = path.join(UPLOAD_ROOT, partCode, type);
  fs.mkdirSync(dir, { recursive: true });

  const storedName = `${Date.now()}-${safeFileName(fileName)}`;
  const fullPath = path.join(dir, storedName);
  fs.writeFileSync(fullPath, Buffer.from(base64, 'base64'));
  return path.relative(path.join(__dirname, '../..'), fullPath).replace(/\\/g, '/');
}

function normalizeMachinesJson(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((machine) => machine && machine.id);
  } catch (_error) {
    return [];
  }
}

// GET /api/parts/:id/sheets
const getPartSheets = async (req, res) => {
  try {
    const result = {};
    for (const [key, table] of Object.entries(sheetTables)) {
      const { rows } = await db.query(
        `${sheetSelect} FROM ${table} WHERE part_code = ? ORDER BY id DESC`,
        [req.params.id]
      );
      result[key] = rows;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/parts/:id/sheets/:type
const uploadPartSheet = async (req, res) => {
  try {
    const table = sheetTables[req.params.type];
    if (!table) return res.status(400).json({ success: false, message: 'Invalid sheet type' });

    const { fileName, version, updatedBy, fileData } = req.body;
    if (!fileName) return res.status(400).json({ success: false, message: 'File name is required' });

    const uploadDate = new Date().toISOString().slice(0, 10);
    const filePath = saveUploadedFile(req.params.id, req.params.type, fileName, fileData);
    await db.run(
      `INSERT INTO ${table} (part_code, upload_date, version, file_name, file_path, updated_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, uploadDate, version || 'V1', fileName, filePath, updatedBy || 'Admin']
    );

    const { rows } = await db.query(
      `${sheetSelect} FROM ${table} WHERE part_code = ? ORDER BY id DESC`,
      [req.params.id]
    );

    res.status(201).json({ success: true, data: rows, message: 'Sheet uploaded' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parts/:id/sheets/:type/:sheetId/download
const downloadPartSheet = async (req, res) => {
  try {
    const table = sheetTables[req.params.type];
    if (!table) return res.status(400).json({ success: false, message: 'Invalid sheet type' });

    const { rows } = await db.query(
      `SELECT file_name, file_path FROM ${table} WHERE id = ? AND part_code = ?`,
      [req.params.sheetId, req.params.id]
    );
    if (!rows.length || !rows[0].file_path) {
      return res.status(404).json({ success: false, message: 'Sheet file not found' });
    }

    const fullPath = path.resolve(path.join(__dirname, '../..'), rows[0].file_path);
    if (!fullPath.startsWith(path.resolve(path.join(__dirname, '../..', 'uploads')))) {
      return res.status(400).json({ success: false, message: 'Invalid sheet path' });
    }

    res.download(fullPath, rows[0].file_name);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/parts/:id/configuration
const getPartConfiguration = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cycle_time_sec, box_quantity, manufacturing_type, total_produced FROM ${TABLES.parts} WHERE material_code = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Part not found' });
    const p = rows[0];
    res.json({
      success: true,
      data: {
        hourlyTarget: p.cycle_time_sec ? Math.floor(3600 / p.cycle_time_sec) : 0,
        cycletime: p.cycle_time_sec || 0,
        boxQuantity: p.box_quantity || 0,
        manufacturingType: p.manufacturing_type || '',
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/parts/:id/configuration
const updatePartConfiguration = async (req, res) => {
  try {
    const { cycletime, hourlyTarget, boxQuantity, manufacturingType } = req.body;
    const nextCycleTime = cycletime || (hourlyTarget ? Math.round(3600 / Number(hourlyTarget)) : 0);
    await db.run(
      `UPDATE ${TABLES.parts} SET cycle_time_sec = ?, box_quantity = ?, manufacturing_type = ? WHERE material_code = ?`,
      [nextCycleTime, boxQuantity || 0, manufacturingType, req.params.id]
    );
    res.json({ success: true, message: 'Configuration updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/materials?plant=GURUGRAM&group=RAWMAT
const getMaterials = async (req, res) => {
  try {
    const { plant, group, search, limit = 50 } = req.query;
    const params = [];
    let whereClauses = [];

    if (plant) { whereClauses.push('plant_code = ?'); params.push(plant); }
    if (group) { whereClauses.push('material_group = ?'); params.push(group); }
    if (search) {
      whereClauses.push('(LOWER(description) LIKE ? OR material_code LIKE ?)');
      params.push(`%${search.toLowerCase()}%`, `%${search}%`);
    }

    const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const { rows } = await db.query(
      `SELECT * FROM ${TABLES.materials} ${where} ORDER BY material_code OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY`,
      [...params, parseInt(limit)]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/stats?plant=GURUGRAM
const getStats = async (req, res) => {
  try {
    const { plant } = req.query;
    const params = plant ? [plant] : [];
    const where = plant ? 'WHERE plant_code = ?' : '';

    const { rows: partStats } = await db.query(
      `SELECT 
         COUNT(*) as total_parts,
         COUNT(DISTINCT material_group) as material_groups,
         COUNT(DISTINCT customer) as customers,
         COUNT(DISTINCT manufacturing_type) as mfg_types
       FROM ${TABLES.parts} ${where}`, params
    );
    const { rows: matStats } = await db.query(
      `SELECT COUNT(*) as total_materials FROM ${TABLES.materials} ${where}`, params
    );
    const { rows: mfgBreakdown } = await db.query(
      `SELECT manufacturing_type, COUNT(*) as count 
       FROM ${TABLES.parts} ${where} 
       GROUP BY manufacturing_type ORDER BY count DESC`, params
    );

    res.json({
      success: true,
      data: {
        ...partStats[0],
        total_materials: matStats[0]?.total_materials || 0,
        manufacturing_breakdown: mfgBreakdown,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllPlants, getPartsByPlant, getPartById, updatePartById,
  getOperationMaster,
  getPartOperations, updatePartOperation, deletePartOperation,
  getPartConfiguration, updatePartConfiguration,
  getPartSheets, uploadPartSheet, downloadPartSheet,
  getMaterials, getStats,
};
