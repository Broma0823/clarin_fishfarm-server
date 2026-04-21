const severeAlerts = (() => {
  if (!deviceReadings) return []
  const alerts = []
  const temp = deviceReadings.waterTemperature
  if (temp !== null && temp !== undefined) {
    if (temp < 24) alerts.push({ label: 'Water Temperature', severity: 'critical', message: `Critically low (${temp.toFixed(2)}°C).` })
    else if (temp > 32) alerts.push({ label: 'Water Temperature', severity: 'critical', message: `Critically high (${temp.toFixed(2)}°C).` })
  }
  const ph = deviceReadings.phLevel
  if (ph !== null && ph !== undefined) {
    if (ph < 6.0) alerts.push({ label: 'pH Level', severity: 'warning', message: `Too acidic (pH ${ph.toFixed(2)}).` })
    else if (ph > 9.0) alerts.push({ label: 'pH Level', severity: 'warning', message: `Too alkaline (pH ${ph.toFixed(2)}).` })
  }
  const doValue = deviceReadings.dissolvedOxygen
  if (doValue !== null && doValue !== undefined && doValue < 4.0) {
    alerts.push({ label: 'Dissolved Oxygen', severity: 'critical', message: `Critically low (${doValue.toFixed(2)} mg/L).` })
  }
  return alerts
})()