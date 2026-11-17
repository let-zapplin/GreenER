import type { MonitoredService, ServiceStatus } from "../types/service";

export type ServicePointProperties = {
  serviceId: string;
  name: string;
  status: ServiceStatus;
  selected: boolean;
};

export type ServicePointFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: ServicePointProperties;
  }>;
};

export function buildServiceFeatureCollection(
  services: MonitoredService[],
  selectedServiceId: string | null = null,
): ServicePointFeatureCollection {
  return {
    type: "FeatureCollection",
    features: services.flatMap((service) => {
      const { latitude, longitude } = service.location;

      if (
        latitude === null ||
        longitude === null ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return [];
      }

      return [
        {
          type: "Feature" as const,
          id: service.id,
          geometry: {
            type: "Point" as const,
            coordinates: [longitude, latitude] as [number, number],
          },
          properties: {
            serviceId: service.id,
            name: service.name,
            status: service.status,
            selected: service.id === selectedServiceId,
          },
        },
      ];
    }),
  };
}
