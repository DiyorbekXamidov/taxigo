-- Add passenger telegram chat_id to bookings table
ALTER TABLE public.bookings 
ADD COLUMN passenger_telegram_chat_id TEXT;