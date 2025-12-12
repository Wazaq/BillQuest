-- Add frequency support and paid tracking

-- frequency: 'monthly', 'annual', 'every_n_months'
ALTER TABLE bills ADD COLUMN frequency TEXT NOT NULL DEFAULT 'monthly';

-- For every_n_months frequency (e.g., 2 for bi-monthly, 3 for quarterly, 6 for semi-annual)
ALTER TABLE bills ADD COLUMN frequency_months INTEGER DEFAULT NULL;

-- Anchor date for calculating due dates (stores full date for annual/irregular, day is used for monthly)
ALTER TABLE bills ADD COLUMN anchor_date TEXT DEFAULT NULL;

-- When the bill is paid through (if paid_through >= next_due_date, bill is paid for that cycle)
ALTER TABLE bills ADD COLUMN paid_through TEXT DEFAULT NULL;

-- Migrate existing due_day to anchor_date (use current month/year as base)
UPDATE bills SET anchor_date = date('now', 'start of month', '+' || (due_day - 1) || ' days') WHERE anchor_date IS NULL;
