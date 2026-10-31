import { AppError } from "../../shared/errors/AppError.js";
import { IndicadoresService } from "../indicadores/indicadores.service.js";
import { DashboardRepository } from "./dashboard.repository.js";

const DEFAULT_PERIOD_MS = 24 * 60 * 60 * 1000;

interface DashboardPeriod {
  start: Date;
  end: Date;
}

export interface DashboardSummaryResponse {
  period: DashboardPeriod;
  summary: {
    energyKwh: number;
    emissionsGco2e: number;
    activeServiceCount: number;
    unavailableServiceCount: number;
    isPartial: boolean;
  };
}

function parseDate(value: string, field: string): Date {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(
      `O parâmetro ${field} deve ser uma data ISO válida`,
      400,
      "INVALID_DASHBOARD_PERIOD",
    );
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new AppError(
      `O parâmetro ${field} deve ser uma data ISO válida`,
      400,
      "INVALID_DASHBOARD_PERIOD",
    );
  }

  return new Date(timestamp);
}

function resolvePeriod(
  startValue?: string,
  endValue?: string,
  now = new Date(),
): DashboardPeriod {
  if (startValue === undefined && endValue === undefined) {
    return {
      start: new Date(now.getTime() - DEFAULT_PERIOD_MS),
      end: now,
    };
  }

  if (startValue === undefined || endValue === undefined) {
    throw new AppError(
      "Informe os parâmetros start e end juntos ou omita ambos",
      400,
      "INVALID_DASHBOARD_PERIOD",
    );
  }

  const start = parseDate(startValue, "start");
  const end = parseDate(endValue, "end");

  if (end <= start) {
    throw new AppError(
      "A data final deve ser posterior à data inicial",
      400,
      "INVALID_DASHBOARD_PERIOD",
    );
  }

  return { start, end };
}

export class DashboardService {
  constructor(
    private readonly indicatorsService: Pick<
      IndicadoresService,
      "getIndicators"
    > = new IndicadoresService(),
    private readonly repository: Pick<
      DashboardRepository,
      "countServicesByAvailability"
    > = new DashboardRepository(),
  ) {}

  async getSummary(
    startValue?: string,
    endValue?: string,
  ): Promise<DashboardSummaryResponse> {
    const period = resolvePeriod(startValue, endValue);
    const [indicators, availability] = await Promise.all([
      this.indicatorsService.getIndicators(
        period.start.toISOString(),
        period.end.toISOString(),
      ),
      this.repository.countServicesByAvailability(),
    ]);

    const activeServices = indicators.services.filter(
      (service) => service.status === "active",
    );

    return {
      period,
      summary: {
        energyKwh: activeServices.reduce(
          (total, service) => total + service.periodTotals.energyKwh,
          0,
        ),
        emissionsGco2e: activeServices.reduce(
          (total, service) => total + service.periodTotals.emissionsGco2e,
          0,
        ),
        activeServiceCount: availability.activeServiceCount,
        unavailableServiceCount: availability.unavailableServiceCount,
        isPartial: activeServices.some(
          (service) =>
            service.periodTotals.collectionCount === 0 ||
            service.periodTotals.isPartial,
        ),
      },
    };
  }
}
