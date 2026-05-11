require('dotenv').config({ path: './.env' });
const db = require('../rico-iot/src/config/db');

async function fix() {
  try {
    await db.run(`DROP TABLE IF EXISTS dbo.iot_machine_operations`);
    
    const q = `
      CREATE TABLE dbo.iot_machine_operations (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        machine_id BIGINT NOT NULL,
        part_code VARCHAR(40) NOT NULL,
        operation_id BIGINT NULL,
        operation_no VARCHAR(20) NOT NULL,
        is_primary BIT DEFAULT 0,
        cycle_time_sec INT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      )
    `;
    await db.run(q);
    console.log("Recreated iot_machine_operations successfully");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
fix();
