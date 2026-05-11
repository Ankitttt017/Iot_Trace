require('dotenv').config({ path: './.env' });
const db = require('../rico-iot/src/config/db');

async function check() {
  try {
    await db.run(`ALTER TABLE dbo.iot_machines ADD port NVARCHAR(50) NULL`);
    console.log("Added port column successfully");
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('Column names in each table must be unique')) {
      console.log("Column port already exists");
    } else {
      console.error(e);
    }
  } finally {
    process.exit();
  }
}
check();
