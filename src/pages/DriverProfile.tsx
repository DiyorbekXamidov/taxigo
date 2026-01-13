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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { vehicleModels, vehicleColors } from '@/data/regions';
import { Camera, Save, ArrowLeft, Loader2, User, Phone, Car } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

const DriverProfile = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    avatar_url: '',
    default_vehicle_model: '',
    default_vehicle_color: 'white',
    default_plate_number: '',
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setSession(session);
        loadProfile(session);
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

  const loadProfile = async (session: Session) => {
    setLoading(true);
    try {
      const metadata = session.user.user_metadata || {};
      
      setFormData({
        name: metadata.name || '',
        phone: metadata.phone || '',
        avatar_url: metadata.avatar_url || '',
        default_vehicle_model: metadata.default_vehicle_model || vehicleModels[0],
        default_vehicle_color: metadata.default_vehicle_color || 'white',
        default_plate_number: metadata.default_plate_number || '',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;

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
      const fileName = `${session.user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      await supabase.storage
        .from('avatars')
        .remove([fileName]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add timestamp to bust cache
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      
      setFormData(prev => ({ ...prev, avatar_url: avatarUrl }));

      toast({
        title: "Muvaffaqiyatli",
        description: "Rasm yuklandi",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Xatolik",
        description: error.message || "Rasm yuklashda xatolik yuz berdi",
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
          phone: formData.phone,
          avatar_url: formData.avatar_url,
          default_vehicle_model: formData.default_vehicle_model,
          default_vehicle_color: formData.default_vehicle_color,
          default_plate_number: formData.default_plate_number,
        }
      });

      if (error) throw error;

      toast({
        title: "Muvaffaqiyatli",
        description: "Profil ma'lumotlari saqlandi",
      });

      navigate('/driver');
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message,
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
          onClick={() => navigate('/driver')}
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
                      {formData.name ? getInitials(formData.name) : <User className="w-8 h-8" />}
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
                  <User className="w-5 h-5" />
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

              {/* Vehicle Info Section */}
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
