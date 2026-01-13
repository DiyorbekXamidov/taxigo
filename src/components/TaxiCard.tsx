import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getLocationById } from '@/data/regions';
import { getTravelTime, getDistance } from '@/data/districtCoordinates';
import { 
  TaxiCarIcon, 
  SeatIcon, 
  ClockIcon, 
  AirConditionerIcon, 
  WomenOnlyIcon, 
  NavigationIcon,
  MultiPickupIcon,
  RouteIcon
} from '@/components/icons/TaxiIcons';

interface TaxiCardProps {
  id: string;
  driverName: string;
  vehicleModel: string;
  fromId: string;
  toId: string;
  totalSeats: number;
  occupiedSeats: number;
  pricePerSeat: number;
  departureTime: string;
  departureDate: string;
  phone: string;
  hasAirConditioner: boolean;
  forWomen?: boolean;
  pickupDistricts?: string[] | null;
}

const TaxiCard = ({
  id,
  driverName,
  vehicleModel,
  fromId,
  toId,
  totalSeats,
  occupiedSeats,
  pricePerSeat,
  departureTime,
  departureDate,
  phone,
  hasAirConditioner,
  forWomen,
  pickupDistricts
}: TaxiCardProps) => {
  const { language, t } = useLanguage();
  const availableSeats = totalSeats - occupiedSeats;
  
  const travelTime = useMemo(() => getTravelTime(fromId, toId), [fromId, toId]);
  const distance = useMemo(() => getDistance(fromId, toId), [fromId, toId]);
  
  const getDistrictName = (districtId: string) => {
    const location = getLocationById(districtId);
    if (location) return location.name[language];
    return districtId;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };
  
  const formatTimeShort = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Card className="overflow-hidden card-hover border-border bg-card group">
      <CardContent className="p-0">
        {/* Top section with route - MOBILE OPTIMIZED */}
        <div className="p-3 sm:p-4 pb-2 sm:pb-3 border-b border-border/50">
          {/* Route display - vertical on mobile, horizontal on desktop */}
          <div className="flex flex-col gap-2">
            {/* From-To Route */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              {/* From */}
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-success flex-shrink-0 ring-2 sm:ring-4 ring-success/20" />
                <span className="font-semibold text-foreground text-sm sm:text-base">{getDistrictName(fromId)}</span>
              </div>
              
              {/* Arrow - horizontal line on mobile */}
              <div className="flex items-center gap-1 pl-1 sm:pl-0 sm:px-2">
                <div className="w-4 sm:w-8 h-0.5 bg-gradient-to-r from-success via-muted-foreground/30 to-primary" />
                <RouteIcon size={14} className="text-muted-foreground sm:hidden" />
                <RouteIcon size={18} className="text-muted-foreground hidden sm:block" />
                <div className="w-4 sm:w-8 h-0.5 bg-gradient-to-r from-muted-foreground/30 to-primary" />
              </div>
              
              {/* To */}
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary flex-shrink-0 ring-2 sm:ring-4 ring-primary/20" />
                <span className="font-semibold text-foreground text-sm sm:text-base">{getDistrictName(toId)}</span>
              </div>
            </div>
            
            {/* Badges row - horizontal scroll on mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {hasAirConditioner && (
                <Badge variant="secondary" className="text-xs bg-accent/10 text-accent border-0 flex-shrink-0">
                  <AirConditionerIcon size={12} className="mr-1" />
                  AC
                </Badge>
              )}
              {pickupDistricts && pickupDistricts.length > 0 && (
                <Badge variant="outline" className="text-xs border-primary/50 text-primary bg-primary/5 flex-shrink-0">
                  <MultiPickupIcon size={12} className="mr-1" />
                  {pickupDistricts.length} tuman
                </Badge>
              )}
              {forWomen && (
                <Badge variant="outline" className="text-xs border-pink-400/50 text-pink-500 bg-pink-500/5 flex-shrink-0">
                  <WomenOnlyIcon size={12} className="mr-1" />
                  {t('taxi.forWomen')}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Middle section with details - MOBILE OPTIMIZED */}
        <div className="p-3 sm:p-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Vehicle and driver */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <TaxiCarIcon size={18} className="text-muted-foreground sm:hidden" />
                <TaxiCarIcon size={22} className="text-muted-foreground hidden sm:block" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm sm:text-base truncate">{vehicleModel}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{driverName}</p>
              </div>
            </div>

            {/* Stats - compact on mobile */}
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-shrink-0">
              {/* Seats */}
              <div className="flex items-center gap-0.5 sm:gap-1.5">
                <div className="flex gap-0.5">
                  {Array.from({ length: totalSeats }).map((_, i) => (
                    <SeatIcon 
                      key={i} 
                      size={14} 
                      available={i >= occupiedSeats} 
                    />
                  ))}
                </div>
              </div>
              
              {/* Time */}
              <div className="flex items-center gap-1 text-foreground">
                <ClockIcon size={14} className="text-muted-foreground" />
                <span className="font-medium">{departureTime}</span>
              </div>

              {/* Distance - hidden on small mobile */}
              {distance && (
                <div className="hidden md:flex items-center gap-1 text-muted-foreground">
                  <NavigationIcon size={14} />
                  <span>{distance} km</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom section with price and actions - MOBILE OPTIMIZED */}
        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-muted/30 border-t border-border/50 flex items-center justify-between gap-2 sm:gap-4">
          {/* Price */}
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold text-primary">
                {formatPrice(pricePerSeat)}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground">{t('common.sum')}</span>
            </div>
            <span className="text-xs text-muted-foreground">{t('taxi.perSeat')}</span>
          </div>

          {/* Actions - smaller buttons on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a href={`tel:${phone}`}>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-9 h-9 sm:w-10 sm:h-10 p-0 border-border hover:border-accent hover:bg-accent/10 hover:text-accent transition-colors"
              >
                <Phone className="w-4 h-4" />
              </Button>
            </a>
            <a href={`https://t.me/${phone.replace('+', '')}`} target="_blank" rel="noopener noreferrer">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-9 h-9 sm:w-10 sm:h-10 p-0 border-border hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </a>
            <Link to={`/taxi/${id}`}>
              <Button 
                size="sm" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-3 sm:px-5 text-xs sm:text-sm btn-glow"
              >
                {t('taxi.details')}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaxiCard;
