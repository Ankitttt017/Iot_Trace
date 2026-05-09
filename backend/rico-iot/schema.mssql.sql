-- RICO integrated backend - SQL Server schema for IoT/master-data API tables.
-- Run this in SSMS against the database configured in backend/traceability/.env.
-- This script is non-destructive: it creates missing tables/indexes only.

IF OBJECT_ID(N'dbo.iot_plants', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_plants (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID(N'dbo.iot_materials', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_materials (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    material_code VARCHAR(40) UNIQUE NOT NULL,
    description NVARCHAR(MAX) NULL,
    plant_code VARCHAR(20) NULL,
    storage_location VARCHAR(20) NULL,
    unit_of_measure VARCHAR(10) NULL,
    material_type VARCHAR(20) NULL,
    material_group VARCHAR(30) NULL,
    cycle_time_sec DECIMAL(10,2) NULL,
    box_quantity INT DEFAULT 0,
    customer VARCHAR(100) NULL,
    opn_number VARCHAR(50) NULL,
    final_opn_code VARCHAR(50) NULL,
    manufacturing_type VARCHAR(50) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID(N'dbo.iot_parts', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_parts (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sl_no INT NULL,
    material_code VARCHAR(40) UNIQUE NOT NULL,
    description NVARCHAR(MAX) NULL,
    plant_code VARCHAR(20) NULL,
    storage_location VARCHAR(20) NULL,
    unit_of_measure VARCHAR(10) NULL,
    material_group VARCHAR(30) NULL,
    cycle_time_sec DECIMAL(10,2) NULL,
    box_quantity INT DEFAULT 0,
    customer VARCHAR(100) NULL,
    opn_number VARCHAR(50) NULL,
    final_opn_code VARCHAR(50) NULL,
    manufacturing_type VARCHAR(50) NULL,
    total_produced INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ENABLED',
    traceability_status VARCHAR(20) DEFAULT 'ENABLED',
    version VARCHAR(50) NULL,
    registered_on VARCHAR(30) NULL,
    registered_by VARCHAR(100) NULL,
    revision_date VARCHAR(30) NULL,
    revised_by VARCHAR(100) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID(N'dbo.iot_operations', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_operations (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    part_code VARCHAR(40) NOT NULL,
    sr_no INT NULL,
    name NVARCHAR(MAX) NULL,
    type VARCHAR(50) NULL,
    label VARCHAR(50) NULL,
    rework VARCHAR(100) DEFAULT 'No rework assigned',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_iot_operations_part FOREIGN KEY (part_code)
      REFERENCES dbo.iot_parts(material_code) ON DELETE CASCADE
  );
END;

IF OBJECT_ID(N'dbo.iot_part_plants', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_part_plants (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    part_code VARCHAR(40) NOT NULL,
    plant_code VARCHAR(20) NOT NULL,
    storage_location VARCHAR(20) NULL,
    unit_of_measure VARCHAR(20) NULL,
    material_type VARCHAR(50) NULL,
    material_group VARCHAR(50) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_iot_part_plants_part FOREIGN KEY (part_code)
      REFERENCES dbo.iot_parts(material_code) ON DELETE CASCADE
  );
END;

IF OBJECT_ID(N'dbo.iot_process_flow_diagrams', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_process_flow_diagrams (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    part_code VARCHAR(40) NOT NULL,
    upload_date VARCHAR(30) NULL,
    version VARCHAR(20) NULL,
    file_name VARCHAR(200) NULL,
    file_path VARCHAR(500) NULL,
    updated_by VARCHAR(100) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_iot_process_flow_part FOREIGN KEY (part_code)
      REFERENCES dbo.iot_parts(material_code) ON DELETE CASCADE
  );
END;

IF OBJECT_ID(N'dbo.iot_inspection_sheets', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_inspection_sheets (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    part_code VARCHAR(40) NOT NULL,
    upload_date VARCHAR(30) NULL,
    version VARCHAR(20) NULL,
    file_name VARCHAR(200) NULL,
    file_path VARCHAR(500) NULL,
    updated_by VARCHAR(100) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_iot_inspection_part FOREIGN KEY (part_code)
      REFERENCES dbo.iot_parts(material_code) ON DELETE CASCADE
  );
END;

IF OBJECT_ID(N'dbo.iot_control_plan_charts', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_control_plan_charts (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    part_code VARCHAR(40) NOT NULL,
    upload_date VARCHAR(30) NULL,
    version VARCHAR(20) NULL,
    file_name VARCHAR(200) NULL,
    file_path VARCHAR(500) NULL,
    updated_by VARCHAR(100) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_iot_control_plan_part FOREIGN KEY (part_code)
      REFERENCES dbo.iot_parts(material_code) ON DELETE CASCADE
  );
END;

IF OBJECT_ID(N'dbo.iot_parts_master_raw', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_parts_master_raw (
    sl_no VARCHAR(50) NULL,
    material VARCHAR(80) NULL,
    material_description NVARCHAR(MAX) NULL,
    plant VARCHAR(20) NULL,
    storage_location VARCHAR(20) NULL,
    base_unit_of_measure VARCHAR(20) NULL,
    material_group VARCHAR(50) NULL,
    cycle_time VARCHAR(50) NULL,
    customer VARCHAR(100) NULL,
    manufacturing_type VARCHAR(50) NULL,
    old_equipment NVARCHAR(MAX) NULL,
    s4hana NVARCHAR(MAX) NULL,
    description NVARCHAR(MAX) NULL,
    plant_code NVARCHAR(MAX) NULL,
    asset NVARCHAR(MAX) NULL,
    cost_center NVARCHAR(MAX) NULL
  );
END;

IF OBJECT_ID(N'dbo.iot_machine_master_raw', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_machine_master_raw (
    old_equipment NVARCHAR(MAX) NULL,
    s4hana NVARCHAR(MAX) NULL,
    description NVARCHAR(MAX) NULL,
    plant_code NVARCHAR(MAX) NULL,
    asset NVARCHAR(MAX) NULL,
    cost_center NVARCHAR(MAX) NULL
  );
END;

IF OBJECT_ID(N'dbo.iot_parts_master_bawal_raw', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_parts_master_bawal_raw (
    sl_no INT NULL,
    material NVARCHAR(80) NULL,
    material_description NVARCHAR(MAX) NULL,
    plant NVARCHAR(20) NULL,
    storage_location NVARCHAR(20) NULL,
    unrestricted NVARCHAR(50) NULL,
    base_unit_of_measure NVARCHAR(20) NULL,
    quality_inspection NVARCHAR(50) NULL,
    returns NVARCHAR(50) NULL,
    material_type NVARCHAR(50) NULL,
    material_group NVARCHAR(50) NULL
  );
END;

IF OBJECT_ID(N'dbo.iot_machine_master_bawal_raw', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_machine_master_bawal_raw (
    sl_no INT NULL,
    equipment NVARCHAR(80) NULL,
    description NVARCHAR(MAX) NULL,
    valid_to NVARCHAR(50) NULL,
    maint_plant NVARCHAR(20) NULL,
    location NVARCHAR(50) NULL,
    plant_section NVARCHAR(100) NULL,
    abc_indicator NVARCHAR(50) NULL,
    asset NVARCHAR(100) NULL,
    business_area NVARCHAR(100) NULL,
    cost_center NVARCHAR(100) NULL,
    functional_loc NVARCHAR(200) NULL,
    serial_number NVARCHAR(100) NULL,
    division NVARCHAR(100) NULL,
    planning_plant NVARCHAR(20) NULL
  );
END;

IF OBJECT_ID(N'dbo.iot_machines', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_machines (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    machine_code VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(200) NULL,
    category VARCHAR(80) NULL,
    plant_code VARCHAR(20) NULL,
    asset NVARCHAR(MAX) NULL,
    cost_center NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF COL_LENGTH('dbo.iot_machines', 'line_id') IS NULL
  ALTER TABLE dbo.iot_machines ADD line_id INT NULL;
IF COL_LENGTH('dbo.iot_machines', 'operation_no') IS NULL
  ALTER TABLE dbo.iot_machines ADD operation_no VARCHAR(50) NULL;
IF COL_LENGTH('dbo.iot_machines', 'operation_name') IS NULL
  ALTER TABLE dbo.iot_machines ADD operation_name NVARCHAR(200) NULL;

IF OBJECT_ID(N'dbo.iot_machine_status', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_machine_status (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    machine_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IDLE',
    part_code VARCHAR(40) NULL,
    operation_no VARCHAR(50) NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_iot_machine_status_machine FOREIGN KEY (machine_id)
      REFERENCES dbo.iot_machines(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID(N'dbo.iot_machine_operations', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.iot_machine_operations (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    machine_id BIGINT NOT NULL,
    part_code VARCHAR(40) NOT NULL,
    operation_id BIGINT NULL,
    operation_no VARCHAR(50) NOT NULL,
    is_primary BIT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_iot_machine_operations_machine FOREIGN KEY (machine_id)
      REFERENCES dbo.iot_machines(id) ON DELETE CASCADE,
    CONSTRAINT fk_iot_machine_operations_part FOREIGN KEY (part_code)
      REFERENCES dbo.iot_parts(material_code),
    CONSTRAINT fk_iot_machine_operations_operation FOREIGN KEY (operation_id)
      REFERENCES dbo.iot_operations(id)
  );
END;

IF OBJECT_ID(N'dbo.[machine master Ggn (1002)]', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.iot_machine_master_raw)
BEGIN
  INSERT INTO dbo.iot_machine_master_raw (
    old_equipment, s4hana, description, plant_code, asset, cost_center
  )
  SELECT
    CONVERT(NVARCHAR(MAX), Old_Equipment),
    CONVERT(NVARCHAR(MAX), S4hana),
    Description,
    CONVERT(NVARCHAR(MAX), Plant_Code),
    CONVERT(NVARCHAR(MAX), Asset),
    Cost_Center
  FROM dbo.[machine master Ggn (1002)];
END;

IF OBJECT_ID(N'dbo.parts_master', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.iot_parts_master_raw)
BEGIN
  INSERT INTO dbo.iot_parts_master_raw (
    sl_no, material, material_description, plant, storage_location,
    base_unit_of_measure, material_group, cycle_time, customer,
    manufacturing_type
  )
  SELECT
    CONVERT(VARCHAR(50), Sl_No),
    CONVERT(VARCHAR(80), Material),
    Material_Description,
    CONVERT(VARCHAR(20), Plant),
    CONVERT(VARCHAR(20), Storage_Location),
    Base_Unit_of_Measure,
    Material_Group,
    Cycle_time_In_Sec,
    Cutomer,
    Manufacturing_Type
  FROM dbo.parts_master;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_iot_materials_plant')
  CREATE INDEX idx_iot_materials_plant ON dbo.iot_materials (plant_code);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_iot_materials_group')
  CREATE INDEX idx_iot_materials_group ON dbo.iot_materials (material_group);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_iot_parts_plant')
  CREATE INDEX idx_iot_parts_plant ON dbo.iot_parts (plant_code);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_iot_parts_group')
  CREATE INDEX idx_iot_parts_group ON dbo.iot_parts (material_group);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_iot_part_plants_part_plant')
  CREATE UNIQUE INDEX ux_iot_part_plants_part_plant
    ON dbo.iot_part_plants (part_code, plant_code);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_iot_part_plants_plant')
  CREATE INDEX idx_iot_part_plants_plant ON dbo.iot_part_plants (plant_code);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_iot_operations_part')
  CREATE INDEX idx_iot_operations_part ON dbo.iot_operations (part_code);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_iot_machines_plant')
  CREATE INDEX idx_iot_machines_plant ON dbo.iot_machines (plant_code);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_iot_machine_status_machine_updated')
  CREATE INDEX idx_iot_machine_status_machine_updated
    ON dbo.iot_machine_status (machine_id, updated_at DESC, id DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_iot_machine_operations_machine')
  CREATE INDEX idx_iot_machine_operations_machine
    ON dbo.iot_machine_operations (machine_id, is_active, updated_at DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_iot_machine_operations_part_operation')
  CREATE INDEX idx_iot_machine_operations_part_operation
    ON dbo.iot_machine_operations (part_code, operation_no, is_active);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_iot_machine_operations_active')
  CREATE UNIQUE INDEX ux_iot_machine_operations_active
    ON dbo.iot_machine_operations (machine_id, part_code, operation_no)
    WHERE is_active = 1;

MERGE dbo.iot_plants AS target
USING (
  SELECT '1002' AS code, 'Gurugram Plant' AS name, 'Gurugram, Haryana' AS location
  UNION ALL SELECT '1008', 'Bawal Plant', 'Bawal, Haryana'
) AS source
ON target.code = source.code
WHEN MATCHED THEN
  UPDATE SET name = source.name, location = COALESCE(target.location, source.location)
WHEN NOT MATCHED THEN
  INSERT (code, name, location) VALUES (source.code, source.name, source.location);

MERGE dbo.iot_parts AS target
USING (
  SELECT
    TRY_CONVERT(INT, NULLIF(sl_no, '')) AS sl_no,
    NULLIF(material, '') AS material_code,
    material_description,
    plant,
    storage_location,
    base_unit_of_measure,
    material_group,
    TRY_CONVERT(DECIMAL(10,2), NULLIF(cycle_time, '')) AS cycle_time_sec,
    customer,
    manufacturing_type
  FROM dbo.iot_parts_master_raw
  WHERE NULLIF(material, '') IS NOT NULL
) AS source
ON target.material_code = source.material_code
WHEN NOT MATCHED THEN
  INSERT (
    sl_no, material_code, description, plant_code, storage_location, unit_of_measure,
    material_group, cycle_time_sec, customer, manufacturing_type, status, traceability_status
  )
  VALUES (
    source.sl_no, source.material_code, source.material_description, source.plant,
    source.storage_location, source.base_unit_of_measure, source.material_group,
    source.cycle_time_sec, source.customer, source.manufacturing_type, 'ENABLED', 'ENABLED'
  );

MERGE dbo.iot_part_plants AS target
USING (
  SELECT
    NULLIF(material, '') AS part_code,
    NULLIF(plant, '') AS plant_code,
    storage_location,
    base_unit_of_measure AS unit_of_measure,
    NULL AS material_type,
    material_group
  FROM dbo.iot_parts_master_raw
  WHERE NULLIF(material, '') IS NOT NULL
    AND NULLIF(plant, '') IS NOT NULL
) AS source
ON target.part_code = source.part_code AND target.plant_code = source.plant_code
WHEN MATCHED THEN
  UPDATE SET
    storage_location = source.storage_location,
    unit_of_measure = source.unit_of_measure,
    material_group = source.material_group,
    updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
  INSERT (part_code, plant_code, storage_location, unit_of_measure, material_type, material_group)
  VALUES (source.part_code, source.plant_code, source.storage_location, source.unit_of_measure, source.material_type, source.material_group);

MERGE dbo.iot_parts AS target
USING (
  SELECT sl_no, material_code, material_description, plant, storage_location,
         base_unit_of_measure, material_group, material_type
  FROM (
    SELECT
      sl_no,
      NULLIF(CONVERT(VARCHAR(40), material), '') AS material_code,
      material_description,
      NULLIF(CONVERT(VARCHAR(20), plant), '') AS plant,
      storage_location,
      base_unit_of_measure,
      material_group,
      material_type,
      ROW_NUMBER() OVER (
        PARTITION BY NULLIF(CONVERT(VARCHAR(40), material), '')
        ORDER BY CASE WHEN NULLIF(material_description, '') IS NULL THEN 1 ELSE 0 END, sl_no
      ) AS rn
    FROM dbo.iot_parts_master_bawal_raw
    WHERE NULLIF(CONVERT(VARCHAR(40), material), '') IS NOT NULL
      AND NULLIF(CONVERT(VARCHAR(20), plant), '') = '1008'
  ) deduped_parts
  WHERE rn = 1
) AS source
ON target.material_code = source.material_code
WHEN NOT MATCHED THEN
  INSERT (
    sl_no, material_code, description, plant_code, storage_location, unit_of_measure,
    material_group, manufacturing_type, status, traceability_status
  )
  VALUES (
    source.sl_no, source.material_code, source.material_description, source.plant,
    source.storage_location, source.base_unit_of_measure, source.material_group,
    source.material_type, 'ENABLED', 'ENABLED'
  );

MERGE dbo.iot_part_plants AS target
USING (
  SELECT part_code, plant_code, storage_location, unit_of_measure, material_type, material_group
  FROM (
    SELECT
      NULLIF(CONVERT(VARCHAR(40), material), '') AS part_code,
      NULLIF(CONVERT(VARCHAR(20), plant), '') AS plant_code,
      storage_location,
      base_unit_of_measure AS unit_of_measure,
      material_type,
      material_group,
      ROW_NUMBER() OVER (
        PARTITION BY NULLIF(CONVERT(VARCHAR(40), material), ''), NULLIF(CONVERT(VARCHAR(20), plant), '')
        ORDER BY CASE WHEN NULLIF(material_description, '') IS NULL THEN 1 ELSE 0 END, sl_no
      ) AS rn
    FROM dbo.iot_parts_master_bawal_raw
    WHERE NULLIF(CONVERT(VARCHAR(40), material), '') IS NOT NULL
      AND NULLIF(CONVERT(VARCHAR(20), plant), '') = '1008'
  ) deduped_part_plants
  WHERE rn = 1
) AS source
ON target.part_code = source.part_code AND target.plant_code = source.plant_code
WHEN MATCHED THEN
  UPDATE SET
    storage_location = source.storage_location,
    unit_of_measure = source.unit_of_measure,
    material_type = source.material_type,
    material_group = source.material_group,
    updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
  INSERT (part_code, plant_code, storage_location, unit_of_measure, material_type, material_group)
  VALUES (source.part_code, source.plant_code, source.storage_location, source.unit_of_measure, source.material_type, source.material_group);

MERGE dbo.iot_plants AS target
USING (
  SELECT DISTINCT plant_code AS code, CONCAT(plant_code, ' Plant') AS name
  FROM dbo.iot_parts
  WHERE plant_code IS NOT NULL AND plant_code <> ''
) AS source
ON target.code = source.code
WHEN NOT MATCHED THEN INSERT (code, name) VALUES (source.code, source.name);

MERGE dbo.iot_machines AS target
USING (
  SELECT machine_code, name, category, plant_code, asset, cost_center
  FROM (
    SELECT
      COALESCE(NULLIF(old_equipment, ''), NULLIF(s4hana, '')) AS machine_code,
      COALESCE(NULLIF(description, ''), COALESCE(NULLIF(old_equipment, ''), NULLIF(s4hana, ''))) AS name,
      'Machine' AS category,
      NULLIF(CONVERT(VARCHAR(20), plant_code), '') AS plant_code,
      NULLIF(asset, '') AS asset,
      NULLIF(cost_center, '') AS cost_center,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(NULLIF(old_equipment, ''), NULLIF(s4hana, ''))
        ORDER BY CASE WHEN NULLIF(description, '') IS NULL THEN 1 ELSE 0 END, description
      ) AS rn
    FROM dbo.iot_machine_master_raw
    WHERE COALESCE(NULLIF(old_equipment, ''), NULLIF(s4hana, '')) IS NOT NULL
  ) deduped_machines
  WHERE rn = 1
) AS source
ON target.machine_code = source.machine_code
WHEN MATCHED THEN
  UPDATE SET
    name = source.name,
    plant_code = source.plant_code,
    asset = source.asset,
    cost_center = source.cost_center
WHEN NOT MATCHED THEN
  INSERT (machine_code, name, category, plant_code, asset, cost_center)
  VALUES (source.machine_code, source.name, source.category, source.plant_code, source.asset, source.cost_center);

MERGE dbo.iot_machines AS target
USING (
  SELECT machine_code, name, category, plant_code, asset, cost_center
  FROM (
    SELECT
      NULLIF(CONVERT(VARCHAR(80), equipment), '') AS machine_code,
      COALESCE(NULLIF(CONVERT(VARCHAR(200), description), ''), NULLIF(CONVERT(VARCHAR(80), equipment), '')) AS name,
      COALESCE(NULLIF(CONVERT(VARCHAR(80), plant_section), ''), 'Machine') AS category,
      '1008' AS plant_code,
      NULLIF(asset, '') AS asset,
      NULLIF(cost_center, '') AS cost_center,
      ROW_NUMBER() OVER (
        PARTITION BY NULLIF(CONVERT(VARCHAR(80), equipment), '')
        ORDER BY CASE WHEN NULLIF(CONVERT(VARCHAR(200), description), '') IS NULL THEN 1 ELSE 0 END, sl_no
      ) AS rn
    FROM dbo.iot_machine_master_bawal_raw
    WHERE NULLIF(CONVERT(VARCHAR(80), equipment), '') IS NOT NULL
      AND (
        NULLIF(CONVERT(VARCHAR(20), maint_plant), '') = '1008'
        OR CONVERT(VARCHAR(20), planning_plant) LIKE '%1008%'
      )
  ) deduped_machines
  WHERE rn = 1
) AS source
ON target.machine_code = source.machine_code
WHEN MATCHED THEN
  UPDATE SET
    name = source.name,
    category = source.category,
    plant_code = source.plant_code,
    asset = source.asset,
    cost_center = source.cost_center
WHEN NOT MATCHED THEN
  INSERT (machine_code, name, category, plant_code, asset, cost_center)
  VALUES (source.machine_code, source.name, source.category, source.plant_code, source.asset, source.cost_center);

MERGE dbo.iot_machine_operations AS target
USING (
  SELECT
    ms.machine_id,
    ms.part_code,
    ms.operation_no,
    MIN(o.id) AS operation_id,
    MAX(CASE WHEN latest.rn = 1 THEN 1 ELSE 0 END) AS is_primary,
    MAX(ms.updated_at) AS updated_at
  FROM (
    SELECT
      machine_status.*,
      ROW_NUMBER() OVER (
        PARTITION BY machine_id
        ORDER BY
          CASE WHEN updated_at IS NULL THEN 1 ELSE 0 END,
          updated_at DESC,
          id DESC
      ) AS rn
    FROM dbo.iot_machine_status machine_status
    WHERE NULLIF(part_code, '') IS NOT NULL
      AND NULLIF(operation_no, '') IS NOT NULL
  ) latest
  INNER JOIN dbo.iot_machine_status ms ON ms.id = latest.id
  LEFT JOIN dbo.iot_operations o
    ON o.part_code = ms.part_code
   AND (
      UPPER(TRIM(ms.operation_no)) = UPPER(TRIM(o.label))
      OR UPPER(TRIM(ms.operation_no)) = UPPER(TRIM(CAST(o.sr_no AS VARCHAR(50))))
      OR REPLACE(REPLACE(UPPER(TRIM(ms.operation_no)), 'OP-', ''), 'OP', '') =
         REPLACE(REPLACE(UPPER(TRIM(COALESCE(o.label, CAST(o.sr_no AS VARCHAR(50))))), 'OP-', ''), 'OP', '')
    )
  GROUP BY ms.machine_id, ms.part_code, ms.operation_no
) AS source
ON target.machine_id = source.machine_id
 AND target.part_code = source.part_code
 AND target.operation_no = source.operation_no
WHEN MATCHED THEN
  UPDATE SET
    operation_id = COALESCE(target.operation_id, source.operation_id),
    is_primary = CASE WHEN source.is_primary = 1 THEN 1 ELSE target.is_primary END,
    is_active = 1,
    updated_at = COALESCE(source.updated_at, SYSUTCDATETIME())
WHEN NOT MATCHED THEN
  INSERT (machine_id, part_code, operation_id, operation_no, is_primary, is_active, updated_at)
  VALUES (source.machine_id, source.part_code, source.operation_id, source.operation_no, source.is_primary, 1, COALESCE(source.updated_at, SYSUTCDATETIME()));
