const { Sequelize } = require("sequelize");
const {
  getSequelizeMssqlDialectOptions,
  isTrustedConnection,
  numberFromEnv,
} = require("./sqlServerConfig");

const sequelizeOptions = {
  host: process.env.DB_HOST || "localhost",
  port: numberFromEnv(process.env.DB_PORT, 1433),
  dialect: "mssql",
  logging: false,
  dialectOptions: getSequelizeMssqlDialectOptions(),
};

if (isTrustedConnection()) {
  sequelizeOptions.dialectModulePath = require.resolve("./sequelizeMsnodesqlv8Dialect");
}

if (process.env.DB_INSTANCE_NAME) {
  delete sequelizeOptions.port;
}

const sequelize = new Sequelize(
  process.env.DB_NAME || "IOT_Trace",
  process.env.DB_USER || null,
  process.env.DB_PASS || null,
  sequelizeOptions
);

module.exports = sequelize;
