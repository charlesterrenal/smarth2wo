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
    
    if resend is None:
        print("WARNING: resend package not installed - email alerts disabled")
        return False
    
    try:
        # Set the API key for resend module
        resend.api_key = RESEND_API_KEY
        resend_client = resend.emails
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


def send_email(to_email: str, subject: str, html: str, alert_type: str = "general") -> bool:
    """Send email via Resend"""
    if not resend_client or resend is None:
        print(f"Email service not initialized - cannot send: {subject}")
        return False
    
    try:
        # Use resend.Emails class to send
        result = resend.Emails.send({
            "from": RESEND_FROM_EMAIL,
            "to": to_email,
            "subject": subject,
            "html": html
        })
        
        success = result.get("id") is not None
        status = "sent" if success else "failed"
        error_msg = result.get("message") if not success else None
        
        log_email(alert_type, to_email, subject, status, error_msg)
        
        if success:
            print(f"✉️  Email sent: {subject} (ID: {result.get('id')})")
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
    print(f"DEBUG: send_transaction_alert called for {transaction_id}")
    if not should_send_alert("transaction"):
        print(f"DEBUG: Transaction alert on cooldown - skipping")
        return False
    
    subject = f"Transaction Confirmed - {volume_ml}ml Water Dispensed"
    html = f"""
    <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #1a1a1a; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; }}
                .header {{ background: linear-gradient(135deg, #378ADD 0%, #1D9E75 100%); color: white; padding: 32px 24px; text-align: center; }}
                .header h2 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .content {{ padding: 32px 24px; }}
                .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }}
                .info-item {{ padding: 16px; background: #f8f9fa; border-radius: 0; }}
                .info-label {{ font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }}
                .info-value {{ font-size: 16px; font-weight: 600; color: #1a1a1a; font-family: 'DM Mono', monospace; }}
                .amount {{ font-size: 32px; color: #1D9E75; }}
                .volume {{ font-size: 24px; color: #378ADD; }}
                .footer {{ padding: 24px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>✅ Payment Confirmed</h2>
                </div>
                
                <div class="content">
                    <p style="margin-top: 0; color: #666;">Your water dispenser payment has been successfully processed.</p>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Volume</div>
                            <div class="info-value volume">{volume_ml}ml</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Amount Paid</div>
                            <div class="info-value amount">₱{price:.2f}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Transaction ID</div>
                            <div class="info-value" style="font-size: 13px; word-break: break-all;">{transaction_id}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Timestamp</div>
                            <div class="info-value" style="font-size: 13px;">{datetime.now().strftime('%H:%M:%S')}</div>
                        </div>
                    </div>
                    
                    <p style="margin-top: 32px; padding: 16px; background: #f0f8ff; border-left: 4px solid #378ADD; color: #333; font-size: 14px;">
                        Your water is being dispensed. Thank you for using SmartH2wo!
                    </p>
                </div>
                
                <div class="footer">
                    SmartH2wo Water Dispenser Management System
                </div>
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
    color_header = "#d32f2f" if status == "critical" else "#EF9F27"
    color_bar = "#d32f2f" if status == "critical" else "#EF9F27"
    
    subject = f"🚨 Water Level {severity} - {water_level}%"
    html = f"""
    <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #1a1a1a; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; }}
                .header {{ background: linear-gradient(135deg, {color_header} 0%, #d32f2f 100%); color: white; padding: 32px 24px; text-align: center; }}
                .header h2 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .content {{ padding: 32px 24px; }}
                .level-display {{ margin: 32px 0; text-align: center; }}
                .level-number {{ font-size: 48px; font-weight: 600; color: {color_bar}; font-family: 'DM Mono', monospace; }}
                .level-label {{ font-size: 14px; color: #666; margin-top: 8px; }}
                .progress-bar {{ width: 100%; height: 8px; background: #eee; margin: 24px 0; border-radius: 0; overflow: hidden; }}
                .progress-fill {{ height: 100%; background: {color_bar}; width: {water_level}%; }}
                .alert-box {{ padding: 16px 24px; background: #fff3e0; border-left: 4px solid {color_bar}; margin: 24px 0; }}
                .alert-box p {{ margin: 0; font-size: 14px; color: #333; }}
                .footer {{ padding: 24px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>⚠️ Water Level {severity}</h2>
                </div>
                
                <div class="content">
                    <div class="level-display">
                        <div class="level-number">{water_level}%</div>
                        <div class="level-label">Current Water Level</div>
                    </div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    
                    <div class="alert-box">
                        <p><strong>Action Required:</strong> Water level is low. Please refill the tank as soon as possible to avoid service interruption.</p>
                    </div>
                    
                    <p style="font-size: 13px; color: #666;">
                        <strong>Alert Type:</strong> {severity}<br>
                        <strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                    </p>
                </div>
                
                <div class="footer">
                    SmartH2wo Water Dispenser Management System
                </div>
            </div>
        </body>
    </html>
    """
    
    return send_email(ALERT_RECIPIENT_EMAIL, subject, html, "water_level")


def send_maintenance_due_alert(days_remaining: int, reason: str, severity: str) -> bool:
    """Alert when maintenance is due"""
    if not should_send_alert("maintenance"):
        return False
    
    color_map = {"critical": "#d32f2f", "high": "#EF9F27", "medium": "#378ADD"}
    color = color_map.get(severity, "#1976d2")
    
    subject = f"🔧 Maintenance Due - {reason}"
    html = f"""
    <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #1a1a1a; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; }}
                .header {{ background: linear-gradient(135deg, {color} 0%, #378ADD 100%); color: white; padding: 32px 24px; text-align: center; }}
                .header h2 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .content {{ padding: 32px 24px; }}
                .info-box {{ margin: 24px 0; }}
                .info-item {{ padding: 16px; background: #f8f9fa; margin-bottom: 12px; border-left: 4px solid {color}; }}
                .info-label {{ font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }}
                .info-value {{ font-size: 16px; font-weight: 600; color: #1a1a1a; }}
                .days-remaining {{ font-size: 32px; color: {color}; font-family: 'DM Mono', monospace; }}
                .severity-badge {{ display: inline-block; padding: 6px 12px; background: {color}; color: white; font-size: 12px; font-weight: 600; text-transform: uppercase; }}
                .action-box {{ padding: 16px 24px; background: #f0f8ff; border-left: 4px solid #378ADD; margin: 24px 0; }}
                .footer {{ padding: 24px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🔧 Maintenance Required</h2>
                </div>
                
                <div class="content">
                    <div class="info-box">
                        <div class="info-item">
                            <div class="info-label">Days Until Due</div>
                            <div class="days-remaining">{days_remaining}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Reason</div>
                            <div class="info-value">{reason}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Severity</div>
                            <span class="severity-badge">{severity}</span>
                        </div>
                    </div>
                    
                    <div class="action-box">
                        <p style="margin: 0; font-size: 14px; color: #333;">
                            <strong>Schedule Maintenance:</strong> Please schedule maintenance within the specified timeframe to prevent system downtime and ensure optimal performance.
                        </p>
                    </div>
                </div>
                
                <div class="footer">
                    SmartH2wo Water Dispenser Management System
                </div>
            </div>
        </body>
    </html>
    """
    
    return send_email(ALERT_RECIPIENT_EMAIL, subject, html, "maintenance")


def send_anomaly_alert(anomaly_type: str, message: str, severity: str) -> bool:
    """Alert on anomalies (pressure, temperature, etc.)"""
    if not should_send_alert("anomaly"):
        return False
    
    color_map = {"critical": "#d32f2f", "high": "#EF9F27", "medium": "#378ADD"}
    color = color_map.get(severity, "#1976d2")
    
    subject = f"🚨 System Anomaly - {anomaly_type}"
    html = f"""
    <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #1a1a1a; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; }}
                .header {{ background: linear-gradient(135deg, {color} 0%, #d32f2f 100%); color: white; padding: 32px 24px; text-align: center; }}
                .header h2 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .content {{ padding: 32px 24px; }}
                .anomaly-box {{ margin: 24px 0; padding: 24px; background: #f8f9fa; border-left: 4px solid {color}; }}
                .anomaly-type {{ font-size: 18px; font-weight: 600; color: {color}; margin-bottom: 12px; }}
                .anomaly-message {{ font-size: 14px; color: #333; margin-bottom: 16px; line-height: 1.6; }}
                .severity-badge {{ display: inline-block; padding: 6px 12px; background: {color}; color: white; font-size: 12px; font-weight: 600; text-transform: uppercase; }}
                .warning-box {{ padding: 16px 24px; background: #ffebee; border-left: 4px solid #d32f2f; margin: 24px 0; }}
                .warning-box p {{ margin: 0; font-size: 14px; color: #333; }}
                .footer {{ padding: 24px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🚨 System Anomaly Detected</h2>
                </div>
                
                <div class="content">
                    <div class="anomaly-box">
                        <div class="anomaly-type">{anomaly_type}</div>
                        <p class="anomaly-message">{message}</p>
                        <span class="severity-badge">{severity} Priority</span>
                    </div>
                    
                    <div class="warning-box">
                        <p><strong>⚠️ Action Required:</strong> Investigate and resolve this system issue immediately to prevent potential failures or service disruption.</p>
                    </div>
                    
                    <p style="font-size: 13px; color: #666; margin-top: 24px;">
                        <strong>Detected:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                    </p>
                </div>
                
                <div class="footer">
                    SmartH2wo Water Dispenser Management System
                </div>
            </div>
        </body>
    </html>
    """
    
    return send_email(ALERT_RECIPIENT_EMAIL, subject, html, "anomaly")
