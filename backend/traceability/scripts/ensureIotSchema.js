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
  // Skip if schema file doesn't exist
  if (!fs.existsSync(schemaPath)) {
    console.log("[ensureIotSchema] Schema file not found, skipping.");
    return;
  }

  let pool;
  try {
    pool = new sqlServer.ConnectionPool({
      ...getSqlServerConfig(),
      connectionTimeout: 10000,  // 10s timeout instead of hanging forever
      requestTimeout: 10000,
    });

    await pool.connect();

    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    const batches = splitSqlBatches(schemaSql);

    for (const batch of batches) {
      try {
        await pool.request().batch(batch);
      } catch (batchErr) {
        // Ignore "already exists" errors — table/index already created
        if (
          batchErr.message.includes("already exists") ||
          batchErr.message.includes("There is already an object")
        ) {
          continue;
        }
        console.warn("[ensureIotSchema] Batch warning:", batchErr.message);
      }
    }

    console.log("[ensureIotSchema] Schema check complete.");
  } catch (err) {
    // Don't crash the server if schema check fails
    console.warn("[ensureIotSchema] Skipped due to error:", err.message);
  } finally {
    if (pool) await pool.close();
  }
}

module.exports = { ensureIotSchema };