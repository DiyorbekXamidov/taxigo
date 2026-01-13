import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchForm from '@/components/SearchForm';
import PopularRoutes from '@/components/PopularRoutes';
import HowItWorks from '@/components/HowItWorks';
import { SafetyIcon, SpeedIcon, TaxiCarIcon } from '@/components/icons/TaxiIcons';

const Index = () => {
  const { language } = useLanguage();
  const isLatin = language === 'uz-latin';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-hero overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 hero-pattern" />
        
        {/* Road Line Decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-1 road-pattern opacity-50" />
        
        {/* Content */}
        <div className="relative container mx-auto px-4 py-16 md:py-24 lg:py-32">
          <div className="max-w-3xl mx-auto text-center mb-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/15 backdrop-blur-sm px-5 py-2.5 rounded-full mb-6 border border-primary/20">
              <TaxiCarIcon className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary">Surxondaryo viloyati</span>
            </div>
            
            {/* Headline */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-secondary-foreground mb-6 leading-tight">
              {isLatin ? (
                <>Ishonchli yo'l.<br className="hidden sm:block" /> <span className="text-primary">Qulay safar.</span></>
              ) : (
                <>Ишончли йўл.<br className="hidden sm:block" /> <span className="text-primary">Қулай сафар.</span></>
              )}
            </h1>
            
            <p className="text-lg md:text-xl text-secondary-foreground/70 max-w-xl mx-auto">
              {isLatin 
                ? "Surxondaryo viloyati bo'ylab tez va xavfsiz taksi xizmati. Istalgan manzilga oson yetib boring."
                : "Сурхондарё вилояти бўйлаб тез ва хавфсиз такси хизмати. Исталган манзилга осон етиб боринг."
              }
            </p>
          </div>
          
          {/* Search Card */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-6 md:p-8 animate-fade-in">
              <SearchForm variant="hero" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 md:py-16 bg-background relative">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <FeatureCard 
              icon={SafetyIcon}
              title={isLatin ? "Ishonchli" : "Ишончли"}
              description={isLatin ? "Tekshirilgan haydovchilar" : "Текширилган ҳайдовчилар"}
              color="accent"
            />
            <FeatureCard 
              icon={SpeedIcon}
              title={isLatin ? "Tez xizmat" : "Тез хизмат"}
              description={isLatin ? "Har kuni ishlaydi" : "Ҳар куни ишлайди"}
              color="primary"
            />
            <FeatureCard 
              icon={TaxiCarIcon}
              title={isLatin ? "Qulay narxlar" : "Қулай нархлар"}
              description={isLatin ? "Hamyonbop taksi" : "Ҳамёнбоп такси"}
              color="accent"
            />
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <PopularRoutes />
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <HowItWorks />
        </div>
      </section>

      <Footer />
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  description: string;
  color: 'primary' | 'accent';
}

const FeatureCard = ({ icon: Icon, title, description, color }: FeatureCardProps) => (
  <div className="flex items-center gap-4 p-5 bg-card rounded-xl border border-border hover:shadow-md transition-all duration-300 group">
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
      color === 'primary' 
        ? 'bg-primary/10 group-hover:bg-primary/20' 
        : 'bg-accent/10 group-hover:bg-accent/20'
    }`}>
      <Icon 
        className={`w-7 h-7 ${color === 'primary' ? 'text-primary' : 'text-accent'}`} 
      />
    </div>
    <div>
      <h3 className="font-semibold text-foreground text-lg">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mt-0.5">
        {description}
      </p>
    </div>
  </div>
);

export default Index;
