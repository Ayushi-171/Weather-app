import { useState, useCallback } from 'react';
import './App.css';

// ✅ Define API_KEY FIRST, then check it
const API_KEY = process.env.REACT_APP_WEATHER_API_KEY;

if (!API_KEY) {
  console.error('❌ REACT_APP_WEATHER_API_KEY is missing from your .env file');
}

const weatherThemes = {
  Clear:       { bg: 'from-[#f7b733] to-[#fc4a1a]',   card: 'bg-white/20', emoji: '☀️'  },
  Clouds:      { bg: 'from-[#636fa4] to-[#e8cbc0]',   card: 'bg-white/20', emoji: '☁️'  },
  Rain:        { bg: 'from-[#1e3c72] to-[#2a5298]',   card: 'bg-white/10', emoji: '🌧️' },
  Drizzle:     { bg: 'from-[#3a7bd5] to-[#3a6073]',   card: 'bg-white/10', emoji: '🌦️' },
  Thunderstorm:{ bg: 'from-[#0f0c29] to-[#302b63]',   card: 'bg-white/10', emoji: '⛈️' },
  Snow:        { bg: 'from-[#e0eafc] to-[#cfdef3]',   card: 'bg-white/30', emoji: '❄️'  },
  Mist:        { bg: 'from-[#606c88] to-[#3f4c6b]',   card: 'bg-white/10', emoji: '🌫️' },
  default:     { bg: 'from-[#4aacb1] to-[#1d4a6b]',   card: 'bg-white/20', emoji: '🌡️' },
};

// ─── Helper: filter forecast to one reading per day ───────────────────────────
function getDailyForecast(list) {
  // Prefer noon readings; fall back to every 8th slot if timezone has no noon
  const noon = list.filter((item) => new Date(item.dt * 1000).getHours() === 12).slice(0, 5);
  return noon.length > 0 ? noon : list.filter((_, i) => i % 8 === 0).slice(0, 5);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value }) {
  return (
    <div className="bg-white/10 rounded-2xl p-3 text-center">
      <p className="text-white/60 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-white font-bold text-lg mt-0.5">{value}</p>
    </div>
  );
}

function WeatherCard({ data, unit, onToggleUnit }) {
  const toDisplay = (celsius) =>
    unit === 'C' ? Math.round(celsius) : Math.round((celsius * 9) / 5 + 32);

  const condition = data.weather[0].main;
  const theme = weatherThemes[condition] || weatherThemes.default;

  return (
    <div className={`rounded-3xl ${theme.card} backdrop-blur-md border border-white/30 p-8 text-white shadow-2xl`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-white/70 text-sm uppercase tracking-widest font-medium">Current Weather</p>
          <h2 className="text-4xl font-bold mt-1">
            {data.name}, <span className="text-white/80">{data.sys.country}</span>
          </h2>
          <p className="capitalize text-white/80 text-lg mt-1">{data.weather[0].description}</p>
        </div>
        <span className="text-6xl">{theme.emoji}</span>
      </div>

      <div className="flex items-end gap-4 mt-6">
        <span className="text-8xl font-bold leading-none">{toDisplay(data.main.temp)}°</span>
        <button
          onClick={onToggleUnit}
          className="mb-3 text-white/70 hover:text-white border border-white/40 hover:border-white/80 rounded-full px-3 py-1 text-sm transition-all"
        >
          Switch to °{unit === 'C' ? 'F' : 'C'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6">
        <StatPill label="Feels Like" value={`${toDisplay(data.main.feels_like)}°${unit}`} />
        <StatPill label="Humidity"   value={`${data.main.humidity}%`} />
        <StatPill label="Wind"       value={`${Math.round(data.wind.speed)} m/s`} />
      </div>
    </div>
  );
}

function ForecastCard({ item, unit }) {
  const day     = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
  const temp    = unit === 'C' ? Math.round(item.main.temp) : Math.round((item.main.temp * 9) / 5 + 32);
  const theme   = weatherThemes[item.weather[0].main] || weatherThemes.default;

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-white text-center flex-1 min-w-[80px]">
      <p className="text-white/60 text-xs font-medium uppercase">{day}</p>
      <span className="text-3xl my-2 block">{theme.emoji}</span>
      <p className="font-bold">{temp}°{unit}</p>
      <p className="text-white/60 text-xs mt-1 capitalize">{item.weather[0].description}</p>
    </div>
  );
}

function SearchHistory({ history, onSelect, onClear }) {
  if (history.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/60 text-xs uppercase tracking-widest">Recent</p>
        <button onClick={onClear} className="text-white/40 hover:text-white/70 text-xs transition-colors">
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.map((city) => (
          <button
            key={city}
            onClick={() => onSelect(city)}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm rounded-full px-3 py-1 transition-all"
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [city,      setCity]      = useState('');
  const [wDetails,  setWDetails]  = useState(null);
  const [forecast,  setForecast]  = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);
  const [unit,      setUnit]      = useState('C');
  const [history,   setHistory]   = useState(() => {
    try   { return JSON.parse(localStorage.getItem('weatherHistory')) || []; }
    catch { return []; }
  });

  const theme = weatherThemes[wDetails?.weather[0]?.main] || weatherThemes.default;

  // ✅ Functional setState — never reads stale `history`
  const saveHistory = useCallback((cityName) => {
    setHistory((prev) => {
      const updated = [cityName, ...prev.filter((c) => c !== cityName)].slice(0, 5);
      localStorage.setItem('weatherHistory', JSON.stringify(updated));
      return updated;
    });
  }, []); // empty deps is correct here

  // ✅ saveHistory in deps (not `history`), no stale closure
  const fetchWeather = useCallback(async (searchCity) => {
    if (!searchCity.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const [weatherRes, forecastRes] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${searchCity}&appid=${API_KEY}&units=metric`),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${searchCity}&appid=${API_KEY}&units=metric&cnt=40`),
      ]);

      if (!weatherRes.ok) {
        throw new Error(
          weatherRes.status === 404
            ? `"${searchCity}" not found. Check the spelling.`
            : 'Something went wrong. Try again.'
        );
      }

      // ✅ Both variables defined INSIDE try — used INSIDE try
      const weatherData  = await weatherRes.json();
      const forecastData = await forecastRes.json();

      setWDetails(weatherData);
      setForecast(getDailyForecast(forecastData.list));
      saveHistory(weatherData.name); // ✅ inside try, weatherData exists here

    } catch (err) {
      setError(err.message);
      setWDetails(null);
      setForecast([]);
    } finally {
      setIsLoading(false);
      setCity('');
    }
  }, [saveHistory]); // ✅ correct dependency

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchWeather(city);
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const [weatherRes, forecastRes] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&cnt=40`),
          ]);

          if (!weatherRes.ok) throw new Error('Could not fetch weather for your location.');

          // ✅ defined and used inside the same try block
          const weatherData  = await weatherRes.json();
          const forecastData = await forecastRes.json();

          setWDetails(weatherData);
          setForecast(getDailyForecast(forecastData.list));
          saveHistory(weatherData.name);

        } catch (err) {
          setError(err.message || 'Could not fetch weather for your location.');
          setWDetails(null);
          setForecast([]);
        } finally {
          setIsLoading(false);
        }
      },
      () => {
        setError('Location access denied. Search manually.');
        setIsLoading(false);
      }
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg} transition-all duration-700`}>
      <div className="max-w-lg mx-auto px-4 py-12">

        <div className="mb-8">
          <h1 className="text-white text-4xl font-bold tracking-tight">Weather</h1>
          <p className="text-white/60 text-sm mt-1">Real-time conditions anywhere</p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Search city..."
            className="flex-1 bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/50 rounded-2xl px-4 py-3 outline-none focus:border-white/60 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-white text-[#1d4a6b] font-bold rounded-2xl px-5 py-3 hover:bg-white/90 disabled:opacity-50 transition-all"
          >
            {isLoading ? '...' : 'Go'}
          </button>
          <button
            type="button"
            onClick={handleGeolocation}
            disabled={isLoading}
            title="Use my location"
            className="bg-white/20 border border-white/30 text-white rounded-2xl px-4 py-3 hover:bg-white/30 disabled:opacity-50 transition-all"
          >
            📍
          </button>
        </form>

        <SearchHistory
          history={history}
          onSelect={(c) => fetchWeather(c)}
          onClear={() => { setHistory([]); localStorage.removeItem('weatherHistory'); }}
        />

        {error && (
          <div className="mt-6 bg-red-500/20 border border-red-400/40 rounded-2xl p-4 text-white text-sm">
            ⚠️ {error}
          </div>
        )}

        {isLoading && (
          <div className="mt-6 rounded-3xl bg-white/10 border border-white/20 p-8 animate-pulse">
            <div className="h-6 bg-white/20 rounded-full w-1/3 mb-3" />
            <div className="h-10 bg-white/20 rounded-full w-1/2 mb-6" />
            <div className="h-20 bg-white/20 rounded-full w-1/3" />
          </div>
        )}

        {wDetails && !isLoading && (
          <div className="mt-6 space-y-4">
            <WeatherCard
              data={wDetails}
              unit={unit}
              onToggleUnit={() => setUnit(unit === 'C' ? 'F' : 'C')}
            />
            {forecast.length > 0 && (
              <div>
                <p className="text-white/60 text-xs uppercase tracking-widest mb-3">5-Day Forecast</p>
                <div className="flex gap-2">
                  {forecast.map((item) => (
                    <ForecastCard key={item.dt} item={item} unit={unit} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!wDetails && !isLoading && !error && (
          <div className="mt-16 text-center">
            <p className="text-5xl mb-4">🌍</p>
            <p className="text-lg font-medium text-white/70">Search a city or use your location</p>
            <p className="text-sm mt-1 text-white/50">Get real-time weather + 5-day forecast</p>
          </div>
        )}

      </div>
    </div>
  );
}