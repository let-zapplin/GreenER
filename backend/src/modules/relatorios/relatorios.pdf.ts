import { existsSync } from "node:fs";
import { resolve } from "node:path";

import PDFDocument from "pdfkit";

import type {
  ComparisonAnalysisReportData,
  IndividualAnalysisReportData,
} from "./relatorios.types.js";

const COLORS = {
  dark: "#103536",
  text: "#1F3533",
  muted: "#6E817C",
  accent: "#8BFF5D",
  accentDark: "#3B8C35",
  surface: "#F3F7F4",
  surfaceStrong: "#E8F0EB",
  line: "#D8E3DD",
  warningBackground: "#FFF4D6",
  warningText: "#7A5700",
  white: "#FFFFFF",
} as const;

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 42,
} as const;

const SERIES_COLORS = [
  "#3B8C35",
  "#2F6FA3",
  "#C47B21",
  "#7A5AA6",
  "#B94B4B",
  "#2A8F86",
  "#8A6F2D",
  "#65747A",
] as const;

const GREENER_LOGO_PATH = resolve(
  process.cwd(),
  "src",
  "assets",
  "branding",
  "greener-logo.png",
);

type ChartPoint = {
  x: number;
  y: number;
};

function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits,
  });
}

function formatNullableMetric(
  value: number | null,
  unit: string,
  maximumFractionDigits = 2,
): string {
  if (value === null) {
    return "Indisponível";
  }

  const formatted = formatNumber(value, maximumFractionDigits);

  if (unit === "%") {
    return `${formatted}%`;
  }

  return `${formatted} ${unit}`;
}

function formatEnergy(value: number): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })} kWh`;
}

function formatEmissions(value: number): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} gCO2e`;
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function formatLocation(report: IndividualAnalysisReportData): string {
  const { city, region, country } = report.service.location;

  return [city, region, country]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .join(" · ");
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  report: IndividualAnalysisReportData,
): void {
  doc.rect(0, 0, PAGE.width, 78).fill(COLORS.dark);

  if (existsSync(GREENER_LOGO_PATH)) {
    doc.image(GREENER_LOGO_PATH, PAGE.margin, 20, {
      fit: [100, 32],
    });
  } else {
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor(COLORS.accent)
      .text("GreenER", PAGE.margin, 24);
  }

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(COLORS.white)
    .text("RELATÓRIO AMBIENTAL", PAGE.margin, 57, {
      characterSpacing: 1.1,
    });

  doc
    .font("Helvetica")
    .fontSize(6.5)
    .fillColor("#C8D6D2")
    .text(`Gerado em ${formatDateTime(report.generatedAt)}`, PAGE.margin, 29, {
      width: PAGE.width - PAGE.margin * 2,
      align: "right",
    });
}

function drawServiceIdentification(
  doc: PDFKit.PDFDocument,
  report: IndividualAnalysisReportData,
  y: number,
): number {
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLORS.dark)
    .text(report.service.name, PAGE.margin, y);

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      `${formatLocation(report)} · ${report.service.location.regionCode}`,
      PAGE.margin,
      y + 20,
    );

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(COLORS.muted)
    .text(
      `Período: ${formatDateTime(report.period.start)} - ${formatDateTime(report.period.end)}`,
      PAGE.margin,
      y + 34,
    );

  return y + 50;
}

function drawSectionTitle(
  doc: PDFKit.PDFDocument,
  label: string,
  title: string,
  y: number,
): number {
  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(COLORS.accentDark)
    .text(label.toUpperCase(), PAGE.margin, y, {
      characterSpacing: 0.9,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLORS.dark)
    .text(title, PAGE.margin, y + 10);

  return y + 28;
}

function drawMetricCard(
  doc: PDFKit.PDFDocument,
  options: {
    x: number;
    y: number;
    width: number;
    label: string;
    value: string;
    description: string;
  },
): void {
  const { x, y, width, label, value, description } = options;
  const height = 64;

  doc
    .roundedRect(x, y, width, height, 9)
    .fillAndStroke(COLORS.surface, COLORS.line);

  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(COLORS.muted)
    .text(label.toUpperCase(), x + 12, y + 10, {
      characterSpacing: 0.6,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor(COLORS.dark)
    .text(value, x + 12, y + 24, {
      width: width - 24,
    });

  doc
    .font("Helvetica")
    .fontSize(6.2)
    .fillColor(COLORS.muted)
    .text(description, x + 12, y + 47, {
      width: width - 24,
      lineGap: 0,
    });
}

function drawEnvironmentalSummary(
  doc: PDFKit.PDFDocument,
  report: IndividualAnalysisReportData,
  y: number,
): number {
  const gap = 12;
  const width = (PAGE.width - PAGE.margin * 2 - gap) / 2;

  drawMetricCard(doc, {
    x: PAGE.margin,
    y,
    width,
    label: "Energia estimada",
    value: formatEnergy(report.environmentalSummary.energyKwh),
    description: "Energia estimada no período selecionado.",
  });

  drawMetricCard(doc, {
    x: PAGE.margin + width + gap,
    y,
    width,
    label: "Emissões",
    value: formatEmissions(report.environmentalSummary.emissionsGco2e),
    description: "Emissões estimadas usando a intensidade regional.",
  });

  return y + 64;
}

function drawChartSegment(
  doc: PDFKit.PDFDocument,
  points: ChartPoint[],
): void {
  if (points.length < 2) {
    return;
  }

  doc
    .lineWidth(1.8)
    .strokeColor(COLORS.accentDark)
    .moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length; index += 1) {
    doc.lineTo(points[index].x, points[index].y);
  }

  doc.stroke();
}

function drawHistoryChart(
  doc: PDFKit.PDFDocument,
  report: IndividualAnalysisReportData,
  y: number,
): number {
  const x = PAGE.margin;
  const width = PAGE.width - PAGE.margin * 2;
  const height = 150;

  doc
    .roundedRect(x, y, width, height, 10)
    .fillAndStroke(COLORS.surface, COLORS.line);

  const chartX = x + 56;
  const chartY = y + 31;
  const chartWidth = width - 72;
  const chartHeight = 78;

  const validValues = report.history.flatMap((sample) => {
    const energyKwh = sample.energyKwh;

    if (
      sample.gapReason !== null ||
      energyKwh === null ||
      !Number.isFinite(energyKwh)
    ) {
      return [];
    }

    return [energyKwh];
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(COLORS.muted)
    .text("Energia (kWh)", chartX, y + 10);

  const legendX = x + width - 115;

  doc
    .lineWidth(2)
    .strokeColor(COLORS.accentDark)
    .moveTo(legendX, y + 14)
    .lineTo(legendX + 18, y + 14)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(6)
    .fillColor(COLORS.muted)
    .text("Energia estimada", legendX + 23, y + 10);

  if (validValues.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(
        "Não existem amostras de energia válidas neste período.",
        chartX,
        y + 65,
        {
          width: chartWidth,
          align: "center",
        },
      );

    doc
      .font("Helvetica-Bold")
      .fontSize(6.2)
      .fillColor(COLORS.muted)
      .text("Tempo no período analisado", chartX, y + height - 16, {
        width: chartWidth,
        align: "center",
      });

    return y + height;
  }

  let minimum = Math.min(...validValues);
  let maximum = Math.max(...validValues);

  if (minimum === maximum) {
    const padding = Math.max(Math.abs(minimum) * 0.1, 0.000001);

    minimum -= padding;
    maximum += padding;
  }

  const periodStart = new Date(report.period.start).getTime();
  const periodEnd = new Date(report.period.end).getTime();
  const duration = Math.max(1, periodEnd - periodStart);

  const gridLines = 4;

  for (let index = 0; index < gridLines; index += 1) {
    const ratio = index / (gridLines - 1);
    const gridY = chartY + chartHeight * ratio;
    const value = maximum - (maximum - minimum) * ratio;

    doc
      .lineWidth(0.5)
      .strokeColor(COLORS.line)
      .moveTo(chartX, gridY)
      .lineTo(chartX + chartWidth, gridY)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(5.8)
      .fillColor(COLORS.muted)
      .text(
        value.toLocaleString("pt-BR", {
          maximumFractionDigits: 6,
        }),
        x + 5,
        gridY - 3,
        {
          width: 43,
          align: "right",
        },
      );
  }

  let currentSegment: ChartPoint[] = [];

  const flushSegment = (): void => {
    drawChartSegment(doc, currentSegment);
    currentSegment = [];
  };

  doc.save();

  doc.rect(chartX, chartY, chartWidth, chartHeight).clip();

  for (const sample of report.history) {
    const energyKwh = sample.energyKwh;

    if (
      sample.gapReason !== null ||
      energyKwh === null ||
      !Number.isFinite(energyKwh)
    ) {
      flushSegment();
      continue;
    }

    const timestamp = new Date(sample.attemptedAt).getTime();

    const horizontalRatio = Math.min(
      1,
      Math.max(0, (timestamp - periodStart) / duration),
    );

    const verticalRatio =
      (energyKwh - minimum) /
      (maximum - minimum);

    currentSegment.push({
      x: chartX + horizontalRatio * chartWidth,
      y: chartY + chartHeight - verticalRatio * chartHeight,
    });
  }

  flushSegment();
  doc.restore();

  const datesY = chartY + chartHeight + 7;

  doc
    .font("Helvetica")
    .fontSize(5.8)
    .fillColor(COLORS.muted)
    .text(`Início: ${formatDateTime(report.period.start)}`, chartX, datesY, {
      width: chartWidth / 2,
    });

  doc.text(
    `Fim: ${formatDateTime(report.period.end)}`,
    chartX + chartWidth / 2,
    datesY,
    {
      width: chartWidth / 2,
      align: "right",
    },
  );

  doc
    .font("Helvetica-Bold")
    .fontSize(6.2)
    .fillColor(COLORS.muted)
    .text("Tempo no período analisado", chartX, y + height - 16, {
      width: chartWidth,
      align: "center",
    });

  return y + height;
}

function drawResourceCard(
  doc: PDFKit.PDFDocument,
  options: {
    x: number;
    y: number;
    width: number;
    label: string;
    value: string;
  },
): void {
  const height = 44;

  doc
    .roundedRect(options.x, options.y, options.width, height, 8)
    .fill(COLORS.surface);

  doc
    .font("Helvetica")
    .fontSize(6.2)
    .fillColor(COLORS.muted)
    .text(options.label.toUpperCase(), options.x + 9, options.y + 8, {
      width: options.width - 18,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.dark)
    .text(options.value, options.x + 9, options.y + 23, {
      width: options.width - 18,
    });
}

function drawResources(
  doc: PDFKit.PDFDocument,
  report: IndividualAnalysisReportData,
  y: number,
): number {
  const gap = 8;
  const width = (PAGE.width - PAGE.margin * 2 - gap * 3) / 4;

  const resources = [
    {
      label: "CPU média",
      value: formatNullableMetric(
        report.resourceSummary.cpu.averagePercent,
        "%",
        1,
      ),
    },
    {
      label: "Memória média",
      value: formatNullableMetric(
        report.resourceSummary.memory.averageGb,
        "GB",
        2,
      ),
    },
    {
      label: "Disco médio",
      value: formatNullableMetric(
        report.resourceSummary.disk.averageGb,
        "GB",
        2,
      ),
    },
    {
      label: "Rede total",
      value: formatNullableMetric(
        report.resourceSummary.network.totalGb,
        "GB",
        2,
      ),
    },
  ];

  resources.forEach((resource, index) => {
    drawResourceCard(doc, {
      x: PAGE.margin + index * (width + gap),
      y,
      width,
      label: resource.label,
      value: resource.value,
    });
  });

  return y + 44;
}

function drawCoverageBar(
  doc: PDFKit.PDFDocument,
  options: {
    y: number;
    label: string;
    value: number;
  },
): void {
  const x = PAGE.margin;
  const width = PAGE.width - PAGE.margin * 2;
  const normalizedValue = Math.min(100, Math.max(0, options.value));

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(COLORS.text)
    .text(options.label, x, options.y);

  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(COLORS.dark)
    .text(formatPercent(normalizedValue), x, options.y, {
      width,
      align: "right",
    });

  const barY = options.y + 12;

  doc
    .roundedRect(x, barY, width, 5, 2.5)
    .fill(COLORS.surfaceStrong);

  const filledWidth = width * (normalizedValue / 100);

  if (filledWidth > 0) {
    doc
      .roundedRect(x, barY, filledWidth, 5, 2.5)
      .fill(COLORS.accent);
  }
}

function drawCoverageSection(
  doc: PDFKit.PDFDocument,
  report: IndividualAnalysisReportData,
  y: number,
): number {
  drawCoverageBar(doc, {
    y,
    label: "Cobertura de métricas",
    value: report.environmentalSummary.metricCoveragePercent,
  });

  drawCoverageBar(doc, {
    y: y + 25,
    label: "Cobertura de intensidade de carbono",
    value: report.environmentalSummary.carbonIntensityCoveragePercent,
  });

  return y + 45;
}

function drawPartialWarning(
  doc: PDFKit.PDFDocument,
  report: IndividualAnalysisReportData,
  y: number,
): number {
  if (!report.environmentalSummary.isPartial) {
    return y;
  }

  const gapCount = report.history.filter(
    (sample) => sample.gapReason !== null,
  ).length;

  const height = 30;

  doc
    .roundedRect(
      PAGE.margin,
      y,
      PAGE.width - PAGE.margin * 2,
      height,
      7,
    )
    .fill(COLORS.warningBackground);

  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(COLORS.warningText)
    .text("ANÁLISE PARCIAL", PAGE.margin + 10, y + 6);

  doc
    .font("Helvetica")
    .fontSize(6.2)
    .fillColor(COLORS.warningText)
    .text(
      `${gapCount} amostra(s) com lacunas ou indisponibilidade de dados no período.`,
      PAGE.margin + 10,
      y + 16,
      {
        width: PAGE.width - PAGE.margin * 2 - 20,
      },
    );

  return y + height;
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  const y = PAGE.height - PAGE.margin - 18;

  doc
    .moveTo(PAGE.margin, y - 8)
    .lineTo(PAGE.width - PAGE.margin, y - 8)
    .lineWidth(0.5)
    .strokeColor(COLORS.line)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(6)
    .fillColor(COLORS.muted)
    .text(
      "GreenER · Relatório ambiental gerado automaticamente · Valores estimados pelo modelo GreenER",
      PAGE.margin,
      y,
      {
        width: PAGE.width - PAGE.margin * 2,
        align: "center",
      },
    );
}

export function renderIndividualAnalysisPdf(
  report: IndividualAnalysisReportData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: PAGE.margin,
        bottom: PAGE.margin,
        left: PAGE.margin,
        right: PAGE.margin,
      },
      info: {
        Title: `Relatório ambiental - ${report.service.name}`,
        Author: "GreenER",
        Subject: "Análise ambiental de serviço monitorado",
        Creator: "GreenER",
      },
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    });

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on("error", (error) => {
      reject(error);
    });

    drawHeader(doc, report);

    let currentY = 94;

    currentY = drawServiceIdentification(doc, report, currentY);
    currentY += 6;

    currentY = drawSectionTitle(
      doc,
      "Resumo ambiental",
      "Impacto no período",
      currentY,
    );

    currentY = drawEnvironmentalSummary(doc, report, currentY);
    currentY += 14;

    currentY = drawSectionTitle(
      doc,
      "Evolução",
      "Histórico de energia",
      currentY,
    );

    currentY = drawHistoryChart(doc, report, currentY);
    currentY += 14;

    currentY = drawSectionTitle(
      doc,
      "Recursos computacionais",
      "Resumo operacional",
      currentY,
    );

    currentY = drawResources(doc, report, currentY);
    currentY += 14;

    currentY = drawSectionTitle(
      doc,
      "Qualidade dos dados",
      "Cobertura da análise",
      currentY,
    );

    currentY = drawCoverageSection(doc, report, currentY);
    currentY += 10;

    drawPartialWarning(doc, report, currentY);

    drawFooter(doc);

    doc.end();
  });
}


/* ======================================================
   RELATÓRIO COMPARATIVO
====================================================== */

function formatComparisonValue(
  value: number | null,
  report: ComparisonAnalysisReportData,
): string {
  if (value === null || !Number.isFinite(value)) {
    return "Indisponível";
  }

  const maximumFractionDigits =
    report.metric.value === "energy"
      ? 6
      : report.metric.value === "emissions"
        ? 4
        : 2;

  const formatted = value.toLocaleString("pt-BR", {
    maximumFractionDigits,
  });

  if (report.metric.unit === "%") {
    return `${formatted}%`;
  }

  return `${formatted} ${report.metric.unit}`;
}

function getComparisonServiceName(
  report: ComparisonAnalysisReportData,
  serviceId: number | null,
): string {
  if (serviceId === null) {
    return "Indisponível";
  }

  return (
    report.services.find(
      (service) =>
        service.serviceId === serviceId,
    )?.name ??
    report.failedServices.find(
      (service) =>
        service.serviceId === serviceId,
    )?.name ??
    `Serviço ${serviceId}`
  );
}

function truncateLabel(
  value: string,
  maximumLength: number,
): string {
  if (value.length <= maximumLength) {
    return value;
  }

  return `${value.slice(0, maximumLength - 1)}…`;
}

function drawComparisonHeader(
  doc: PDFKit.PDFDocument,
  report: ComparisonAnalysisReportData,
  subtitle: string,
): void {
  doc
    .rect(0, 0, PAGE.width, 78)
    .fill(COLORS.dark);

  if (existsSync(GREENER_LOGO_PATH)) {
    doc.image(
      GREENER_LOGO_PATH,
      PAGE.margin,
      20,
      {
        fit: [100, 32],
      },
    );
  } else {
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor(COLORS.accent)
      .text(
        "GreenER",
        PAGE.margin,
        24,
      );
  }

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(COLORS.white)
    .text(
      "RELATÓRIO COMPARATIVO",
      PAGE.margin,
      57,
      {
        characterSpacing: 1.1,
      },
    );

  doc
    .font("Helvetica")
    .fontSize(6.5)
    .fillColor("#C8D6D2")
    .text(
      subtitle,
      PAGE.margin,
      20,
      {
        width:
          PAGE.width -
          PAGE.margin * 2,
        align: "right",
      },
    );

  doc.text(
    `Gerado em ${formatDateTime(
      report.generatedAt,
    )}`,
    PAGE.margin,
    32,
    {
      width:
        PAGE.width -
        PAGE.margin * 2,
      align: "right",
    },
  );
}

function drawComparisonIdentification(
  doc: PDFKit.PDFDocument,
  report: ComparisonAnalysisReportData,
  y: number,
): number {
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLORS.dark)
    .text(
      "Comparação de serviços",
      PAGE.margin,
      y,
    );

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      `${report.metric.label} · ${report.metric.periodAggregationLabel} · ${report.services.length} serviço(s) analisado(s)`,
      PAGE.margin,
      y + 21,
    );

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(COLORS.muted)
    .text(
      `Período: ${formatDateTime(
        report.period.start,
      )} - ${formatDateTime(
        report.period.end,
      )}`,
      PAGE.margin,
      y + 35,
    );

  return y + 51;
}

function drawComparisonMetricCard(
  doc: PDFKit.PDFDocument,
  options: {
    x: number;
    y: number;
    width: number;
    label: string;
    serviceName: string;
    value: string;
  },
): void {
  const height = 64;

  doc
    .roundedRect(
      options.x,
      options.y,
      options.width,
      height,
      9,
    )
    .fillAndStroke(
      COLORS.surface,
      COLORS.line,
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(6.2)
    .fillColor(COLORS.muted)
    .text(
      options.label.toUpperCase(),
      options.x + 10,
      options.y + 9,
      {
        width:
          options.width - 20,
        characterSpacing: 0.5,
      },
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.dark)
    .text(
      options.value,
      options.x + 10,
      options.y + 23,
      {
        width:
          options.width - 20,
      },
    );

  doc
    .font("Helvetica")
    .fontSize(6.2)
    .fillColor(COLORS.muted)
    .text(
      truncateLabel(
        options.serviceName,
        25,
      ),
      options.x + 10,
      options.y + 45,
      {
        width:
          options.width - 20,
      },
    );
}

function drawComparisonSummary(
  doc: PDFKit.PDFDocument,
  report: ComparisonAnalysisReportData,
  y: number,
): number {
  const gap = 8;

  const width =
    (
      PAGE.width -
      PAGE.margin * 2 -
      gap * 2
    ) / 3;

  const highestName =
    getComparisonServiceName(
      report,
      report.summary.highestServiceId,
    );

  const lowestName =
    getComparisonServiceName(
      report,
      report.summary.lowestServiceId,
    );

  drawComparisonMetricCard(
    doc,
    {
      x: PAGE.margin,
      y,
      width,
      label: "Maior valor",
      serviceName: highestName,
      value:
        formatComparisonValue(
          report.summary.highestValue,
          report,
        ),
    },
  );

  drawComparisonMetricCard(
    doc,
    {
      x:
        PAGE.margin +
        width +
        gap,
      y,
      width,
      label: "Menor valor",
      serviceName: lowestName,
      value:
        formatComparisonValue(
          report.summary.lowestValue,
          report,
        ),
    },
  );

  drawComparisonMetricCard(
    doc,
    {
      x:
        PAGE.margin +
        (width + gap) * 2,
      y,
      width,
      label: "Diferença",
      serviceName:
        "Entre os extremos",
      value:
        formatComparisonValue(
          report.summary.difference,
          report,
        ),
    },
  );

  return y + 64;
}

function drawComparisonRanking(
  doc: PDFKit.PDFDocument,
  report: ComparisonAnalysisReportData,
  y: number,
): number {
  const x = PAGE.margin;
  const width =
    PAGE.width -
    PAGE.margin * 2;

  const sortedServices =
    [...report.services].sort(
      (a, b) => {
        if (
          a.periodValue === null &&
          b.periodValue === null
        ) {
          return 0;
        }

        if (a.periodValue === null) {
          return 1;
        }

        if (b.periodValue === null) {
          return -1;
        }

        return (
          b.periodValue -
          a.periodValue
        );
      },
    );

  const rowHeight = 22;
  const headerHeight = 34;

  const height =
    headerHeight +
    sortedServices.length *
      rowHeight +
    16;

  doc
    .roundedRect(
      x,
      y,
      width,
      height,
      10,
    )
    .fillAndStroke(
      COLORS.surface,
      COLORS.line,
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(COLORS.muted)
    .text(
      `${report.metric.label} (${report.metric.unit})`,
      x + 12,
      y + 10,
    );

  const finiteValues =
    sortedServices.flatMap(
      (service) =>
        service.periodValue !==
          null &&
        Number.isFinite(
          service.periodValue,
        )
          ? [service.periodValue]
          : [],
    );

  const maximum =
    finiteValues.length > 0
      ? Math.max(...finiteValues)
      : 0;

  const labelWidth = 142;
  const valueWidth = 82;

  const barX =
    x +
    labelWidth +
    18;

  const barWidth =
    width -
    labelWidth -
    valueWidth -
    46;

  sortedServices.forEach(
    (service, index) => {
      const rowY =
        y +
        headerHeight +
        index * rowHeight;

      doc
        .font("Helvetica")
        .fontSize(6.7)
        .fillColor(COLORS.text)
        .text(
          truncateLabel(
            service.name,
            28,
          ),
          x + 12,
          rowY + 4,
          {
            width:
              labelWidth - 10,
          },
        );

      doc
        .roundedRect(
          barX,
          rowY + 6,
          barWidth,
          7,
          3.5,
        )
        .fill(
          COLORS.surfaceStrong,
        );

      if (
        service.periodValue !==
          null &&
        Number.isFinite(
          service.periodValue,
        ) &&
        maximum > 0
      ) {
        const normalized =
          Math.max(
            0,
            service.periodValue,
          ) / maximum;

        const filledWidth =
          Math.max(
            2,
            barWidth *
              Math.min(
                1,
                normalized,
              ),
          );

        doc
          .roundedRect(
            barX,
            rowY + 6,
            filledWidth,
            7,
            3.5,
          )
          .fill(
            SERIES_COLORS[
              index %
                SERIES_COLORS.length
            ],
          );
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(6.5)
        .fillColor(COLORS.dark)
        .text(
          formatComparisonValue(
            service.periodValue,
            report,
          ),
          x +
            width -
            valueWidth -
            10,
          rowY + 3,
          {
            width:
              valueWidth,
            align: "right",
          },
        );
    },
  );

  return y + height;
}

function drawComparisonPartialWarning(
  doc: PDFKit.PDFDocument,
  report: ComparisonAnalysisReportData,
  y: number,
): number {
  if (!report.summary.isPartial) {
    return y;
  }

  const failedNames =
    report.failedServices
      .map(
        (service) =>
          service.name ??
          `Serviço ${service.serviceId}`,
      )
      .join(", ");

  const message =
    report.failedServices.length >
    0
      ? `Comparação parcial. Não foi possível obter dados de: ${failedNames}.`
      : "Comparação parcial. Um ou mais serviços possuem lacunas ou dados indisponíveis no período.";

  const height = 34;

  doc
    .roundedRect(
      PAGE.margin,
      y,
      PAGE.width -
        PAGE.margin * 2,
      height,
      7,
    )
    .fill(
      COLORS.warningBackground,
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(
      COLORS.warningText,
    )
    .text(
      "COMPARAÇÃO PARCIAL",
      PAGE.margin + 10,
      y + 6,
    );

  doc
    .font("Helvetica")
    .fontSize(6.1)
    .fillColor(
      COLORS.warningText,
    )
    .text(
      message,
      PAGE.margin + 10,
      y + 16,
      {
        width:
          PAGE.width -
          PAGE.margin * 2 -
          20,
      },
    );

  return y + height;
}

function drawComparisonLineSegment(
  doc: PDFKit.PDFDocument,
  points: ChartPoint[],
  color: string,
): void {
  if (points.length === 0) {
    return;
  }

  if (points.length === 1) {
    doc
      .circle(
        points[0].x,
        points[0].y,
        1.5,
      )
      .fill(color);

    return;
  }

  doc
    .lineWidth(1.5)
    .strokeColor(color)
    .moveTo(
      points[0].x,
      points[0].y,
    );

  for (
    let index = 1;
    index < points.length;
    index += 1
  ) {
    doc.lineTo(
      points[index].x,
      points[index].y,
    );
  }

  doc.stroke();
}

function drawComparisonLegend(
  doc: PDFKit.PDFDocument,
  report: ComparisonAnalysisReportData,
  x: number,
  y: number,
  width: number,
): number {
  const columns = 2;
  const columnWidth =
    width / columns;

  const rowHeight = 15;

  report.services.forEach(
    (service, index) => {
      const column =
        index % columns;

      const row =
        Math.floor(
          index / columns,
        );

      const itemX =
        x +
        column *
          columnWidth;

      const itemY =
        y +
        row *
          rowHeight;

      const color =
        SERIES_COLORS[
          index %
            SERIES_COLORS.length
        ];

      doc
        .lineWidth(2)
        .strokeColor(color)
        .moveTo(
          itemX,
          itemY + 5,
        )
        .lineTo(
          itemX + 17,
          itemY + 5,
        )
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(6.2)
        .fillColor(COLORS.text)
        .text(
          truncateLabel(
            service.name,
            31,
          ),
          itemX + 23,
          itemY + 1,
          {
            width:
              columnWidth - 27,
          },
        );
    },
  );

  return (
    y +
    Math.ceil(
      report.services.length /
        columns,
    ) *
      rowHeight
  );
}

function drawComparisonHistoryChart(
  doc: PDFKit.PDFDocument,
  report: ComparisonAnalysisReportData,
  y: number,
): number {
  const x = PAGE.margin;
  const width =
    PAGE.width -
    PAGE.margin * 2;

  const height = 390;

  doc
    .roundedRect(
      x,
      y,
      width,
      height,
      10,
    )
    .fillAndStroke(
      COLORS.surface,
      COLORS.line,
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(COLORS.muted)
    .text(
      `${report.metric.label} (${report.metric.unit})`,
      x + 12,
      y + 10,
    );

  const legendBottom =
    drawComparisonLegend(
      doc,
      report,
      x + 12,
      y + 28,
      width - 24,
    );

  const chartX =
    x + 58;

  const chartY =
    legendBottom + 13;

  const chartWidth =
    width - 76;

  const chartHeight =
    Math.max(
      175,
      y +
        height -
        chartY -
        47,
    );

  const validValues =
    report.services.flatMap(
      (service) =>
        service.history.flatMap(
          (sample) =>
            sample.value !==
              null &&
            Number.isFinite(
              sample.value,
            )
              ? [sample.value]
              : [],
        ),
    );

  if (
    validValues.length === 0
  ) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(
        "Não existem amostras válidas para a métrica selecionada neste período.",
        chartX,
        chartY +
          chartHeight / 2 -
          5,
        {
          width:
            chartWidth,
          align: "center",
        },
      );

    return y + height;
  }

  let minimum =
    Math.min(...validValues);

  let maximum =
    Math.max(...validValues);

  if (minimum === maximum) {
    const padding =
      Math.max(
        Math.abs(minimum) *
          0.1,
        0.000001,
      );

    minimum -= padding;
    maximum += padding;
  } else {
    const range =
      maximum - minimum;

    const padding =
      range * 0.08;

    minimum -= padding;
    maximum += padding;
  }

  const periodStart =
    new Date(
      report.period.start,
    ).getTime();

  const periodEnd =
    new Date(
      report.period.end,
    ).getTime();

  const duration =
    Math.max(
      1,
      periodEnd - periodStart,
    );

  const gridLines = 5;

  for (
    let index = 0;
    index < gridLines;
    index += 1
  ) {
    const ratio =
      index /
      (gridLines - 1);

    const gridY =
      chartY +
      chartHeight * ratio;

    const value =
      maximum -
      (
        maximum -
        minimum
      ) *
        ratio;

    doc
      .lineWidth(0.5)
      .strokeColor(COLORS.line)
      .moveTo(
        chartX,
        gridY,
      )
      .lineTo(
        chartX +
          chartWidth,
        gridY,
      )
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(5.6)
      .fillColor(COLORS.muted)
      .text(
        value.toLocaleString(
          "pt-BR",
          {
            maximumFractionDigits:
              report.metric
                .value ===
              "energy"
                ? 6
                : 2,
          },
        ),
        x + 5,
        gridY - 3,
        {
          width: 46,
          align: "right",
        },
      );
  }

  doc.save();

  doc
    .rect(
      chartX,
      chartY,
      chartWidth,
      chartHeight,
    )
    .clip();

  report.services.forEach(
    (service, serviceIndex) => {
      const color =
        SERIES_COLORS[
          serviceIndex %
            SERIES_COLORS.length
        ];

      let currentSegment:
        ChartPoint[] = [];

      const flushSegment =
        (): void => {
          drawComparisonLineSegment(
            doc,
            currentSegment,
            color,
          );

          currentSegment = [];
        };

      for (
        const sample of
        service.history
      ) {
        const value =
          sample.value;

        const breaksSeries =
          sample.temporalGap ||
          value === null ||
          !Number.isFinite(
            value,
          );

        if (breaksSeries) {
          flushSegment();
          continue;
        }

        const timestamp =
          new Date(
            sample.attemptedAt,
          ).getTime();

        const horizontalRatio =
          Math.min(
            1,
            Math.max(
              0,
              (
                timestamp -
                periodStart
              ) /
                duration,
            ),
          );

        const verticalRatio =
          (
            value -
            minimum
          ) /
          (
            maximum -
            minimum
          );

        currentSegment.push({
          x:
            chartX +
            horizontalRatio *
              chartWidth,

          y:
            chartY +
            chartHeight -
            verticalRatio *
              chartHeight,
        });
      }

      flushSegment();
    },
  );

  doc.restore();

  const datesY =
    chartY +
    chartHeight +
    8;

  doc
    .font("Helvetica")
    .fontSize(5.8)
    .fillColor(COLORS.muted)
    .text(
      `Início: ${formatDateTime(
        report.period.start,
      )}`,
      chartX,
      datesY,
      {
        width:
          chartWidth / 2,
      },
    );

  doc.text(
    `Fim: ${formatDateTime(
      report.period.end,
    )}`,
    chartX +
      chartWidth / 2,
    datesY,
    {
      width:
        chartWidth / 2,
      align: "right",
    },
  );

  doc
    .font("Helvetica-Bold")
    .fontSize(6.2)
    .fillColor(COLORS.muted)
    .text(
      "Tempo no período analisado",
      chartX,
      y +
        height -
        17,
      {
        width:
          chartWidth,
        align: "center",
      },
    );

  return y + height;
}

function drawComparisonMethodologyNote(
  doc: PDFKit.PDFDocument,
  report: ComparisonAnalysisReportData,
  y: number,
): number {
  const height = 52;

  doc
    .roundedRect(
      PAGE.margin,
      y,
      PAGE.width -
        PAGE.margin * 2,
      height,
      8,
    )
    .fill(
      COLORS.surfaceStrong,
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(COLORS.dark)
    .text(
      "LEITURA DO GRÁFICO",
      PAGE.margin + 10,
      y + 8,
    );

  doc
    .font("Helvetica")
    .fontSize(6.2)
    .fillColor(COLORS.muted)
    .text(
      `As séries representam ${report.metric.label.toLowerCase()} ao longo do período. Lacunas temporais e amostras sem valor válido interrompem a linha, evitando conectar artificialmente pontos separados por ausência de dados.`,
      PAGE.margin + 10,
      y + 19,
      {
        width:
          PAGE.width -
          PAGE.margin * 2 -
          20,
        lineGap: 1,
      },
    );

  return y + height;
}

export function renderComparisonAnalysisPdf(
  report: ComparisonAnalysisReportData,
): Promise<Buffer> {
  return new Promise(
    (resolve, reject) => {
      const doc =
        new PDFDocument({
          size: "A4",

          margins: {
            top: PAGE.margin,
            bottom:
              PAGE.margin,
            left: PAGE.margin,
            right:
              PAGE.margin,
          },

          info: {
            Title:
              "Relatório comparativo ambiental",

            Author:
              "GreenER",

            Subject:
              `Comparação de serviços - ${report.metric.label}`,

            Creator:
              "GreenER",
          },
        });

      const chunks:
        Buffer[] = [];

      doc.on(
        "data",
        (chunk: Buffer) => {
          chunks.push(
            Buffer.from(
              chunk,
            ),
          );
        },
      );

      doc.on(
        "end",
        () => {
          resolve(
            Buffer.concat(
              chunks,
            ),
          );
        },
      );

      doc.on(
        "error",
        (error) => {
          reject(error);
        },
      );

      /* ==============================
         PÁGINA 1 — RESUMO E RANKING
      ============================== */

      drawComparisonHeader(
        doc,
        report,
        "Resumo consolidado",
      );

      let currentY = 94;

      currentY =
        drawComparisonIdentification(
          doc,
          report,
          currentY,
        );

      currentY += 7;

      currentY =
        drawSectionTitle(
          doc,
          "Resumo comparativo",
          "Extremos do período",
          currentY,
        );

      currentY =
        drawComparisonSummary(
          doc,
          report,
          currentY,
        );

      currentY += 15;

      currentY =
        drawSectionTitle(
          doc,
          "Comparação do período",
          "Ranking entre serviços",
          currentY,
        );

      currentY =
        drawComparisonRanking(
          doc,
          report,
          currentY,
        );

      currentY += 12;

      drawComparisonPartialWarning(
        doc,
        report,
        currentY,
      );

      drawFooter(doc);

      /* ==============================
         PÁGINA 2 — EVOLUÇÃO TEMPORAL
      ============================== */

      doc.addPage();

      drawComparisonHeader(
        doc,
        report,
        "Evolução temporal",
      );

      currentY = 94;

      currentY =
        drawComparisonIdentification(
          doc,
          report,
          currentY,
        );

      currentY += 7;

      currentY =
        drawSectionTitle(
          doc,
          "Evolução",
          `Histórico de ${report.metric.label.toLowerCase()}`,
          currentY,
        );

      currentY =
        drawComparisonHistoryChart(
          doc,
          report,
          currentY,
        );

      currentY += 14;

      drawComparisonMethodologyNote(
        doc,
        report,
        currentY,
      );

      drawFooter(doc);

      doc.end();
    },
  );
}
