const driver = require("sequelize-msnodesqlv8");

if (!driver.Connection.prototype.STATE) {
  driver.Connection.prototype.STATE = { INITIALIZED: "initialized" };
}

if (!driver.Connection.prototype.state) {
  driver.Connection.prototype.state = driver.Connection.prototype.STATE.INITIALIZED;
}

const originalEmit = driver.Connection.prototype.emit;
driver.Connection.prototype.emit = function emit(eventName, ...args) {
  if (eventName === "connect" && !args[0]) {
    this.__sequelizeConnectReady = true;
  }
  return originalEmit.call(this, eventName, ...args);
};

const originalOn = driver.Connection.prototype.on;
driver.Connection.prototype.on = function on(eventName, listener) {
  const result = originalOn.call(this, eventName, listener);
  if (eventName === "connect" && this.__sequelizeConnectReady) {
    process.nextTick(() => listener(null));
  }
  return result;
};

driver.Request.prototype.execute = function execute(context) {
  let metadata = null;
  let rowBuffer = null;
  let done = false;
  let callbackResult;
  let callbackError;
  let callbackReceived = false;
  let finished = false;

  const finish = () => {
    if (finished || !done || !callbackReceived) {
      return;
    }

    finished = true;
    context.removeRequest(this, callbackError);
    if (!callbackError && typeof this.callback === "function") {
      this.callback(null, callbackResult);
    }
  };

  context.requests.push(this);

  try {
    const request = context.connection.queryRaw(this.sql, (err, results) => {
      callbackError = err;
      callbackResult = results;
      callbackReceived = true;
      finish();
    });

    request.on("meta", (meta) => {
      metadata = meta;
    });

    request.on("row", () => {
      if (rowBuffer) {
        this.emit("row", rowBuffer);
      }
      rowBuffer = [];
    });

    request.on("column", (index, data) => {
      const columnMetadata = metadata[index];
      const existing = rowBuffer[index];

      if (existing && existing.metadata.colName === columnMetadata.name) {
        if (typeof existing.value === "string") {
          existing.value += data;
          return;
        }
        if (existing.value instanceof Buffer) {
          existing.value = Buffer.concat([existing.value, data]);
          return;
        }
      }

      rowBuffer[index] = {
        metadata: {
          colName: columnMetadata.name,
          type: { id: columnMetadata.sqlType },
          nullable: columnMetadata.nullable,
          size: columnMetadata.size,
        },
        value: data,
      };
    });

    request.on("done", () => {
      done = true;
      if (rowBuffer) {
        this.emit("row", rowBuffer);
      }
      finish();
    });
  } catch (err) {
    context.removeRequest(this, err);
    context.close();
  }
};

module.exports = driver;
