import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Telegram icon component
const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

interface TelegramLoginButtonProps {
  onSuccess?: () => void;
}

const TelegramLoginButton = ({ onSuccess }: TelegramLoginButtonProps) => {
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Get bot username
    const fetchBotInfo = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('telegram-auth', {
          body: { action: 'get_bot_info' }
        });

        if (data?.bot_username) {
          setBotUsername(data.bot_username);
        }
      } catch (error) {
        console.error('Error fetching bot info:', error);
      }
    };

    fetchBotInfo();
  }, []);

  useEffect(() => {
    // Handle Telegram login callback
    const handleTelegramCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      
      // Check if this is a telegram login callback
      if (!params.get('id') || !params.get('hash')) return;

      setLoading(true);

      const authData = {
        id: parseInt(params.get('id') || '0'),
        first_name: params.get('first_name') || '',
        last_name: params.get('last_name') || undefined,
        username: params.get('username') || undefined,
        photo_url: params.get('photo_url') || undefined,
        auth_date: parseInt(params.get('auth_date') || '0'),
        hash: params.get('hash') || '',
      };

      try {
        const { data, error } = await supabase.functions.invoke('telegram-auth', {
          body: { 
            action: 'verify_telegram_auth',
            ...authData
          }
        });

        if (error || !data?.success) {
          throw new Error(data?.error || 'Authentication failed');
        }

        // Set the session
        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          toast({
            title: "Muvaffaqiyatli!",
            description: data.isNewUser 
              ? "Ro'yxatdan muvaffaqiyatli o'tdingiz"
              : "Tizimga muvaffaqiyatli kirdingiz",
          });

          // Clear URL params and navigate
          window.history.replaceState({}, '', '/auth');
          navigate('/driver');
          onSuccess?.();
        }
      } catch (error: any) {
        console.error('Telegram auth error:', error);
        toast({
          title: "Xatolik",
          description: error.message || "Telegram orqali kirish amalga oshmadi",
          variant: 'destructive',
        });
        window.history.replaceState({}, '', '/auth');
      } finally {
        setLoading(false);
      }
    };

    handleTelegramCallback();
  }, [navigate, toast, onSuccess]);

  const handleTelegramLogin = () => {
    if (!botUsername) {
      toast({
        title: "Xatolik",
        description: "Telegram bot topilmadi",
        variant: 'destructive',
      });
      return;
    }

    // Open Telegram login widget in a popup
    const width = 550;
    const height = 470;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    const authUrl = `https://oauth.telegram.org/auth?bot_id=${botUsername}&origin=${encodeURIComponent(window.location.origin)}&embed=1&request_access=write&return_to=${encodeURIComponent(window.location.href)}`;
    
    // For Telegram Login Widget, we need to use the widget approach
    // Redirect to Telegram for auth
    const redirectUrl = `https://t.me/${botUsername}?start=login`;
    window.open(redirectUrl, '_blank');
  };

  if (loading) {
    return (
      <Button disabled className="w-full" variant="outline">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Yuklanmoqda...
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full flex items-center justify-center gap-2 border-[#0088cc] text-[#0088cc] hover:bg-[#0088cc]/10"
      onClick={handleTelegramLogin}
      disabled={!botUsername}
    >
      <TelegramIcon />
      Telegram orqali kirish
    </Button>
  );
};

export default TelegramLoginButton;
