import { existsSync } from "node:fs";
import { resolve } from "node:path";

import PDFDocument from "pdfkit";

import type { IndividualAnalysisReportData } from "./relatorios.types.js";

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
