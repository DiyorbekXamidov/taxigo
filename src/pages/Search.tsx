import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TaxiCard from '@/components/TaxiCard';
import SearchForm from '@/components/SearchForm';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, SlidersHorizontal } from 'lucide-react';
import { db } from '@/integrations/firebase/client';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { TaxiCarIcon, AirConditionerIcon, WomenOnlyIcon, SeatIcon, ClockIcon, PriceTagIcon } from '@/components/icons/TaxiIcons';

interface TaxiTrip {
  id: string;
  driver_name: string;
  vehicle_model: string;
  from_district: string;
  to_district: string;
  total_seats: number;
  occupied_seats: number;
  price_per_seat: number;
  departure_time: string;
  departure_date: string;
  phone: string;
  has_air_conditioner: boolean;
  for_women: boolean;
  pickup_districts: string[] | null;
}

const Search = () => {
  const { t, language } = useLanguage();
  const isLatin = language === 'uz-latin';
  const [searchParams] = useSearchParams();
  const [trips, setTrips] = useState<TaxiTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    availableOnly: false,
    cheapest: false,
    earliest: false,
    airConditioner: false,
    forWomen: false,
  });

  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  useEffect(() => {
    fetchTrips();
  }, [from, to]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      // Build Firestore query
      const tripsRef = collection(db, 'taxi_trips');
      let q = query(tripsRef, where('is_active', '==', true));
      
      // Firestore doesn't support multiple inequality filters easily
      // so we filter in code
      const querySnapshot = await getDocs(q);
      const allTrips: TaxiTrip[] = [];
      
      querySnapshot.forEach((doc) => {
        const trip = { id: doc.id, ...doc.data() } as TaxiTrip;
        
        // Filter by from/to if specified
        let matches = true;
        if (from && trip.from_district !== from) {
          // Also check if from is in pickup_districts
          if (!trip.pickup_districts || !trip.pickup_districts.includes(from)) {
            matches = false;
          }
        }
        if (to && trip.to_district !== to) {
          matches = false;
        }
        
        if (matches) {
          allTrips.push(trip);
        }
      });
      
      setTrips(allTrips);
    } catch (error) {
      console.error('Error:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if trip is expired - using Uzbekistan timezone (UTC+5)
  const isTripExpired = (trip: TaxiTrip) => {
    try {
      // Get current time in Uzbekistan (UTC+5)
      const now = new Date();
      const uzbekistanOffset = 5 * 60; // UTC+5 in minutes
      const localOffset = now.getTimezoneOffset();
      const uzbekistanTime = new Date(now.getTime() + (uzbekistanOffset + localOffset) * 60000);
      
      const [hours, minutes] = trip.departure_time.split(':').map(Number);
      
      // Parse date - handle both YYYY-MM-DD and DD.MM.YYYY formats
      let day, month, year;
      if (trip.departure_date.includes('-')) {
        [year, month, day] = trip.departure_date.split('-').map(Number);
      } else {
        [day, month, year] = trip.departure_date.split('.').map(Number);
      }
      
      const tripDate = new Date(year, month - 1, day, hours, minutes);
      
      return uzbekistanTime > tripDate;
    } catch {
      return false;
    }
  };

  const filteredTrips = trips.filter((trip) => {
    if (filters.availableOnly && trip.total_seats - trip.occupied_seats === 0) return false;
    if (filters.airConditioner && !trip.has_air_conditioner) return false;
    if (filters.forWomen && !trip.for_women) return false;
    return true;
  }).sort((a, b) => {
    // Expired trips go to the end
    const aExpired = isTripExpired(a);
    const bExpired = isTripExpired(b);
    if (aExpired && !bExpired) return 1;
    if (!aExpired && bExpired) return -1;
    
    // Then apply user filters
    if (filters.cheapest) return a.price_per_seat - b.price_per_seat;
    if (filters.earliest) {
      // Compare by date first, then by time - handle both YYYY-MM-DD and DD.MM.YYYY formats
      const parseDate = (dateStr: string) => {
        if (dateStr.includes('-')) {
          // YYYY-MM-DD format
          const [year, month, day] = dateStr.split('-').map(Number);
          return { day, month, year };
        } else {
          // DD.MM.YYYY format
          const [day, month, year] = dateStr.split('.').map(Number);
          return { day, month, year };
        }
      };
      
      const aDateParts = parseDate(a.departure_date);
      const bDateParts = parseDate(b.departure_date);
      const [aHours, aMinutes] = a.departure_time.split(':').map(Number);
      const [bHours, bMinutes] = b.departure_time.split(':').map(Number);
      
      const aDate = new Date(aDateParts.year, aDateParts.month - 1, aDateParts.day, aHours, aMinutes);
      const bDate = new Date(bDateParts.year, bDateParts.month - 1, bDateParts.day, bHours, bMinutes);
      
      return aDate.getTime() - bDate.getTime();
    }
    return 0;
  });

  const FilterContent = () => (
    <div className="space-y-5">
      <FilterItem
        id="availableOnly"
        icon={SeatIcon}
        label={t('taxi.availableOnly')}
        checked={filters.availableOnly}
        onChange={(checked) => setFilters({ ...filters, availableOnly: !!checked })}
      />
      <FilterItem
        id="cheapest"
        icon={PriceTagIcon}
        label={t('taxi.cheapest')}
        checked={filters.cheapest}
        onChange={(checked) => setFilters({ ...filters, cheapest: !!checked, earliest: false })}
      />
      <FilterItem
        id="earliest"
        icon={ClockIcon}
        label={t('taxi.earliest')}
        checked={filters.earliest}
        onChange={(checked) => setFilters({ ...filters, earliest: !!checked, cheapest: false })}
      />
      <FilterItem
        id="airConditioner"
        icon={AirConditionerIcon}
        label={t('taxi.airConditioner')}
        checked={filters.airConditioner}
        onChange={(checked) => setFilters({ ...filters, airConditioner: !!checked })}
      />
      <FilterItem
        id="forWomen"
        icon={WomenOnlyIcon}
        label={t('taxi.forWomen')}
        checked={filters.forWomen}
        onChange={(checked) => setFilters({ ...filters, forWomen: !!checked })}
      />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Search Bar */}
        <section className="bg-gradient-hero py-6 relative overflow-hidden">
          <div className="absolute inset-0 hero-pattern opacity-50" />
          <div className="container mx-auto px-4 relative">
            <div className="bg-card rounded-xl shadow-lg border border-border/50 p-4 md:p-6">
              <SearchForm variant="compact" />
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Desktop Filters */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="bg-card border border-border rounded-xl p-5 sticky top-20 shadow-sm">
                <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                  {t('taxi.filters')}
                </h3>
                <FilterContent />
              </div>
            </aside>

            {/* Results */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {isLatin ? "Topilgan taksilar" : "Топилган таксилар"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {filteredTrips.length} {isLatin ? "ta natija" : "та натижа"}
                  </p>
                </div>
                
                {/* Mobile Filter Button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden gap-2">
                      <Filter className="w-4 h-4" />
                      {t('taxi.filters')}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <SlidersHorizontal className="w-5 h-5 text-primary" />
                        {t('taxi.filters')}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
                  <p className="text-muted-foreground">
                    {isLatin ? "Yuklanmoqda..." : "Юкланмоқда..."}
                  </p>
                </div>
              ) : filteredTrips.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-border">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-5">
                    <TaxiCarIcon size={40} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('taxi.noResults')}
                  </h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    {isLatin 
                      ? "Boshqa yo'nalish yoki sana tanlang" 
                      : "Бошқа йўналиш ёки сана танланг"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredTrips.map((trip) => (
                    <TaxiCard
                      key={trip.id}
                      id={trip.id}
                      driverName={trip.driver_name}
                      vehicleModel={trip.vehicle_model}
                      fromId={trip.from_district}
                      toId={trip.to_district}
                      totalSeats={trip.total_seats}
                      occupiedSeats={trip.occupied_seats}
                      pricePerSeat={trip.price_per_seat}
                      departureTime={trip.departure_time}
                      departureDate={trip.departure_date}
                      phone={trip.phone}
                      hasAirConditioner={trip.has_air_conditioner}
                      forWomen={trip.for_women}
                      pickupDistricts={trip.pickup_districts}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

interface FilterItemProps {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const FilterItem = ({ id, icon: Icon, label, checked, onChange }: FilterItemProps) => (
  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      className="border-2"
    />
    <Icon size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
    <Label htmlFor={id} className="text-sm font-normal cursor-pointer flex-1">
      {label}
    </Label>
  </div>
);

export default Search;
