-- Cria o index para a consulta na tabela carbon_intensity
CREATE INDEX idx_carbon_intensity_location_registered
  ON carbon_intensity (
    location_id_location,
    registered_at DESC,
    id_carbon_intensity DESC
  );

