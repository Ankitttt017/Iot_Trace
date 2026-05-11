require('dotenv').config({ path: './.env' });
const db = require('../rico-iot/src/config/db');

async function alter() {
  try {
    await db.run(`IF COL_LENGTH('dbo.iot_machines', 'part_name') IS NULL ALTER TABLE dbo.iot_machines ADD part_name NVARCHAR(200) NULL`);
    console.log("DB altered successfully");
  } catch (e) {
    console.error("Error altering DB:", e);
  } finally {
    process.exit();
  }
}
alter();
