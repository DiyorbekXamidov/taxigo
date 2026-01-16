import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Menu, X, User, Globe, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth, db } from '@/integrations/firebase/client';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { TaxiLogoMark } from '@/components/icons/TaxiIcons';

const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Get user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsDriver(userData.is_driver === true || userData.user_type === 'driver');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setIsDriver(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'uz-latin' ? 'uz-cyrillic' : 'uz-latin');
  };

  return (
    <>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-card/95 backdrop-blur-md shadow-md border-b border-border' 
          : 'bg-card border-b border-border'
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <TaxiLogoMark size={42} className="transition-transform duration-300 group-hover:scale-105" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground tracking-tight">TaxiGo</span>
                <span className="text-[10px] text-muted-foreground font-medium -mt-1 tracking-wide">UZBEKISTAN</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link 
                to="/" 
                className="text-foreground hover:text-primary transition-colors font-medium link-underline"
              >
                {t('nav.home')}
              </Link>
              <Link 
                to="/search" 
                className="text-foreground hover:text-primary transition-colors font-medium link-underline"
              >
                {t('nav.search')}
              </Link>
              {user && (
                <Link 
                  to={isDriver ? '/driver' : '/passenger'} 
                  className="text-foreground hover:text-primary transition-colors font-medium link-underline"
                >
                  {t('nav.dashboard')}
                </Link>
              )}
            </nav>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="text-sm font-medium gap-2"
              >
                <Globe className="w-4 h-4" />
                {language === 'uz-latin' ? 'Кир' : 'Lat'}
              </Button>

              {user ? (
                <div className="flex items-center gap-2">
                  <Link to={isDriver ? '/driver' : '/passenger'}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <User className="w-4 h-4" />
                      {t('nav.dashboard')}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    {t('nav.logout')}
                  </Button>
                </div>
              ) : (
                <Link to="/auth">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 btn-glow font-semibold px-6">
                    {t('nav.login')}
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              {/* Quick dashboard access on mobile */}
              {user && (
                <Link to={isDriver ? '/driver' : '/passenger'}>
                  <Button size="sm" variant="outline" className="gap-1 px-2">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="text-xs">Panel</span>
                  </Button>
                </Link>
              )}
              <button
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-border animate-fade-in">
              <nav className="flex flex-col gap-1">
                <Link
                  to="/"
                  className="text-foreground hover:text-primary hover:bg-muted/50 transition-colors font-medium py-3 px-3 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.home')}
                </Link>
                <Link
                  to="/search"
                  className="text-foreground hover:text-primary hover:bg-muted/50 transition-colors font-medium py-3 px-3 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.search')}
                </Link>
                {user && (
                  <Link
                    to={isDriver ? '/driver' : '/passenger'}
                    className="text-foreground hover:text-primary hover:bg-muted/50 transition-colors font-medium py-3 px-3 rounded-lg flex items-center gap-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {t('nav.dashboard')}
                  </Link>
                )}
                <div className="flex items-center gap-3 pt-4 mt-2 border-t border-border px-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleLanguage}
                    className="gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    {language === 'uz-latin' ? 'Кирилл' : 'Lotin'}
                  </Button>
                  {user ? (
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      {t('nav.logout')}
                    </Button>
                  ) : (
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button size="sm" className="bg-primary text-primary-foreground font-semibold">
                        {t('nav.login')}
                      </Button>
                    </Link>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
