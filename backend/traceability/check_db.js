require('dotenv').config({ path: './.env' });
const db = require('../rico-iot/src/config/db');

async function check() {
  try {
    const res1 = await db.query(`SELECT TOP 1 * FROM dbo.iot_parts_master_raw`);
    console.log("iot_parts_master_raw:", Object.keys(res1.rows[0] || {}));
    
    const res2 = await db.query(`SELECT TOP 1 * FROM dbo.iot_parts_master_bawal_raw`);
    console.log("iot_parts_master_bawal_raw:", Object.keys(res2.rows[0] || {}));

    const res3 = await db.query(`SELECT TOP 1 * FROM dbo.iot_machine_master_raw`);
    console.log("machine_master_raw:", Object.keys(res3.rows[0] || {}));

    const res4 = await db.query(`SELECT TOP 1 * FROM dbo.iot_machine_master_bawal_raw`);
    console.log("machine_master_bawal_raw:", Object.keys(res4.rows[0] || {}));

  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
