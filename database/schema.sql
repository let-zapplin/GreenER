CREATE TABLE location (
  id_location INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  region_code VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  region VARCHAR(255) NOT NULL,
  city VARCHAR(255) NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  UNIQUE (region_code, city)
);

CREATE TABLE users (
  id_users INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  certificate_hash VARCHAR(255) NOT NULL,
  admin BOOL NOT NULL DEFAULT FALSE
);

CREATE TABLE service (
  id_service INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id_location INTEGER NOT NULL,
  id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,

  status VARCHAR(30) NOT NULL DEFAULT 'active',

  last_seen_at TIMESTAMPTZ,

  FOREIGN KEY(location_id_location)
    REFERENCES location(id_location)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
);

CREATE TABLE collection (
  id_collection BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_id_service INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  failure_reason VARCHAR(100),
  http_status SMALLINT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (service_id_service)
    REFERENCES service(id_service)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT chk_collection_status
    CHECK (
        status IN (
          'success',
          'no_metrics',
          'unavailable',
          'error'
        )
    ),

    CONSTRAINT chk_collection_failure_reason
    CHECK (
      (status = 'success' AND failure_reason IS NULL)
      OR status <> 'success'
    ),

  CONSTRAINT chk_collection_http_status
    CHECK (
        http_status IS NULL
        OR http_status BETWEEN 100 AND 599
    )
);

CREATE INDEX idx_collection_service_attempted
  ON collection (service_id_service, attempted_at DESC);

CREATE TABLE carbon_intensity (
  id_carbon_intensity INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id_location INTEGER NOT NULL,
  carbon_intensity_gco2e_per_kwh DOUBLE PRECISION NOT NULL,
  renewable_share_percent DOUBLE PRECISION NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY(location_id_location)
    REFERENCES location(id_location)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
);

CREATE TABLE metrics (
  id_metrics BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  collection_id_collection BIGINT NOT NULL UNIQUE,
  cpu_percent DECIMAL(5,2) NOT NULL,
  memory_gb DOUBLE PRECISION NOT NULL,
  disk_gb DOUBLE PRECISION NOT NULL,
  network_gb DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY(collection_id_collection)
    REFERENCES collection(id_collection)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
);

CREATE TABLE favorites (
  id_favorites INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_id_service INTEGER NOT NULL,
  service_location_id_location INTEGER NOT NULL,
  users_id_users INTEGER NOT NULL,
  FOREIGN KEY(users_id_users)
    REFERENCES users(id_users)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION,
  FOREIGN KEY(service_id_service)
    REFERENCES service(id_service)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
);

