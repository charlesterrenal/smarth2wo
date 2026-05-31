## Resend Email Integration - Setup Guide

This document explains how to set up Resend email notifications for SmartH2O.

---

## What Was Added

✅ **New Files:**
- `email_service.py` - Email sending logic
- `SETUP_EMAIL_LOGS.sql` - Database table setup

✅ **Updated Files:**
- `requirements.txt` - Added `resend>=0.11.0`
- `.env` - Added Resend configuration variables
- `.env.example` - Added Resend config template
- `main.py` - Integrated email service

---

## Email Alerts Configured

Your system will now automatically send emails for:

1. **Transaction Alert** - When payment succeeds
   - Who: Admin email (from `ALERT_RECIPIENT_EMAIL`)
   - When: Immediately after payment confirmation
   - Info: Transaction ID, volume, amount

2. **Water Level Alert** - When water runs low
   - Triggers at: < 20% (warning) or < 10% (critical)
   - Cooldown: 30 minutes (configurable)
   - Info: Current water level, action needed

3. **Maintenance Due Alert** - When maintenance needed
   - Triggers: When severity is HIGH or CRITICAL
   - Info: Days remaining, reason, severity level

4. **Anomaly Alert** - When system issues detected
   - Triggers: Pressure too high, temperature critical, flow rate low, etc.
   - Info: Anomaly type, message, severity

5. **Email Logs** - Tracks all sent emails
   - Database table: `email_logs`
   - Prevents duplicate alerts within 30 minutes

---

## Step 1: Get Resend API Key

1. Go to https://resend.com
2. Sign up (free tier available)
3. Navigate to "API Keys"
4. Create new key (copy it)

---

## Step 2: Update `.env` File

Edit `backend/.env` and fill in:

```env
# RESEND Email Service
RESEND_API_KEY=re_xxxxxxxxxxxx  # Your API key from step 1
RESEND_FROM_EMAIL=alerts@smarth2o.com  # Sending email (will be verified in Resend)
ALERT_RECIPIENT_EMAIL=admin@example.com  # Who receives alerts

# Alert Cooldown (prevent spam)
EMAIL_COOLDOWN_MINUTES=30  # Don't send same alert twice within 30 min
```

### Verify Sender Email

In Resend dashboard:
1. Go to "Domains"
2. Add your domain (or use Resend's default: `onboarding@resend.dev`)
3. Verify the domain
4. Update `RESEND_FROM_EMAIL` to your verified email

For testing, you can use the default:
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

---

## Step 3: Create Supabase Table

1. Go to Supabase Dashboard
2. SQL Editor → New Query
3. Copy contents of `SETUP_EMAIL_LOGS.sql`
4. Run the query

This creates the `email_logs` table to:
- Track all sent emails
- Prevent duplicate alerts within cooldown period
- Store error messages for failed emails

---

## Step 4: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs `resend>=0.11.0`

---

## Step 5: Restart Backend

```bash
python main.py
```

You should see:
```
STARTUP EVENT: Initializing MQTT...
MQTT initialized - Broker: broker.hivemq.com:1883
STARTUP EVENT: Initializing Email Service...
Email service initialized - From: alerts@smarth2o.com
```

---

## Testing Emails

### Test 1: Transaction Alert

Use the admin panel:
1. Go to http://localhost:5173/admin/payments
2. Click "Simulate Payment Success"
3. Check email inbox for: "Transaction Confirmed - 100ml Water Dispensed"

### Test 2: Water Level Alert

Use API:
```bash
curl -X POST http://localhost:8000/api/maintenance/predict \
  -H "Content-Type: application/json" \
  -d '{
    "water_level_pct": 15,
    "temperature": 30,
    "flow_rate": 5.0,
    "pressure": 50,
    "power_on": true
  }'
```

Check email for: "Water Level WARNING - 15%"

### Test 3: Maintenance Alert

```bash
curl -X POST http://localhost:8000/api/maintenance/predict \
  -H "Content-Type: application/json" \
  -d '{
    "water_level_pct": 5,
    "temperature": 50,
    "flow_rate": 2.0,
    "pressure": 90,
    "power_on": true
  }'
```

Check email for: "Maintenance Required"

### Test 4: Anomaly Alert

```bash
curl -X POST http://localhost:8000/api/anomalies/detect \
  -H "Content-Type: application/json" \
  -d '{
    "water_level_pct": 2,
    "temperature": 52,
    "flow_rate": 0.05,
    "pressure": 110,
    "power_on": false
  }'
```

Check email for: "System Anomaly Detected"

---

## Configuration

### Alert Thresholds

Water level alerts trigger at:
- **Critical**: < 10%
- **Warning**: < 20%

Maintenance alerts trigger when:
- Severity is "high" or "critical"

Anomaly alerts trigger for:
- Water level < 5%
- Temperature > 50°C (critical) or > 45°C (high)
- Pressure > 100 PSI (critical) or > 80 PSI (warning)
- Flow rate < 0.1 L/min

### Change Cooldown

Edit `backend/.env`:
```env
EMAIL_COOLDOWN_MINUTES=60  # Increase to 1 hour
```

This prevents email spam by not sending the same alert type more than once per hour.

---

## Troubleshooting

### Emails not sending?

1. Check logs for error message:
   ```
   ❌ Email failed: ... - [error message]
   ```

2. Verify API key:
   ```bash
   echo $RESEND_API_KEY  # Should show: re_xxxxx
   ```

3. Check sender email is verified in Resend dashboard

4. Check email_logs table in Supabase for failed attempts

### Too many emails?

Increase cooldown:
```env
EMAIL_COOLDOWN_MINUTES=120  # 2 hours
```

### Want to disable emails?

Leave `RESEND_API_KEY` blank:
```env
RESEND_API_KEY=
```

System will log "WARNING: Email service disabled" and continue without errors.

---

## Email Service Code

See `email_service.py` for:
- `send_transaction_alert()` - Transaction emails
- `send_water_level_alert()` - Water level notifications
- `send_maintenance_due_alert()` - Maintenance reminders
- `send_anomaly_alert()` - System anomaly alerts
- `should_send_alert()` - Cooldown logic
- `log_email()` - Database tracking

---

## Next Steps

1. ✅ Install `resend` package
2. ✅ Add Resend API key to `.env`
3. ✅ Verify sender email in Resend dashboard
4. ✅ Create `email_logs` table in Supabase
5. ✅ Restart backend
6. ✅ Test emails from admin panel

Done! Your email alerts are now active.

---

## Support

- Resend docs: https://resend.com/docs
- Troubleshoot: Check `email_logs` table for failed emails
- Questions: Check the implementation in `email_service.py`
