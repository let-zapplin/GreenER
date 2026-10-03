CREATE TABLE location (
  id_location INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  region_code VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  region VARCHAR(255) NOT NULL,
  city VARCHAR(255) NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL
);

CREATE TABLE users (
  id_users INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mail VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  admin BOOL NOT NULL
);

CREATE TABLE service (
  id_service INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id_location INTEGER NOT NULL,
  id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  FOREIGN KEY(location_id_location)
    REFERENCES location(id_location)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
);

CREATE TABLE carbon_intensity (
  id_carbon_intensity INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id_location INTEGER NOT NULL,
  carbon_intensity_gco2e_per_kwh DOUBLE PRECISION NOT NULL,
  renewable_share_percent DOUBLE PRECISION NOT NULL,
  FOREIGN KEY(location_id_location)
    REFERENCES location(id_location)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
);

CREATE TABLE metrics (
  id_metrics BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_id_service INTEGER NOT NULL,
  service_location_id_location INTEGER NOT NULL,
  cpu_percent DECIMAL(5,2) NOT NULL,
  memory_gb DOUBLE PRECISION NOT NULL,
  disk_gb DOUBLE PRECISION NOT NULL,
  network_gb DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY(service_id_service)
    REFERENCES service(id_service)
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

