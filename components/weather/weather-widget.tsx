"use client"

import { useState, useEffect, useCallback } from "react"
import { useFamily } from "@/context/family-context"
import { cn } from "@/lib/utils"
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, RefreshCw, ChevronDown, ChevronUp, MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import type { WeatherData } from "@/types"
import { fetchWeatherFromCoords, fetchCoordsFromCity, getCurrentLocation } from "@/lib/weather"
import type { WeatherResult } from "@/lib/weather"

type ClothingRecommendation = {
  shoes: string
  shoesEmoji: string
  pants: string
  pantsEmoji: string
  top: string
  topEmoji: string
  jacket: string
  jacketEmoji: string
}

const getClothingRecommendation = (
  tempMorning: number,
  tempAfternoon: number,
  condition: string,
  isRaining: boolean,
): ClothingRecommendation => {
  const avgTemp = (tempMorning + tempAfternoon) / 2
  const minTemp = Math.min(tempMorning, tempAfternoon)
  const maxTemp = Math.max(tempMorning, tempAfternoon)

  const clothing: ClothingRecommendation = {
    shoes: "Sportschuhe",
    shoesEmoji: "👟",
    pants: "Normale Hose",
    pantsEmoji: "👖",
    top: "T-Shirt",
    topEmoji: "👕",
    jacket: "Keine Jacke",
    jacketEmoji: "❌",
  }

  if (isRaining || condition === "rainy") {
    clothing.shoes = "Gummistiefel"
    clothing.shoesEmoji = "🥾"
  } else if (condition === "snowy" || minTemp < 5) {
    clothing.shoes = "Winterschuhe"
    clothing.shoesEmoji = "🥾"
  } else if (minTemp < 15) {
    clothing.shoes = "Geschlossene Schuhe"
    clothing.shoesEmoji = "👞"
  }

  if (minTemp < 10 || condition === "snowy") {
    clothing.pants = "Warme lange Hose"
    clothing.pantsEmoji = "🧥"
  } else if (minTemp < 18) {
    clothing.pants = "Lange Hose"
    clothing.pantsEmoji = "👖"
  } else if (maxTemp > 25) {
    clothing.pants = "Kurze Hose"
    clothing.pantsEmoji = "🩳"
  }

  if (maxTemp > 25) {
    clothing.top = "Leichtes T-Shirt"
    clothing.topEmoji = "👕"
  } else if (avgTemp > 18) {
    clothing.top = "T-Shirt"
    clothing.topEmoji = "👕"
  } else if (avgTemp > 12) {
    clothing.top = "Langarm-Shirt"
    clothing.topEmoji = "👔"
  } else {
    clothing.top = "Pullover"
    clothing.topEmoji = "🧥"
  }

  if (condition === "snowy" || minTemp < 5) {
    clothing.jacket = "Warme Winterjacke"
    clothing.jacketEmoji = "🧥"
  } else if (minTemp < 12) {
    clothing.jacket = "Warme Jacke"
    clothing.jacketEmoji = "🧥"
  } else if (minTemp < 18 || isRaining) {
    clothing.jacket = isRaining ? "Regenjacke" : "Leichte Jacke"
    clothing.jacketEmoji = isRaining ? "🌧️" : "🧥"
  } else if (maxTemp - minTemp > 10) {
    clothing.jacket = "Jacke fuer spaeter"
    clothing.jacketEmoji = "🧥"
  } else {
    clothing.jacket = "Keine Jacke noetig"
    clothing.jacketEmoji = "☀️"
  }

  return clothing
}

const WEATHER_DATA = {
  sunny: {
    icon: Sun,
    label: "Sonnig",
    emoji: "☀️",
  },
  cloudy: {
    icon: Cloud,
    label: "Bewoelkt",
    emoji: "☁️",
  },
  rainy: {
    icon: CloudRain,
    label: "Regnerisch",
    emoji: "🌧️",
  },
  snowy: {
    icon: CloudSnow,
    label: "Schnee",
    emoji: "❄️",
  },
  stormy: {
    icon: CloudLightning,
    label: "Gewitter",
    emoji: "⛈️",
  },
  windy: {
    icon: Wind,
    label: "Windig",
    emoji: "💨",
  },
}

const FALLBACK_COORDS = { lat: 52.52, lon: 13.405 } // Berlin

interface WeatherWidgetProps {
  compact?: boolean
}

export function WeatherWidget({ compact = false }: WeatherWidgetProps) {
  const { state, dispatch } = useFamily()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [weatherDetails, setWeatherDetails] = useState<{
    tempMorning: number
    tempAfternoon: number
    humidity: number
    windSpeed: number
  } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [showManualLocation, setShowManualLocation] = useState(false)
  const [manualCity, setManualCity] = useState("")
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)

  const applyWeatherResult = useCallback(
    (result: WeatherResult) => {
      setWeatherDetails({
        tempMorning: result.tempMorning,
        tempAfternoon: result.tempAfternoon,
        humidity: result.humidity,
        windSpeed: result.windSpeed,
      })
      dispatch({
        type: "UPDATE_WEATHER",
        payload: {
          temperature: result.temperature,
          condition: result.condition,
          clothingTip: result.clothingTip,
          lastUpdated: result.lastUpdated,
          locationName: result.locationName,
        },
      })
    },
    [dispatch],
  )

  const loadWeather = useCallback(
    async (lat: number, lon: number, locationName?: string) => {
      setLocationError(null)
      try {
        const result = await fetchWeatherFromCoords(lat, lon, locationName)
        applyWeatherResult(result)
      } catch (e) {
        setLocationError("Wetter konnte nicht geladen werden.")
      }
    },
    [applyWeatherResult],
  )

  const resolveLocationAndLoad = useCallback(async () => {
    setIsLoadingLocation(true)
    setLocationError(null)
    try {
      let lat: number
      let lon: number
      let locationName: string | undefined = state.settings.weatherCityName

      if (state.settings.weatherLat != null && state.settings.weatherLon != null) {
        lat = state.settings.weatherLat
        lon = state.settings.weatherLon
      } else {
        try {
          const pos = await getCurrentLocation()
          lat = pos.lat
          lon = pos.lon
        } catch {
          lat = FALLBACK_COORDS.lat
          lon = FALLBACK_COORDS.lon
          locationName = locationName ?? "Berlin (Standard)"
        }
      }
      await loadWeather(lat, lon, locationName)
    } catch (e) {
      setLocationError("Standort konnte nicht ermittelt werden.")
    } finally {
      setIsLoadingLocation(false)
    }
  }, [state.settings.weatherLat, state.settings.weatherLon, state.settings.weatherCityName, loadWeather])

  useEffect(() => {
    if (!state.settings.weatherEnabled) return
    if (!state.weather) {
      resolveLocationAndLoad()
      return
    }
    const lastUpdate = new Date(state.weather.lastUpdated).getTime()
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    if (now - lastUpdate > oneHour) {
      resolveLocationAndLoad()
    }
  }, [state.settings.weatherEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await resolveLocationAndLoad()
    setIsRefreshing(false)
  }

  const handleManualCitySubmit = async () => {
    const city = manualCity.trim()
    if (!city) return
    setIsLoadingLocation(true)
    setLocationError(null)
    try {
      const coords = await fetchCoordsFromCity(city)
      if (!coords) {
        setLocationError("Ort nicht gefunden. Bitte anderen Namen versuchen.")
        return
      }
      dispatch({
        type: "UPDATE_SETTINGS",
        payload: {
          weatherLat: coords.lat,
          weatherLon: coords.lon,
          weatherCityName: coords.name,
        },
      })
      await loadWeather(coords.lat, coords.lon, coords.name)
      setShowManualLocation(false)
      setManualCity("")
    } catch {
      setLocationError("Standort konnte nicht geladen werden.")
    } finally {
      setIsLoadingLocation(false)
    }
  }

  const handleUseMyLocation = async () => {
    setIsLoadingLocation(true)
    setLocationError(null)
    try {
      const pos = await getCurrentLocation()
      dispatch({
        type: "UPDATE_SETTINGS",
        payload: {
          weatherLat: pos.lat,
          weatherLon: pos.lon,
          weatherCityName: undefined,
        },
      })
      await loadWeather(pos.lat, pos.lon)
      setShowManualLocation(false)
    } catch {
      setLocationError("GPS-Zugriff verweigert oder nicht verfügbar.")
    } finally {
      setIsLoadingLocation(false)
    }
  }

  if (!state.settings.weatherEnabled) return null

  if (isLoadingLocation && !state.weather) {
    return (
      <div className="rounded-2xl p-4 border bg-secondary border-border flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Wetter wird geladen…</span>
      </div>
    )
  }

  if (!state.weather) {
    return (
      <div className="rounded-2xl p-4 border bg-secondary border-border space-y-3">
        {locationError && <p className="text-sm text-destructive">{locationError}</p>}
        <p className="text-sm text-muted-foreground">Standort ermitteln oder manuell eingeben.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={resolveLocationAndLoad} disabled={isLoadingLocation}>
            {isLoadingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Standort aktualisieren
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowManualLocation(true)}>
            Ort eingeben
          </Button>
        </div>
        {showManualLocation && (
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              placeholder="z. B. Berlin, München"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
            <Button size="sm" onClick={handleManualCitySubmit} disabled={!manualCity.trim() || isLoadingLocation}>
              Übernehmen
            </Button>
          </div>
        )}
      </div>
    )
  }

  const weather = state.weather
  const weatherInfo = WEATHER_DATA[weather.condition]
  const WeatherIcon = weatherInfo.icon
  const locationLabel = weather.locationName ?? state.settings.weatherCityName

  const tempMorning = weatherDetails?.tempMorning ?? weather.temperature - 3
  const tempAfternoon = weatherDetails?.tempAfternoon ?? weather.temperature + 3

  const clothing = getClothingRecommendation(
    tempMorning,
    tempAfternoon,
    weather.condition,
    weather.condition === "rainy",
  )

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-secondary border-border">
        <span className="text-lg">{weatherInfo.emoji}</span>
        <span className="font-medium text-foreground">{weather.temperature}°C</span>
      </div>
    )
  }

  return (
    <motion.div
      layout
      className="rounded-2xl p-4 border cursor-pointer transition-all bg-secondary border-border"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Compact View */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            animate={weather.condition === "sunny" ? { rotate: [0, 15, -15, 0] } : {}}
            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
            className="text-4xl"
          >
            {weatherInfo.emoji}
          </motion.div>
          <div>
            <div className="text-3xl font-bold text-foreground">{weather.temperature}°C</div>
            <div className="text-sm text-muted-foreground">{weatherInfo.label}</div>
            {locationLabel && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {locationLabel}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              🌅 {tempMorning}° → 🌇 {tempAfternoon}°
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              handleRefresh()
            }}
            className={cn("rounded-full h-8 w-8", isRefreshing && "animate-spin")}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium bg-card/60 text-card-foreground px-2 py-1 rounded-full">
              {clothing.shoesEmoji} {clothing.shoes.split(" ")[0]}
            </span>
            <span className="text-xs font-medium bg-card/60 text-card-foreground px-2 py-1 rounded-full">
              {clothing.jacketEmoji} {clothing.jacket.split(" ")[0]}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded View */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-border space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-bold text-foreground mb-2">Kleidungsempfehlung für heute</div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { emoji: clothing.shoesEmoji, label: clothing.shoes, type: "Schuhe" },
                { emoji: clothing.pantsEmoji, label: clothing.pants, type: "Hose" },
                { emoji: clothing.topEmoji, label: clothing.top, type: "Oberteil" },
                { emoji: clothing.jacketEmoji, label: clothing.jacket, type: "Jacke" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card/60 p-3 rounded-xl"
                >
                  <div className="text-2xl mb-1">{item.emoji}</div>
                  <div className="text-xs font-bold text-foreground">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground">{item.type}</div>
                </motion.div>
              ))}
            </div>

            {weatherDetails && (
              <div className="bg-muted/40 p-3 rounded-xl">
                <div className="text-xs font-bold text-foreground mb-2">Wetter-Details</div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>💧 Feuchtigkeit: {weatherDetails.humidity}%</span>
                  <span>💨 Wind: {weatherDetails.windSpeed} km/h</span>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <div className="text-xs font-bold text-foreground">Standort</div>
              {locationError && <p className="text-xs text-destructive">{locationError}</p>}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleUseMyLocation} disabled={isLoadingLocation}>
                  {isLoadingLocation ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                  Aktuellen Standort
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowManualLocation(!showManualLocation)}>
                  Ort manuell eingeben
                </Button>
              </div>
              {showManualLocation && (
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    placeholder="z. B. Berlin, München"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                  <Button size="sm" onClick={handleManualCitySubmit} disabled={!manualCity.trim() || isLoadingLocation}>
                    Übernehmen
                  </Button>
                </div>
              )}
            </div>

            <div className="text-[10px] text-center text-muted-foreground">
              Empfehlung für 8 Stunden Schultag (8:00 - 16:00)
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
