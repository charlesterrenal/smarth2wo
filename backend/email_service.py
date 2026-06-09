"""
Email Service for SmartH2wo - Handles alerts via Resend
Sends notifications for: transactions, water level, maintenance, anomalies
"""

import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from typing import Optional
import json

load_dotenv()

try:
    import resend
except ImportError as e:
    print(f"DEBUG: Failed to import resend: {e}")
    resend = None

# Load logo as base64 for email embedding
_LOGO_B64 = ""
try:
    import base64 as _b64
    _logo_path = os.path.join(os.path.dirname(__file__), "logo.png")
    if not os.path.exists(_logo_path):
        # fallback to txt file
        _logo_path = os.path.join(os.path.dirname(__file__), "logo_b64.txt")
        with open(_logo_path, "r") as f:
            _LOGO_B64 = f.read().strip()
    else:
        with open(_logo_path, "rb") as f:
            _LOGO_B64 = _b64.b64encode(f.read()).decode()
except Exception:
    pass

LOGO_IMG = ''  # Logo removed - not displaying properly in email clients

# Configuration
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "alerts@smarth2o.com")
# Parse comma-separated email list
_raw_recipients = os.getenv("ALERT_RECIPIENT_EMAIL", "admin@example.com")
ALERT_RECIPIENT_EMAILS = [email.strip() for email in _raw_recipients.split(",") if email.strip()]
EMAIL_COOLDOWN_MINUTES = int(os.getenv("EMAIL_COOLDOWN_MINUTES", "30"))

# Global client
resend_client = None
supabase = None


def init_email_service(supabase_client):
    """Initialize email service with Supabase client"""
    global resend_client, supabase
    
    if not RESEND_API_KEY:
        print("WARNING: RESEND_API_KEY not configured - email alerts disabled")
        return False
    
    if resend is None:
        print("WARNING: resend package not installed - email alerts disabled")
        return False
    
    try:
        # Set the API key for resend module
        resend.api_key = RESEND_API_KEY
        resend_client = resend.emails
        supabase = supabase_client
        recipient_count = len(ALERT_RECIPIENT_EMAILS)
        recipient_list = ", ".join(ALERT_RECIPIENT_EMAILS)
        print(f"Email service initialized - From: {RESEND_FROM_EMAIL}")
        print(f"Recipients ({recipient_count}): {recipient_list}")
        return True
    except Exception as e:
        print(f"Failed to initialize email service: {e}")
        return False


def should_send_alert(alert_type: str) -> bool:
    """Check if enough time has passed since last alert of this type (cooldown)"""
    if not supabase:
        return True
    
    try:
        cooldown_time = datetime.now(timezone.utc) - timedelta(minutes=EMAIL_COOLDOWN_MINUTES)
        
        response = supabase.table("email_logs").select("id").eq(
            "alert_type", alert_type
        ).gte(
            "created_at", cooldown_time.isoformat()
        ).limit(1).execute()
        
        # If there's a recent alert, skip sending (cooldown active)
        has_recent = len(response.data) > 0
        if has_recent:
            print(f"DEBUG: Cooldown active for {alert_type} - skipping email")
        else:
            print(f"DEBUG: No recent {alert_type} alert - will send")
        return not has_recent
    except Exception as e:
        print(f"Cooldown check error: {e}")
        return True  # Send anyway if check fails


def log_email(alert_type: str, recipient: str, subject: str, status: str, error_message: str = None):
    """Log email attempt to database"""
    if not supabase:
        return
    
    try:
        supabase.table("email_logs").insert({
            "alert_type": alert_type,
            "recipient_email": recipient,
            "subject": subject,
            "status": status,
            "error_message": error_message,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception as e:
        print(f"Failed to log email: {e}")


def send_email(to_email, subject: str, html: str, alert_type: str = "general") -> bool:
    """Send email via Resend - supports single email (str) or multiple emails (list)"""
    if not resend_client or resend is None:
        print(f"Email service not initialized - cannot send: {subject}")
        return False
    
    # Normalize to list for consistent handling
    recipients = to_email if isinstance(to_email, list) else [to_email]
    
    try:
        # Use resend.Emails class to send
        result = resend.Emails.send({
            "from": RESEND_FROM_EMAIL,
            "to": recipients,
            "subject": subject,
            "html": html
        })
        
        success = result.get("id") is not None
        status = "sent" if success else "failed"
        error_msg = result.get("message") if not success else None
        
        # Log for each recipient
        for recipient in recipients:
            log_email(alert_type, recipient, subject, status, error_msg)
        
        if success:
            recipient_str = ", ".join(recipients) if len(recipients) > 1 else recipients[0]
            print(f"✉️  Email sent: {subject} to {len(recipients)} recipient(s) (ID: {result.get('id')})")
        else:
            print(f"[ERROR] Email failed: {subject} - {error_msg}")
        
        return success
    except Exception as e:
        print(f"Error sending email: {e}")
        for recipient in recipients:
            log_email(alert_type, recipient, subject, "failed", str(e))
        return False


# ============ ALERT EMAIL TEMPLATES ============

def send_transaction_alert(transaction_id: str, customer_email: str, volume_ml: int, price: float) -> bool:
    """Alert when transaction is completed"""
    print(f"DEBUG: send_transaction_alert called for {transaction_id}")
    if not should_send_alert("transaction"):
        print(f"DEBUG: Transaction alert on cooldown - skipping")
        return False
    
    subject = f"[SmartH2wo] Transaction Completed - P{price:.2f} ({volume_ml}ml)"
    html = f"""
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding: 40px 40px 32px;">
                                    <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 600; color: #1a1a1a; text-align: center;">Transaction Completed</h1>
                                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                        <tr>
                                            <td style="background-color: #1D9E75; color: white; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">SUCCESS</td>
                                        </tr>
                                    </table>
                                    <p style="margin: 12px 0 0; font-size: 16px; color: #666; text-align: center;">Water dispensed successfully</p>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 0 40px 40px;">
                                    <!-- Details Box -->
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 4px;">
                                        <tr>
                                            <td style="padding: 24px;">
                                                <p style="margin: 0 0 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #888;">TRANSACTION DETAILS</p>
                                                
                                                <!-- Volume -->
                                                <table width="100%" border="0" cellpadding="12" cellspacing="0" style="border-bottom: 1px solid #e5e7eb;">
                                                    <tr>
                                                        <td style="font-size: 16px; color: #666;">Volume dispensed</td>
                                                        <td align="right" style="font-size: 16px; font-weight: 600; color: #1a1a1a;">{volume_ml} ml</td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Amount -->
                                                <table width="100%" border="0" cellpadding="12" cellspacing="0" style="border-bottom: 1px solid #e5e7eb;">
                                                    <tr>
                                                        <td style="font-size: 16px; color: #666;">Amount paid</td>
                                                        <td align="right" style="font-size: 20px; font-weight: 700; color: #1D9E75;">PHP {price:.2f}</td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Transaction ID -->
                                                <table width="100%" border="0" cellpadding="12" cellspacing="0" style="border-bottom: 1px solid #e5e7eb;">
                                                    <tr>
                                                        <td style="font-size: 16px; color: #666;">Transaction ID</td>
                                                        <td align="right" style="font-size: 11px; font-weight: 600; color: #1a1a1a; font-family: 'Courier New', monospace; word-break: break-all; max-width: 280px;">{transaction_id}</td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Timestamp -->
                                                <table width="100%" border="0" cellpadding="12" cellspacing="0">
                                                    <tr>
                                                        <td style="font-size: 16px; color: #666;">Timestamp</td>
                                                        <td align="right" style="font-size: 16px; font-weight: 600; color: #1a1a1a;">{datetime.now().strftime('%b %d, %Y at %I:%M %p')}</td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <p style="margin: 24px 0 0; font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
                                        Payment processed via PayMongo. Dispense command sent to device.
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td align="center" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                                    <p style="margin: 0; font-size: 13px; color: #999;">SmartH2wo Operations Center</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>
    """
    
    return send_email(ALERT_RECIPIENT_EMAILS, subject, html, "transaction")


def send_water_level_alert(water_level: float, status: str = "warning") -> bool:
    """Alert when water level is low"""
    if not should_send_alert("water_level"):
        return False
    
    severity = "CRITICAL" if status == "critical" else "WARNING"
    color_header = "#d32f2f" if status == "critical" else "#EF9F27"
    color_bar = "#d32f2f" if status == "critical" else "#EF9F27"
    
    subject = f"[SmartH2wo] {severity} - Water Level at {water_level}%"
    html = f"""
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding: 40px 40px 32px;">
                                    <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 600; color: #1a1a1a; text-align: center;">Low Water Level Alert</h1>
                                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                        <tr>
                                            <td style="background-color: {color_bar}; color: white; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">{severity}</td>
                                        </tr>
                                    </table>
                                    <p style="margin: 12px 0 0; font-size: 16px; color: #666; text-align: center;">Refill required</p>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 0 40px 40px;">
                                    <!-- Level Display -->
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 4px; margin: 0 0 24px;">
                                        <tr>
                                            <td align="center" style="padding: 40px 20px;">
                                                <p style="margin: 0; font-size: 64px; font-weight: 700; color: {color_bar}; font-family: 'Courier New', monospace; line-height: 1;">{water_level}%</p>
                                                <p style="margin: 12px 0 0; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Current water level</p>
                                                <!-- Progress bar -->
                                                <table width="80%" border="0" cellpadding="0" cellspacing="0" style="margin: 20px auto 0; height: 10px; background-color: #e5e7eb; border-radius: 5px;">
                                                    <tr>
                                                        <td style="width: {water_level}%; background-color: {color_bar}; border-radius: 5px; height: 10px;"></td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Alert Box -->
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-left: 4px solid {color_bar}; border-radius: 4px; margin: 0 0 24px;">
                                        <tr>
                                            <td style="padding: 20px;">
                                                <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #991b1b;">ACTION REQUIRED</p>
                                                <p style="margin: 0; font-size: 15px; color: #666; line-height: 1.6;">Tank water level is low. Refill the tank to avoid service interruption and ensure continuous operation.</p>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Info -->
                                    <table width="100%" border="0" cellpadding="10" cellspacing="0">
                                        <tr>
                                            <td style="font-size: 15px; color: #666;">Severity</td>
                                            <td align="right" style="font-size: 15px; font-weight: 600; color: #1a1a1a;">{severity}</td>
                                        </tr>
                                        <tr>
                                            <td style="font-size: 15px; color: #666;">Detected at</td>
                                            <td align="right" style="font-size: 15px; font-weight: 600; color: #1a1a1a;">{datetime.now().strftime('%b %d, %Y at %I:%M %p')}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td align="center" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                                    <p style="margin: 0; font-size: 13px; color: #999;">SmartH2wo Operations Center</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>
    """
    
    return send_email(ALERT_RECIPIENT_EMAILS, subject, html, "water_level")


def send_maintenance_due_alert(days_remaining: int, reason: str, severity: str) -> bool:
    """Alert when maintenance is due"""
    if not should_send_alert("maintenance"):
        return False
    
    color_map = {"critical": "#d32f2f", "high": "#EF9F27", "medium": "#378ADD"}
    color = color_map.get(severity, "#1976d2")
    
    subject = f"[SmartH2wo] Maintenance Required - {reason}"
    html = f"""
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding: 40px 40px 32px;">
                                    <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 600; color: #1a1a1a; text-align: center;">Maintenance Required</h1>
                                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                        <tr>
                                            <td style="background-color: {color}; color: white; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">{severity}</td>
                                        </tr>
                                    </table>
                                    <p style="margin: 12px 0 0; font-size: 16px; color: #666; text-align: center;">Scheduled maintenance needed</p>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 0 40px 40px;">
                                    <!-- Days Display -->
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 4px; margin: 0 0 24px;">
                                        <tr>
                                            <td align="center" style="padding: 40px 20px;">
                                                <p style="margin: 0; font-size: 64px; font-weight: 700; color: {color}; font-family: 'Courier New', monospace; line-height: 1;">{days_remaining}</p>
                                                <p style="margin: 12px 0 0; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Days until maintenance due</p>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Details Box -->
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fef9f3; border-left: 4px solid {color}; border-radius: 4px; margin: 0 0 24px;">
                                        <tr>
                                            <td style="padding: 20px;">
                                                <table width="100%" border="0" cellpadding="10" cellspacing="0">
                                                    <tr>
                                                        <td style="font-size: 15px; color: #666;">Reason</td>
                                                        <td align="right" style="font-size: 15px; font-weight: 600; color: #1a1a1a;">{reason}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="font-size: 15px; color: #666;">Priority level</td>
                                                        <td align="right" style="font-size: 15px; font-weight: 600; color: #1a1a1a;">{severity.upper()}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="font-size: 15px; color: #666;">Predicted by AI</td>
                                                        <td align="right" style="font-size: 15px; font-weight: 600; color: #1a1a1a;">{datetime.now().strftime('%b %d, %Y')}</td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <p style="margin: 0; font-size: 15px; color: #666; line-height: 1.6;">
                                        Schedule maintenance within the specified timeframe to prevent system downtime and ensure optimal performance.
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td align="center" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                                    <p style="margin: 0; font-size: 13px; color: #999;">SmartH2wo Operations Center</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>
    """
    
    return send_email(ALERT_RECIPIENT_EMAILS, subject, html, "maintenance")


def send_anomaly_alert(anomaly_type: str, message: str, severity: str) -> bool:
    """Alert on anomalies (pressure, temperature, etc.)"""
    if not should_send_alert("anomaly"):
        return False
    
    color_map = {"critical": "#d32f2f", "high": "#EF9F27", "medium": "#378ADD"}
    color = color_map.get(severity, "#1976d2")
    
    subject = f"[SmartH2wo] {severity.upper()} - System Anomaly Detected: {anomaly_type}"
    html = f"""
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding: 40px 40px 32px;">
                                    <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 600; color: #1a1a1a; text-align: center;">System Anomaly Detected</h1>
                                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                        <tr>
                                            <td style="background-color: {color}; color: white; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">{severity}</td>
                                        </tr>
                                    </table>
                                    <p style="margin: 12px 0 0; font-size: 16px; color: #666; text-align: center;">Immediate investigation required</p>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 0 40px 40px;">
                                    <!-- Anomaly Box -->
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-left: 4px solid {color}; border-radius: 4px; margin: 0 0 24px;">
                                        <tr>
                                            <td style="padding: 24px;">
                                                <p style="margin: 0 0 12px; font-size: 20px; font-weight: 600; color: {color};">{anomaly_type}</p>
                                                <p style="margin: 0; font-size: 15px; color: #666; line-height: 1.6;">{message}</p>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Info -->
                                    <table width="100%" border="0" cellpadding="10" cellspacing="0" style="margin: 0 0 24px;">
                                        <tr>
                                            <td style="font-size: 15px; color: #666;">Severity level</td>
                                            <td align="right" style="font-size: 15px; font-weight: 600; color: #1a1a1a;">{severity.upper()}</td>
                                        </tr>
                                        <tr>
                                            <td style="font-size: 15px; color: #666;">Detected at</td>
                                            <td align="right" style="font-size: 15px; font-weight: 600; color: #1a1a1a;">{datetime.now().strftime('%b %d, %Y at %I:%M %p')}</td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Action Box -->
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fef9f3; border-radius: 4px;">
                                        <tr>
                                            <td style="padding: 20px;">
                                                <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #78350f;">ACTION REQUIRED</p>
                                                <p style="margin: 0; font-size: 15px; color: #666; line-height: 1.6;">Investigate and resolve this system issue immediately to prevent potential failures or service disruption.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td align="center" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                                    <p style="margin: 0; font-size: 13px; color: #999;">SmartH2wo Operations Center</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>
    """
    
    return send_email(ALERT_RECIPIENT_EMAILS, subject, html, "anomaly")

def send_power_status_alert(is_on: bool) -> bool:
    """Alert when system power state changes"""
    if not should_send_alert("power_status"):
        return False
    
    status_text = "POWER RESTORED" if is_on else "POWER LOST"
    color = "#1D9E75" if is_on else "#d32f2f"
    bg_color = "#e6f4ea" if is_on else "#fef2f2"
    
    subject = f"[SmartH2wo] System {status_text}"
    html = f"""
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding: 40px 40px 32px;">
                                    <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 600; color: #1a1a1a; text-align: center;">Power Status Update</h1>
                                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                        <tr>
                                            <td style="background-color: {color}; color: white; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">{status_text}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 0 40px 40px;">
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: {bg_color}; border-left: 4px solid {color}; border-radius: 4px;">
                                        <tr>
                                            <td style="padding: 24px;">
                                                <p style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: {color};">The system is now {'ONLINE' if is_on else 'OFFLINE'}</p>
                                                <p style="margin: 0; font-size: 15px; color: #666; line-height: 1.6;">
                                                    {'The water dispenser has regained power and is operating normally.' if is_on else 'The water dispenser has lost power or the MCU has disconnected from the broker. Please investigate.'}
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <table width="100%" border="0" cellpadding="10" cellspacing="0" style="margin-top: 24px;">
                                        <tr>
                                            <td style="font-size: 15px; color: #666;">Time Detected</td>
                                            <td align="right" style="font-size: 15px; font-weight: 600; color: #1a1a1a;">{datetime.now().strftime('%b %d, %Y at %I:%M %p')}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td align="center" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                                    <p style="margin: 0; font-size: 13px; color: #999;">SmartH2wo Operations Center</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>
    """
    
    return send_email(ALERT_RECIPIENT_EMAILS, subject, html, "power_status")
