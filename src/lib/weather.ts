// Wetter über Open-Meteo: kostenlos und ohne API-Schlüssel.
// Den Ort änderst du über JARVIS_WEATHER_* in .env.local, Standard ist Deggendorf.

export type WeatherSnapshot = {
  source: "live" | "demo";
  place: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windKmh: number;
  description: string;
  days: WeatherDay[];
};

export type WeatherDay = { date: string; max: number; min: number; rain: number; description: string };

const PLACE = process.env.JARVIS_WEATHER_PLACE ?? "Deggendorf";
const LAT = process.env.JARVIS_WEATHER_LAT ?? "48.84";
const LON = process.env.JARVIS_WEATHER_LON ?? "12.96";

type OpenMeteo = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
  };
};

// WMO-Wettercodes, wie Open-Meteo sie liefert.
export function describeWeather(code: number): string {
  if (code === 0) return "klarer Himmel";
  if (code <= 2) return "teils bewölkt";
  if (code === 3) return "bedeckt";
  if (code <= 48) return "Nebel";
  if (code <= 57) return "Nieselregen";
  if (code <= 67) return "Regen";
  if (code <= 77) return "Schnee";
  if (code <= 82) return "Regenschauer";
  if (code <= 86) return "Schneeschauer";
  return "Gewitter";
}

export async function getWeather(): Promise<WeatherSnapshot> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code" +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=4" +
      "&timezone=Europe%2FBerlin";
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Open-Meteo antwortet mit ${res.status}`);
    const { current, daily } = (await res.json()) as OpenMeteo;
    return {
      source: "live",
      place: PLACE,
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windKmh: current.wind_speed_10m,
      description: describeWeather(current.weather_code),
      days: daily.time.map((date, i) => ({
        date,
        max: daily.temperature_2m_max[i],
        min: daily.temperature_2m_min[i],
        rain: daily.precipitation_probability_max[i] ?? 0,
        description: describeWeather(daily.weather_code[i]),
      })),
    };
  } catch {
    const today = new Date();
    const day = (offset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    return {
      source: "demo",
      place: PLACE,
      temperature: 11,
      feelsLike: 9,
      humidity: 78,
      windKmh: 14,
      description: "teils bewölkt",
      days: [
        { date: day(0), max: 13, min: 6, rain: 20, description: "teils bewölkt" },
        { date: day(1), max: 11, min: 5, rain: 60, description: "Regen" },
        { date: day(2), max: 14, min: 4, rain: 10, description: "klarer Himmel" },
        { date: day(3), max: 12, min: 6, rain: 30, description: "bedeckt" },
      ],
    };
  }
}
