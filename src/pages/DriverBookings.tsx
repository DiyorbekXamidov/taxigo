import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Phone, Users, MapPin, Check, X, Clock, Loader2, Radio } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import BookingLocationMap from '@/components/BookingLocationMap';
import LiveLocationViewer from '@/components/LiveLocationViewer';

interface Booking {
  id: string;
  trip_id: string;
  passenger_name: string;
  passenger_phone: string;
  passenger_telegram_chat_id: string | null;
  seats_booked: number;
  status: string;
  created_at: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_address: string | null;
  taxi_trips: {
    from_district: string;
    to_district: string;
    departure_date: string;
    departure_time: string;
  };
}

const DriverBookings = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const texts = {
    title: language === 'uz-latin' ? "Band qilishlar" : "Банд қилишлар",
    all: language === 'uz-latin' ? "Barchasi" : "Барчаси",
    pending: language === 'uz-latin' ? "Kutilmoqda" : "Кутилмоқда",
    confirmed: language === 'uz-latin' ? "Tasdiqlangan" : "Тасдиқланган",
    cancelled: language === 'uz-latin' ? "Bekor qilingan" : "Бекор қилинган",
    noBookings: language === 'uz-latin' ? "Band qilishlar yo'q" : "Банд қилишлар йўқ",
    confirm: language === 'uz-latin' ? "Tasdiqlash" : "Тасдиқлаш",
    cancel: language === 'uz-latin' ? "Bekor qilish" : "Бекор қилиш",
    viewLocation: language === 'uz-latin' ? "Joylashuvni ko'rish" : "Жойлашувни кўриш",
    liveLocation: language === 'uz-latin' ? "Jonli joylashuv" : "Жонли жойлашув",
    back: language === 'uz-latin' ? "Orqaga" : "Орқага",
    seats: language === 'uz-latin' ? "o'rin" : "ўрин",
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setSession(session);
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
          taxi_trips!inner (
            from_district,
            to_district,
            departure_date,
            departure_time,
            user_id
          )
        `)
        .eq('taxi_trips.user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data as Booking[]) || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    setUpdating(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      setBookings(prev => 
        prev.map(b => b.id === bookingId ? { ...b, status } : b)
      );

      toast({
        title: language === 'uz-latin' ? "Muvaffaqiyatli" : "Муваффақиятли",
        description: status === 'confirmed' 
          ? (language === 'uz-latin' ? "Band qilish tasdiqlandi" : "Банд қилиш тасдиқланди")
          : (language === 'uz-latin' ? "Band qilish bekor qilindi" : "Банд қилиш бекор қилинди"),
      });
    } catch (error: any) {
      toast({
        title: language === 'uz-latin' ? "Xatolik" : "Хатолик",
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600"><Clock className="w-3 h-3 mr-1" />{texts.pending}</Badge>;
      case 'confirmed':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-600"><Check className="w-3 h-3 mr-1" />{texts.confirmed}</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-500/20 text-red-600"><X className="w-3 h-3 mr-1" />{texts.cancelled}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filterBookings = (status: string | null) => {
    if (!status) return bookings;
    return bookings.filter(b => b.status === status);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const hasLocation = (booking: Booking) => {
    return booking.pickup_lat && booking.pickup_lng;
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
        <Button
          variant="ghost"
          onClick={() => navigate('/driver')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {texts.back}
        </Button>

        <h1 className="text-2xl font-bold text-foreground mb-6">{texts.title}</h1>

        <Tabs defaultValue="all">
          <TabsList className="grid grid-cols-4 w-full max-w-md mb-6">
            <TabsTrigger value="all">{texts.all}</TabsTrigger>
            <TabsTrigger value="pending">{texts.pending}</TabsTrigger>
            <TabsTrigger value="confirmed">{texts.confirmed}</TabsTrigger>
            <TabsTrigger value="cancelled">{texts.cancelled}</TabsTrigger>
          </TabsList>

          {['all', 'pending', 'confirmed', 'cancelled'].map(tab => (
            <TabsContent key={tab} value={tab}>
              {filterBookings(tab === 'all' ? null : tab).length === 0 ? (
                <Card className="border-border bg-card">
                  <CardContent className="py-12 text-center">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{texts.noBookings}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filterBookings(tab === 'all' ? null : tab).map(booking => (
                    <Card key={booking.id} className="border-border bg-card">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">{booking.passenger_name}</span>
                              {getStatusBadge(booking.status)}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <Phone className="w-4 h-4" />
                              <a href={`tel:${booking.passenger_phone}`} className="hover:text-primary">
                                {booking.passenger_phone}
                              </a>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="w-4 h-4" />
                              <span>{booking.seats_booked} {texts.seats}</span>
                            </div>
                            
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(booking.created_at)}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2">
                            {/* Live location button - always show for confirmed bookings */}
                            {booking.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500/50 text-green-600"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                <Radio className="w-4 h-4 mr-1 animate-pulse" />
                                {texts.liveLocation}
                              </Button>
                            )}
                            
                            {hasLocation(booking) && booking.status !== 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                <MapPin className="w-4 h-4 mr-1" />
                                {texts.viewLocation}
                              </Button>
                            )}
                            
                            {booking.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                  disabled={updating === booking.id}
                                >
                                  {updating === booking.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                  disabled={updating === booking.id}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Location Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBooking?.passenger_name} - {language === 'uz-latin' ? "Joylashuv" : "Жойлашув"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              {/* Live Location Viewer */}
              <LiveLocationViewer
                bookingId={selectedBooking.id}
                passengerName={selectedBooking.passenger_name}
                passengerPhone={selectedBooking.passenger_phone}
                passengerTelegramChatId={selectedBooking.passenger_telegram_chat_id}
                pickupLat={selectedBooking.pickup_lat}
                pickupLng={selectedBooking.pickup_lng}
                pickupAddress={selectedBooking.pickup_address}
              />
              
              {/* Static Location Map */}
              {(selectedBooking.pickup_lat || selectedBooking.dropoff_lat) && (
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                    {language === 'uz-latin' ? "Belgilangan manzillar" : "Белгиланган манзиллар"}
                  </h4>
                  <BookingLocationMap
                    pickupLat={selectedBooking.pickup_lat}
                    pickupLng={selectedBooking.pickup_lng}
                    pickupAddress={selectedBooking.pickup_address}
                    dropoffLat={selectedBooking.dropoff_lat}
                    dropoffLng={selectedBooking.dropoff_lng}
                    dropoffAddress={selectedBooking.dropoff_address}
                    passengerName={selectedBooking.passenger_name}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default DriverBookings;
