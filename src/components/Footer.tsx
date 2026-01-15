import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { TaxiLogoMark, PhoneIcon } from '@/components/icons/TaxiIcons';
import { Mail, Send } from 'lucide-react';

const Footer = () => {
  const { t, language } = useLanguage();
  const isLatin = language === 'uz-latin';

  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto">
      {/* Main footer content */}
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <TaxiLogoMark size={48} />
              <div>
                <span className="text-2xl font-bold text-secondary-foreground">TaxiGo</span>
                <span className="block text-xs text-muted-foreground font-medium tracking-wider">UZBEKISTAN</span>
              </div>
            </div>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              {isLatin 
                ? "Surxondaryo viloyati bo'ylab ishonchli va qulay taksi xizmati. Viloyatlararo yo'nalishlar va tumanlar aro qatnovlar."
                : "Сурхондарё вилояти бўйлаб ишончли ва қулай такси хизмати. Вилоятлараро йўналишлар ва туманлар аро қатновлар."
              }
            </p>
            
            {/* Social links */}
            <div className="flex items-center gap-3 mt-6">
              <a 
                href="https://t.me/taxigo_uz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary-foreground/10 hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4 text-secondary-foreground">
              {isLatin ? "Sahifalar" : "Саҳифалар"}
            </h3>
            <nav className="flex flex-col gap-3">
              <Link 
                to="/" 
                className="text-muted-foreground hover:text-primary transition-colors text-sm link-underline inline-block"
              >
                {t('nav.home')}
              </Link>
              <Link 
                to="/search" 
                className="text-muted-foreground hover:text-primary transition-colors text-sm link-underline inline-block"
              >
                {t('nav.search')}
              </Link>
              <Link 
                to="/auth" 
                className="text-muted-foreground hover:text-primary transition-colors text-sm link-underline inline-block"
              >
                {isLatin ? "Haydovchi sifatida ro'yxatdan o'tish" : "Ҳайдовчи сифатида рўйхатдан ўтиш"}
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4 text-secondary-foreground">{t('footer.contact')}</h3>
            <div className="flex flex-col gap-3">
              <a 
                href="tel:+998902665004" 
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm group"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary-foreground/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <PhoneIcon className="w-4 h-4" />
                </div>
                +998 90 266 50 04
              </a>
              <a 
                href="mailto:xamidovdiyorbek220@gmail.com" 
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm group"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary-foreground/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                xamidovdiyorbek220@gmail.com
              </a>
              <a 
                href="https://t.me/xamidov_diyorbek" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm group"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary-foreground/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <Send className="w-4 h-4" />
                </div>
                @xamidov_diyorbek
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-muted/20">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2026 TaxiGo. {t('footer.rights')}.</p>
            <p className="text-xs">
              {isLatin 
                ? "Surxondaryo viloyati, O'zbekiston" 
                : "Сурхондарё вилояти, Ўзбекистон"
              }
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
