-- Add pickup_districts column to support multiple pickup points
ALTER TABLE public.taxi_trips 
ADD COLUMN pickup_districts text[] DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.taxi_trips.pickup_districts IS 'Array of districts where driver can pick up passengers along the route';