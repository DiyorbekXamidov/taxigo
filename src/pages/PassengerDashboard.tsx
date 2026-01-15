import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TelegramConnection from '@/components/TelegramConnection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Session } from '@supabase/supabase-js';
import { 
  Search, 
  Calendar, 
  MapPin, 
  Clock, 
  User,
  Phone,
  Settings,
  Loader2,
  TicketCheck
} from 'lucide-react';

interface Booking {
  id: string;
  trip_id: string;
  passenger_name: string;
  passenger_phone: string;
  seats_booked: number;
  total_price?: number;
  status: string;
  created_at: string;
  taxi_trips?: {
    from_district: string;
    to_district: string;
    departure_date: string;
    departure_time: string;
    driver_name: string;
    phone: string;
    vehicle_model: string;
  } | null;
}

const PassengerDashboard = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setSession(session);
        setUserName(session.user.user_metadata?.name || '');
        fetchBookings(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchBookings = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          taxi_trips (
            from_district,
            to_district,
            departure_date,
            departure_time,
            driver_name,
            phone,
            vehicle_model
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: language === 'uz-latin' ? 'Kutilmoqda' : 'Кутилмоқда', variant: 'secondary' as const },
      confirmed: { label: language === 'uz-latin' ? 'Tasdiqlangan' : 'Тасдиқланган', variant: 'default' as const },
      rejected: { label: language === 'uz-latin' ? 'Rad etilgan' : 'Рад этилган', variant: 'destructive' as const },
      cancelled: { label: language === 'uz-latin' ? 'Bekor qilingan' : 'Бекор қилинган', variant: 'outline' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'uz-latin' ? "Yo'lovchi paneli" : "Йўловчи панели"}
            </h1>
            <p className="text-muted-foreground">
              {language === 'uz-latin' 
                ? `Salom, ${userName}! Bronlaringizni boshqaring.`
                : `Салом, ${userName}! Бронларингизни бошқаринг.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/search">
              <Button variant="default" className="gap-2">
                <Search className="w-4 h-4" />
                {language === 'uz-latin' ? "Sayohat qidirish" : "Саёҳат қидириш"}
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                {t('nav.profile')}
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleLogout}>
              {t('nav.logout')}
            </Button>
          </div>
        </div>

        {/* Bookings Section */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TicketCheck className="w-5 h-5" />
              {language === 'uz-latin' ? "Mening bronlarim" : "Менинг бронларим"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <TicketCheck className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">
                  {language === 'uz-latin' 
                    ? "Hali bronlar mavjud emas"
                    : "Ҳали бронлар мавжуд эмас"}
                </p>
                <Link to="/search">
                  <Button>
                    <Search className="w-4 h-4 mr-2" />
                    {language === 'uz-latin' ? "Sayohat qidirish" : "Саёҳат қидириш"}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-medium">
                              {booking.taxi_trips?.from_district} → {booking.taxi_trips?.to_district}
                            </span>
                            {getStatusBadge(booking.status)}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {booking.taxi_trips?.departure_date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {booking.taxi_trips?.departure_time}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {booking.seats_booked} {language === 'uz-latin' ? "o'rin" : "ўрин"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4 text-muted-foreground" />
                              {booking.taxi_trips?.driver_name}
                            </span>
                            <a 
                              href={`tel:${booking.taxi_trips?.phone}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Phone className="w-4 h-4" />
                              {booking.taxi_trips?.phone}
                            </a>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {booking.total_price?.toLocaleString()} {language === 'uz-latin' ? "so'm" : "сўм"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.taxi_trips?.vehicle_model}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Telegram Notifications */}
        {session && (
          <div className="mt-6">
            <TelegramConnection userId={session.user.id} isPassenger={true} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PassengerDashboard;
