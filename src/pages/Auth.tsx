import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Car, Mail, Lock, User, Phone, Eye, EyeOff, Users } from 'lucide-react';
import TelegramLoginButton from '@/components/TelegramLoginButton';
import { Separator } from '@/components/ui/separator';
import { vehicleModels } from '@/data/regions';

const Auth = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<'driver' | 'passenger'>('passenger');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    // Driver fields
    vehicleModel: '',
    customVehicleModel: '',
    vehicleColor: '',
    plateNumber: '',
  });

  // Helper to determine redirect path based on user type
  const getRedirectPath = (session: { user: { user_metadata?: { is_driver?: boolean; user_type?: string } } }) => {
    const metadata = session.user.user_metadata || {};
    if (metadata.is_driver === true || metadata.user_type === 'driver') {
      return '/driver';
    }
    return '/passenger';
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(getRedirectPath(session));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate(getRedirectPath(session));
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: language === 'uz-latin' 
            ? "Tizimga muvaffaqiyatli kirdingiz" 
            : "Тизимга муваффақиятли кирдингиз",
        });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const userData = {
          name: formData.name,
          phone: formData.phone,
          is_driver: userType === 'driver',
          user_type: userType,
          // Driver specific
          vehicle_model: userType === 'driver' ? (formData.vehicleModel === 'other' ? formData.customVehicleModel : formData.vehicleModel) : null,
          vehicle_color: userType === 'driver' ? formData.vehicleColor : null,
          plate_number: userType === 'driver' ? formData.plateNumber : null,
        };

        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: userData,
          },
        });

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: language === 'uz-latin' 
            ? "Ro'yxatdan muvaffaqiyatli o'tdingiz" 
            : "Рўйхатдан муваффақиятли ўтдингиз",
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg border-border bg-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? t('auth.login') : t('auth.register')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User Type Selection - only for registration */}
              {!isLogin && (
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => setUserType('passenger')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
                      userType === 'passenger'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    {language === 'uz-latin' ? "Yo'lovchi" : "Йўловчи"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('driver')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
                      userType === 'driver'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Car className="w-4 h-4" />
                    {language === 'uz-latin' ? "Haydovchi" : "Ҳайдовчи"}
                  </button>
                </div>
              )}

              {/* Basic fields for registration */}
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('auth.name')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder={t('auth.name')}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('auth.phone')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+998 90 123 45 67"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Driver-specific fields */}
              {!isLogin && userType === 'driver' && (
                <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    {language === 'uz-latin' ? "Avtomobil ma'lumotlari" : "Автомобил маълумотлари"}
                  </h3>
                  
                  <div className="space-y-2">
                    <Label>{language === 'uz-latin' ? "Avtomobil modeli" : "Автомобил модели"}</Label>
                    <Select 
                      value={formData.vehicleModel} 
                      onValueChange={(v) => setFormData({...formData, vehicleModel: v, customVehicleModel: ''})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'uz-latin' ? "Tanlang" : "Танланг"} />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleModels.map((model) => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                        <SelectItem value="other">{language === 'uz-latin' ? "Boshqa..." : "Бошқа..."}</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.vehicleModel === 'other' && (
                      <Input
                        placeholder={language === 'uz-latin' ? "Avtomobil modelini kiriting" : "Автомобил моделини киритинг"}
                        value={formData.customVehicleModel}
                        onChange={(e) => setFormData({ ...formData, customVehicleModel: e.target.value })}
                        className="mt-2"
                        required
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{language === 'uz-latin' ? "Rang" : "Ранг"}</Label>
                      <Select 
                        value={formData.vehicleColor} 
                        onValueChange={(v) => setFormData({...formData, vehicleColor: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'uz-latin' ? "Tanlang" : "Танланг"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="white">{language === 'uz-latin' ? "Oq" : "Оқ"}</SelectItem>
                          <SelectItem value="black">{language === 'uz-latin' ? "Qora" : "Қора"}</SelectItem>
                          <SelectItem value="silver">{language === 'uz-latin' ? "Kumush" : "Кумуш"}</SelectItem>
                          <SelectItem value="gray">{language === 'uz-latin' ? "Kulrang" : "Кулранг"}</SelectItem>
                          <SelectItem value="red">{language === 'uz-latin' ? "Qizil" : "Қизил"}</SelectItem>
                          <SelectItem value="blue">{language === 'uz-latin' ? "Ko'k" : "Кўк"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{language === 'uz-latin' ? "Davlat raqami" : "Давлат рақами"}</Label>
                      <Input
                        placeholder="01 A 123 AA"
                        value={formData.plateNumber}
                        onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}



              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? t('common.loading') : (isLogin ? t('auth.login') : t('auth.register'))}
              </Button>
            </form>

            <div className="mt-6">
              <Separator className="my-4" />
              <p className="text-center text-sm text-muted-foreground mb-4">
                {language === 'uz-latin' ? 'yoki' : 'ёки'}
              </p>
              
              <TelegramLoginButton />
              
              <Button
                type="button"
                variant="outline"
                className="w-full mt-3 flex items-center justify-center gap-2"
                onClick={async () => {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/driver`,
                    },
                  });
                  if (error) {
                    toast({
                      title: t('common.error'),
                      description: error.message,
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google orqali kirish
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? t('auth.register') : t('auth.login')}
              </button>
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Auth;
