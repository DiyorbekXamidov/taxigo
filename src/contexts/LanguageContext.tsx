import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'uz-latin' | 'uz-cyrillic';

interface Translations {
  [key: string]: {
    'uz-latin': string;
    'uz-cyrillic': string;
  };
}

export const translations: Translations = {
  // Navigation
  'nav.home': { 'uz-latin': "Bosh sahifa", 'uz-cyrillic': "Бош саҳифа" },
  'nav.search': { 'uz-latin': "Taksi qidirish", 'uz-cyrillic': "Такси қидириш" },
  'nav.driver': { 'uz-latin': "Haydovchi", 'uz-cyrillic': "Ҳайдовчи" },
  'nav.login': { 'uz-latin': "Kirish", 'uz-cyrillic': "Кириш" },
  'nav.register': { 'uz-latin': "Ro'yxatdan o'tish", 'uz-cyrillic': "Рўйхатдан ўтиш" },
  'nav.logout': { 'uz-latin': "Chiqish", 'uz-cyrillic': "Чиқиш" },
  'nav.dashboard': { 'uz-latin': "Boshqaruv paneli", 'uz-cyrillic': "Бошқарув панели" },

  // Homepage
  'home.title': { 'uz-latin': "Ishonchli taksi xizmati", 'uz-cyrillic': "Ишончли такси хизмати" },
  'home.subtitle': { 'uz-latin': "Surxondaryo viloyati bo'ylab qulay va arzon sayohat", 'uz-cyrillic': "Сурхондарё вилояти бўйлаб қулай ва арзон саёҳат" },
  'home.from': { 'uz-latin': "Qayerdan", 'uz-cyrillic': "Қаердан" },
  'home.to': { 'uz-latin': "Qayerga", 'uz-cyrillic': "Қаерга" },
  'home.date': { 'uz-latin': "Sana", 'uz-cyrillic': "Сана" },
  'home.passengers': { 'uz-latin': "Yo'lovchilar soni", 'uz-cyrillic': "Йўловчилар сони" },
  'home.search': { 'uz-latin': "Taksi topish", 'uz-cyrillic': "Такси топиш" },
  'home.popular': { 'uz-latin': "Mashhur yo'nalishlar", 'uz-cyrillic': "Машҳур йўналишлар" },
  'home.howItWorks': { 'uz-latin': "Qanday ishlaydi", 'uz-cyrillic': "Қандай ишлайди" },
  'home.step1Title': { 'uz-latin': "Yo'nalishni tanlang", 'uz-cyrillic': "Йўналишни танланг" },
  'home.step1Desc': { 'uz-latin': "Qayerdan va qayerga borishni kiriting", 'uz-cyrillic': "Қаердан ва қаерга боришни киритинг" },
  'home.step2Title': { 'uz-latin': "Taksi tanlang", 'uz-cyrillic': "Такси танланг" },
  'home.step2Desc': { 'uz-latin': "Mavjud taksilardan sizga mosini tanlang", 'uz-cyrillic': "Мавжуд таксилардан сизга мосини танланг" },
  'home.step3Title': { 'uz-latin': "Bog'laning", 'uz-cyrillic': "Боғланинг" },
  'home.step3Desc': { 'uz-latin': "Haydovchi bilan to'g'ridan-to'g'ri bog'laning", 'uz-cyrillic': "Ҳайдовчи билан тўғридан-тўғри боғланинг" },

  // Taxi listing
  'taxi.available': { 'uz-latin': "bo'sh joy", 'uz-cyrillic': "бўш жой" },
  'taxi.occupied': { 'uz-latin': "band", 'uz-cyrillic': "банд" },
  'taxi.seats': { 'uz-latin': "o'rin", 'uz-cyrillic': "ўрин" },
  'taxi.perSeat': { 'uz-latin': "har bir o'rin", 'uz-cyrillic': "ҳар бир ўрин" },
  'taxi.departure': { 'uz-latin': "Jo'nash vaqti", 'uz-cyrillic': "Жўнаш вақти" },
  'taxi.call': { 'uz-latin': "Qo'ng'iroq", 'uz-cyrillic': "Қўнғироқ" },
  'taxi.details': { 'uz-latin': "Batafsil", 'uz-cyrillic': "Батафсил" },
  'taxi.noResults': { 'uz-latin': "Taksi topilmadi", 'uz-cyrillic': "Такси топилмади" },
  'taxi.filters': { 'uz-latin': "Filtrlar", 'uz-cyrillic': "Фильтрлар" },
  'taxi.availableOnly': { 'uz-latin': "Faqat bo'sh joylar", 'uz-cyrillic': "Фақат бўш жойлар" },
  'taxi.cheapest': { 'uz-latin': "Eng arzon", 'uz-cyrillic': "Энг арзон" },
  'taxi.earliest': { 'uz-latin': "Eng erta", 'uz-cyrillic': "Энг эрта" },
  'taxi.airConditioner': { 'uz-latin': "Konditsioner", 'uz-cyrillic': "Кондиционер" },
  'taxi.forWomen': { 'uz-latin': "Ayollar uchun", 'uz-cyrillic': "Аёллар учун" },

  // Taxi detail
  'detail.driver': { 'uz-latin': "Haydovchi", 'uz-cyrillic': "Ҳайдовчи" },
  'detail.vehicle': { 'uz-latin': "Avtomobil", 'uz-cyrillic': "Автомобил" },
  'detail.color': { 'uz-latin': "Rang", 'uz-cyrillic': "Ранг" },
  'detail.comfort': { 'uz-latin': "Qulayliklar", 'uz-cyrillic': "Қулайликлар" },
  'detail.airConditioner': { 'uz-latin': "Konditsioner bor", 'uz-cyrillic': "Кондиционер бор" },
  'detail.noAirConditioner': { 'uz-latin': "Konditsioner yo'q", 'uz-cyrillic': "Кондиционер йўқ" },
  'detail.largeLuggage': { 'uz-latin': "Katta yuk joyi", 'uz-cyrillic': "Катта юк жойи" },
  'detail.smoking': { 'uz-latin': "Chekish mumkin", 'uz-cyrillic': "Чекиш мумкин" },
  'detail.noSmoking': { 'uz-latin': "Chekish mumkin emas", 'uz-cyrillic': "Чекиш мумкин эмас" },
  'detail.music': { 'uz-latin': "Musiqa", 'uz-cyrillic': "Мусиқа" },
  'detail.rating': { 'uz-latin': "Reyting", 'uz-cyrillic': "Рейтинг" },
  'detail.reviews': { 'uz-latin': "sharh", 'uz-cyrillic': "шарҳ" },
  'detail.book': { 'uz-latin': "Band qilish", 'uz-cyrillic': "Банд қилиш" },
  'detail.route': { 'uz-latin': "Yo'nalish", 'uz-cyrillic': "Йўналиш" },
  'detail.price': { 'uz-latin': "Narx", 'uz-cyrillic': "Нарх" },

  // Driver dashboard
  'driver.dashboard': { 'uz-latin': "Haydovchi paneli", 'uz-cyrillic': "Ҳайдовчи панели" },
  'driver.myTrips': { 'uz-latin': "Mening sayohatlarim", 'uz-cyrillic': "Менинг саёҳатларим" },
  'driver.addTrip': { 'uz-latin': "Yangi sayohat qo'shish", 'uz-cyrillic': "Янги саёҳат қўшиш" },
  'driver.editTrip': { 'uz-latin': "Sayohatni tahrirlash", 'uz-cyrillic': "Саёҳатни таҳрирлаш" },
  'driver.route': { 'uz-latin': "Yo'nalish", 'uz-cyrillic': "Йўналиш" },
  'driver.departureTime': { 'uz-latin': "Jo'nash vaqti", 'uz-cyrillic': "Жўнаш вақти" },
  'driver.totalSeats': { 'uz-latin': "Jami o'rinlar", 'uz-cyrillic': "Жами ўринлар" },
  'driver.occupiedSeats': { 'uz-latin': "Band o'rinlar", 'uz-cyrillic': "Банд ўринлар" },
  'driver.pricePerSeat': { 'uz-latin': "Har bir o'rin narxi", 'uz-cyrillic': "Ҳар бир ўрин нархи" },
  'driver.save': { 'uz-latin': "Saqlash", 'uz-cyrillic': "Сақлаш" },
  'driver.cancel': { 'uz-latin': "Bekor qilish", 'uz-cyrillic': "Бекор қилиш" },
  'driver.pause': { 'uz-latin': "To'xtatish", 'uz-cyrillic': "Тўхтатиш" },
  'driver.activate': { 'uz-latin': "Faollashtirish", 'uz-cyrillic': "Фаоллаштириш" },
  'driver.delete': { 'uz-latin': "O'chirish", 'uz-cyrillic': "Ўчириш" },
  'driver.noTrips': { 'uz-latin': "Hali sayohat yo'q", 'uz-cyrillic': "Ҳали саёҳат йўқ" },
  'driver.vehicleInfo': { 'uz-latin': "Avtomobil ma'lumotlari", 'uz-cyrillic': "Автомобил маълумотлари" },
  'driver.vehicleModel': { 'uz-latin': "Model", 'uz-cyrillic': "Модел" },
  'driver.vehicleColor': { 'uz-latin': "Rang", 'uz-cyrillic': "Ранг" },
  'driver.plateNumber': { 'uz-latin': "Davlat raqami", 'uz-cyrillic': "Давлат рақами" },

  // Auth
  'auth.email': { 'uz-latin': "Elektron pochta", 'uz-cyrillic': "Электрон почта" },
  'auth.password': { 'uz-latin': "Parol", 'uz-cyrillic': "Парол" },
  'auth.name': { 'uz-latin': "Ism", 'uz-cyrillic': "Исм" },
  'auth.phone': { 'uz-latin': "Telefon raqami", 'uz-cyrillic': "Телефон рақами" },
  'auth.login': { 'uz-latin': "Kirish", 'uz-cyrillic': "Кириш" },
  'auth.register': { 'uz-latin': "Ro'yxatdan o'tish", 'uz-cyrillic': "Рўйхатдан ўтиш" },
  'auth.noAccount': { 'uz-latin': "Hisobingiz yo'qmi?", 'uz-cyrillic': "Ҳисобингиз йўқми?" },
  'auth.hasAccount': { 'uz-latin': "Hisobingiz bormi?", 'uz-cyrillic': "Ҳисобингиз борми?" },
  'auth.isDriver': { 'uz-latin': "Men haydovchiman", 'uz-cyrillic': "Мен ҳайдовчиман" },

  // Common
  'common.loading': { 'uz-latin': "Yuklanmoqda...", 'uz-cyrillic': "Юкланмоқда..." },
  'common.error': { 'uz-latin': "Xatolik yuz berdi", 'uz-cyrillic': "Хатолик юз берди" },
  'common.success': { 'uz-latin': "Muvaffaqiyatli", 'uz-cyrillic': "Муваффақиятли" },
  'common.close': { 'uz-latin': "Yopish", 'uz-cyrillic': "Ёпиш" },
  'common.sum': { 'uz-latin': "so'm", 'uz-cyrillic': "сўм" },
  'common.select': { 'uz-latin': "Tanlang", 'uz-cyrillic': "Танланг" },

  // Footer
  'footer.rights': { 'uz-latin': "Barcha huquqlar himoyalangan", 'uz-cyrillic': "Барча ҳуқуқлар ҳимояланган" },
  'footer.about': { 'uz-latin': "Biz haqimizda", 'uz-cyrillic': "Биз ҳақимизда" },
  'footer.contact': { 'uz-latin': "Aloqa", 'uz-cyrillic': "Алоқа" },
  'footer.privacy': { 'uz-latin': "Maxfiylik siyosati", 'uz-cyrillic': "Махфийлик сиёсати" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'uz-latin';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
