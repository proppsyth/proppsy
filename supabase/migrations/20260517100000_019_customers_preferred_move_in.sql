-- Store the customer's latest preferred move-in date on the master profile
-- Inquiry-specific dates stay on property_inquiries; this is the rolling "soonest preference"
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS preferred_move_in_date date;
