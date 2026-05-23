import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import haulierService from '../../api/haulierService';

/* ─── Types ────────────────────────────────────────────────────────────────────── */

interface LocationEntry {
  id:      string;
  type:    'pickup' | 'stop' | 'drop';
  address: string;
  lat?:    number;
  lng?:    number;
}

export interface RouteStepData {
  pickupAddress: string;
  pickupLat?:    number;
  pickupLng?:    number;
  dropAddress:   string;
  dropLat?:      number;
  dropLng?:      number;
  stops: Array<{ id: string; address: string; lat?: number; lng?: number }>;
  distanceKm?:  number;
  durationMin?: number;
}

interface Props {
  onChange: (data: RouteStepData) => void;
}

interface Suggestion {
  description: string;
  placeId:     string;
  isGoogle?:   boolean;
  lat?:        number | null;
  lng?:        number | null;
}

/* ─── Constants ────────────────────────────────────────────────────────────────── */

const DEFAULT_CENTER: [number, number] = [54.5, -3.0]; // UK centre

/* ─── Helpers ──────────────────────────────────────────────────────────────────── */

function fmtDistance(km: number) { return `${km.toFixed(1)} km`; }
function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

function makeIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2px solid white;"><span style="color:white;font-size:11px;font-weight:900;font-family:sans-serif;line-height:1;">${label}</span></div>`,
    iconSize:   [30, 30],
    iconAnchor: [15, 15],
  });
}

/* ─── MapFitter: fits bounds when route changes ────────────────────────────────── */

function MapFitter({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length >= 2) {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 14 });
    }
  }, [coords, map]);
  return null;
}

/* ─── Component ────────────────────────────────────────────────────────────────── */

export default function RouteMapStep({ onChange }: Props) {
  const [locations, setLocations] = useState<LocationEntry[]>([
    { id: 'pickup', type: 'pickup', address: '' },
    { id: 'drop',   type: 'drop',   address: '' },
  ]);
  const [inputValues,  setInputValues]  = useState<Record<string, string>>({ pickup: '', drop: '' });
  const [suggestions,  setSuggestions]  = useState<Record<string, Suggestion[]>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [routeCoords,  setRouteCoords]  = useState<[number, number][]>([]);
  const [routeStats,   setRouteStats]   = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [loadingId,    setLoadingId]    = useState<string | null>(null);

  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /* ── emit change upward ── */
  const emitChange = useCallback((locs: LocationEntry[], stats: typeof routeStats) => {
    const pickup = locs[0];
    const drop   = locs[locs.length - 1];
    onChange({
      pickupAddress: pickup.address,
      pickupLat:     pickup.lat,
      pickupLng:     pickup.lng,
      dropAddress:   drop.address,
      dropLat:       drop.lat,
      dropLng:       drop.lng,
      stops: locs.slice(1, -1)
        .filter(l => l.address)
        .map(l => ({ id: l.id, address: l.address, lat: l.lat, lng: l.lng })),
      distanceKm:  stats?.distanceKm,
      durationMin: stats?.durationMin,
    });
  }, [onChange]);

  /* ── fetch route polyline + stats (threads through all stops) ── */
  const refreshRoute = useCallback(async (locs: LocationEntry[]) => {
    const pickup = locs[0];
    const drop   = locs[locs.length - 1];
    if (!pickup.lat || !pickup.lng || !drop.lat || !drop.lng) {
      setRouteCoords([]);
      setRouteStats(null);
      emitChange(locs, null);
      return;
    }

    // Collect stops that have been geocoded
    const stopWaypoints = locs.slice(1, -1)
      .filter(l => l.lat != null && l.lng != null)
      .map(l => ({ lat: l.lat!, lng: l.lng! }));

    try {
      const [routeRes, statsRes] = await Promise.all([
        haulierService.getRoute(
          pickup.lat, pickup.lng,
          drop.lat,   drop.lng,
          stopWaypoints.length ? stopWaypoints : undefined,
        ),
        haulierService.calculateRoute({
          originLat: pickup.lat, originLng: pickup.lng,
          destLat:   drop.lat,   destLng:   drop.lng,
          waypoints: stopWaypoints,
        }),
      ]);
      const coords: [number, number][] = (routeRes.coordinates ?? []).map(
        (c: { latitude: number; longitude: number }) => [c.latitude, c.longitude] as [number, number],
      );
      setRouteCoords(coords);
      const stats = { distanceKm: statsRes.distanceKm, durationMin: statsRes.durationMin };
      setRouteStats(stats);
      emitChange(locs, stats);
    } catch {
      setRouteCoords([]);
      setRouteStats(null);
      emitChange(locs, null);
    }
  }, [emitChange]);

  /* ── autocomplete input change ── */
  const handleInputChange = useCallback((id: string, value: string) => {
    setInputValues(prev => ({ ...prev, [id]: value }));
    setLocations(prev => prev.map(l => l.id === id ? { ...l, address: value, lat: undefined, lng: undefined } : l));
    setSuggestions(prev => ({ ...prev, [id]: [] }));

    if (debounceRefs.current[id]) clearTimeout(debounceRefs.current[id]);
    if (value.length < 3) { setOpenDropdown(null); return; }

    debounceRefs.current[id] = setTimeout(async () => {
      try {
        const res = await haulierService.addressAutocomplete(value);
        setSuggestions(prev => ({ ...prev, [id]: res.predictions ?? [] }));
        setOpenDropdown(id);
      } catch { /* ignore */ }
    }, 350);
  }, []);

  /* ── resolve address to lat/lng (shared by selection + blur) ── */
  const geocodeAndSet = useCallback(async (
    id: string,
    addressText: string,
    opts?: { placeId?: string; isGoogle?: boolean; lat?: number | null; lng?: number | null },
  ) => {
    if (!addressText.trim()) return;
    setLoadingId(id);
    try {
      let lat: number, lng: number, address: string;

      if (opts?.lat != null && opts?.lng != null) {
        // Photon result already has coords — no extra network call needed
        lat = opts.lat;
        lng = opts.lng;
        address = addressText;
      } else if (opts?.placeId && opts?.isGoogle) {
        // Google suggestion — use Place Details for exact building/street name
        const geo = await haulierService.getPlaceDetails(opts.placeId);
        lat = geo.lat; lng = geo.lng; address = geo.formattedAddress ?? addressText;
      } else {
        // Freeform typed text — geocode via backend
        const geo = await haulierService.validateAddress(addressText);
        lat = geo.lat; lng = geo.lng; address = geo.formattedAddress ?? addressText;
      }

      setLocations(prev => {
        const next = prev.map(l => l.id === id ? { ...l, address, lat, lng } : l);
        refreshRoute(next);
        return next;
      });
      setInputValues(prev => ({ ...prev, [id]: address }));
    } catch { /* ignore */ }
    finally { setLoadingId(null); }
  }, [refreshRoute]);

  /* ── suggestion selected ── */
  const handleSuggestionSelect = useCallback((id: string, s: Suggestion) => {
    setOpenDropdown(null);
    geocodeAndSet(id, s.description, { placeId: s.placeId, isGoogle: s.isGoogle, lat: s.lat, lng: s.lng });
  }, [geocodeAndSet]);

  /* ── blur: auto-geocode typed text if no coords yet ── */
  const handleInputBlur = useCallback((id: string) => {
    setTimeout(() => setOpenDropdown(null), 180);
    const loc = locations.find(l => l.id === id);
    const text = inputValues[id] ?? '';
    if (!loc?.lat && text.trim().length >= 3) {
      geocodeAndSet(id, text, {});
    }
  }, [locations, inputValues, geocodeAndSet]);

  /* ── add / remove stops ── */
  const addStop = useCallback(() => {
    const id = `stop-${Date.now()}`;
    setLocations(prev => {
      const stop: LocationEntry = { id, type: 'stop', address: '' };
      return [...prev.slice(0, -1), stop, prev[prev.length - 1]];
    });
    setInputValues(prev => ({ ...prev, [id]: '' }));
  }, []);

  const removeStop = useCallback((id: string) => {
    setLocations(prev => {
      const next = prev.filter(l => l.id !== id);
      refreshRoute(next);
      return next;
    });
    setInputValues(prev => { const n = { ...prev }; delete n[id]; return n; });
    setSuggestions(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, [refreshRoute]);

  /* ── stop ordinal helper ── */
  const stopOrdinal = (locs: LocationEntry[], idx: number) =>
    locs.slice(0, idx).filter(l => l.type === 'stop').length + 1;

  /* ── markers ── */
  const markers = locations
    .filter(l => l.lat && l.lng)
    .map(l => {
      const idx = locations.indexOf(l);
      const color = l.type === 'pickup' ? '#1066b1' : l.type === 'drop' ? '#ef4444' : '#f59e0b';
      const label = l.type === 'pickup' ? '▲' : l.type === 'drop' ? '■' : String(stopOrdinal(locations, idx));
      return { key: l.id, lat: l.lat!, lng: l.lng!, color, label };
    });

  /* ── render ── */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] overflow-hidden rounded-xl border border-slate-200 shadow-sm">

      {/* ─── Left panel ─────────────────────────────────────────────── */}
      <div className="bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">

        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Route Planner</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Search for each location</p>
        </div>

        {/* Location inputs */}
        <div className="px-5 py-4 flex-1 overflow-y-auto space-y-1">
          <div className="relative">
            <div className="absolute left-[17px] z-0 w-0.5 bg-slate-200" style={{ top: '36px', bottom: '36px' }} />
            <div className="space-y-2 relative z-10">
              {locations.map((loc, idx) => {
                const isPickup = loc.type === 'pickup';
                const isDrop   = loc.type === 'drop';
                const ord      = loc.type === 'stop' ? stopOrdinal(locations, idx) : 0;

                return (
                  <div key={loc.id} className="flex items-center gap-3">
                    {/* Icon dot */}
                    <div className={`w-[34px] h-[34px] rounded-full shrink-0 flex items-center justify-center shadow-sm ${
                      isPickup ? 'bg-[#1066b1]' : isDrop ? 'bg-red-500' : 'bg-amber-400'
                    }`}>
                      {isPickup && <span className="material-symbols-outlined text-white text-sm">my_location</span>}
                      {isDrop   && <span className="material-symbols-outlined text-white text-sm">flag</span>}
                      {loc.type === 'stop' && <span className="text-white text-xs font-black">{ord}</span>}
                    </div>

                    {/* Input + suggestions */}
                    <div className="flex-1 min-w-0 relative">
                      <input
                        className={`w-full border rounded-xl py-2.5 px-3 text-sm outline-none transition-all placeholder:text-slate-400 ${
                          loc.lat
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold'
                            : 'border-slate-200 bg-white text-[#041627] focus:border-[#1066b1] focus:ring-2 focus:ring-[#1066b1]/20'
                        }`}
                        placeholder={isPickup ? 'Pickup location…' : isDrop ? 'Drop-off location…' : `Stop ${ord}…`}
                        value={inputValues[loc.id] ?? ''}
                        onChange={e => handleInputChange(loc.id, e.target.value)}
                        onFocus={() => (suggestions[loc.id]?.length ?? 0) > 0 && setOpenDropdown(loc.id)}
                        onBlur={() => handleInputBlur(loc.id)}
                        autoComplete="off"
                      />

                      {/* Spinner while geocoding */}
                      {loadingId === loc.id && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <span className="material-symbols-outlined text-slate-400 text-base animate-spin">progress_activity</span>
                        </div>
                      )}

                      {/* Suggestions dropdown */}
                      {openDropdown === loc.id && (suggestions[loc.id]?.length ?? 0) > 0 && (
                        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {suggestions[loc.id].map((s, i) => (
                            <li
                              key={i}
                              className="px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-[#1066b1] cursor-pointer flex items-center gap-2"
                              onMouseDown={() => handleSuggestionSelect(loc.id, s)}
                            >
                              <span className="material-symbols-outlined text-slate-400 text-sm">location_on</span>
                              <span className="truncate">{s.description}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Remove button (stops only) */}
                    {loc.type === 'stop' && (
                      <button
                        type="button"
                        onClick={() => removeStop(loc.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        title="Remove stop"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Stop button */}
          <button
            type="button"
            onClick={addStop}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm font-bold text-slate-400 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50 transition-all"
          >
            <span className="material-symbols-outlined text-base">add_location_alt</span>
            Add Stop
          </button>
        </div>

        {/* Route stats */}
        {routeStats && (
          <div className="px-5 pb-5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Distance</p>
              <p className="text-xl font-black text-blue-700 mt-0.5">{fmtDistance(routeStats.distanceKm)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Time</p>
              <p className="text-xl font-black text-slate-700 mt-0.5">{fmtDuration(routeStats.durationMin)}</p>
            </div>
            {locations.filter(l => l.type === 'stop').length > 0 && (
              <div className="col-span-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-sm">add_location_alt</span>
                <p className="text-xs font-bold text-amber-700">
                  {locations.filter(l => l.type === 'stop').length} stop{locations.filter(l => l.type === 'stop').length > 1 ? 's' : ''} via waypoints
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Right panel: map ─────────────────────────────────────────── */}
      <div className="h-[420px] lg:h-auto relative min-h-[420px]">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={6}
          style={{ width: '100%', height: '100%' }}
          zoomControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {routeCoords.length > 1 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: '#1066b1', weight: 5, opacity: 0.85 }}
            />
          )}
          {markers.map(m => (
            <Marker
              key={m.key}
              position={[m.lat, m.lng]}
              icon={makeIcon(m.color, m.label)}
            />
          ))}
          {routeCoords.length > 1 && <MapFitter coords={routeCoords} />}
        </MapContainer>

        {/* Hint overlay when map is empty */}
        {routeCoords.length === 0 && (
          <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1066b1] text-base">info</span>
              <p className="text-xs font-semibold text-slate-600">
                Select pickup &amp; drop-off to see the route
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
