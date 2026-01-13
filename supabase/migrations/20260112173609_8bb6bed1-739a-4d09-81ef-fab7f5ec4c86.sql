-- Add telegram_chat_id column to taxi_trips table for driver notifications
ALTER TABLE public.taxi_trips ADD COLUMN telegram_chat_id TEXT;

-- Create a table to store driver telegram connections (separate from trips for reusability)
CREATE TABLE public.driver_telegram (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  chat_id TEXT NOT NULL,
  username TEXT,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_telegram ENABLE ROW LEVEL SECURITY;

-- Policies for driver_telegram
CREATE POLICY "Users can view own telegram connection"
ON public.driver_telegram
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own telegram connection"
ON public.driver_telegram
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own telegram connection"
ON public.driver_telegram
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own telegram connection"
ON public.driver_telegram
FOR DELETE
USING (auth.uid() = user_id);

-- Create bookings table to track passenger bookings
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.taxi_trips(id) ON DELETE CASCADE,
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  seats_booked INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Anyone can create a booking (passengers don't need to be logged in)
CREATE POLICY "Anyone can create bookings"
ON public.bookings
FOR INSERT
WITH CHECK (true);

-- Trip owners can view bookings for their trips
CREATE POLICY "Trip owners can view their bookings"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.taxi_trips 
    WHERE taxi_trips.id = bookings.trip_id 
    AND taxi_trips.user_id = auth.uid()
  )
);

-- Trip owners can update booking status
CREATE POLICY "Trip owners can update booking status"
ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.taxi_trips 
    WHERE taxi_trips.id = bookings.trip_id 
    AND taxi_trips.user_id = auth.uid()
  )
);