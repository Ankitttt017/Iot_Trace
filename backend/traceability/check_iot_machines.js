require('dotenv').config({ path: './.env' });
const db = require('../rico-iot/src/config/db');

async function check() {
  try {
    const res = await db.query(`SELECT TOP 1 * FROM dbo.iot_machines`);
    console.log("iot_machines:", Object.keys(res.rows[0] || {}));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
