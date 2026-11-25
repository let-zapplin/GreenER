import "./RouteLoading.css";

export function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-spinner" aria-hidden="true" />
      <span>Carregando página...</span>
    </div>
  );
}
