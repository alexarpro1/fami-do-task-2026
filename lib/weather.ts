/**
 * Wetter per Open-Meteo (kostenlos, ohne API-Key).
 * Standort: Koordinaten (GPS oder manuell) oder Stadtname (Geocoding).
 */

import type { WeatherData } from "@/types"

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
const GEOCODING = "https://geocoding-api.open-meteo.com/v1/search"

/** Open-Meteo Wettercode → unsere condition */
function weatherCodeToCondition(code: number): WeatherData["condition"] {
  if (code === 0) return "sunny"
  if (code >= 1 && code <= 3) return "cloudy"
  if (code === 45 || code === 48) return "cloudy"
  if (code >= 51 && code <= 67) return "rainy"
  if (code >= 71 && code <= 77) return "snowy"
  if (code >= 80 && code <= 82) return "rainy"
  if (code >= 85 && code <= 86) return "snowy"
  if (code >= 95 && code <= 99) return "stormy"
  if (code >= 90 && code <= 94) return "rainy"
  return "cloudy"
}

export interface WeatherResult extends WeatherData {
  tempMorning: number
  tempAfternoon: number
  humidity: number
  windSpeed: number
}

/** Wetter für Koordinaten von Open-Meteo laden */
export async function fetchWeatherFromCoords(
  lat: number,
  lon: number,
  locationName?: string,
): Promise<WeatherResult> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    daily: "temperature_2m_min,temperature_2m_max",
    wind_speed_unit: "kmh",
    timezone: "auto",
  })
  const res = await fetch(`${OPEN_METEO}?${params}`)
  if (!res.ok) throw new Error("Wetter konnte nicht geladen werden")

  const data = (await res.json()) as {
    current: {
      temperature_2m: number
      relative_humidity_2m: number
      weather_code: number
      wind_speed_10m?: number
    }
    daily: {
      temperature_2m_min: number[]
      temperature_2m_max: number[]
    }
  }
  const current = data.current
  const tempMin = data.daily?.temperature_2m_min?.[0] ?? current.temperature_2m - 3
  const tempMax = data.daily?.temperature_2m_max?.[0] ?? current.temperature_2m + 3

  const condition = weatherCodeToCondition(current.weather_code)
  const temperature = Math.round(current.temperature_2m)

  return {
    temperature,
    tempMorning: Math.round(tempMin),
    tempAfternoon: Math.round(tempMax),
    condition,
    clothingTip: "",
    humidity: current.relative_humidity_2m ?? 50,
    windSpeed: Math.round(current.wind_speed_10m ?? 10),
    lastUpdated: new Date().toISOString(),
    locationName: locationName ?? undefined,
  }
}

/** Stadtname → Koordinaten (Open-Meteo Geocoding) */
export async function fetchCoordsFromCity(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const params = new URLSearchParams({
    name: city.trim(),
    count: "1",
    language: "de",
  })
  const res = await fetch(`${GEOCODING}?${params}`)
  if (!res.ok) return null

  const data = (await res.json()) as { results?: { latitude: number; longitude: number; name: string }[] }
  const first = data.results?.[0]
  if (!first) return null
  return { lat: first.latitude, lon: first.longitude, name: first.name }
}

/** Browser-GPS (nur im Client) */
export function getBrowserLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation nicht verfügbar"))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  })
}
