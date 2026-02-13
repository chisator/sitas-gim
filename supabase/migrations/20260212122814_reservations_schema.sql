-- Add reservation_credits to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS reservation_credits INTEGER DEFAULT 0;

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES gym_classes(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, class_id)
);

-- Add RLS policies for reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Users can view their own reservations
CREATE POLICY "Users can view own reservations" 
ON reservations FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own reservations
CREATE POLICY "Users can create own reservations" 
ON reservations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reservations (cancel)
CREATE POLICY "Users can delete own reservations" 
ON reservations FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can view all reservations (assuming admin role check exists or via service role)
-- For simplicity in this app structure, we might rely on service role for admin actions or add specific admin policies if needed.
-- But usually admin actions use service role client.
