"""
PayMongo Payment Integration Service

Handles:
- Creating dynamic QR code payment checkout sessions
- Generating QR codes for transactions
- Processing payment webhooks
- Logging transactions to Supabase
"""

import os
import json
import base64
import uuid
from datetime import datetime
import requests
import qrcode
from io import BytesIO
from pydantic import BaseModel
from typing import Optional

PAYMONGO_PUBLIC_KEY = os.getenv("PAYMONGO_PUBLIC_KEY")
PAYMONGO_SECRET_KEY = os.getenv("PAYMONGO_SECRET_KEY")
PAYMONGO_BASE_URL = "https://api.paymongo.com/v1"

# ============ Request Models ============

class CreatePaymentRequest(BaseModel):
    """Request to create a payment checkout"""
    amount_pesos: float  # e.g., 50.00 for ₱50
    volume_ml: int  # e.g., 500 for 500ml
    description: Optional[str] = None
    customer_email: Optional[str] = None

class WebhookPayload(BaseModel):
    """PayMongo webhook payload structure"""
    data: dict
    type: str

# ============ Helper Functions ============

def _get_auth_header():
    """Generate Basic Auth header for PayMongo"""
    credentials = base64.b64encode(f"{PAYMONGO_SECRET_KEY}:".encode()).decode()
    return {"Authorization": f"Basic {credentials}"}

def generate_qr_code_image(payment_link: str) -> str:
    """
    Generate QR code image and return as base64 string
    
    Args:
        payment_link: URL to encode in QR code
        
    Returns:
        base64 encoded PNG image string
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2,
    )
    qr.add_data(payment_link)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return img_base64

# ============ Payment Functions ============

def create_checkout_session(request: CreatePaymentRequest) -> dict:
    """
    Create a PayMongo GCash QR code checkout session
    
    Args:
        request: Payment request with amount and details
        
    Returns:
        {
            "checkout_url": "https://...",
            "qr_code_base64": "data:image/png;base64,...",
            "transaction_id": "uuid",
            "amount_pesos": 50.00,
            "volume_ml": 500
        }
    """
    
    if not PAYMONGO_PUBLIC_KEY or not PAYMONGO_SECRET_KEY:
        raise Exception("PayMongo credentials not configured in .env")
    
    # Generate unique transaction ID
    transaction_id = str(uuid.uuid4())
    
    # Amount in centavos (₱50 = 5000 centavos)
    amount_centavos = int(request.amount_pesos * 100)
    
    # Create checkout session via PayMongo API
    checkout_payload = {
        "data": {
            "attributes": {
                "amount": amount_centavos,
                "currency": "PHP",
                "payment_method_types": ["qrph"],
                "description": request.description or f"Water dispenser refill - {request.volume_ml}ml",
                "line_items": [
                    {
                        "name": f"Water Refill - {request.volume_ml}ml",
                        "quantity": 1,
                        "amount": amount_centavos,
                        "currency": "PHP"
                    }
                ],
                "success_url": f"http://localhost:5173?payment_success={transaction_id}",
                "cancel_url": "http://localhost:5173?payment_cancelled=true",
                "client_key": PAYMONGO_PUBLIC_KEY,
                "metadata": {
                    "transaction_id": transaction_id,
                    "volume_ml": request.volume_ml,
                    "customer_email": request.customer_email
                }
            }
        }
    }
    
    try:
        response = requests.post(
            f"{PAYMONGO_BASE_URL}/checkout_sessions",
            json=checkout_payload,
            headers=_get_auth_header()
        )
        response.raise_for_status()
        
        checkout_data = response.json()
        checkout_id = checkout_data["data"]["id"]
        checkout_url = checkout_data["data"]["attributes"]["checkout_url"]
        
        # Generate QR code
        qr_code_base64 = generate_qr_code_image(checkout_url)
        
        return {
            "transaction_id": transaction_id,
            "checkout_url": checkout_url,
            "checkout_id": checkout_id,
            "qr_code_base64": f"data:image/png;base64,{qr_code_base64}",
            "amount_pesos": request.amount_pesos,
            "volume_ml": request.volume_ml,
            "status": "pending"
        }
    
    except requests.exceptions.RequestException as e:
        raise Exception(f"PayMongo API error: {str(e)}")

def handle_webhook(webhook_data: dict) -> dict:
    """
    Handle PayMongo webhook for payment confirmation
    
    Called when customer completes payment. Updates transaction status.
    
    Args:
        webhook_data: Webhook payload from PayMongo
        
    Returns:
        {
            "success": True/False,
            "transaction_id": "uuid",
            "payment_status": "succeeded|failed",
            "message": "..."
        }
    """
    
    try:
        event_type = webhook_data.get("type")
        event_data = webhook_data.get("data", {})
        attributes = event_data.get("attributes", {})
        
        # Only handle payment.paid events
        if event_type != "payment.paid":
            return {
                "success": False,
                "message": f"Webhook type '{event_type}' not handled"
            }
        
        # Extract transaction details
        payment_metadata = attributes.get("metadata", {})
        transaction_id = payment_metadata.get("transaction_id")
        volume_ml = payment_metadata.get("volume_ml")
        
        if not transaction_id:
            return {
                "success": False,
                "message": "No transaction_id in webhook metadata"
            }
        
        payment_status = attributes.get("status", "unknown")
        amount_cents = attributes.get("amount", 0)
        amount_pesos = amount_cents / 100
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "payment_status": payment_status,
            "volume_ml": volume_ml,
            "amount_pesos": amount_pesos,
            "payment_method": "gcash",
            "message": "Payment confirmed - ready to dispense"
        }
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Webhook processing error: {str(e)}"
        }

def verify_webhook_signature(body: str, signature: str) -> bool:
    """
    Verify PayMongo webhook signature for security
    
    Args:
        body: Raw request body
        signature: Signature header from PayMongo
        
    Returns:
        True if signature is valid, False otherwise
    """
    import hmac
    import hashlib
    
    expected_signature = hmac.new(
        PAYMONGO_SECRET_KEY.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return signature == expected_signature
