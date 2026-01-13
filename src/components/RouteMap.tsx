import { useEffect, useMemo, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { surxondaryoRegion } from '@/data/regions';
import { districtCoordinates, getTravelTime, getDistance } from '@/data/districtCoordinates';
import { Clock, Navigation, MapPin } from 'lucide-react';

interface RouteMapProps {
  fromId: string;
  toId: string;
  className?: string;
}

const RouteMap = ({ fromId, toId, className = '' }: RouteMapProps) => {
  const { language } = useLanguage();
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  
  const fromCoords = districtCoordinates[fromId];
  const toCoords = districtCoordinates[toId];
  
  const getDistrictName = (districtId: string) => {
    const district = surxondaryoRegion.districts.find(d => d.id === districtId);
    return district ? district.name[language] : districtId;
  };
  
  const travelTime = useMemo(() => getTravelTime(fromId, toId), [fromId, toId]);
  const distance = useMemo(() => getDistance(fromId, toId), [fromId, toId]);
  
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return language === 'uz-latin' ? `${minutes} daqiqa` : `${minutes} дақиқа`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (language === 'uz-latin') {
      return mins > 0 ? `${hours} soat ${mins} daqiqa` : `${hours} soat`;
    }
    return mins > 0 ? `${hours} соат ${mins} дақиқа` : `${hours} соат`;
  };

  // Initialize map using vanilla Leaflet (avoiding react-leaflet context issues)
  useEffect(() => {
    if (!fromCoords || !toCoords || !mapRef.current) return;
    
    let mounted = true;
    
    const initMap = async () => {
      try {
        // Dynamically import Leaflet
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');
        
        if (!mounted || !mapRef.current) return;
        
        // Clean up existing map
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }
        
        // Fix for default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
        
        const fromLatLng: [number, number] = [fromCoords.lat, fromCoords.lng];
        const toLatLng: [number, number] = [toCoords.lat, toCoords.lng];
        
        // Calculate center
        const center: [number, number] = [
          (fromCoords.lat + toCoords.lat) / 2,
          (fromCoords.lng + toCoords.lng) / 2,
        ];
        
        // Create map
        const map = L.map(mapRef.current, {
          center,
          zoom: 9,
          scrollWheelZoom: false,
        });
        
        leafletMapRef.current = map;
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        
        // Create custom icons
        const createIcon = (color: string) => L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: 24px;
            height: 24px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12],
        });
        
        const startIcon = createIcon('#22c55e');
        const endIcon = createIcon('#ef4444');
        
        // Markers only - no route line
        
        // Add markers
        L.marker(fromLatLng, { icon: startIcon })
          .bindPopup(`<div class="text-center"><strong>${getDistrictName(fromId)}</strong><br/><span class="text-sm">${language === 'uz-latin' ? "Boshlang'ich nuqta" : 'Бошланғич нуқта'}</span></div>`)
          .addTo(map);
        
        L.marker(toLatLng, { icon: endIcon })
          .bindPopup(`<div class="text-center"><strong>${getDistrictName(toId)}</strong><br/><span class="text-sm">${language === 'uz-latin' ? 'Oxirgi nuqta' : 'Охирги нуқта'}</span></div>`)
          .addTo(map);
        
        // Fit bounds
        const bounds = L.latLngBounds([fromLatLng, toLatLng]);
        map.fitBounds(bounds, { padding: [50, 50] });
        
        setMapLoaded(true);
      } catch (error) {
        console.error('Failed to load map:', error);
      }
    };
    
    initMap();
    
    return () => {
      mounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [fromId, toId, fromCoords, toCoords, language]);
  
  if (!fromCoords || !toCoords) {
    return null;
  }
  
  return (
    <div className={`rounded-lg overflow-hidden border border-border ${className}`}>
      {/* Route info bar */}
      <div className="bg-card p-3 border-b border-border flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-sm font-medium text-foreground">{getDistrictName(fromId)}</span>
        </div>
        <span className="text-muted-foreground">→</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-sm font-medium text-foreground">{getDistrictName(toId)}</span>
        </div>
        <div className="flex-1" />
        {distance && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Navigation className="w-4 h-4" />
            <span>~{distance} km</span>
          </div>
        )}
        {travelTime && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>~{formatTime(travelTime)}</span>
          </div>
        )}
      </div>
      
      {/* Map container */}
      <div className="h-64 md:h-80 relative">
        {!mapLoaded && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
            <div className="text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 animate-pulse" />
              <p className="text-sm">{language === 'uz-latin' ? 'Xarita yuklanmoqda...' : 'Харита юкланмоқда...'}</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default RouteMap;