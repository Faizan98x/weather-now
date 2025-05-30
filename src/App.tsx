import React, { useState, useEffect } from "react";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  Eye,
  Thermometer,
  MapPin,
  Loader,
} from "lucide-react";

// Type definitions for OpenWeatherMap API
interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface MainWeatherData {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
}

interface WindData {
  speed: number;
  deg: number;
}

interface WeatherData {
  id: number;
  name: string;
  coord: {
    lon: number;
    lat: number;
  };
  weather: WeatherCondition[];
  main: MainWeatherData;
  visibility: number;
  wind: WindData;
  dt: number;
}

interface ForecastItem {
  dt: number;
  main: MainWeatherData;
  weather: WeatherCondition[];
  wind: WindData;
  visibility: number;
  dt_txt: string;
}

interface ForecastData {
  list: ForecastItem[];
}

const App: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [currentLocation, setCurrentLocation] =
    useState<string>("Kuala Lumpur");

  // API key - move this to .env file in production: REACT_APP_WEATHER_API_KEY
  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
  const BASE_URL = "https://api.openweathermap.org/data/2.5";

  const getWeatherIcon = (
    weatherMain: string,
    size: string = "w-8 h-8"
  ): React.ReactElement => {
    switch (weatherMain?.toLowerCase()) {
      case "clear":
        return <Sun className={`${size} text-yellow-500`} />;
      case "clouds":
        return <Cloud className={`${size} text-gray-500`} />;
      case "rain":
        return <CloudRain className={`${size} text-blue-500`} />;
      case "snow":
        return <CloudSnow className={`${size} text-blue-200`} />;
      case "thunderstorm":
        return <CloudRain className={`${size} text-purple-600`} />;
      default:
        return <Sun className={`${size} text-yellow-500`} />;
    }
  };

  const fetchWeatherData = async (
    cityName: string = currentLocation
  ): Promise<void> => {
    setLoading(true);
    setError("");

    try {
      // Get current weather
      const weatherUrl = `${BASE_URL}/weather?q=${encodeURIComponent(
        cityName
      )}&appid=${API_KEY}&units=metric`;
      const weatherResponse = await fetch(weatherUrl);

      if (!weatherResponse.ok) {
        throw new Error(`Weather data not found for "${cityName}"`);
      }

      const weatherResult: WeatherData = await weatherResponse.json();

      // Get 5-day forecast (we'll use first 4 days)
      const forecastUrl = `${BASE_URL}/forecast?q=${encodeURIComponent(
        cityName
      )}&appid=${API_KEY}&units=metric`;
      const forecastResponse = await fetch(forecastUrl);

      if (!forecastResponse.ok) {
        throw new Error("Failed to fetch forecast data");
      }

      const forecastResult: ForecastData = await forecastResponse.json();

      // Process forecast data to get daily forecasts (one per day)
      const dailyForecasts: ForecastItem[] = [];
      const processedDates = new Set<string>();

      forecastResult.list.forEach((item: ForecastItem) => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!processedDates.has(date) && dailyForecasts.length < 4) {
          dailyForecasts.push(item);
          processedDates.add(date);
        }
      });

      setWeatherData(weatherResult);
      setForecastData({ list: dailyForecasts });
      setCurrentLocation(weatherResult.name);
    } catch (err) {
      console.error("Weather API Error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch weather data. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (city.trim()) {
      fetchWeatherData(city.trim());
      setCity("");
    }
  };

  const getCurrentLocation = (): void => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position: GeolocationPosition) => {
          try {
            const { latitude, longitude } = position.coords;

            // Get weather by coordinates
            const weatherUrl = `${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`;
            const weatherResponse = await fetch(weatherUrl);

            if (!weatherResponse.ok) {
              throw new Error("Failed to fetch weather for current location");
            }

            const weatherResult: WeatherData = await weatherResponse.json();

            // Get forecast by coordinates
            const forecastUrl = `${BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`;
            const forecastResponse = await fetch(forecastUrl);

            if (!forecastResponse.ok) {
              throw new Error("Failed to fetch forecast for current location");
            }

            const forecastResult: ForecastData = await forecastResponse.json();

            // Process forecast data
            const dailyForecasts: ForecastItem[] = [];
            const processedDates = new Set<string>();

            forecastResult.list.forEach((item: ForecastItem) => {
              const date = new Date(item.dt * 1000).toDateString();
              if (!processedDates.has(date) && dailyForecasts.length < 4) {
                dailyForecasts.push(item);
                processedDates.add(date);
              }
            });

            setWeatherData(weatherResult);
            setForecastData({ list: dailyForecasts });
            setCurrentLocation(weatherResult.name);
            setLoading(false);
          } catch (err) {
            console.error("Location weather error:", err);
            setError(
              "Failed to get weather for current location. Showing default location."
            );
            fetchWeatherData("Kuala Lumpur");
          }
        },
        (err: GeolocationPositionError) => {
          console.error("Geolocation error:", err);
          setError("Unable to get your location. Showing default location.");
          fetchWeatherData("Kuala Lumpur");
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
      fetchWeatherData("Kuala Lumpur");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    fetchWeatherData();
  }, []);

  const backgroundGradient =
    weatherData?.weather[0]?.main?.toLowerCase() === "clear"
      ? "from-blue-400 via-blue-500 to-blue-600"
      : weatherData?.weather[0]?.main?.toLowerCase() === "rain"
      ? "from-gray-600 via-gray-700 to-gray-800"
      : "from-blue-500 via-blue-600 to-blue-700";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${backgroundGradient} p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Weather Now
          </h1>
          <p className="text-blue-100">Real-time weather information</p>
        </div>

        {/* Search */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 w-5 h-5" />
              <input
                type="text"
                value={city}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCity(e.target.value)
                }
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === "Enter" && handleSearch()
                }
                placeholder="Enter city name..."
                className="w-full pl-12 pr-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <button
              onClick={getCurrentLocation}
              disabled={loading}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl text-white transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
              title="Get current location weather"
            >
              <MapPin className="w-5 h-5" />
              <span className="hidden sm:inline">Current Location</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-white">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 text-white animate-spin" />
            <span className="ml-3 text-white text-lg">
              Loading weather data...
            </span>
          </div>
        ) : weatherData ? (
          <>
            {/* Current Weather */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">
                    {weatherData.name}
                  </h2>
                  <p className="text-blue-100 capitalize">
                    {weatherData.weather[0].description}
                  </p>
                </div>
                {getWeatherIcon(weatherData.weather[0].main, "w-16 h-16")}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-6xl font-bold text-white mb-2">
                    {Math.round(weatherData.main.temp)}°C
                  </div>
                  <div className="text-blue-100">
                    Feels like {Math.round(weatherData.main.feels_like)}°C
                  </div>
                </div>

                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="flex items-center mb-2">
                      <Droplets className="w-5 h-5 text-blue-300 mr-2" />
                      <span className="text-blue-100">Humidity</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {weatherData.main.humidity}%
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="flex items-center mb-2">
                      <Wind className="w-5 h-5 text-blue-300 mr-2" />
                      <span className="text-blue-100">Wind</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {weatherData.wind.speed} m/s
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="flex items-center mb-2">
                      <Thermometer className="w-5 h-5 text-blue-300 mr-2" />
                      <span className="text-blue-100">Pressure</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {weatherData.main.pressure} hPa
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="flex items-center mb-2">
                      <Eye className="w-5 h-5 text-blue-300 mr-2" />
                      <span className="text-blue-100">Visibility</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {weatherData.visibility / 1000} km
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Day Forecast */}
            {forecastData && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <h3 className="text-2xl font-bold text-white mb-6">
                  4-Day Forecast
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {forecastData.list.map(
                    (item: ForecastItem, index: number) => (
                      <div
                        key={index}
                        className="bg-white/10 rounded-xl p-4 text-center"
                      >
                        <div className="text-white font-semibold mb-3">
                          {formatDate(item.dt)}
                        </div>
                        <div className="flex justify-center mb-3">
                          {getWeatherIcon(item.weather[0].main, "w-8 h-8")}
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">
                          {Math.round(item.main.temp)}°C
                        </div>
                        <div className="text-blue-100 text-sm capitalize mb-2">
                          {item.weather[0].description}
                        </div>
                        <div className="flex justify-between text-xs text-blue-200">
                          <span>💧 {item.main.humidity}%</span>
                          <span>💨 {item.wind.speed} m/s</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-blue-100 text-sm">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
          <h6 className="text-blue-100 text-base mt-4">
            Developed By{" "}
            <a className="text-blue-400 hover:underline text-xl"
              href="https://faizan98x.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Muhammad Faizan Ur Rehman 
            </a>
          </h6>
        </div>
      </div>
    </div>
  );
};

export default App;
