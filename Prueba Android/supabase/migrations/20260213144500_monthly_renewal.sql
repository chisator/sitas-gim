-- Add columns for monthly renewal logic
-- plan_credits: The number of credits to add on the 1st of each month.
-- expiring_credits: Credits from the previous month that will expire on the 6th.
-- last_renewal_date: Tracks when the last monthly renewal logic was applied.
-- last_expiration_date: Tracks when the last expiration logic was applied.

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS plan_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS expiring_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_renewal_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS last_expiration_date DATE DEFAULT CURRENT_DATE;

-- Optional: You might want to initialize last_renewal_date to the first of the current month
-- or just leave it as current_date, depending on when you want the FIRST renewal to happen.
-- If we set it to '2000-01-01', everyone will get renewed immediately upon next action.
-- Let's stick to default CURRENT_DATE so it starts counting from now (or manual update).
