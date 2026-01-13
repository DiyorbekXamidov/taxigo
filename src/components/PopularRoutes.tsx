import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { surxondaryoRegion, popularRoutes, getLocationById } from '@/data/regions';
import { RouteIcon } from '@/components/icons/TaxiIcons';
import { ArrowRight, TrendingUp } from 'lucide-react';

const PopularRoutes = () => {
  const { language, t } = useLanguage();
  const isLatin = language === 'uz-latin';

  const getLocationName = (locationId: string) => {
    const location = getLocationById(locationId);
    return location ? location.name[language] : locationId;
  };


  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-primary" />
            {t('home.popular')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isLatin 
              ? "Eng ko'p qidirilayotgan yo'nalishlar"
              : "Энг кўп қидирилаётган йўналишлар"
            }
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {popularRoutes.map((route, index) => (
          <Link
            key={index}
            to={`/search?from=${route.from}&to=${route.to}`}
          >
            <Card className="card-hover cursor-pointer border-border bg-card group overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 flex items-center gap-4">
                  {/* Route icon */}
                  <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <RouteIcon size={24} />
                  </div>
                  
                  {/* Route info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground truncate">
                        {getLocationName(route.from)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-foreground truncate">
                        {getLocationName(route.to)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Arrow indicator */}
                  <div className="w-8 h-8 rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center transition-all duration-300 flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default PopularRoutes;
