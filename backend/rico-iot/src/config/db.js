const {
  getSqlServerConfig,
  isTrustedConnection,
} = require("../../../traceability/config/sqlServerConfig");

const sqlServer = isTrustedConnection()
  ? require("../../../traceability/node_modules/mssql/msnodesqlv8")
  : require("../../../traceability/node_modules/mssql");

const config = getSqlServerConfig();
const pool = new sqlServer.ConnectionPool(config);
let poolConnect;

function getPool() {
  if (!poolConnect) {
    poolConnect = pool.connect();
  }
  return poolConnect;
}

function bindParams(request, params) {
  params.forEach((value, index) => {
    request.input(`p${index + 1}`, value);
  });
}

function toSqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function prepareSql(sql, params, { inlineParams = false } = {}) {
  let index = 0;
  const prepared = sql.replace(/\?/g, () => {
    index += 1;
    return inlineParams ? toSqlLiteral(params[index - 1]) : `@p${index}`;
  });

  if (index !== params.length) {
    throw new Error(`SQL parameter mismatch: expected ${index}, received ${params.length}`);
  }

  return prepared;
}

async function execute(sql, params = []) {
  const connection = await getPool();
  const request = connection.request();
  const inlineParams = isTrustedConnection();
  if (!inlineParams) {
    bindParams(request, params);
  }
  const result = await request.query(prepareSql(sql, params, { inlineParams }));
  return result;
}

async function query(sql, params = []) {
  const result = await execute(sql, params);
  return {
    rows: result.recordset || [],
    rowCount: result.rowsAffected?.[0] || result.recordset?.length || 0,
  };
}

async function run(sql, params = []) {
  const result = await execute(sql, params);
  return {
    rows: result.recordset || [],
    rowCount: result.rowsAffected?.[0] || 0,
    changes: result.rowsAffected?.[0] || 0,
    insertId: result.recordset?.[0]?.insertId,
  };
}

module.exports = { query, run, pool };
