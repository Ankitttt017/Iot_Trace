const fs = require("fs");
const path = require("path");
const {
  getSqlServerConfig,
  isTrustedConnection,
} = require("../config/sqlServerConfig");

const sqlServer = isTrustedConnection() ? require("mssql/msnodesqlv8") : require("mssql");

const schemaPath = path.resolve(__dirname, "../../rico-iot/schema.mssql.sql");

function splitSqlBatches(sqlText) {
  return sqlText
    .split(/^\s*GO\s*;?\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);
}

async function ensureIotSchema() {
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const pool = new sqlServer.ConnectionPool(getSqlServerConfig());
  await pool.connect();

  try {
    for (const batch of splitSqlBatches(schemaSql)) {
      await pool.request().batch(batch);
    }
  } finally {
    await pool.close();
  }
}

module.exports = { ensureIotSchema };
