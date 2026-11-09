export type MapCameraTarget = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
};

// Bearing não participa: a órbita altera a orientação sem mudar o destino.
export function isSameMapTarget(
  current: MapCameraTarget,
  target: MapCameraTarget,
): boolean {
  const longitudeDelta =
    ((current.longitude - target.longitude + 180) % 360 + 360) % 360 - 180;

  return (
    Math.abs(longitudeDelta) <= 0.00001 &&
    Math.abs(current.latitude - target.latitude) <= 0.00001 &&
    Math.abs(current.zoom - target.zoom) <= 0.01 &&
    Math.abs(current.pitch - target.pitch) <= 0.1
  );
}
