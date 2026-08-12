-- Production DB fix: add all columns that may be missing
-- Run this on the production MySQL database to resolve 500 errors
-- Safe to run multiple times (uses IF NOT EXISTS / IGNORE logic)

-- ── users table ────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NULL DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS country  VARCHAR(2) NULL DEFAULT 'GB';

-- Back-fill currency from phone prefix for existing rows
UPDATE users SET currency = 'GBP', country = 'GB'  WHERE currency IS NULL AND phone LIKE '+44%';
UPDATE users SET currency = 'USD', country = 'US'  WHERE currency IS NULL AND phone LIKE '+1%';
UPDATE users SET currency = 'INR', country = 'IN'  WHERE currency IS NULL AND phone LIKE '+91%';
UPDATE users SET currency = 'PKR', country = 'PK'  WHERE currency IS NULL AND phone LIKE '+92%';
UPDATE users SET currency = 'BDT', country = 'BD'  WHERE currency IS NULL AND phone LIKE '+880%';
UPDATE users SET currency = 'NGN', country = 'NG'  WHERE currency IS NULL AND phone LIKE '+234%';
UPDATE users SET currency = 'GHS', country = 'GH'  WHERE currency IS NULL AND phone LIKE '+233%';
UPDATE users SET currency = 'ZAR', country = 'ZA'  WHERE currency IS NULL AND phone LIKE '+27%';
UPDATE users SET currency = 'EUR', country = 'DE'  WHERE currency IS NULL AND phone LIKE '+49%';
UPDATE users SET currency = 'EUR', country = 'FR'  WHERE currency IS NULL AND phone LIKE '+33%';
UPDATE users SET currency = 'AUD', country = 'AU'  WHERE currency IS NULL AND phone LIKE '+61%';
UPDATE users SET currency = 'GBP', country = 'GB'  WHERE currency IS NULL;

-- ── shifts table ───────────────────────────────────────────────────────────────
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NULL DEFAULT 'GBP';

-- Back-fill shifts currency from haulier profile
UPDATE shifts s
  JOIN users u ON u.id = s.haulier_id
  SET s.currency = COALESCE(u.currency, 'GBP')
  WHERE s.currency IS NULL;

-- ── shift_quotes table ─────────────────────────────────────────────────────────
ALTER TABLE shift_quotes
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NULL DEFAULT 'GBP';

-- Back-fill quote currency from the shift
UPDATE shift_quotes sq
  JOIN shifts s ON s.id = sq.shift_id
  SET sq.currency = COALESCE(s.currency, 'GBP')
  WHERE sq.currency IS NULL;

-- ── payments table (currency column may have wrong default) ───────────────────
-- Already exists — just fix any NULL or empty values
UPDATE payments SET currency = 'GBP' WHERE currency IS NULL OR currency = '' OR currency = 'INR';

-- ── quotes table (job quotes) ─────────────────────────────────────────────────
UPDATE quotes SET currency = 'GBP' WHERE currency IS NULL OR currency = '' OR currency = 'INR';

-- ── shift_payments table ───────────────────────────────────────────────────────
UPDATE shift_payments SET currency = 'GBP' WHERE currency IS NULL OR currency = '' OR currency = 'USD';

SELECT 'Production DB fix complete.' AS status;
