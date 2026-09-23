-- Migration 008: Double Booking Protection - Only confirmed bookings block slots
-- Unpaid / Pending reservations leave the time slot available until payment is completed.

CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Only block if the new/updated reservation is confirmed and another confirmed reservation exists
  IF NEW.status IN ('confirmed', 'checked_in', 'completed') AND EXISTS (
    SELECT 1 FROM reservations
    WHERE court_id = NEW.court_id
      AND reservation_date = NEW.reservation_date
      AND status IN ('confirmed', 'checked_in', 'completed')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND start_time < NEW.end_time
      AND end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'Time slot is no longer available. Another confirmed reservation exists for this court.';
  END IF;

  -- Check for overlapping court blocks (maintenance)
  IF EXISTS (
    SELECT 1 FROM court_blocks
    WHERE court_id = NEW.court_id
      AND date = NEW.reservation_date
      AND start_time < NEW.end_time
      AND end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'This court is blocked for maintenance during this time.';
  END IF;

  -- Check court is active
  IF EXISTS (
    SELECT 1 FROM courts
    WHERE id = NEW.court_id AND status != 'active'
  ) THEN
    RAISE EXCEPTION 'This court is not available for booking.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
