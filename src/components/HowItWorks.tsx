import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { PickupPinIcon, TaxiCarIcon, PhoneIcon } from '@/components/icons/TaxiIcons';

const HowItWorks = () => {
  const { t, language } = useLanguage();
  const isLatin = language === 'uz-latin';

  const steps = [
    {
      icon: PickupPinIcon,
      title: t('home.step1Title'),
      description: t('home.step1Desc'),
      color: 'success' as const,
    },
    {
      icon: TaxiCarIcon,
      title: t('home.step2Title'),
      description: t('home.step2Desc'),
      color: 'primary' as const,
    },
    {
      icon: PhoneIcon,
      title: t('home.step3Title'),
      description: t('home.step3Desc'),
      color: 'accent' as const,
    },
  ];

  return (
    <section className="py-4">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          {t('home.howItWorks')}
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          {isLatin 
            ? "Taksi topish juda oson. Uch oddiy qadamda safarga chiqing."
            : "Такси топиш жуда осон. Уч оддий қадамда сафарга чиқинг."
          }
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {/* Connection lines (hidden on mobile) */}
        <div className="hidden md:block absolute top-24 left-1/3 w-1/3 h-0.5">
          <div className="w-full h-full bg-gradient-to-r from-success via-primary to-primary" style={{ maskImage: 'linear-gradient(to right, black 0%, black 40%, transparent 50%, black 60%, black 100%)' }} />
        </div>
        <div className="hidden md:block absolute top-24 left-2/3 w-1/3 h-0.5">
          <div className="w-full h-full bg-gradient-to-r from-primary to-accent" style={{ maskImage: 'linear-gradient(to right, black 0%, black 40%, transparent 50%, black 60%, black 100%)' }} />
        </div>

        {steps.map((step, index) => (
          <Card 
            key={index} 
            className="text-center border-border bg-card card-hover relative overflow-visible"
          >
            <CardContent className="pt-8 pb-6 px-6">
              {/* Icon container */}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 relative ${
                step.color === 'success' 
                  ? 'bg-success/10' 
                  : step.color === 'primary' 
                    ? 'bg-primary/10' 
                    : 'bg-accent/10'
              }`}>
                <step.icon 
                  size={36} 
                  className={
                    step.color === 'success' 
                      ? 'text-success' 
                      : step.color === 'primary' 
                        ? 'text-primary' 
                        : 'text-accent'
                  } 
                />
                
                {/* Step number badge */}
                <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${
                  step.color === 'success' 
                    ? 'bg-success text-success-foreground' 
                    : step.color === 'primary' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-accent text-accent-foreground'
                }`}>
                  {index + 1}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
