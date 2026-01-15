import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, ArrowRight, Calendar, Users } from 'lucide-react';
import { surxondaryoRegion, regionalCenters } from '@/data/regions';
import { PickupPinIcon, DropoffPinIcon, PassengerIcon } from '@/components/icons/TaxiIcons';

interface SearchFormProps {
  variant?: 'hero' | 'compact';
}

const SearchForm = ({ variant = 'hero' }: SearchFormProps) => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState('1');

  // When 'from' changes, clear 'to' if it's the same
  const handleFromChange = (value: string) => {
    setFrom(value);
    if (to === value) {
      setTo('');
    }
  };

  // Filter destinations to exclude selected origin
  const filteredDistricts = surxondaryoRegion.districts.filter(d => d.id !== from);
  const filteredCenters = regionalCenters.filter(c => c.id !== from);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (date) params.set('date', date);
    if (passengers) params.set('passengers', passengers);
    navigate(`/search?${params.toString()}`);
  };

  const isHero = variant === 'hero';

  return (
    <form onSubmit={handleSearch}>
      <div className={`grid gap-4 ${isHero ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
        {/* From */}
        <div className="space-y-2">
          <Label htmlFor="from" className="text-sm font-medium text-foreground flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-success" />
            </span>
            {t('home.from')}
          </Label>
          <Select value={from} onValueChange={handleFromChange}>
            <SelectTrigger id="from" className="h-12 bg-background border-border hover:border-primary/50 transition-colors">
              <SelectValue placeholder={t('common.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="text-primary font-semibold flex items-center gap-2">
                  <PickupPinIcon size={16} />
                  Surxondaryo tumanlari
                </SelectLabel>
                {surxondaryoRegion.districts.map((district) => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name[language]}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-primary font-semibold flex items-center gap-2">
                  <DropoffPinIcon size={16} />
                  Viloyat markazlari
                </SelectLabel>
                {regionalCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name[language]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Arrow (only on hero) */}
        {isHero && (
          <div className="hidden md:flex items-end justify-center pb-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* To */}
        <div className="space-y-2">
          <Label htmlFor="to" className="text-sm font-medium text-foreground flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-primary" />
            </span>
            {t('home.to')}
          </Label>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger id="to" className="h-12 bg-background border-border hover:border-primary/50 transition-colors">
              <SelectValue placeholder={t('common.select')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="text-primary font-semibold flex items-center gap-2">
                  <PickupPinIcon size={16} />
                  Surxondaryo tumanlari
                </SelectLabel>
                {filteredDistricts.map((district) => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name[language]}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-primary font-semibold flex items-center gap-2">
                  <DropoffPinIcon size={16} />
                  Viloyat markazlari
                </SelectLabel>
                {filteredCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name[language]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            {t('home.date')}
          </Label>
          <div className="relative">
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 bg-background border-border hover:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Passengers */}
        <div className="space-y-2">
          <Label htmlFor="passengers" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            {t('home.passengers')}
          </Label>
          <Select value={passengers} onValueChange={setPassengers}>
            <SelectTrigger id="passengers" className="h-12 bg-background border-border hover:border-primary/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  <span className="flex items-center gap-2">
                    <PassengerIcon size={16} />
                    {num} {num === 1 ? (language === 'uz-latin' ? "yo'lovchi" : "йўловчи") : (language === 'uz-latin' ? "yo'lovchi" : "йўловчи")}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full mt-6 h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base rounded-xl btn-glow shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <Search className="w-5 h-5 mr-2" />
        {t('home.search')}
      </Button>
    </form>
  );
};

export default SearchForm;
