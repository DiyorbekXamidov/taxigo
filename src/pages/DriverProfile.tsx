import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { auth, db, storage } from '@/integrations/firebase/client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { vehicleModels, vehicleColors } from '@/data/regions';
import { Camera, Save, ArrowLeft, Loader2, User as UserIcon, Phone, Car } from 'lucide-react';

const DriverProfile = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    avatar_url: '',
    default_vehicle_model: '',
    default_vehicle_color: 'white',
    default_plate_number: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate('/auth');
      } else {
        setUser(firebaseUser);
        await loadProfile(firebaseUser.uid);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check if user is driver
        const userIsDriver = userData.is_driver === true || userData.user_type === 'driver';
        setIsDriver(userIsDriver);
        
        setFormData({
          name: userData.name || '',
          phone: userData.phone || '',
          avatar_url: userData.avatar_url || '',
          default_vehicle_model: userData.vehicle_model || vehicleModels[0],
          default_vehicle_color: userData.vehicle_color || 'white',
          default_plate_number: userData.plate_number || '',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Xatolik",
        description: "Faqat rasm fayllari yuklash mumkin",
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Xatolik",
        description: "Rasm hajmi 5MB dan oshmasligi kerak",
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.uid}/avatar.${fileExt}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const avatarUrl = await getDownloadURL(storageRef);
      
      setFormData(prev => ({ ...prev, avatar_url: avatarUrl }));

      toast({
        title: "Muvaffaqiyatli",
        description: "Rasm yuklandi",
      });
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Rasm yuklashda xatolik yuz berdi';
      toast({
        title: "Xatolik",
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      // Update user data in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        phone: formData.phone,
        avatar_url: formData.avatar_url,
        vehicle_model: formData.default_vehicle_model,
        vehicle_color: formData.default_vehicle_color,
        plate_number: formData.default_plate_number,
      });

      toast({
        title: "Muvaffaqiyatli",
        description: "Profil ma'lumotlari saqlandi",
      });

      navigate(isDriver ? '/driver' : '/passenger');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Xatolik yuz berdi';
      toast({
        title: "Xatolik",
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
          onClick={() => navigate(isDriver ? '/driver' : '/passenger')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>

        <Card className="max-w-2xl mx-auto border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {language === 'uz-latin' ? "Profil sozlamalari" : "Профил созламалари"}
            </CardTitle>
            <CardDescription>
              {language === 'uz-latin' 
                ? "Ism, rasm va mashina ma'lumotlarini tahrirlang"
                : "Исм, расм ва машина маълумотларини таҳрирланг"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="w-24 h-24 cursor-pointer" onClick={handleAvatarClick}>
                    <AvatarImage src={formData.avatar_url} alt={formData.name} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {formData.name ? getInitials(formData.name) : <UserIcon className="w-8 h-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground">
                  {language === 'uz-latin' 
                    ? "Rasmni o'zgartirish uchun bosing"
                    : "Расмни ўзгартириш учун босинг"}
                </p>
              </div>

              {/* Personal Info Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  {language === 'uz-latin' ? "Shaxsiy ma'lumotlar" : "Шахсий маълумотлар"}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('auth.name')}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ismingiz"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('auth.phone')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+998 90 123 45 67"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle Info Section - Only for Drivers */}
              {isDriver && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    {language === 'uz-latin' ? "Mashina ma'lumotlari" : "Машина маълумотлари"}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('driver.vehicleModel')}</Label>
                      <Select 
                        value={formData.default_vehicle_model} 
                        onValueChange={(v) => setFormData({...formData, default_vehicle_model: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
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
                      <Select 
                        value={formData.default_vehicle_color} 
                        onValueChange={(v) => setFormData({...formData, default_vehicle_color: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
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
                      value={formData.default_plate_number}
                      onChange={(e) => setFormData({...formData, default_plate_number: e.target.value})}
                      placeholder="01 A 123 AA"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'uz-latin' ? "Saqlanmoqda..." : "Сақланмоқда..."}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {language === 'uz-latin' ? "Saqlash" : "Сақлаш"}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default DriverProfile;
