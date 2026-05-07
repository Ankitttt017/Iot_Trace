function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isTrustedConnection() {
  return process.env.DB_TRUSTED_CONNECTION === "true" && !process.env.DB_USER;
}

function getServerName() {
  const host = process.env.DB_HOST || "localhost";
  if (process.env.DB_INSTANCE_NAME) {
    return `${host}\\${process.env.DB_INSTANCE_NAME}`;
  }
  return process.env.DB_PORT ? `${host},${numberFromEnv(process.env.DB_PORT, 1433)}` : host;
}

function getTrustedConnectionString(database = process.env.DB_NAME || "IOT_Trace") {
  const driver = process.env.DB_ODBC_DRIVER || "ODBC Driver 17 for SQL Server";
  const parts = [
    `Driver={${driver}}`,
    `Server=${getServerName()}`,
    `Database=${database}`,
    "Trusted_Connection=yes",
    process.env.DB_ENCRYPT === "true" ? "Encrypt=yes" : "Encrypt=no",
    process.env.DB_TRUST_SERVER_CERT !== "false" ? "TrustServerCertificate=yes" : "TrustServerCertificate=no",
  ];

  return `${parts.join(";")};`;
}

function getSqlServerOptions() {
  const options = {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== "false",
  };

  if (process.env.DB_TRUSTED_CONNECTION === "true") {
    options.trustedConnection = true;
  }

  if (process.env.DB_INSTANCE_NAME) {
    options.instanceName = process.env.DB_INSTANCE_NAME;
  }

  return options;
}

function getSqlServerConfig() {
  const user = process.env.DB_USER;
  const password = process.env.DB_PASS;

  if (isTrustedConnection()) {
    return {
      connectionString: getTrustedConnectionString(),
      pool: {
        max: numberFromEnv(process.env.DB_POOL_MAX, 10),
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };
  }

  const config = {
    server: process.env.DB_HOST || "localhost",
    port: numberFromEnv(process.env.DB_PORT, 1433),
    database: process.env.DB_NAME || "IOT_Trace",
    pool: {
      max: numberFromEnv(process.env.DB_POOL_MAX, 10),
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: getSqlServerOptions(),
  };

  if (user) {
    config.user = user;
    config.password = password || "";
  }

  if (process.env.DB_INSTANCE_NAME) {
    delete config.port;
  }

  return config;
}

function getSequelizeMssqlDialectOptions() {
  if (isTrustedConnection()) {
    return {
      connectionString: getTrustedConnectionString(),
      trustedConnection: true,
      driver: process.env.DB_ODBC_DRIVER || "ODBC Driver 17 for SQL Server",
    };
  }

  const dialectOptions = {
    options: getSqlServerOptions(),
  };

  if (process.env.DB_AUTH_TYPE && process.env.DB_AUTH_TYPE !== "default") {
    dialectOptions.authentication = {
      type: process.env.DB_AUTH_TYPE,
      options: {
        domain: process.env.DB_DOMAIN || undefined,
        userName: process.env.DB_USER || undefined,
        password: process.env.DB_PASS || undefined,
      },
    };
  }

  return dialectOptions;
}

module.exports = {
  getSequelizeMssqlDialectOptions,
  getSqlServerConfig,
  getTrustedConnectionString,
  isTrustedConnection,
  numberFromEnv,
};
