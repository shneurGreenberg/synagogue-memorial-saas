export async function getDeviceCoordinates(settings) {
  if (!settings.useDeviceLocation) {
    const lat = Number(settings.manualLat);
    const long = Number(settings.manualLong);
    if (Number.isFinite(lat) && Number.isFinite(long)) {
      return { lat, long };
    }
    return null;
  }

  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const permission = await Geolocation.requestPermissions();
    if (permission.location === 'denied') {
      throw new Error('Location permission denied');
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });

    return {
      lat: position.coords.latitude,
      long: position.coords.longitude,
    };
  } catch (err) {
    const lat = Number(settings.manualLat);
    const long = Number(settings.manualLong);
    if (Number.isFinite(lat) && Number.isFinite(long)) {
      return { lat, long };
    }
    throw err;
  }
}

export async function resolveTimezone(lat, long) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(long),
    current: 'temperature_2m',
    timezone: 'auto',
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Could not resolve timezone');
  }

  const data = await response.json();
  return data.timezone || 'UTC';
}
