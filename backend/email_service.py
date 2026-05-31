"""
Email Service for SmartH2O - Handles alerts via Resend
Sends notifications for: transactions, water level, maintenance, anomalies
"""

import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from typing import Optional
import json

load_dotenv()

try:
    from resend import Resend
except ImportError:
    Resend = None

# Configuration
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "alerts@smarth2o.com")
ALERT_RECIPIENT_EMAIL = os.getenv("ALERT_RECIPIENT_EMAIL", "admin@example.com")
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
    
    if Resend is None:
        print("WARNING: resend package not installed - email alerts disabled")
        return False
    
    try:
        resend_client = Resend(RESEND_API_KEY)
        supabase = supabase_client
        print(f"Email service initialized - From: {RESEND_FROM_EMAIL}")
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
        return len(response.data) == 0
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


def send_email(to_email: str, subject: str, html: str, alert_type: str = "general") -> bool:
    """Send email via Resend"""
    if not resend_client:
        print(f"Email service not initialized - cannot send: {subject}")
        return False
    
    try:
        result = resend_client.emails.send({
            "from": RESEND_FROM_EMAIL,
            "to": to_email,
            "subject": subject,
            "html": html
        })
        
        success = "id" in result
        status = "sent" if success else "failed"
        error_msg = result.get("message") if not success else None
        
        log_email(alert_type, to_email, subject, status, error_msg)
        
        if success:
            print(f"✉️  Email sent: {subject}")
        else:
            print(f"❌ Email failed: {subject} - {error_msg}")
        
        return success
    except Exception as e:
        print(f"Error sending email: {e}")
        log_email(alert_type, to_email, subject, "failed", str(e))
        return False


# ============ ALERT EMAIL TEMPLATES ============

def send_transaction_alert(transaction_id: str, customer_email: str, volume_ml: int, price: float) -> bool:
    """Alert when transaction is completed"""
    if not should_send_alert("transaction"):
        return False
    
    subject = f"Transaction Confirmed - {volume_ml}ml Water Dispensed"
    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 8px;">
                <h2 style="color: #0066cc;">✅ Transaction Successful</h2>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Transaction ID:</strong> {transaction_id}</p>
                    <p><strong>Volume:</strong> {volume_ml} ml</p>
                    <p><strong>Amount:</strong> ₱{price:.2f}</p>
                    <p><strong>Customer Email:</strong> {customer_email}</p>
                    <p><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
                
                <p style="color: #666; font-size: 12px; text-align: center;">
                    SmartH2O Water Dispenser System
                </p>
            </div>
        </body>
    </html>
    """
    
    return send_email(ALERT_RECIPIENT_EMAIL, subject, html, "transaction")


def send_water_level_alert(water_level: float, status: str = "warning") -> bool:
    """Alert when water level is low"""
    if not should_send_alert("water_level"):
        return False
    
    severity = "CRITICAL" if status == "critical" else "WARNING"
    color = "#d32f2f" if status == "critical" else "#f57c00"
    
    subject = f"🚨 Water Level {severity} - {water_level}%"
    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 8px;">
                <h2 style="color: {color};">⚠️ Water Level {severity}</h2>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <div style="background: {color}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h3 style="margin: 0; font-size: 24px;">{water_level}%</h3>
                        <p style="margin: 5px 0 0 0;">Current Water Level</p>
                    </div>
                    
                    <p><strong>Status:</strong> {severity}</p>
                    <p><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                    
                    <div style="background: #fff3e0; padding: 10px; border-radius: 4px; margin-top: 15px;">
                        <p style="margin: 0;">
                            <strong>Action Required:</strong> Please refill the water tank soon.
                        </p>
                    </div>
                </div>
                
                <p style="color: #666; font-size: 12px; text-align: center;">
                    SmartH2O Water Dispenser System
                </p>
            </div>
        </body>
    </html>
    """
    
    return send_email(ALERT_RECIPIENT_EMAIL, subject, html, "water_level")


def send_maintenance_due_alert(days_remaining: int, reason: str, severity: str) -> bool:
    """Alert when maintenance is due"""
    if not should_send_alert("maintenance"):
        return False
    
    color_map = {"critical": "#d32f2f", "high": "#f57c00", "medium": "#fbc02d"}
    color = color_map.get(severity, "#1976d2")
    
    subject = f"🔧 Maintenance Due - {reason}"
    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 8px;">
                <h2 style="color: {color};">🔧 Maintenance Required</h2>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <div style="background: {color}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h3 style="margin: 0; font-size: 24px;">{days_remaining} days</h3>
                        <p style="margin: 5px 0 0 0;">Time Remaining</p>
                    </div>
                    
                    <p><strong>Reason:</strong> {reason}</p>
                    <p><strong>Severity:</strong> {severity.upper()}</p>
                    <p><strong>Scheduled:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                    
                    <div style="background: #e3f2fd; padding: 10px; border-radius: 4px; margin-top: 15px;">
                        <p style="margin: 0;">
                            <strong>Action Required:</strong> Schedule maintenance within {days_remaining} days to avoid system downtime.
                        </p>
                    </div>
                </div>
                
                <p style="color: #666; font-size: 12px; text-align: center;">
                    SmartH2O Water Dispenser System
                </p>
            </div>
        </body>
    </html>
    """
    
    return send_email(ALERT_RECIPIENT_EMAIL, subject, html, "maintenance")


def send_anomaly_alert(anomaly_type: str, message: str, severity: str) -> bool:
    """Alert on anomalies (pressure, temperature, etc.)"""
    if not should_send_alert("anomaly"):
        return False
    
    color_map = {"critical": "#d32f2f", "high": "#f57c00", "medium": "#fbc02d"}
    color = color_map.get(severity, "#1976d2")
    
    subject = f"🚨 System Anomaly - {anomaly_type}"
    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 8px;">
                <h2 style="color: {color};">🚨 System Anomaly Detected</h2>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <div style="background: {color}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h3 style="margin: 0; font-size: 20px;">{anomaly_type}</h3>
                        <p style="margin: 5px 0 0 0;">{severity.upper()} - Immediate Attention Required</p>
                    </div>
                    
                    <p><strong>Issue:</strong> {message}</p>
                    <p><strong>Severity:</strong> {severity.upper()}</p>
                    <p><strong>Detected:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                    
                    <div style="background: #ffebee; padding: 10px; border-radius: 4px; margin-top: 15px;">
                        <p style="margin: 0;">
                            <strong>Action Required:</strong> Investigate and resolve this issue immediately to prevent system failure.
                        </p>
                    </div>
                </div>
                
                <p style="color: #666; font-size: 12px; text-align: center;">
                    SmartH2O Water Dispenser System
                </p>
            </div>
        </body>
    </html>
    """
    
    return send_email(ALERT_RECIPIENT_EMAIL, subject, html, "anomaly")
