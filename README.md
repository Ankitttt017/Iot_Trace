# Rico IoT Integrated Platform

Traceability and Rico IoT/master-data now run through one backend on port `4000`.

## Project Structure

```text
integrated/
  frontend/
    src/
      modules/
        machine/        Rico IoT machine module
        traceability/   Traceability module
      services/         Rico IoT/master-data API client
  backend/
    traceability/       Unified backend entry point
    rico-iot/           IoT/master-data routes, controllers, and SQL Server routes
```

## Database

Use one SQL Server database for the whole project. Configure it in `backend/traceability/.env`:

```env
DB_HOST=localhost
DB_PORT=1433
DB_NAME=IOT_Trace
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true
DB_TRUSTED_CONNECTION=true
DB_ODBC_DRIVER=ODBC Driver 17 for SQL Server
```

Create the common database once with Windows/trusted auth:

```bash
sqlcmd -S localhost -E -No -C -i backend/traceability/scripts/create-final-db.sql
```

Traceability tables are created by Sequelize when the unified backend starts. IoT/master-data tables are created by `backend/rico-iot/schema.mssql.sql`, which the unified backend runs automatically on startup. The runtime is fixed to Microsoft SQL Server / MSSQL; old MySQL/PostgreSQL/SQLite schemas are not used. If you use a named instance such as `SQLEXPRESS`, set `DB_INSTANCE_NAME=SQLEXPRESS` and leave `DB_PORT` unused.

## How To Run

Use the unified backend for both Traceability and Rico IoT/master-data:

```bash
cd backend/traceability
npm install
npm start
```

You can also run from `backend/` with `npm start`. The old `backend/rico-iot` server is no longer a separate service; its routes are mounted by the unified backend.

```bash
cd frontend
npm install
npm run dev
```

## API Proxy

- `/api/*` -> unified backend at `localhost:4000`
- `/traceability-api/*` -> legacy frontend alias for traceability APIs at `localhost:4000/api/v1`
