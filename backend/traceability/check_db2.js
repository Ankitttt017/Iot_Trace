require('dotenv').config({ path: './.env' });
const db = require('../rico-iot/src/config/db');

async function check() {
  try {
    const r1 = await db.query(`SELECT TOP 5 material AS material_code, material_description AS description, material_group, customer, manufacturing_type FROM dbo.iot_parts_master_raw`);
    console.log("Parts Gurgaon:", r1.rows);

    const r2 = await db.query(`SELECT TOP 5 material AS material_code, material_description AS description, material_group, NULL AS customer, NULL AS manufacturing_type FROM dbo.iot_parts_master_bawal_raw`);
    console.log("Parts Bawal:", r2.rows);

    const r3 = await db.query(`SELECT TOP 5 s4hana AS machine_code, description AS name, asset, cost_center, NULL AS category FROM dbo.iot_machine_master_raw`);
    console.log("Machines Gurgaon:", r3.rows);

    const r4 = await db.query(`SELECT TOP 5 equipment AS machine_code, description AS name, asset, cost_center, division AS category FROM dbo.iot_machine_master_bawal_raw`);
    console.log("Machines Bawal:", r4.rows);

    const r5 = await db.query(`SELECT TOP 5 DISTINCT COALESCE(label, CAST(sr_no AS VARCHAR(50))) AS operation_no, name AS operation_name FROM dbo.iot_operations WHERE name IS NOT NULL`);
    console.log("Operations:", r5.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
