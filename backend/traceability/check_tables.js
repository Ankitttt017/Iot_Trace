require('dotenv').config({ path: './.env' });
const db = require('../rico-iot/src/config/db');

async function check() {
  try {
    // Check raw machine master table
    const { rows: m1 } = await db.query(`SELECT TOP 3 * FROM dbo.iot_machine_master_raw`);
    console.log("iot_machine_master_raw:", m1);

    // Check columns of iot_machines
    const { rows: m2 } = await db.query(`SELECT TOP 3 * FROM dbo.iot_machines WHERE plant_code = '1002'`);
    console.log("iot_machines 1002:", m2);
    
    // Check if bawal raw table exists
    try {
      const { rows: m3 } = await db.query(`SELECT TOP 2 * FROM dbo.iot_machine_master_bawal_raw`);
      console.log("bawal raw:", m3);
    } catch(e) {
      console.log("bawal raw error:", e.message);
    }
    
    // Check parts
    try {
      const { rows: p1 } = await db.query(`SELECT TOP 2 * FROM dbo.iot_parts_master_raw`);
      console.log("parts_master_raw:", p1);
    } catch(e) {
      console.log("parts_master_raw error:", e.message);
    }

  } catch(e) {
    console.error(e.message);
  } finally {
    process.exit();
  }
}
check();
