# TaxiGo - Surxondaryo Taksi Xizmati

Surxondaryo viloyati bo'ylab ishonchli va qulay taksi xizmati. Viloyatlararo yo'nalishlar va tumanlar aro qatnovlar.

## Loyihani Ishga Tushirish

```bash
# Dependencies o'rnatish
npm install

# Development server
npm run dev

# Production build
npm run build
```

## Texnologiyalar

- **Frontend**: React, TypeScript, Vite
- **UI**: Tailwind CSS, Radix UI
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **Telegram**: Telegram Bot API integration

## Loyiha Tuzilmasi

```
src/
├── components/     # UI komponentlar
├── contexts/       # React contexts
├── data/          # Static data (regions, etc)
├── hooks/         # Custom hooks
├── integrations/  # Supabase client
├── lib/           # Utility functions
└── pages/         # Page components

supabase/
├── functions/     # Edge Functions (Telegram bot)
└── migrations/    # Database migrations
```

## Telegram Bot

Bot quyidagi funksiyalarni qo'llab-quvvatlaydi:

- `/start` - Botni ishga tushirish
- `/search` - Sayohat qidirish
- `/add` - Sayohat qo'shish (haydovchilar uchun)
- `/mytrips` - Mening sayohatlarim
- `/help` - Yordam

## Litsenziya

© 2026 TaxiGo. Barcha huquqlar himoyalangan.
