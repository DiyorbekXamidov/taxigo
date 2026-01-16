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
import { auth, db } from '@/integrations/firebase/client';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Car, Mail, Lock, User, Phone, Eye, EyeOff, Users } from 'lucide-react';
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
  const getRedirectPath = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.is_driver === true || userData.user_type === 'driver') {
          return '/driver';
        }
      }
      return '/passenger';
    } catch {
      return '/passenger';
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const path = await getRedirectPath(user.uid);
        navigate(path);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);

        toast({
          title: t('common.success'),
          description: language === 'uz-latin' 
            ? "Tizimga muvaffaqiyatli kirdingiz" 
            : "Тизимга муваффақиятли кирдингиз",
        });
      } else {
        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        
        // Save user data to Firestore
        const userData = {
          uid: userCredential.user.uid,
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          is_driver: userType === 'driver',
          user_type: userType,
          // Driver specific
          vehicle_model: userType === 'driver' ? (formData.vehicleModel === 'other' ? formData.customVehicleModel : formData.vehicleModel) : null,
          vehicle_color: userType === 'driver' ? formData.vehicleColor : null,
          plate_number: userType === 'driver' ? formData.plateNumber : null,
          created_at: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', userCredential.user.uid), userData);

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

  const texts = {
    login: language === 'uz-latin' ? 'Kirish' : 'Кириш',
    register: language === 'uz-latin' ? "Ro'yxatdan o'tish" : "Рўйхатдан ўтиш",
    email: language === 'uz-latin' ? 'Email manzil' : 'Email манзил',
    password: language === 'uz-latin' ? 'Parol' : 'Парол',
    name: language === 'uz-latin' ? 'Ismingiz' : 'Исмингиз',
    phone: language === 'uz-latin' ? 'Telefon raqam' : 'Телефон рақам',
    vehicle: language === 'uz-latin' ? 'Avtomobil modeli' : 'Автомобил модели',
    color: language === 'uz-latin' ? 'Rangi' : 'Ранги',
    plateNumber: language === 'uz-latin' ? 'Davlat raqami' : 'Давлат рақами',
    noAccount: language === 'uz-latin' ? "Hisobingiz yo'qmi?" : "Ҳисобингиз йўқми?",
    hasAccount: language === 'uz-latin' ? "Hisobingiz bormi?" : "Ҳисобингиз борми?",
    driver: language === 'uz-latin' ? "Haydovchi" : "Ҳайдовчи",
    passenger: language === 'uz-latin' ? "Yo'lovchi" : "Йўловчи",
    registerAs: language === 'uz-latin' ? "Sifatida ro'yxatdan o'ting:" : "Сифатида рўйхатдан ўтинг:",
    otherModel: language === 'uz-latin' ? "Boshqa model" : "Бошқа модел",
    enterModel: language === 'uz-latin' ? "Modelni kiriting" : "Моделни киритинг",
  };

  const colorOptions = [
    { value: 'white', label: language === 'uz-latin' ? 'Oq' : 'Оқ' },
    { value: 'black', label: language === 'uz-latin' ? 'Qora' : 'Қора' },
    { value: 'silver', label: language === 'uz-latin' ? 'Kumush' : 'Кумуш' },
    { value: 'grey', label: language === 'uz-latin' ? 'Kulrang' : 'Кулранг' },
    { value: 'red', label: language === 'uz-latin' ? 'Qizil' : 'Қизил' },
    { value: 'blue', label: language === 'uz-latin' ? "Ko'k" : 'Кўк' },
    { value: 'green', label: language === 'uz-latin' ? "Yashil" : 'Яшил' },
    { value: 'yellow', label: language === 'uz-latin' ? "Sariq" : 'Сариқ' },
    { value: 'brown', label: language === 'uz-latin' ? "Jigarrang" : 'Жигарранг' },
    { value: 'beige', label: language === 'uz-latin' ? "Bej" : 'Беж' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-20 flex items-center justify-center">
        <Card className="w-full max-w-md glass">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {isLogin ? texts.login : texts.register}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User Type Selection for Registration */}
              {!isLogin && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{texts.registerAs}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={userType === 'passenger' ? 'default' : 'outline'}
                      onClick={() => setUserType('passenger')}
                      className="flex-1"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {texts.passenger}
                    </Button>
                    <Button
                      type="button"
                      variant={userType === 'driver' ? 'default' : 'outline'}
                      onClick={() => setUserType('driver')}
                      className="flex-1"
                    >
                      <Car className="w-4 h-4 mr-2" />
                      {texts.driver}
                    </Button>
                  </div>
                </div>
              )}

              {/* Name and Phone first for registration */}
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">{texts.name}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        className="pl-10"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{texts.phone}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+998"
                        className="pl-10"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email and Password */}
              <div className="space-y-2">
                <Label htmlFor="email">{texts.email}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{texts.password}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-10 pr-10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Driver specific fields */}
              {!isLogin && userType === 'driver' && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Car className="w-5 h-5" />
                      <span className="font-medium">
                        {language === 'uz-latin' ? "Avtomobil ma'lumotlari" : "Автомобил маълумотлари"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label>{texts.vehicle}</Label>
                      <Select
                        value={formData.vehicleModel}
                        onValueChange={(value) => setFormData({ ...formData, vehicleModel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={texts.vehicle} />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                          <SelectItem value="other">{texts.otherModel}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.vehicleModel === 'other' && (
                      <div className="space-y-2">
                        <Label>{texts.enterModel}</Label>
                        <Input
                          type="text"
                          value={formData.customVehicleModel}
                          onChange={(e) => setFormData({ ...formData, customVehicleModel: e.target.value })}
                          placeholder={texts.enterModel}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>{texts.color}</Label>
                      <Select
                        value={formData.vehicleColor}
                        onValueChange={(value) => setFormData({ ...formData, vehicleColor: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={texts.color} />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              {color.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{texts.plateNumber}</Label>
                      <Input
                        type="text"
                        placeholder="01 A 123 AA"
                        value={formData.plateNumber}
                        onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  isLogin ? texts.login : texts.register
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              {isLogin ? (
                <p>
                  {texts.noAccount}{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setIsLogin(false)}
                  >
                    {texts.register}
                  </button>
                </p>
              ) : (
                <p>
                  {texts.hasAccount}{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setIsLogin(true)}
                  >
                    {texts.login}
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Auth;
