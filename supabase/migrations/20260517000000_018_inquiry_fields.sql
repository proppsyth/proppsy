-- Add dedicated inquiry fields to property_inquiries
-- Previously stored only in notes string; now queryable for analytics and CRM
ALTER TABLE property_inquiries
  ADD COLUMN IF NOT EXISTS budget       text,
  ADD COLUMN IF NOT EXISTS move_in_date date;

CREATE INDEX IF NOT EXISTS idx_property_inquiries_customer_id ON property_inquiries(customer_id);
