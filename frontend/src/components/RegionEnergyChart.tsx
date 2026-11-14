import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { groupEnergyByRegion } from "../lib/regionEnergy";
import type { ServiceIndicators } from "../types/indicators";
import type { MonitoredService } from "../types/service";
import "./RegionEnergyChart.css";

type RegionEnergyChartProps = {
  indicators: ServiceIndicators[];
  services: MonitoredService[];
  loading: boolean;
  error: string | null;
};

export function RegionEnergyChart({
  indicators,
  services,
  loading,
  error,
}: RegionEnergyChartProps) {
  const data = groupEnergyByRegion(indicators, services);

  return (
    <section
      className="region-energy-chart"
      aria-label="Consumo energético estimado por região nas últimas 24 horas"
    >
      <header className="region-energy-chart-header">
        <div>
          <h3>Consumo por região</h3>
          <p>Energia estimada · últimas 24 horas</p>
        </div>
        <span>kWh</span>
      </header>

      {loading && data.length === 0 ? (
        <p className="region-energy-chart-state" role="status">
          Carregando indicadores...
        </p>
      ) : error && data.length === 0 ? (
        <p className="region-energy-chart-state" role="alert">
          Não foi possível carregar o consumo por região.
        </p>
      ) : data.length === 0 ? (
        <p className="region-energy-chart-state" role="status">
          Ainda não há consumo calculável para este período.
        </p>
      ) : (
        <>
          {error && (
            <p className="region-energy-chart-warning" role="status">
              Exibindo os últimos indicadores disponíveis.
            </p>
          )}
          <div className="region-energy-chart-plot">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="rgba(167, 201, 147, 0.14)"
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#a7c993", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="regionCode"
                  width={112}
                  tick={{ fill: "#e2ece6", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    data.find((item) => item.regionCode === String(value))
                      ?.region ?? String(value)
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(135, 228, 108, 0.08)" }}
                  formatter={(value) => [
                    `${Number(value).toLocaleString("pt-BR", {
                      maximumFractionDigits: 6,
                    })} kWh`,
                    "Energia estimada",
                  ]}
                  labelFormatter={(label) => {
                    const item = data.find(
                      (entry) => entry.regionCode === String(label),
                    );

                    return item
                      ? `${item.region} (${item.regionCode}) · ${item.serviceCount} ${
                          item.serviceCount === 1 ? "serviço" : "serviços"
                        }${item.isPartial ? " · dados parciais" : ""}`
                      : "";
                  }}
                  contentStyle={{
                    border: "1px solid #426c60",
                    borderRadius: 10,
                    background: "#0c282bf2",
                    color: "#f4f8f5",
                  }}
                />
                <Bar
                  dataKey="energyKwh"
                  name="Energia estimada"
                  fill="#87e46c"
                  radius={[0, 5, 5, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
