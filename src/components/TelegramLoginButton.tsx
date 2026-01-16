import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { auth, verifyTelegramLogin } from '@/integrations/firebase/client';
import { signInWithCustomToken } from 'firebase/auth';

// Telegram icon component
const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

interface TelegramLoginButtonProps {
  onSuccess?: () => void;
}

declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth: (user: TelegramUser) => void;
    };
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const TelegramLoginButton = ({ onSuccess }: TelegramLoginButtonProps) => {
  const [botUsername] = useState<string | null>('surxontaksi2_bot');
  const [loading, setLoading] = useState(false);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Handle Telegram auth callback
  const handleTelegramAuth = useCallback(async (user: TelegramUser) => {
    setLoading(true);
    console.log('Telegram auth data:', user);

    try {
      // Verify with Cloud Function and get custom token
      const result = await verifyTelegramLogin({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        photo_url: user.photo_url,
        auth_date: user.auth_date,
        hash: user.hash,
      });
      
      const data = result.data as { success: boolean; customToken: string; uid: string };
      
      if (!data.success || !data.customToken) {
        throw new Error('Failed to verify Telegram login');
      }
      
      // Sign in with custom token
      await signInWithCustomToken(auth, data.customToken);
      
      toast({
        title: "Muvaffaqiyat!",
        description: "Telegram orqali kirdingiz",
      });
      
      onSuccess?.();
      navigate('/');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Telegram orqali kirish amalga oshmadi';
      console.error('Telegram auth error:', error);
      toast({
        title: "Xatolik",
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, navigate, onSuccess]);

  // Handle URL callback (when returning from Telegram)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Check if this is a telegram login callback
    if (!params.get('id') || !params.get('hash')) return;

    const authData: TelegramUser = {
      id: parseInt(params.get('id') || '0'),
      first_name: params.get('first_name') || '',
      last_name: params.get('last_name') || undefined,
      username: params.get('username') || undefined,
      photo_url: params.get('photo_url') || undefined,
      auth_date: parseInt(params.get('auth_date') || '0'),
      hash: params.get('hash') || '',
    };

    // Clear URL params
    window.history.replaceState({}, '', '/auth');
    
    handleTelegramAuth(authData);
  }, [handleTelegramAuth]);

  // Load Telegram Login Widget script
  useEffect(() => {
    if (!botUsername || widgetLoaded) return;

    // Create global callback function
    window.onTelegramAuth = handleTelegramAuth;

    // Create script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-radius', '8');

    script.onload = () => setWidgetLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Telegram widget');
      setWidgetLoaded(false);
    };

    if (widgetRef.current) {
      widgetRef.current.innerHTML = '';
      widgetRef.current.appendChild(script);
    }

    return () => {
      delete window.onTelegramAuth;
    };
  }, [botUsername, widgetLoaded, handleTelegramAuth]);

  // Alternative: Open Telegram bot directly
  const handleOpenBot = () => {
    if (!botUsername) {
      toast({
        title: "Xatolik",
        description: "Telegram bot topilmadi",
        variant: 'destructive',
      });
      return;
    }

    // Open Telegram with the bot
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
    <div className="space-y-3">
      {/* Telegram Login Widget container */}
      <div ref={widgetRef} className="flex justify-center" />
      
      {/* Fallback button if widget doesn't load */}
      {!widgetLoaded && (
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-2 border-[#0088cc] text-[#0088cc] hover:bg-[#0088cc]/10"
          onClick={handleOpenBot}
          disabled={!botUsername}
        >
          <TelegramIcon />
          Telegram orqali kirish
        </Button>
      )}
    </div>
  );
};

export default TelegramLoginButton;
