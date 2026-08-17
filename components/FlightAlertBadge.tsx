export default function FlightAlertBadge({
  alert,
  compact = false
}: {
  alert?: any;
  compact?: boolean;
}) {
  if (!alert || !alert.active) return null;

  return (
    <span
      className={`flight-auto-alert ${alert.severity || "warning"} ${
        alert.acknowledged_at ? "acknowledged" : ""
      }`}
      title={alert.message}
    >
      <strong>{alert.title}</strong>
      {!compact && <small>{alert.message}</small>}
    </span>
  );
}
