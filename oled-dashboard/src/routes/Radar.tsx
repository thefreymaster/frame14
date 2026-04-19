export function Radar() {
  return (
    <iframe
      src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=6&overlay=radar&product=radar&level=surface&lat=42.533&lon=-72.328&pressure=true"
      style={{ width: "100vw", height: "100vh", border: "none", display: "block" }}
      title="Radar"
    />
  );
}
