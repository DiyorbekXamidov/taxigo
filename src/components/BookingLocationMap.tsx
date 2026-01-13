import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin, Navigation, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface BookingLocationMapProps {
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupAddress?: string | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  dropoffAddress?: string | null;
  passengerName: string;
}

const BookingLocationMap = ({
  pickupLat,
  pickupLng,
  pickupAddress,
  dropoffLat,
  dropoffLng,
  dropoffAddress,
  passengerName,
}: BookingLocationMapProps) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  
  const hasPickup = pickupLat && pickupLng;
  const hasDropoff = dropoffLat && dropoffLng;
  
  // Initialize map
  useEffect(() => {
    if (!hasPickup && !hasDropoff) return;
    if (!mapRef.current) return;
    
    let mounted = true;
    
    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        
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
        
        const center: [number, number] = hasPickup 
          ? [pickupLat!, pickupLng!] 
          : [dropoffLat!, dropoffLng!];
        
        const map = L.map(mapRef.current, {
          center,
          zoom: hasPickup && hasDropoff ? 12 : 15,
          scrollWheelZoom: false,
        });
        
        leafletMapRef.current = map;
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        
        // Create custom icons
        const createIcon = (color: string, label: string) => L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: 36px;
            height: 36px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 3px 10px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
          ">${label}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
        });
        
        const pickupIcon = createIcon('#22c55e', 'A');
        const dropoffIcon = createIcon('#ef4444', 'B');
        
        const markers: [number, number][] = [];
        
        if (hasPickup) {
          const pickupLatLng: [number, number] = [pickupLat!, pickupLng!];
          markers.push(pickupLatLng);
          L.marker(pickupLatLng, { icon: pickupIcon })
            .bindPopup(`<strong>Chiqish nuqtasi</strong><br/><small>${pickupAddress || `${pickupLat}, ${pickupLng}`}</small>`)
            .addTo(map);
        }
        
        if (hasDropoff) {
          const dropoffLatLng: [number, number] = [dropoffLat!, dropoffLng!];
          markers.push(dropoffLatLng);
          L.marker(dropoffLatLng, { icon: dropoffIcon })
            .bindPopup(`<strong>Borish nuqtasi</strong><br/><small>${dropoffAddress || `${dropoffLat}, ${dropoffLng}`}</small>`)
            .addTo(map);
        }
        
        // Draw route line
        if (hasPickup && hasDropoff) {
          L.polyline(
            [[pickupLat!, pickupLng!], [dropoffLat!, dropoffLng!]],
            {
              color: 'hsl(45, 100%, 50%)',
              weight: 4,
              opacity: 0.8,
              dashArray: '10, 10',
            }
          ).addTo(map);
          
          // Fit bounds to show both markers
          const bounds = L.latLngBounds(markers);
          map.fitBounds(bounds, { padding: [30, 30] });
        }
        
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
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, hasPickup, hasDropoff, pickupAddress, dropoffAddress]);
  
  if (!hasPickup && !hasDropoff) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center bg-muted rounded-lg">
        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Joylashuv ma'lumoti mavjud emas</p>
      </div>
    );
  }

  const openInYandexMaps = (lat: number, lng: number) => {
    window.open(`https://yandex.com/maps/?pt=${lng},${lat}&z=17&l=map`, '_blank');
  };

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const openNavigationToPickup = () => {
    if (hasPickup) {
      setNavigating(true);
      // Try to use Yandex Navigator on mobile, fallback to Google Maps
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        // Try Yandex Navigator first
        const yandexUrl = `yandexnavi://build_route_on_map?lat_to=${pickupLat}&lon_to=${pickupLng}`;
        window.location.href = yandexUrl;
        
        // Fallback to Yandex Maps or Google Maps after delay
        setTimeout(() => {
          window.open(`https://yandex.com/maps/?rtext=~${pickupLat},${pickupLng}&rtt=auto`, '_blank');
          setNavigating(false);
        }, 500);
      } else {
        window.open(`https://yandex.com/maps/?rtext=~${pickupLat},${pickupLng}&rtt=auto`, '_blank');
        setNavigating(false);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="h-48 rounded-lg overflow-hidden border border-border relative">
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

      {/* Location info */}
      <div className="space-y-2 text-sm">
        {hasPickup && (
          <div className="flex items-start justify-between gap-2 p-2 bg-green-500/10 rounded-md">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-medium text-green-600">Chiqish nuqtasi:</span>
                <p className="text-muted-foreground text-xs truncate">{pickupAddress || `${pickupLat}, ${pickupLng}`}</p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 px-2 text-xs"
                onClick={() => openInYandexMaps(pickupLat!, pickupLng!)}
                title="Yandex Maps"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
        
        {hasDropoff && (
          <div className="flex items-start justify-between gap-2 p-2 bg-red-500/10 rounded-md">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-medium text-red-600">Borish nuqtasi:</span>
                <p className="text-muted-foreground text-xs truncate">{dropoffAddress || `${dropoffLat}, ${dropoffLng}`}</p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 px-2 text-xs"
                onClick={() => openInYandexMaps(dropoffLat!, dropoffLng!)}
                title="Yandex Maps"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation button */}
      {hasPickup && (
        <Button 
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
          onClick={openNavigationToPickup}
          disabled={navigating}
        >
          {navigating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 mr-2" />
          )}
          {passengerName}ga yo'l olish (Yandex)
        </Button>
      )}
    </div>
  );
};

export default BookingLocationMap;