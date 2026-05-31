-- SmartH2O Email Logs Table
-- Run this in Supabase SQL Editor to create the table for tracking sent emails

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create index for efficient cooldown checks
CREATE INDEX IF NOT EXISTS idx_email_logs_alert_type_created ON email_logs(alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email, created_at DESC);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow reads for all authenticated users
DROP POLICY IF EXISTS "Allow read email_logs" ON email_logs;
CREATE POLICY "Allow read email_logs" ON email_logs
  FOR SELECT USING (true);

-- Allow inserts for all users (backend can log emails)
DROP POLICY IF EXISTS "Allow insert email_logs" ON email_logs;
CREATE POLICY "Allow insert email_logs" ON email_logs
  FOR INSERT WITH CHECK (true);

-- Allow updates for authenticated users
DROP POLICY IF EXISTS "Allow update email_logs" ON email_logs;
CREATE POLICY "Allow update email_logs" ON email_logs
  FOR UPDATE USING (true);

