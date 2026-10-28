BEGIN;

-- Garante uma única localização por combinação de região e cidade,
-- tratando NULL como valor equivalente para localizações regionais.
ALTER TABLE location
  DROP CONSTRAINT IF EXISTS location_region_code_city_key;

ALTER TABLE location
  ADD CONSTRAINT location_region_code_city_key
  UNIQUE NULLS NOT DISTINCT (region_code, city);

-- Otimiza a busca pelo histórico de intensidade de carbono.
CREATE INDEX IF NOT EXISTS idx_carbon_intensity_location_registered
  ON carbon_intensity (
    location_id_location,
    registered_at DESC,
    id_carbon_intensity DESC
  );

COMMIT;
