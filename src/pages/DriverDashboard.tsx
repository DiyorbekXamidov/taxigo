import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TelegramConnection from '@/components/TelegramConnection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMobileKeyboardScroll } from '@/hooks/useMobileKeyboardScroll';
import { surxondaryoRegion, regionalCenters, vehicleModels, vehicleColors } from '@/data/regions';
import { Plus, Edit2, Trash2, Pause, Play, Car, ArrowRight, Clock, Users, Settings, CalendarCheck } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

interface TaxiTrip {
  id: string;
  from_district: string;
  to_district: string;
  departure_time: string;
  departure_date: string;
  total_seats: number;
  occupied_seats: number;
  price_per_seat: number;
  vehicle_model: string;
  vehicle_color: string;
  plate_number: string | null;
  has_air_conditioner: boolean;
  has_large_luggage: boolean;
  smoking_allowed: boolean;
  music_preference: string | null;
  for_women: boolean;
  is_active: boolean;
}

const DriverDashboard = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  useMobileKeyboardScroll(); // Auto-scroll inputs into view on mobile
  const [session, setSession] = useState<Session | null>(null);
  const [trips, setTrips] = useState<TaxiTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TaxiTrip | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  const [formData, setFormData] = useState({
    from_district: '',
    to_district: '',
    departure_time: '',
    departure_date: '',
    total_seats: 4,
    occupied_seats: 0,
    price_per_seat: 30000,
    vehicle_model: vehicleModels[0],
    vehicle_color: 'white',
    plate_number: '',
    has_air_conditioner: true,
    has_large_luggage: false,
    smoking_allowed: false,
    music_preference: '',
    for_women: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setSession(session);
        const metadata = session.user.user_metadata || {};
        setDriverName(metadata.name || '');
        setDriverPhone(metadata.phone || '');
        
        // Auto-fill vehicle info from profile settings
        if (metadata.default_vehicle_model || metadata.default_vehicle_color || metadata.default_plate_number) {
          setFormData(prev => ({
            ...prev,
            vehicle_model: metadata.default_vehicle_model || prev.vehicle_model,
            vehicle_color: metadata.default_vehicle_color || prev.vehicle_color,
            plate_number: metadata.default_plate_number || prev.plate_number,
          }));
        }
        
        fetchTrips(session.user.id);
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

  const fetchTrips = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('taxi_trips')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      const tripData = {
        ...formData,
        user_id: session.user.id,
        driver_name: driverName,
        phone: driverPhone,
        is_active: true,
        rating: 0,
        review_count: 0,
      };

      if (editingTrip) {
        // Track what changed for notification
        const changes: { field: string; old_value: string; new_value: string }[] = [];
        if (editingTrip.departure_time !== formData.departure_time) {
          changes.push({ field: 'departure_time', old_value: editingTrip.departure_time, new_value: formData.departure_time });
        }
        if (editingTrip.departure_date !== formData.departure_date) {
          changes.push({ field: 'departure_date', old_value: editingTrip.departure_date, new_value: formData.departure_date });
        }
        if (editingTrip.from_district !== formData.from_district) {
          changes.push({ field: 'from_district', old_value: editingTrip.from_district, new_value: formData.from_district });
        }
        if (editingTrip.to_district !== formData.to_district) {
          changes.push({ field: 'to_district', old_value: editingTrip.to_district, new_value: formData.to_district });
        }
        if (editingTrip.price_per_seat !== formData.price_per_seat) {
          changes.push({ field: 'price_per_seat', old_value: String(editingTrip.price_per_seat), new_value: String(formData.price_per_seat) });
        }

        const { error } = await supabase
          .from('taxi_trips')
          .update(tripData)
          .eq('id', editingTrip.id);

        if (error) throw error;

        // Notify booked passengers about changes
        if (changes.length > 0) {
          try {
            // Get bookings for this trip
            const { data: bookings } = await supabase
              .from('bookings')
              .select('passenger_name, passenger_telegram_chat_id')
              .eq('trip_id', editingTrip.id)
              .eq('status', 'confirmed');

            if (bookings && bookings.length > 0) {
              const passengers = bookings.map(b => ({
                name: b.passenger_name,
                telegram_chat_id: b.passenger_telegram_chat_id
              }));

              await supabase.functions.invoke('notify-passengers', {
                body: {
                  action: 'trip_updated',
                  trip: {
                    from_district: formData.from_district,
                    to_district: formData.to_district,
                    departure_date: formData.departure_date,
                    departure_time: formData.departure_time,
                    driver_name: driverName
                  },
                  passengers,
                  changes
                }
              });
            }
          } catch (notifyError) {
            console.error('Failed to notify passengers:', notifyError);
          }
        }

        toast({
          title: t('common.success'),
          description: t('home.title') === 'Ishonchli taksi xizmati' 
            ? "Sayohat yangilandi" 
            : "Саёҳат янгиланди",
        });
      } else {
        const { error } = await supabase
          .from('taxi_trips')
          .insert([tripData]);

        if (error) throw error;
        toast({
          title: t('common.success'),
          description: t('home.title') === 'Ishonchli taksi xizmati' 
            ? "Sayohat qo'shildi" 
            : "Саёҳат қўшилди",
        });
      }

      setIsDialogOpen(false);
      setEditingTrip(null);
      resetForm();
      fetchTrips(session.user.id);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (trip: TaxiTrip) => {
    try {
      const { error } = await supabase
        .from('taxi_trips')
        .update({ is_active: !trip.is_active })
        .eq('id', trip.id);

      if (error) throw error;
      if (session) fetchTrips(session.user.id);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from('taxi_trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;
      toast({
        title: t('common.success'),
        description: t('home.title') === 'Ishonchli taksi xizmati' 
          ? "Sayohat o'chirildi" 
          : "Саёҳат ўчирилди",
      });
      if (session) fetchTrips(session.user.id);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (trip: TaxiTrip) => {
    setEditingTrip(trip);
    setFormData({
      from_district: trip.from_district,
      to_district: trip.to_district,
      departure_time: trip.departure_time,
      departure_date: trip.departure_date,
      total_seats: trip.total_seats,
      occupied_seats: trip.occupied_seats,
      price_per_seat: trip.price_per_seat,
      vehicle_model: trip.vehicle_model,
      vehicle_color: trip.vehicle_color,
      plate_number: trip.plate_number || '',
      has_air_conditioner: trip.has_air_conditioner,
      has_large_luggage: trip.has_large_luggage,
      smoking_allowed: trip.smoking_allowed,
      music_preference: trip.music_preference || '',
      for_women: trip.for_women,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      from_district: '',
      to_district: '',
      departure_time: '',
      departure_date: '',
      total_seats: 4,
      occupied_seats: 0,
      price_per_seat: 30000,
      vehicle_model: vehicleModels[0],
      vehicle_color: 'white',
      plate_number: '',
      has_air_conditioner: true,
      has_large_luggage: false,
      smoking_allowed: false,
      music_preference: '',
      for_women: false,
    });
  };

  const getDistrictName = (districtId: string) => {
    // Handle multiple districts separated by comma
    const ids = districtId.split(',').filter(Boolean);
    const names = ids.map(id => {
      const district = surxondaryoRegion.districts.find(d => d.id === id);
      if (district) return district.name[language].toUpperCase();
      const center = regionalCenters.find(r => r.id === id);
      return center ? center.name[language].toUpperCase() : id.toUpperCase();
    });
    return names.join(', ');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Telegram Connection */}
        {session && (
          <div className="mb-6">
            <TelegramConnection userId={session.user.id} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('driver.dashboard')}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => navigate('/driver/bookings')}
            >
              <CalendarCheck className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{language === 'uz-latin' ? "Band qilishlar" : "Банд қилишлар"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => navigate('/driver/profile')}
            >
              <Settings className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{language === 'uz-latin' ? "Profil" : "Профил"}</span>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingTrip(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('driver.addTrip')}</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTrip ? t('driver.editTrip') : t('driver.addTrip')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Driver info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('auth.name')}</Label>
                    <Input
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('auth.phone')}</Label>
                    <Input
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Route */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('home.from')}</Label>
                    <Select value={formData.from_district.split(',')[0] || ''} onValueChange={(v) => {
                      // Clear to_district if it's the same as the new from_district
                      if (formData.to_district.split(',').includes(v)) {
                        setFormData({...formData, from_district: v, to_district: ''});
                      } else {
                        setFormData({...formData, from_district: v});
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">SURXONDARYO TUMANLARI</div>
                        {surxondaryoRegion.districts.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name[language].toUpperCase()}</SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1">VILOYAT MARKAZLARI</div>
                        {regionalCenters.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name[language].toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('home.to')}</Label>
                    <Select value={formData.to_district.split(',')[0] || ''} onValueChange={(v) => {
                      if (formData.from_district.split(',').includes(v)) {
                        return;
                      }
                      setFormData({...formData, to_district: v});
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">SURXONDARYO TUMANLARI</div>
                        {surxondaryoRegion.districts.filter(d => !formData.from_district.split(',').includes(d.id)).map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name[language].toUpperCase()}</SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1">VILOYAT MARKAZLARI</div>
                        {regionalCenters.filter(r => !formData.from_district.split(',').includes(r.id)).map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name[language].toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Additional Pickup Points - shown when destination is a regional center (going FROM districts TO city) */}
                {regionalCenters.some(r => r.id === formData.to_district) && formData.from_district && !regionalCenters.some(r => r.id === formData.from_district.split(',')[0]) && (
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <Label className="text-sm font-medium">
                      {language === 'uz-latin' ? "QO'SHIMCHA YO'LOVCHI OLISH NUQTALARI" : "ҚЎШИМЧА ЙЎЛОВЧИ ОЛИШ НУҚТАЛАРИ"}
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {language === 'uz-latin' 
                        ? "Yo'lda qaysi tumanlardan ham yo'lovchi olasiz?" 
                        : "Йўлда қайси туманлардан ҳам йўловчи оласиз?"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {surxondaryoRegion.districts
                        .filter(d => d.id !== formData.from_district.split(',')[0])
                        .map((d) => {
                          const isSelected = formData.from_district.split(',').includes(d.id);
                          return (
                            <div key={d.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`pickup-${d.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const currentPickups = formData.from_district.split(',').filter(Boolean);
                                  const mainPickup = currentPickups[0];
                                  if (checked) {
                                    setFormData({
                                      ...formData, 
                                      from_district: [mainPickup, ...currentPickups.slice(1), d.id].join(',')
                                    });
                                  } else {
                                    setFormData({
                                      ...formData, 
                                      from_district: currentPickups.filter(id => id !== d.id).join(',')
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`pickup-${d.id}`} className="text-sm font-normal cursor-pointer">
                                {d.name[language].toUpperCase()}
                              </Label>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Additional Dropoff Points - shown when starting FROM a regional center (going FROM city TO districts) */}
                {regionalCenters.some(r => r.id === formData.from_district.split(',')[0]) && formData.to_district && !regionalCenters.some(r => r.id === formData.to_district) && (
                  <div className="space-y-2 p-3 bg-primary/10 rounded-lg">
                    <Label className="text-sm font-medium">
                      {language === 'uz-latin' ? "QO'SHIMCHA TUSHIRISH NUQTALARI" : "ҚЎШИМЧА ТУШИРИШ НУҚТАЛАРИ"}
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {language === 'uz-latin' 
                        ? "Yo'lda qaysi tumanlarga ham yo'lovchi olib borasiz?" 
                        : "Йўлда қайси туманларга ҳам йўловчи олиб борасиз?"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {surxondaryoRegion.districts
                        .filter(d => d.id !== formData.to_district.split(',')[0])
                        .map((d) => {
                          const isSelected = formData.to_district.split(',').includes(d.id);
                          return (
                            <div key={d.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`dropoff-${d.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const currentDropoffs = formData.to_district.split(',').filter(Boolean);
                                  const mainDropoff = currentDropoffs[0];
                                  if (checked) {
                                    setFormData({
                                      ...formData, 
                                      to_district: [mainDropoff, ...currentDropoffs.slice(1), d.id].join(',')
                                    });
                                  } else {
                                    setFormData({
                                      ...formData, 
                                      to_district: currentDropoffs.filter(id => id !== d.id).join(',')
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`dropoff-${d.id}`} className="text-sm font-normal cursor-pointer">
                                {d.name[language].toUpperCase()}
                              </Label>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Time and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('driver.departureTime')}</Label>
                    <Input
                      type="time"
                      value={formData.departure_time}
                      onChange={(e) => setFormData({...formData, departure_time: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('home.date')}</Label>
                    <Input
                      type="date"
                      value={formData.departure_date}
                      onChange={(e) => setFormData({...formData, departure_date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                {/* Seats and Price */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('driver.totalSeats')}</Label>
                    <Select value={formData.total_seats.toString()} onValueChange={(v) => setFormData({...formData, total_seats: parseInt(v)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6].map((n) => (
                          <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('driver.occupiedSeats')}</Label>
                    <Select value={formData.occupied_seats.toString()} onValueChange={(v) => setFormData({...formData, occupied_seats: parseInt(v)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length: formData.total_seats + 1}, (_, i) => i).map((n) => (
                          <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('driver.pricePerSeat')}</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formData.price_per_seat.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, '');
                        const numValue = parseInt(value) || 0;
                        setFormData({...formData, price_per_seat: numValue});
                      }}
                      placeholder="50 000"
                      required
                    />
                  </div>
                </div>

                {/* Vehicle */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('driver.vehicleModel')}</Label>
                    <Select value={formData.vehicle_model} onValueChange={(v) => setFormData({...formData, vehicle_model: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleModels.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('driver.vehicleColor')}</Label>
                    <Select value={formData.vehicle_color} onValueChange={(v) => setFormData({...formData, vehicle_color: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(vehicleColors).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val[language]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('driver.plateNumber')}</Label>
                  <Input
                    value={formData.plate_number}
                    onChange={(e) => setFormData({...formData, plate_number: e.target.value})}
                    placeholder="01 A 123 AA"
                  />
                </div>

                {/* Comfort options */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ac"
                      checked={formData.has_air_conditioner}
                      onCheckedChange={(c) => setFormData({...formData, has_air_conditioner: !!c})}
                    />
                    <Label htmlFor="ac" className="font-normal cursor-pointer">{t('detail.airConditioner')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="luggage"
                      checked={formData.has_large_luggage}
                      onCheckedChange={(c) => setFormData({...formData, has_large_luggage: !!c})}
                    />
                    <Label htmlFor="luggage" className="font-normal cursor-pointer">{t('detail.largeLuggage')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="smoking"
                      checked={formData.smoking_allowed}
                      onCheckedChange={(c) => setFormData({...formData, smoking_allowed: !!c})}
                    />
                    <Label htmlFor="smoking" className="font-normal cursor-pointer">{t('detail.smoking')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="women"
                      checked={formData.for_women}
                      onCheckedChange={(c) => setFormData({...formData, for_women: !!c})}
                    />
                    <Label htmlFor="women" className="font-normal cursor-pointer">{t('taxi.forWomen')}</Label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    {t('driver.cancel')}
                  </Button>
                  <Button type="submit" className="flex-1 bg-primary text-primary-foreground">
                    {t('driver.save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : trips.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center">
              <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('driver.noTrips')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('home.title') === 'Ishonchli taksi xizmati' 
                  ? "Yangi sayohat qo'shing va yo'lovchilarni toping" 
                  : "Янги саёҳат қўшинг ва йўловчиларни топинг"}
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                {t('driver.addTrip')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {trips.map((trip) => (
              <Card key={trip.id} className={`border-border bg-card ${!trip.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 text-lg font-semibold text-foreground mb-2">
                        <span>{getDistrictName(trip.from_district)}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <span>{getDistrictName(trip.to_district)}</span>
                        {!trip.is_active && (
                          <Badge variant="secondary" className="ml-2">
                            {t('driver.pause')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {trip.departure_time} - {trip.departure_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {trip.total_seats - trip.occupied_seats}/{trip.total_seats}
                        </span>
                        <span className="font-semibold text-primary">
                          {formatPrice(trip.price_per_seat)} {t('common.sum')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(trip)}
                      >
                        {trip.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(trip)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(trip.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default DriverDashboard;
