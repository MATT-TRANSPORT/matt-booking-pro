export default function FlightAutomationStatus({
  lastRun
}: {
  lastRun?: any;
}) {
  if (!lastRun) {
    return (
      <div className="flight-automation-status waiting">
        <strong>✈ AUTOMATYKA LOTÓW</strong>
        <span>Oczekiwanie na pierwszy przebieg cron.</span>
      </div>
    );
  }

  const errors = Number(lastRun.error_count || 0);

  return (
    <div
      className={`flight-automation-status ${
        errors ? "warning" : "ok"
      }`}
    >
      <strong>
        {errors ? "⚠ FLIGHT AUTOMATION" : "✓ FLIGHT AUTOMATION"}
      </strong>
      <span>
        Ostatnio:{" "}
        {new Date(lastRun.started_at).toLocaleString("pl-PL")}
        {" · "}
        odświeżono {lastRun.refreshed_count ?? 0}
        {errors ? ` · błędy ${errors}` : ""}
      </span>
    </div>
  );
}
