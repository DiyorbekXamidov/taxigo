import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Search, Loader2, ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

interface LocationPickerProps {
  pickupLocation: LocationData | null;
  dropoffLocation: LocationData | null;
  onPickupChange: (location: LocationData | null) => void;
  onDropoffChange: (location: LocationData | null) => void;
  mode: 'pickup' | 'dropoff';
  setMode: (mode: 'pickup' | 'dropoff') => void;
}

// Reverse geocoding using Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'uz,ru,en'
        }
      }
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Geocoding error:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// Search for address using Nominatim
async function searchAddress(query: string): Promise<{ lat: number; lng: number; display_name: string }[]> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=uz`,
      {
        headers: {
          'Accept-Language': 'uz,ru,en'
        }
      }
    );
    return await response.json();
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

const LocationPicker = ({
  pickupLocation,
  dropoffLocation,
  onPickupChange,
  onDropoffChange,
  mode,
  setMode,
}: LocationPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ lat: number; lng: number; display_name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const dropoffMarkerRef = useRef<any>(null);

  // Default center (Surxondaryo region)
  const defaultCenter: [number, number] = [37.9344, 67.5669];

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    
    let mounted = true;
    
    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        
        if (!mounted || !mapRef.current || leafletMapRef.current) return;
        
        // Fix for default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
        
        const center = pickupLocation 
          ? [pickupLocation.lat, pickupLocation.lng] as [number, number]
          : defaultCenter;
        
        const map = L.map(mapRef.current, {
          center,
          zoom: 13,
        });
        
        leafletMapRef.current = map;
        
        // Use Yandex-style tiles for better Uzbekistan coverage
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        
        // Create custom icons
        const createIcon = (color: string) => L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: 32px;
            height: 32px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });
        
        const pickupIcon = createIcon('#22c55e');
        const dropoffIcon = createIcon('#ef4444');
        
        // Add existing markers if locations exist
        if (pickupLocation) {
          pickupMarkerRef.current = L.marker([pickupLocation.lat, pickupLocation.lng], { icon: pickupIcon })
            .bindPopup('Chiqish nuqtasi')
            .addTo(map);
        }
        
        if (dropoffLocation) {
          dropoffMarkerRef.current = L.marker([dropoffLocation.lat, dropoffLocation.lng], { icon: dropoffIcon })
            .bindPopup('Borish nuqtasi')
            .addTo(map);
        }
        
        // Handle map clicks
        map.on('click', async (e: any) => {
          const { lat, lng } = e.latlng;
          const address = await reverseGeocode(lat, lng);
          
          const location: LocationData = { lat, lng, address };
          
          if (mode === 'pickup') {
            // Remove existing pickup marker
            if (pickupMarkerRef.current) {
              map.removeLayer(pickupMarkerRef.current);
            }
            pickupMarkerRef.current = L.marker([lat, lng], { icon: pickupIcon })
              .bindPopup('Chiqish nuqtasi')
              .addTo(map);
            onPickupChange(location);
          } else {
            // Remove existing dropoff marker
            if (dropoffMarkerRef.current) {
              map.removeLayer(dropoffMarkerRef.current);
            }
            dropoffMarkerRef.current = L.marker([lat, lng], { icon: dropoffIcon })
              .bindPopup('Borish nuqtasi')
              .addTo(map);
            onDropoffChange(location);
          }
        });
        
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
  }, []);
  
  // Update markers when locations change externally
  useEffect(() => {
    const updateMarkers = async () => {
      if (!leafletMapRef.current) return;
      
      const L = (await import('leaflet')).default;
      const map = leafletMapRef.current;
      
      const createIcon = (color: string) => L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 32px;
          height: 32px;
          background-color: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 3px 8px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      
      const pickupIcon = createIcon('#22c55e');
      const dropoffIcon = createIcon('#ef4444');
      
      if (pickupLocation && !pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker([pickupLocation.lat, pickupLocation.lng], { icon: pickupIcon })
          .addTo(map);
        map.flyTo([pickupLocation.lat, pickupLocation.lng], 15);
      }
      
      if (dropoffLocation && !dropoffMarkerRef.current) {
        dropoffMarkerRef.current = L.marker([dropoffLocation.lat, dropoffLocation.lng], { icon: dropoffIcon })
          .addTo(map);
      }
    };
    
    updateMarkers();
  }, [pickupLocation, dropoffLocation]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const results = await searchAddress(searchQuery);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = async (result: { lat: number; lng: number; display_name: string }) => {
    const L = (await import('leaflet')).default;
    const location: LocationData = {
      lat: parseFloat(result.lat.toString()),
      lng: parseFloat(result.lng.toString()),
      address: result.display_name,
    };
    
    const map = leafletMapRef.current;
    if (!map) return;
    
    const createIcon = (color: string) => L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 32px;
        height: 32px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
    
    if (mode === 'pickup') {
      if (pickupMarkerRef.current) {
        map.removeLayer(pickupMarkerRef.current);
      }
      pickupMarkerRef.current = L.marker([location.lat, location.lng], { icon: createIcon('#22c55e') })
        .addTo(map);
      onPickupChange(location);
    } else {
      if (dropoffMarkerRef.current) {
        map.removeLayer(dropoffMarkerRef.current);
      }
      dropoffMarkerRef.current = L.marker([location.lat, location.lng], { icon: createIcon('#ef4444') })
        .addTo(map);
      onDropoffChange(location);
    }
    
    map.flyTo([location.lat, location.lng], 15, { duration: 1 });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Brauzeringiz joylashuvni aniqlay olmaydi");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        
        const L = (await import('leaflet')).default;
        const location: LocationData = {
          lat: latitude,
          lng: longitude,
          address,
        };
        
        const map = leafletMapRef.current;
        if (map) {
          const createIcon = (color: string) => L.divIcon({
            className: 'custom-marker',
            html: `<div style="
              width: 32px;
              height: 32px;
              background-color: ${color};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            "></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });
          
          if (mode === 'pickup') {
            if (pickupMarkerRef.current) {
              map.removeLayer(pickupMarkerRef.current);
            }
            pickupMarkerRef.current = L.marker([latitude, longitude], { icon: createIcon('#22c55e') })
              .addTo(map);
            onPickupChange(location);
          } else {
            if (dropoffMarkerRef.current) {
              map.removeLayer(dropoffMarkerRef.current);
            }
            dropoffMarkerRef.current = L.marker([latitude, longitude], { icon: createIcon('#ef4444') })
              .addTo(map);
            onDropoffChange(location);
          }
          
          map.flyTo([latitude, longitude], 16, { duration: 1 });
        }
        
        setGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert("Joylashuvni aniqlab bo'lmadi. GPS yoqilganligini tekshiring.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openInYandexMaps = (lat: number, lng: number) => {
    window.open(`https://yandex.com/maps/?pt=${lng},${lat}&z=17&l=map`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Mode selection */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'pickup' ? 'default' : 'outline'}
          onClick={() => setMode('pickup')}
          className="flex-1"
          size="sm"
        >
          <MapPin className="w-4 h-4 mr-2 text-green-500" />
          Chiqish nuqtasi
        </Button>
        <Button
          type="button"
          variant={mode === 'dropoff' ? 'default' : 'outline'}
          onClick={() => setMode('dropoff')}
          className="flex-1"
          size="sm"
        >
          <MapPin className="w-4 h-4 mr-2 text-red-500" />
          Borish nuqtasi
        </Button>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Manzilni qidiring..."
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {searchResults.length > 0 && (
            <div className="absolute z-[1000] w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => handleSelectSearchResult(result)}
                >
                  {result.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="button" variant="outline" size="icon" onClick={handleSearch} disabled={searching}>
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={handleGetCurrentLocation} disabled={gettingLocation}>
          {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
        </Button>
      </div>

      {/* Map */}
      <div className="h-64 rounded-lg overflow-hidden border border-border relative">
        {!mapLoaded && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
            <div className="text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 animate-pulse" />
              <p className="text-sm">Xarita yuklanmoqda...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="h-full w-full" />
      </div>

      {/* Selected locations display */}
      <div className="space-y-2 text-sm">
        {pickupLocation && (
          <div className="flex items-start justify-between gap-2 p-2 bg-green-500/10 rounded-md">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-medium text-green-600">Chiqish:</span>
                <p className="text-muted-foreground text-xs truncate">{pickupLocation.address}</p>
              </div>
            </div>
            <Button 
              type="button"
              size="sm" 
              variant="ghost" 
              className="h-7 px-2 flex-shrink-0"
              onClick={() => openInYandexMaps(pickupLocation.lat, pickupLocation.lng)}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        )}
        {dropoffLocation && (
          <div className="flex items-start justify-between gap-2 p-2 bg-red-500/10 rounded-md">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-medium text-red-600">Borish:</span>
                <p className="text-muted-foreground text-xs truncate">{dropoffLocation.address}</p>
              </div>
            </div>
            <Button 
              type="button"
              size="sm" 
              variant="ghost" 
              className="h-7 px-2 flex-shrink-0"
              onClick={() => openInYandexMaps(dropoffLocation.lat, dropoffLocation.lng)}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground text-center">
        📍 Xaritada bosing yoki GPS tugmasini bosing
      </p>
    </div>
  );
};

export default LocationPicker;