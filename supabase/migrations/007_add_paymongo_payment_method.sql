-- Migration 007: Update payment_method check constraint to include paymongo and qrph
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check 
  CHECK (payment_method IN ('gcash', 'gotyme', 'cash', 'card', 'paymongo', 'qrph', 'paymaya'));
