-- SmartH2O Email Logs Table
-- Run this in Supabase SQL Editor to create the table for tracking sent emails

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create index for efficient cooldown checks
CREATE INDEX idx_email_logs_alert_type_created ON email_logs(alert_type, created_at DESC);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email, created_at DESC);

-- Optional: Add RLS (Row Level Security) if needed
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads (for debugging)
CREATE POLICY "Allow read email_logs" ON email_logs
  FOR SELECT USING (true);

-- Restrict writes to service role only
CREATE POLICY "Allow insert email_logs service role" ON email_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
