import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Check, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TelegramConnectionProps {
  userId: string;
  isPassenger?: boolean;
}

const TelegramConnection = ({ userId, isPassenger = false }: TelegramConnectionProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [chatId, setChatId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectedChatId, setConnectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const texts = {
    title: language === 'uz-latin' ? 'Telegram bildirishnomalar' : 'Телеграм билдиришномалар',
    description: language === 'uz-latin' 
      ? "Yo'lovchilar band qilganda Telegram orqali xabar oling" 
      : "Йўловчилар банд қилганда Телеграм орқали хабар олинг",
    descriptionPassenger: language === 'uz-latin'
      ? "Haydovchi sayohatni tahrirlasa, Telegram orqali xabar oling"
      : "Ҳайдовчи саёҳатни таҳрирласа, Телеграм орқали хабар олинг",
    connected: language === 'uz-latin' ? 'Ulangan' : 'Уланган',
    notConnected: language === 'uz-latin' ? 'Ulanmagan' : 'Уланмаган',
    chatIdLabel: language === 'uz-latin' ? 'Telegram Chat ID' : 'Телеграм Chat ID',
    chatIdPlaceholder: language === 'uz-latin' ? 'Masalan: 123456789' : 'Масалан: 123456789',
    connect: language === 'uz-latin' ? 'Ulash' : 'Улаш',
    disconnect: language === 'uz-latin' ? 'Uzish' : 'Узиш',
    howToGet: language === 'uz-latin' ? 'Chat ID ni qanday olish mumkin?' : 'Chat ID ни қандай олиш мумкин?',
    step1: language === 'uz-latin' 
      ? "1. @userinfobot ga Telegram'da yozing" 
      : "1. @userinfobot га Телеграмда ёзинг",
    step2: language === 'uz-latin' 
      ? "2. Bot sizning ID raqamingizni yuboradi" 
      : "2. Бот сизнинг ID рақамингизни юборади",
    step3: language === 'uz-latin' 
      ? "3. Shu ID ni bu yerga kiriting" 
      : "3. Шу ID ни бу ерга киритинг",
    success: language === 'uz-latin' ? 'Telegram muvaffaqiyatli ulandi!' : 'Телеграм муваффақиятли уланди!',
    error: language === 'uz-latin' ? 'Xatolik yuz berdi' : 'Хатолик юз берди',
    invalidChatId: language === 'uz-latin' 
      ? "Chat ID noto'g'ri. Iltimos, tekshiring." 
      : "Chat ID нотўғри. Илтимос, текширинг.",
  };

  useEffect(() => {
    checkConnection();
  }, [userId]);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('driver_telegram')
        .select('chat_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setIsConnected(true);
        setConnectedChatId(data.chat_id);
      }
    } catch (error) {
      console.error('Error checking telegram connection:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleConnect = async () => {
    if (!chatId.trim()) return;
    
    setLoading(true);
    try {
      // First verify the chat ID by sending a test message
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'send-telegram-notification',
        {
          body: { action: 'verify_chat', chatId: chatId.trim() }
        }
      );

      if (verifyError || !verifyData?.success) {
        toast({
          title: texts.error,
          description: texts.invalidChatId,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Save to database
      const { error: saveError } = await supabase
        .from('driver_telegram')
        .upsert({
          user_id: userId,
          chat_id: chatId.trim(),
        });

      if (saveError) throw saveError;

      setIsConnected(true);
      setConnectedChatId(chatId.trim());
      setChatId('');
      
      toast({
        title: texts.success,
        description: language === 'uz-latin' 
          ? "Endi yo'lovchilar band qilganda xabar olasiz" 
          : "Энди йўловчилар банд қилганда хабар оласиз",
      });
    } catch (error) {
      console.error('Error connecting telegram:', error);
      toast({
        title: texts.error,
        description: texts.invalidChatId,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('driver_telegram')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setIsConnected(false);
      setConnectedChatId(null);
      
      toast({
        title: language === 'uz-latin' ? 'Telegram uzildi' : 'Телеграм узилди',
      });
    } catch (error) {
      console.error('Error disconnecting telegram:', error);
      toast({
        title: texts.error,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-muted-foreground">{language === 'uz-latin' ? 'Yuklanmoqda...' : 'Юкланмоқда...'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">{texts.title}</CardTitle>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-success text-success-foreground' : ''}>
            {isConnected ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                {texts.connected}
              </>
            ) : (
              <>
                <X className="w-3 h-3 mr-1" />
                {texts.notConnected}
              </>
            )}
          </Badge>
        </div>
        <CardDescription>
          {isPassenger ? texts.descriptionPassenger : texts.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Chat ID:</p>
              <p className="font-mono font-medium text-foreground">{connectedChatId}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleDisconnect}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              {texts.disconnect}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p className="font-medium text-foreground">{texts.howToGet}</p>
              <p className="text-muted-foreground">{texts.step1}</p>
              <p className="text-muted-foreground">{texts.step2}</p>
              <p className="text-muted-foreground">{texts.step3}</p>
              <a 
                href="https://t.me/userinfobot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
              >
                @userinfobot
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            
            <div className="space-y-2">
              <Input
                type="text"
                placeholder={texts.chatIdPlaceholder}
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="font-mono"
              />
              <Button 
                onClick={handleConnect}
                disabled={!chatId.trim() || loading}
                className="w-full bg-primary text-primary-foreground"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                ) : (
                  <MessageCircle className="w-4 h-4 mr-2" />
                )}
                {texts.connect}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramConnection;