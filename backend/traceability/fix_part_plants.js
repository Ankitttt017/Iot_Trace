require('dotenv').config({ path: './.env' });
const db = require('../rico-iot/src/config/db');

async function fix() {
  try {
    await db.run(`DROP TABLE IF EXISTS dbo.iot_part_plants`);
    
    const q = `
      CREATE TABLE dbo.iot_part_plants (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        part_code VARCHAR(40) NOT NULL,
        plant_code VARCHAR(20) NOT NULL,
        storage_location VARCHAR(20) NULL,
        unit_of_measure VARCHAR(20) NULL,
        material_type VARCHAR(50) NULL,
        material_group VARCHAR(50) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      )
    `;
    await db.run(q);
    console.log("Recreated iot_part_plants successfully");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
fix();
