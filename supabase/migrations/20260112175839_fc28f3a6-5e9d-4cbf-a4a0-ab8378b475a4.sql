-- Add location fields to bookings table for pickup and dropoff points
ALTER TABLE public.bookings 
ADD COLUMN pickup_lat DOUBLE PRECISION,
ADD COLUMN pickup_lng DOUBLE PRECISION,
ADD COLUMN pickup_address TEXT,
ADD COLUMN dropoff_lat DOUBLE PRECISION,
ADD COLUMN dropoff_lng DOUBLE PRECISION,
ADD COLUMN dropoff_address TEXT;