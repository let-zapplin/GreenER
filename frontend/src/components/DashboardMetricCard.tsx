import "./DashboardMetricCard.css";

type DashboardMetricCardProps = {
  label: string;
  value: string;
  unit: string;
  description: string;
  variant: "energy" | "emissions";
};

export function DashboardMetricCard({
  label,
  value,
  unit,
  description,
  variant,
}: DashboardMetricCardProps) {
  return (
    <article
      className={`dashboard-card dashboard-card-${variant}`}
    >
      <span className="dashboard-card-label">
        {label}
      </span>

      <strong className="dashboard-card-value">
        {value}
      </strong>

      <span className="dashboard-card-unit">
        {unit}
      </span>

      <p>{description}</p>
    </article>
  );
}