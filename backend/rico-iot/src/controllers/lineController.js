const db = require('../config/db');

const OPERATION_MASTER = [
  ['OP-10', 'Incoming Inspection (Aluminium Alloy Ingots)'],
  ['OP-20A', 'Melting of Aluminium Alloy Ingots'],
  ['OP-20B', 'Degassing & Metal Treatment of Molten Metal'],
  ['OP-20C', 'Holding of Molten Metal for Casting'],
  ['OP-30', 'Die Casting'],
  ['OP-40', 'Trimming'],
  ['OP-50', 'Shot Blasting'],
  ['OP-50B', 'Final Inspection (Casting)'],
  ['OP-60', 'Face Milling, Drilling, Reaming, Tapping & Boring'],
  ['OP-70', 'Pre-Inspection'],
  ['OP-80', 'Marking (Dot Marking)'],
  ['OP-90', 'Leak Testing'],
  ['OP-100', 'Ultrasonic Washing'],
  ['OP-110', 'Final Inspection / Visual Inspection'],
  ['OP-120', 'Packaging'],
].map(([operation_no, operation_name]) => ({ operation_no, operation_name }));

const operationMap = new Map(OPERATION_MASTER.map((operation) => [operation.operation_no, operation.operation_name]));

function normalizeOperation(operationNo) {
  const operation_no = String(operationNo || '').trim();
  if (!operation_no) return { operation_no: null, operation_name: null };
  return {
    operation_no,
    operation_name: operationMap.get(operation_no) || null,
  };
}

const getAllLines = async (req, res) => {
  try {
    const { plant = '1002' } = req.query;
    const params = [];
    const where = plant ? 'WHERE lm.plant_code = ?' : '';
    if (plant) params.push(plant);

    const { rows } = await db.query(`
      SELECT 
        lm.line_id, lm.line_code, lm.line_name,
        lm.division, lm.plant, lm.plant_code, lm.is_active,
        COUNT(DISTINCT m.id) AS total_machines,
        COUNT(DISTINCT pm.Sl_No) AS total_parts
      FROM dbo.line_master lm
      LEFT JOIN dbo.iot_machines m  ON m.line_id  = lm.line_id
      LEFT JOIN dbo.parts_master pm ON pm.line_id = lm.line_id
      ${where}
      GROUP BY lm.line_id, lm.line_code, lm.line_name,
               lm.division, lm.plant, lm.plant_code, lm.is_active
      ORDER BY lm.line_id
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getLineById = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM dbo.line_master WHERE line_id = ?`,
      [req.params.id]
    );
    if (!rows[0])
      return res.status(404).json({ success: false, message: 'Line not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getLinesMachines = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, machine_code, name, category, asset, cost_center, line_id,
              operation_no, operation_name
       FROM dbo.iot_machines 
       WHERE line_id = ?
       ORDER BY name`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getLinesParts = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT Sl_No, Material, Material_Description, 
              Manufacturing_Type, Material_Group
       FROM dbo.parts_master 
       WHERE line_id = ?
       ORDER BY Material_Description`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createLine = async (req, res) => {
  try {
    const { line_code, line_name, plant = 'Gurugram Plant', plant_code = '1002', division, description } = req.body;
    if (!String(line_code || '').trim() || !String(line_name || '').trim()) {
      return res.status(400).json({ success: false, message: 'Line code and name are required' });
    }
    const { rows } = await db.run(
      `INSERT INTO dbo.line_master 
        (line_code, line_name, plant, plant_code, division, description)
       OUTPUT INSERTED.line_id
       VALUES (?, ?, ?, ?, ?, ?)`,
      [line_code, line_name, plant, plant_code, division, description || null]
    );
    res.json({ success: true, line_id: rows[0]?.line_id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateLine = async (req, res) => {
  try {
    const allowed = ['line_code', 'line_name', 'plant', 'plant_code', 'division', 'description', 'is_active'];
    const updates = allowed.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
    if (!updates.length) return res.status(400).json({ success: false, message: 'No line fields supplied' });

    await db.run(
      `UPDATE dbo.line_master
       SET ${updates.map((field) => `${field} = ?`).join(', ')},
           updated_at = GETDATE()
       WHERE line_id = ?`,
      [...updates.map((field) => req.body[field] === '' ? null : req.body[field]), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getLineOperations = async (_req, res) => {
  res.json({ success: true, data: OPERATION_MASTER });
};

const deleteLine = async (req, res) => {
  try {
    await db.run(`UPDATE dbo.iot_machines SET line_id = NULL WHERE line_id = ?`, [req.params.id]);
    await db.run(`DELETE FROM dbo.line_master WHERE line_id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addLineMachine = async (req, res) => {
  try {
    const { machine_code, name, category, asset, cost_center } = req.body;
    const operation = normalizeOperation(req.body.operation_no);
    if (!String(machine_code || '').trim() || !String(name || '').trim()) {
      return res.status(400).json({ success: false, message: 'Machine code and name are required' });
    }

    const { rows: lineRows } = await db.query(`SELECT plant_code FROM dbo.line_master WHERE line_id = ?`, [req.params.id]);
    if (!lineRows.length) return res.status(404).json({ success: false, message: 'Line not found' });

    const { rows } = await db.run(
      `INSERT INTO dbo.iot_machines
        (machine_code, name, category, plant_code, line_id, asset, cost_center, operation_no, operation_name)
       OUTPUT INSERTED.id
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(machine_code).trim(),
        String(name).trim(),
        category || null,
        lineRows[0].plant_code || '1002',
        req.params.id,
        asset || null,
        cost_center || null,
        operation.operation_no,
        operation.operation_name,
      ]
    );

    res.status(201).json({ success: true, id: rows[0]?.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateLineMachine = async (req, res) => {
  try {
    const allowed = ['machine_code', 'name', 'category', 'cost_center', 'asset', 'line_id', 'operation_no'];
    const updates = allowed.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
    if (!updates.length) return res.status(400).json({ success: false, message: 'No machine fields supplied' });

    const normalizedBody = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(req.body, 'operation_no')) {
      const operation = normalizeOperation(req.body.operation_no);
      normalizedBody.operation_no = operation.operation_no;
      normalizedBody.operation_name = operation.operation_name;
      updates.push('operation_name');
    }

    await db.run(
      `UPDATE dbo.iot_machines
       SET ${updates.map((field) => `${field} = ?`).join(', ')}
       WHERE id = ?`,
      [...updates.map((field) => normalizedBody[field] === '' ? null : normalizedBody[field]), req.params.machineId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const removeLineMachine = async (req, res) => {
  try {
    const mode = req.query.mode || 'detach';
    if (mode === 'delete') {
      await db.run(`DELETE FROM dbo.iot_machine_status WHERE machine_id = ?`, [req.params.machineId]);
      await db.run(`DELETE FROM dbo.iot_machines WHERE id = ?`, [req.params.machineId]);
    } else {
      await db.run(`UPDATE dbo.iot_machines SET line_id = NULL WHERE id = ?`, [req.params.machineId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  OPERATION_MASTER,
  getAllLines,
  getLineById,
  getLineOperations,
  getLinesMachines,
  getLinesParts,
  createLine,
  updateLine,
  deleteLine,
  addLineMachine,
  updateLineMachine,
  removeLineMachine,
};
