import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Loader2, Radio, ExternalLink, RefreshCw, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { rtdb } from '@/integrations/firebase/client';
import { ref, onValue, off } from 'firebase/database';
import 'leaflet/dist/leaflet.css';

interface LiveLocationViewerProps {
  bookingId: string;
  passengerName: string;
  passengerPhone?: string;
  passengerTelegramChatId?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupAddress?: string | null;
}

interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
  passengerName: string;
}

// Distance calculation using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const LiveLocationViewer = ({ 
  bookingId, 
  passengerName,
  passengerPhone,
  passengerTelegramChatId,
  pickupLat,
  pickupLng,
  pickupAddress,
}: LiveLocationViewerProps) => {
  const [liveLocation, setLiveLocation] = useState<LocationData | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isStopped, setIsStopped] = useState(false);
  const [distanceToPassenger, setDistanceToPassenger] = useState<number | null>(null);
  const [autoNotifyEnabled, setAutoNotifyEnabled] = useState(true);
  const [notificationsSent, setNotificationsSent] = useState<Set<string>>(new Set());
  const [isTrackingDriver, setIsTrackingDriver] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const liveMarkerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  // Proximity thresholds in meters
  const PROXIMITY_THRESHOLDS = [
    { distance: 2000, message: "🚗 Haydovchi 2 km masofada!", key: '2km' },
    { distance: 1000, message: "🚗 Haydovchi 1 km masofada! Tayyorlaning.", key: '1km' },
    { distance: 500, message: "🚗 Haydovchi 500 m masofada! Tez orada yetib keladi.", key: '500m' },
    { distance: 200, message: "🚗 Haydovchi yetib keldi! Chiqishga tayyorlaning.", key: '200m' },
  ];

  // Send proximity notification to passenger (disabled - needs Firebase Cloud Functions)
  const sendProximityNotification = useCallback(async (message: string, key: string) => {
    if (notificationsSent.has(key)) return;
    
    try {
      // TODO: Implement with Firebase Cloud Functions
      console.log('Proximity notification (disabled):', message, key);
      setNotificationsSent(prev => new Set([...prev, key]));
      toast.success(`Yo'lovchiga xabar: ${key}`);
    } catch (err) {
      console.error('Failed to send proximity notification:', err);
    }
  }, [notificationsSent]);

  // Check proximity and send notifications
  useEffect(() => {
    if (!autoNotifyEnabled || !driverLocation || !liveLocation) return;

    const distance = calculateDistance(
      driverLocation.lat, driverLocation.lng,
      liveLocation.lat, liveLocation.lng
    );
    
    setDistanceToPassenger(distance);

    // Check each threshold
    for (const threshold of PROXIMITY_THRESHOLDS) {
      if (distance <= threshold.distance && !notificationsSent.has(threshold.key)) {
        sendProximityNotification(threshold.message, threshold.key);
        break; // Only send one notification at a time
      }
    }
  }, [driverLocation, liveLocation, autoNotifyEnabled, sendProximityNotification, notificationsSent]);

  // Track driver's own location
  const startTrackingDriver = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolokatsiya qo'llab-quvvatlanmaydi");
      return;
    }

    setIsTrackingDriver(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setDriverLocation({ lat: latitude, lng: longitude });

        // Update driver marker on map
        if (leafletMapRef.current) {
          const L = (await import('leaflet')).default;
          const map = leafletMapRef.current;

          const driverIcon = L.divIcon({
            className: 'driver-marker',
            html: `
              <div style="
                width: 32px;
                height: 32px;
                background-color: #f59e0b;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                </svg>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          if (driverMarkerRef.current) {
            driverMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            driverMarkerRef.current = L.marker([latitude, longitude], { icon: driverIcon })
              .bindPopup('<strong>Siz (Haydovchi)</strong>')
              .addTo(map);
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Joylashuvni olishda xatolik');
        setIsTrackingDriver(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, []);

  const stopTrackingDriver = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingDriver(false);
    setDriverLocation(null);
    if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }
  }, []);

  // Initialize map with pickup location
  useEffect(() => {
    if (!mapRef.current) return;
    
    let mounted = true;
    
    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        
        if (!mounted || !mapRef.current) return;
        
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }
        
        const center: [number, number] = liveLocation 
          ? [liveLocation.lat, liveLocation.lng]
          : pickupLat && pickupLng 
            ? [pickupLat, pickupLng] 
            : [37.9344, 67.5669];
        
        const map = L.map(mapRef.current, {
          center,
          zoom: 15,
        });
        
        leafletMapRef.current = map;
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OSM'
        }).addTo(map);
        
        // Add pickup marker if exists
        if (pickupLat && pickupLng) {
          const pickupIcon = L.divIcon({
            className: 'pickup-marker',
            html: `<div style="
              width: 24px;
              height: 24px;
              background-color: #3b82f6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });
          
          pickupMarkerRef.current = L.marker([pickupLat, pickupLng], { icon: pickupIcon })
            .bindPopup(`<strong>Belgilangan nuqta</strong><br/><small>${pickupAddress || ''}</small>`)
            .addTo(map);
        }
        
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
  }, [pickupLat, pickupLng, pickupAddress]);

  // Subscribe to live location updates from Firebase Realtime Database
  useEffect(() => {
    const locationRef = ref(rtdb, `live-locations/${bookingId}`);
    
    console.log('Subscribing to live location for booking:', bookingId);
    
    const unsubscribe = onValue(locationRef, async (snapshot) => {
      const data = snapshot.val();
      
      if (data && data.isSharing) {
        // Location data received
        const locationData: LocationData = {
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy,
          heading: data.heading,
          speed: data.speed,
          timestamp: data.timestamp,
          passengerName: data.passengerName,
        };
        
        setLiveLocation(locationData);
        setLastUpdate(new Date());
        setIsStopped(false);
        setIsConnected(true);
        
        // Update live marker on map
        if (leafletMapRef.current) {
          const L = (await import('leaflet')).default;
          const map = leafletMapRef.current;
          
          // Create pulsing live marker
          const liveIcon = L.divIcon({
            className: 'live-marker',
            html: `
              <div style="position: relative;">
                <div style="
                  width: 24px;
                  height: 24px;
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
                  width: 48px;
                  height: 48px;
                  background-color: rgba(34, 197, 94, 0.3);
                  border-radius: 50%;
                  animation: pulse 2s ease-in-out infinite;
                "></div>
              </div>
            `,
            iconSize: [48, 48],
            iconAnchor: [24, 24],
          });
          
          if (liveMarkerRef.current) {
            liveMarkerRef.current.setLatLng([locationData.lat, locationData.lng]);
          } else {
            liveMarkerRef.current = L.marker([locationData.lat, locationData.lng], { icon: liveIcon })
              .bindPopup(`<strong>${locationData.passengerName}</strong><br/>Jonli joylashuv`)
              .addTo(map);
          }
          
          // Smooth pan to new location
          map.panTo([locationData.lat, locationData.lng], { animate: true, duration: 0.5 });
        }
      } else {
        // Location sharing stopped or no data
        if (liveLocation) {
          setIsStopped(true);
          console.log('Location sharing stopped by passenger');
        }
      }
    }, (error) => {
      console.error('Error subscribing to location:', error);
      setIsConnected(false);
    });
    
    // Mark as connected
    setIsConnected(true);
    
    return () => {
      off(locationRef);
      stopTrackingDriver();
    };
  }, [bookingId, stopTrackingDriver, liveLocation]);

  const openNavigationToLive = () => {
    if (liveLocation) {
      // Try Yandex Navigator on mobile
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = `yandexnavi://build_route_on_map?lat_to=${liveLocation.lat}&lon_to=${liveLocation.lng}`;
        setTimeout(() => {
          window.open(`https://yandex.com/maps/?rtext=~${liveLocation.lat},${liveLocation.lng}&rtt=auto`, '_blank');
        }, 500);
      } else {
        window.open(`https://yandex.com/maps/?rtext=~${liveLocation.lat},${liveLocation.lng}&rtt=auto`, '_blank');
      }
    }
  };

  const openInYandexMaps = () => {
    if (liveLocation) {
      window.open(`https://yandex.com/maps/?pt=${liveLocation.lng},${liveLocation.lat}&z=17&l=map`, '_blank');
    }
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (seconds < 5) return "hozir";
    if (seconds < 60) return `${seconds} soniya oldin`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} daqiqa oldin`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <div className="space-y-4 p-4 bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className={`w-5 h-5 ${liveLocation && !isStopped ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
          <h3 className="font-semibold text-foreground">{passengerName} - Jonli joylashuv</h3>
        </div>
        <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
          {isConnected ? 'Ulangan' : 'Ulanmoqda...'}
        </Badge>
      </div>

      {/* Distance and Auto-Notify Controls */}
      {liveLocation && !isStopped && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Button
              variant={isTrackingDriver ? "default" : "outline"}
              size="sm"
              onClick={isTrackingDriver ? stopTrackingDriver : startTrackingDriver}
              className={isTrackingDriver ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
            >
              <Navigation className="w-4 h-4 mr-1" />
              {isTrackingDriver ? "Kuzatuvda" : "Joylashuvni kuzatish"}
            </Button>
            
            {distanceToPassenger !== null && (
              <span className="text-sm font-medium">
                📍 {formatDistance(distanceToPassenger)}
              </span>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoNotifyEnabled(!autoNotifyEnabled)}
            className={autoNotifyEnabled ? "text-green-600" : "text-muted-foreground"}
          >
            {autoNotifyEnabled ? (
              <>
                <Bell className="w-4 h-4 mr-1" />
                Avtomatik xabar
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 mr-1" />
                Xabar o'chiq
              </>
            )}
          </Button>
        </div>
      )}

      {/* Map */}
      <div className="h-48 rounded-lg overflow-hidden border border-border relative">
        {!isConnected && (
          <div className="absolute inset-0 bg-muted/80 flex items-center justify-center z-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <div ref={mapRef} className="h-full w-full" />
      </div>

      {/* Status */}
      <div className="space-y-2">
        {liveLocation && !isStopped ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-600 font-medium">Jonli joylashuv faol</span>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                {formatLastUpdate()}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={openNavigationToLive} className="flex-1 bg-primary text-primary-foreground">
                <Navigation className="w-4 h-4 mr-2" />
                Yo'l olish
              </Button>
              <Button onClick={openInYandexMaps} variant="outline">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            
            {liveLocation.speed && liveLocation.speed > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Tezlik: ~{Math.round(liveLocation.speed * 3.6)} km/s
              </p>
            )}
          </>
        ) : isStopped ? (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              Yo'lovchi joylashuv ulashishni to'xtatdi
            </p>
            {pickupLat && pickupLng && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  window.open(`https://yandex.com/maps/?rtext=~${pickupLat},${pickupLng}&rtt=auto`, '_blank');
                }}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Belgilangan nuqtaga yo'l olish
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Yo'lovchi hali joylashuvini ulashmagan
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Yo'lovchi ilovadan joylashuvni ulashganda bu yerda ko'rinadi
            </p>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default LiveLocationViewer;