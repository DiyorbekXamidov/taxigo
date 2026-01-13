import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Navigation, Loader2, Radio, X, ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface LiveLocationSharingProps {
  bookingId: string;
  passengerName: string;
  onClose?: () => void;
}

const LiveLocationSharing = ({ bookingId, passengerName, onClose }: LiveLocationSharingProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const channelRef = useRef<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !currentLocation) return;
    
    let mounted = true;
    
    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        
        if (!mounted || !mapRef.current) return;
        
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }
        
        const map = L.map(mapRef.current, {
          center: [currentLocation.lat, currentLocation.lng],
          zoom: 16,
        });
        
        leafletMapRef.current = map;
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OSM'
        }).addTo(map);
        
        // Create pulsing marker
        const pulsingIcon = L.divIcon({
          className: 'live-marker',
          html: `
            <div style="position: relative;">
              <div style="
                width: 20px;
                height: 20px;
                background-color: #22c55e;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                position: relative;
                z-index: 2;
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 40px;
                height: 40px;
                background-color: rgba(34, 197, 94, 0.3);
                border-radius: 50%;
                animation: pulse 2s ease-in-out infinite;
              "></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        
        markerRef.current = L.marker([currentLocation.lat, currentLocation.lng], { icon: pulsingIcon })
          .bindPopup(`<strong>${passengerName}</strong><br/>Jonli joylashuv`)
          .addTo(map);
          
      } catch (err) {
        console.error('Map init error:', err);
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
  }, [currentLocation?.lat, currentLocation?.lng, passengerName]);
  
  // Update marker position when location changes
  useEffect(() => {
    if (markerRef.current && currentLocation && leafletMapRef.current) {
      markerRef.current.setLatLng([currentLocation.lat, currentLocation.lng]);
      leafletMapRef.current.panTo([currentLocation.lat, currentLocation.lng]);
    }
  }, [currentLocation]);

  const startSharing = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Brauzeringiz joylashuvni qo'llab-quvvatlamaydi");
      return;
    }

    setError(null);
    setIsSharing(true);

    // Create realtime channel for this booking
    const channel = supabase.channel(`live-location-${bookingId}`, {
      config: {
        broadcast: { self: true },
      },
    });
    
    channelRef.current = channel;
    
    await channel.subscribe();

    // Start watching location
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        const locationData = {
          lat: latitude,
          lng: longitude,
          accuracy,
          heading,
          speed,
          timestamp: Date.now(),
          passengerName,
        };
        
        setCurrentLocation({ lat: latitude, lng: longitude });
        
        // Broadcast location to channel
        channel.send({
          type: 'broadcast',
          event: 'location_update',
          payload: locationData,
        });
        
        console.log('Location broadcasted:', locationData);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(err.message);
        setIsSharing(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
    
    setWatchId(id);
  }, [bookingId, passengerName]);

  const stopSharing = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    
    if (channelRef.current) {
      // Send final "stopped" message
      channelRef.current.send({
        type: 'broadcast',
        event: 'location_stopped',
        payload: { passengerName, timestamp: Date.now() },
      });
      
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    setIsSharing(false);
    setCurrentLocation(null);
  }, [watchId, passengerName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSharing();
    };
  }, [stopSharing]);

  const openInYandexMaps = () => {
    if (currentLocation) {
      window.open(`https://yandex.com/maps/?pt=${currentLocation.lng},${currentLocation.lat}&z=17&l=map`, '_blank');
    }
  };

  return (
    <div className="space-y-4 p-4 bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className={`w-5 h-5 ${isSharing ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
          <h3 className="font-semibold text-foreground">Jonli joylashuv</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {!isSharing ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Joylashuvingizni haydovchi bilan ulashing. Haydovchi sizni osonroq topadi.
          </p>
          <Button onClick={startSharing} className="w-full bg-success text-success-foreground hover:bg-success/90">
            <Navigation className="w-4 h-4 mr-2" />
            Joylashuvni ulashishni boshlash
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              Jonli ulashilmoqda
            </Badge>
            {currentLocation && (
              <Button variant="ghost" size="sm" onClick={openInYandexMaps}>
                <ExternalLink className="w-4 h-4 mr-1" />
                Yandex
              </Button>
            )}
          </div>
          
          {/* Mini map */}
          <div className="h-40 rounded-lg overflow-hidden border border-border relative">
            {!currentLocation && (
              <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <div ref={mapRef} className="h-full w-full" />
          </div>
          
          {currentLocation && (
            <p className="text-xs text-muted-foreground text-center">
              📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            </p>
          )}
          
          <Button 
            onClick={stopSharing} 
            variant="outline" 
            className="w-full border-destructive text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4 mr-2" />
            Ulashishni to'xtatish
          </Button>
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default LiveLocationSharing;