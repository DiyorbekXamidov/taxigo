-- Create taxi_trips table
CREATE TABLE public.taxi_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  driver_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_color TEXT NOT NULL DEFAULT 'white',
  plate_number TEXT,
  from_district TEXT NOT NULL,
  to_district TEXT NOT NULL,
  total_seats INTEGER NOT NULL DEFAULT 4,
  occupied_seats INTEGER NOT NULL DEFAULT 0,
  price_per_seat INTEGER NOT NULL,
  departure_time TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  has_air_conditioner BOOLEAN NOT NULL DEFAULT true,
  has_large_luggage BOOLEAN NOT NULL DEFAULT false,
  smoking_allowed BOOLEAN NOT NULL DEFAULT false,
  music_preference TEXT,
  for_women BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.taxi_trips ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active trips
CREATE POLICY "Anyone can view active trips"
ON public.taxi_trips
FOR SELECT
USING (is_active = true);

-- Policy: Authenticated users can view their own trips
CREATE POLICY "Users can view own trips"
ON public.taxi_trips
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Authenticated users can insert their own trips
CREATE POLICY "Users can insert own trips"
ON public.taxi_trips
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own trips
CREATE POLICY "Users can update own trips"
ON public.taxi_trips
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can delete their own trips
CREATE POLICY "Users can delete own trips"
ON public.taxi_trips
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);