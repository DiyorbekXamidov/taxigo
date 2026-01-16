import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { auth, db, sendBookingNotification } from '@/integrations/firebase/client';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { surxondaryoRegion } from '@/data/regions';
import LocationPicker from './LocationPicker';
import LiveLocationSharing from './LiveLocationSharing';
import { CheckCircle } from 'lucide-react';

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

interface BookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trip: {
    id: string;
    from_district: string;
    to_district: string;
    departure_date: string;
    departure_time: string;
    total_seats: number;
    occupied_seats: number;
    price_per_seat: number;
  };
}

const BookingDialog = ({ isOpen, onClose, trip }: BookingDialogProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<LocationData | null>(null);
  const [mapMode, setMapMode] = useState<'pickup' | 'dropoff'>('pickup');
  
  // Success state
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [savedName, setSavedName] = useState('');

  // Pre-fill from user data
  useEffect(() => {
    if (isOpen && auth.currentUser) {
      const uid = auth.currentUser.uid;
      getDoc(doc(db, 'users', uid)).then((userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.name && !name) {
            setName(userData.name);
          }
          if (userData.phone && !phone) {
            setPhone(userData.phone);
          }
        }
      });
    }
  }, [isOpen]);

  const availableSeats = trip.total_seats - trip.occupied_seats;

  const texts = {
    title: language === 'uz-latin' ? "O'rin band qilish" : "Ўрин банд қилиш",
    description: language === 'uz-latin' 
      ? "Ma'lumotlaringizni kiriting va haydovchi siz bilan bog'lanadi" 
      : "Маълумотларингизни киритинг ва ҳайдовчи сиз билан боғланади",
    name: language === 'uz-latin' ? 'Ismingiz' : 'Исмингиз',
    namePlaceholder: language === 'uz-latin' ? "To'liq ismingiz" : "Тўлиқ исмингиз",
    phone: language === 'uz-latin' ? 'Telefon raqamingiz' : 'Телефон рақамингиз',
    phonePlaceholder: language === 'uz-latin' ? '+998 90 123 45 67' : '+998 90 123 45 67',
    seats: language === 'uz-latin' ? "O'rinlar soni" : "Ўринлар сони",
    book: language === 'uz-latin' ? 'Band qilish' : 'Банд қилиш',
    cancel: language === 'uz-latin' ? 'Bekor qilish' : 'Бекор қилиш',
    success: language === 'uz-latin' ? 'Muvaffaqiyatli band qilindi!' : 'Муваффақиятли банд қилинди!',
    successDesc: language === 'uz-latin' 
      ? 'Haydovchi tez orada siz bilan boglanadi' 
      : 'Ҳайдовчи тез орада сиз билан боғланади',
    error: language === 'uz-latin' ? 'Xatolik yuz berdi' : 'Хатолик юз берди',
    total: language === 'uz-latin' ? 'Jami' : 'Жами',
    addLocation: language === 'uz-latin' ? 'Joylashuvni belgilash' : 'Жойлашувни белгилаш',
    hideMap: language === 'uz-latin' ? "Xaritani yashirish" : "Харитани яширлаш",
    locationHint: language === 'uz-latin' 
      ? "Aniq manzilni belgilash haydovchiga sizni topishda yordam beradi"
      : "Аниқ манзилни белгилаш ҳайдовчига сизни топишда ёрдам беради",
    close: language === 'uz-latin' ? 'Yopish' : 'Ёпиш',
    shareLocation: language === 'uz-latin' 
      ? "Haydovchi sizni osonroq topishi uchun jonli joylashuvingizni ulashing"
      : "Ҳайдовчи сизни осонроқ топиши учун жонли жойлашувингизни улашинг",
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  const handleClose = () => {
    // Reset all state
    setName('');
    setPhone('');
    setSeats(1);
    setPickupLocation(null);
    setDropoffLocation(null);
    setShowMap(false);
    setBookingSuccess(false);
    setCreatedBookingId(null);
    setSavedName('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;
    
    setLoading(true);
    try {
      // Get current user
      const user = auth.currentUser;
      
      // Create booking with location data
      const bookingData = {
        trip_id: trip.id,
        user_id: user?.uid || null,
        passenger_name: name.trim(),
        passenger_phone: phone.trim(),
        seats_booked: seats,
        status: 'pending',
        pickup_lat: pickupLocation?.lat || null,
        pickup_lng: pickupLocation?.lng || null,
        pickup_address: pickupLocation?.address || null,
        dropoff_lat: dropoffLocation?.lat || null,
        dropoff_lng: dropoffLocation?.lng || null,
        dropoff_address: dropoffLocation?.address || null,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'bookings'), bookingData);

      // Update occupied seats in taxi_trips
      const tripRef = doc(db, 'taxi_trips', trip.id);
      await updateDoc(tripRef, { 
        occupied_seats: trip.occupied_seats + seats 
      });

      toast({
        title: texts.success,
        description: texts.successDesc,
      });

      // Try to send Telegram notification to driver
      try {
        // Get trip driver info
        const tripDoc = await getDoc(tripRef);
        const tripData = tripDoc.data();
        
        if (tripData?.driver_id) {
          // Get driver's Telegram chat_id
          const telegramDoc = await getDoc(doc(db, 'driver_telegram', tripData.driver_id));
          
          if (telegramDoc.exists()) {
            const driverChatId = telegramDoc.data().chat_id;
            
            // Send notification via Cloud Function
            await sendBookingNotification({
              driverChatId,
              passengerName: name.trim(),
              passengerPhone: phone.trim(),
              passengerCount: seats,
              pickupAddress: pickupLocation?.address || undefined,
              tripFrom: trip.from_district,
              tripTo: trip.to_district,
            });
            console.log('Telegram notification sent to driver');
          }
        }
      } catch (notifyError) {
        // Don't fail booking if notification fails
        console.log('Telegram notification skipped:', notifyError);
      }

      // Show success state with live location sharing option
      setSavedName(name.trim());
      setCreatedBookingId(docRef.id);
      setBookingSuccess(true);
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: texts.error,
        description: error instanceof Error ? error.message : 'Xatolik yuz berdi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        {!bookingSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>{texts.title}</DialogTitle>
              <DialogDescription>{texts.description}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium text-foreground">
                  {getDistrictName(trip.from_district)} → {getDistrictName(trip.to_district)}
                </p>
                <p className="text-muted-foreground">
                  {trip.departure_date} • {trip.departure_time}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">{texts.name}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={texts.namePlaceholder}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">{texts.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={texts.phonePlaceholder}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="seats">{texts.seats}</Label>
                <Input
                  id="seats"
                  type="number"
                  min={1}
                  max={availableSeats}
                  value={seats}
                  onChange={(e) => setSeats(Math.min(availableSeats, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>

              {/* Location section */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowMap(!showMap)}
                >
                  {showMap ? texts.hideMap : texts.addLocation}
                </Button>
                
                {!showMap && (
                  <p className="text-xs text-muted-foreground text-center">{texts.locationHint}</p>
                )}
                
                {showMap && (
                  <LocationPicker
                    pickupLocation={pickupLocation}
                    dropoffLocation={dropoffLocation}
                    onPickupChange={setPickupLocation}
                    onDropoffChange={setDropoffLocation}
                    mode={mapMode}
                    setMode={setMapMode}
                  />
                )}
              </div>
              
              <div className="p-3 bg-primary/10 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{texts.total}:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(trip.price_per_seat * seats)} {language === 'uz-latin' ? "so'm" : "сўм"}
                  </span>
                </div>
              </div>
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                {texts.cancel}
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!name.trim() || !phone.trim() || loading}
                className="bg-primary text-primary-foreground"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                )}
                {texts.book}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle className="w-6 h-6" />
                {texts.success}
              </DialogTitle>
              <DialogDescription>{texts.successDesc}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-4 bg-success/10 rounded-lg text-center border border-success/20">
                <p className="font-medium text-foreground mb-1">
                  {getDistrictName(trip.from_district)} → {getDistrictName(trip.to_district)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {trip.departure_date} • {trip.departure_time}
                </p>
              </div>
              
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-3 text-center">
                  {texts.shareLocation}
                </p>
                
                {createdBookingId && (
                  <LiveLocationSharing
                    bookingId={createdBookingId}
                    passengerName={savedName}
                  />
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                {texts.close}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;