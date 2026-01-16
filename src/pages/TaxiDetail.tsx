import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RouteMap from '@/components/RouteMap';
import BookingDialog from '@/components/BookingDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Phone, MessageCircle, Star, Clock, Users, 
  Snowflake, Cigarette, Music, Briefcase, ArrowRight,
  User, Car as CarIcon, Map, Calendar
} from 'lucide-react';
import { db } from '@/integrations/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import { surxondaryoRegion, vehicleColors } from '@/data/regions';

interface TaxiTrip {
  id: string;
  driver_name: string;
  vehicle_model: string;
  vehicle_color: string;
  plate_number: string | null;
  from_district: string;
  to_district: string;
  total_seats: number;
  occupied_seats: number;
  price_per_seat: number;
  departure_time: string;
  departure_date: string;
  phone: string;
  has_air_conditioner: boolean;
  has_large_luggage: boolean;
  smoking_allowed: boolean;
  music_preference: string | null;
  for_women: boolean;
  rating: number;
  review_count: number;
}

const TaxiDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  const [trip, setTrip] = useState<TaxiTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    fetchTrip();
  }, [id]);

  const fetchTrip = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const tripDoc = await getDoc(doc(db, 'taxi_trips', id));
      if (tripDoc.exists()) {
        setTrip({ id: tripDoc.id, ...tripDoc.data() } as TaxiTrip);
      } else {
        console.error('Trip not found');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDistrictName = (districtId: string) => {
    // Handle multiple districts separated by comma
    const ids = districtId.split(',').filter(Boolean);
    const names = ids.map(id => {
      const district = surxondaryoRegion.districts.find(d => d.id === id);
      return district ? district.name[language].toUpperCase() : id.toUpperCase();
    });
    return names.join(', ');
  };

  const getColorName = (colorKey: string) => {
    const color = vehicleColors[colorKey];
    return color ? color[language] : colorKey;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground mb-4">{t('taxi.noResults')}</h2>
            <Link to="/search">
              <Button>{t('nav.search')}</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const availableSeats = trip.total_seats - trip.occupied_seats;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          {/* Back button */}
          <Link to="/search" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('nav.search')}
          </Link>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Route Card */}
              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                    <span>{getDistrictName(trip.from_district)}</span>
                    <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    <span>{getDistrictName(trip.to_district)}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{trip.departure_time}</span>
                      <span className="text-muted-foreground">{trip.departure_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className={`font-bold ${availableSeats > 0 ? 'text-success' : 'text-destructive'}`}>
                        {availableSeats}
                      </span>
                      <span className="text-muted-foreground">
                        /{trip.total_seats} {t('taxi.available')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Route Map */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="w-5 h-5" />
                    {t('detail.route')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <RouteMap fromId={trip.from_district} toId={trip.to_district} />
                </CardContent>
              </Card>

              {/* Driver Info */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {t('detail.driver')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{trip.driver_name}</p>
                      {trip.rating > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 text-primary fill-primary" />
                          <span className="font-medium text-foreground">{trip.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground text-sm">
                            ({trip.review_count} {t('detail.reviews')})
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <a href={`tel:${trip.phone}`}>
                        <Button size="sm" variant="outline">
                          <Phone className="w-4 h-4 mr-2" />
                          {t('taxi.call')}
                        </Button>
                      </a>
                      <a href={`https://t.me/${trip.phone.replace('+', '')}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Info */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CarIcon className="w-5 h-5" />
                    {t('detail.vehicle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('driver.vehicleModel')}</p>
                      <p className="font-medium text-foreground">{trip.vehicle_model}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('detail.color')}</p>
                      <p className="font-medium text-foreground">{getColorName(trip.vehicle_color)}</p>
                    </div>
                    {trip.plate_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('driver.plateNumber')}</p>
                        <p className="font-medium text-foreground">{trip.plate_number}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Comfort Features */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>{t('detail.comfort')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={trip.has_air_conditioner ? 'default' : 'secondary'} className={trip.has_air_conditioner ? 'bg-primary text-primary-foreground' : ''}>
                      <Snowflake className="w-3 h-3 mr-1" />
                      {trip.has_air_conditioner ? t('detail.airConditioner') : t('detail.noAirConditioner')}
                    </Badge>
                    {trip.has_large_luggage && (
                      <Badge variant="secondary">
                        <Briefcase className="w-3 h-3 mr-1" />
                        {t('detail.largeLuggage')}
                      </Badge>
                    )}
                    <Badge variant={trip.smoking_allowed ? 'outline' : 'secondary'}>
                      <Cigarette className="w-3 h-3 mr-1" />
                      {trip.smoking_allowed ? t('detail.smoking') : t('detail.noSmoking')}
                    </Badge>
                    {trip.music_preference && (
                      <Badge variant="secondary">
                        <Music className="w-3 h-3 mr-1" />
                        {trip.music_preference}
                      </Badge>
                    )}
                    {trip.for_women && (
                      <Badge variant="outline" className="border-accent">
                        {t('taxi.forWomen')}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Price and CTA */}
            <div className="lg:col-span-1">
              <Card className="border-border bg-card sticky top-20">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <p className="text-sm text-muted-foreground mb-1">{t('detail.price')}</p>
                    <p className="text-4xl font-bold text-primary">
                      {formatPrice(trip.price_per_seat)}
                    </p>
                    <p className="text-muted-foreground">{t('common.sum')} / {t('taxi.perSeat')}</p>
                  </div>

                  <div className="space-y-3">
                    {availableSeats > 0 && (
                      <Button 
                        size="lg" 
                        className="w-full bg-success text-success-foreground hover:bg-success/90"
                        onClick={() => setIsBookingOpen(true)}
                      >
                        <Calendar className="w-5 h-5 mr-2" />
                        {t('detail.book')}
                      </Button>
                    )}
                    <a href={`tel:${trip.phone}`} className="block">
                      <Button size="lg" variant={availableSeats > 0 ? "outline" : "default"} className={`w-full ${availableSeats <= 0 ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}>
                        <Phone className="w-5 h-5 mr-2" />
                        {t('taxi.call')}
                      </Button>
                    </a>
                    <a href={`https://t.me/${trip.phone.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="block">
                      <Button size="lg" variant="outline" className="w-full">
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Telegram
                      </Button>
                    </a>
                  </div>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    {t('home.title') === 'Ishonchli taksi xizmati' 
                      ? "Haydovchi bilan to'g'ridan-to'g'ri bog'laning" 
                      : "Ҳайдовчи билан тўғридан-тўғри боғланинг"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Booking Dialog */}
      {trip && (
        <BookingDialog
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          trip={trip}
        />
      )}
    </div>
  );
};

export default TaxiDetail;
