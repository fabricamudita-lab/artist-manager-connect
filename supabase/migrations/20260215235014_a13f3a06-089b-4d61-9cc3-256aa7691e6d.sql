ALTER TABLE booking_offers ADD COLUMN is_sold_out boolean DEFAULT false;
ALTER TABLE booking_offers ADD COLUMN tickets_sold integer;