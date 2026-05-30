# PayMongo Integration Setup

This backend uses **PayMongo** to generate dynamic QR codes for each water dispenser transaction. Customers scan the QR → pay via GCash → water dispenses automatically.

---

## Setup Steps

### 1️⃣ Create PayMongo Account

1. Go to [PayMongo Dashboard](https://dashboard.paymongo.com)
2. Sign up or log in
3. Navigate to **API Keys** (usually in Settings)
4. You'll see two keys:
   - **Public Key** (starts with `pk_live_` or `pk_test_`)
   - **Secret Key** (starts with `sk_live_` or `sk_test_`)

### 2️⃣ Add Credentials to `.env`

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add:

```env
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
```

### 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

New packages added:
- `qrcode>=8.0` - Generate QR codes
- `Pillow>=11.0.0` - Image processing for QR codes

### 4️⃣ Run Backend

```bash
python main.py
```

---

## API Endpoints

### Create Payment Checkout (QR Code)

**Endpoint:** `POST /api/payments/create-checkout`

**Request Body:**
```json
{
  "amount_pesos": 50.00,
  "volume_ml": 500,
  "description": "500ml water refill",
  "customer_email": "user@example.com"
}
```

**Response:**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "checkout_url": "https://checkout.paymongo.com/...",
  "checkout_id": "cs_...",
  "qr_code_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
  "amount_pesos": 50.00,
  "volume_ml": 500,
  "status": "pending"
}
```

**Usage from ESP32:**
1. Call this endpoint
2. Get `qr_code_base64` → Display on TFT screen
3. Customer scans QR with phone
4. Redirects to PayMongo GCash payment page

---

### Payment Webhook

**Endpoint:** `POST /api/payments/webhook`

PayMongo calls this when payment succeeds.

**Webhook Event to Select in PayMongo Dashboard:** `payment.paid`

**Payload from PayMongo:**
```json
{
  "type": "payment.paid",
  "data": {
    "attributes": {
      "status": "succeeded",
      "amount": 5000,
      "metadata": {
        "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
        "volume_ml": 500,
        "customer_email": "user@example.com"
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment confirmed - ready to dispense",
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "should_dispense": true
}
```

**What Happens:**
1. ✅ Transaction marked as "completed" in Supabase
2. ✅ Logged to `logs` table
3. ✅ TODO: Signal sent to ESP32 via MQTT to **dispense water**

---

### Check Payment Status

**Endpoint:** `GET /api/payments/status/{transaction_id}`

**Response:**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "volume_ml": 500,
  "price": 50.00,
  "created_at": "2025-05-30T14:30:00"
}
```

---

## Configure Webhook in PayMongo

To receive payment confirmations, you need to set up a webhook endpoint in PayMongo:

1. **PayMongo Dashboard** → API → Webhooks
2. Add Webhook Endpoint: `https://your-backend-url/api/payments/webhook`
3. Select Event: `payment.success`
4. Save

For **local development**, you can use [ngrok](https://ngrok.com) to expose your local backend:

```bash
ngrok http 8000
# Get URL like: https://abcd-1234-efgh-5678.ngrok.io

# Update PayMongo webhook to:
# https://abcd-1234-efgh-5678.ngrok.io/api/payments/webhook
```

---

## Testing

### Test Create Checkout (Generate QR)

```bash
curl -X POST http://localhost:8000/api/payments/create-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "amount_pesos": 50.00,
    "volume_ml": 500,
    "description": "Test water refill",
    "customer_email": "test@example.com"
  }'
```

Response will include `qr_code_base64` (PNG image).

### Test Webhook (Simulate Payment)

```bash
curl -X POST http://localhost:8000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment.paid",
    "data": {
      "attributes": {
        "status": "succeeded",
        "amount": 5000,
        "metadata": {
          "transaction_id": "test-123",
          "volume_ml": 500,
          "customer_email": "test@example.com"
        }
      }
    }
  }'
```

---

## How PayMongo Webhook Works (Complete Flow)

### The Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ESP32 / Frontend calls: POST /api/payments/create-checkout  │
│    → Backend creates PayMongo checkout session                  │
│    → Generates QR code (base64 PNG)                             │
│    → Returns: {qr_code_base64, checkout_url, transaction_id}   │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. ESP32 displays QR code on TFT screen                         │
│    Customer scans with phone (GCash app)                        │
│    → Redirected to PayMongo payment page (GCash checkout)       │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Customer completes payment in GCash                          │
│    → PayMongo processes payment                                 │
│    → Payment succeeds ✅                                         │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. PayMongo sends WEBHOOK to our backend                        │
│    POST /api/payments/webhook                                   │
│    Payload includes: payment.success event + metadata           │
│    (Contains: transaction_id, volume_ml, customer_email)        │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Backend webhook handler:                                     │
│    ✅ Verify webhook signature (security)                       │
│    ✅ Extract transaction_id from metadata                      │
│    ✅ Update Supabase: mark transaction as "completed"          │
│    ✅ Log to database                                            │
│    ✅ TODO: Signal ESP32 via MQTT to dispense water             │
│    → Return success response to PayMongo                        │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. ESP32 receives signal → DISPENSE WATER! 💧                   │
│    Customer gets their 500ml (or requested amount)              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points

1. **Webhook is called by PayMongo** - Not by our code. PayMongo automatically calls our endpoint after payment succeeds
2. **Automatic Retry** - PayMongo retries the webhook if we don't respond with 200 OK
3. **Webhook Signature Verification** - PayMongo includes a signature header so we can verify the request actually came from PayMongo (prevents fake webhooks)
4. **Idempotent** - Our code should handle duplicate webhook calls gracefully (same transaction_id called twice)

---

## Webhook Setup for Local Development (ngrok)

For testing webhooks locally without deploying:

### Step 1: Install ngrok

Download from [ngrok.com](https://ngrok.com) or install via package manager:

```bash
# macOS
brew install ngrok

# Windows (using choco)
choco install ngrok

# Or download from website
```

### Step 2: Start ngrok

In a new terminal:

```bash
ngrok http 8000
```

You'll see:
```
Session Status       online
Account              user@example.com
Version              3.0.0
Region               us
Latency              10ms
Web Interface        http://127.0.0.1:4040

Forwarding           https://1234-567-89-123.ngrok.io -> http://localhost:8000
```

**Copy the `https://...ngrok.io` URL** - this is your public webhook endpoint!

### Step 3: Set Webhook in PayMongo Dashboard

1. Go to [PayMongo Dashboard](https://dashboard.paymongo.com)
2. Navigate to **API & Keys** → **Webhooks**
3. Add New Webhook:
   - **Webhook URL**: `https://1234-567-89-123.ngrok.io/api/payments/webhook`
   - **Events**: Select `payment.success`
   - Save

### Step 4: Test Full Payment Flow

1. **Start backend:**
   ```bash
   python main.py
   ```

2. **Create checkout:**
   ```bash
   curl -X POST http://localhost:8000/api/payments/create-checkout \
     -H "Content-Type: application/json" \
     -d '{
       "amount_pesos": 1.00,
       "volume_ml": 100,
       "customer_email": "test@example.com"
     }'
   ```

3. **Get the `checkout_url`** from response

4. **Manually trigger webhook** (since you can't actually pay in test mode easily):
   ```bash
   curl -X POST https://1234-567-89-123.ngrok.io/api/payments/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "type": "payment.success",
       "data": {
         "attributes": {
           "status": "succeeded",
           "amount": 100,
           "metadata": {
             "transaction_id": "YOUR_TRANSACTION_ID_HERE",
             "volume_ml": 100,
             "customer_email": "test@example.com"
           }
         }
       }
     }'
   ```

5. **Check Supabase** - Transaction should be marked as completed! ✅

6. **Monitor ngrok dashboard** - Go to `http://127.0.0.1:4040` to see all webhook requests in real-time

---

## Webhook Security (Signature Verification)

PayMongo signs all webhook requests using HMAC-SHA256. To verify:

```python
import hmac
import hashlib

def verify_webhook_signature(body: str, signature: str) -> bool:
    expected_signature = hmac.new(
        PAYMONGO_SECRET_KEY.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature == expected_signature
```

**Note**: Our current implementation doesn't enforce signature verification yet (TODO in code). For production, always verify the signature header!

---

## Frontend Integration (React)

In your React component, call the payment endpoint:

```jsx
async function dispenseWater() {
  const response = await fetch('http://localhost:8000/api/payments/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount_pesos: 50.00,
      volume_ml: 500,
      customer_email: 'user@example.com'
    })
  });
  
  const data = await response.json();
  
  // Display QR code on screen
  console.log('QR Code:', data.qr_code_base64);
  console.log('Checkout URL:', data.checkout_url);
  
  // Store transaction_id for status checking
  setTransactionId(data.transaction_id);
}
```

---

## Database Schema

Transactions are stored in Supabase `transactions` table:

```sql
CREATE TABLE transactions (
  id BIGINT PRIMARY KEY DEFAULT nextval('transactions_id_seq'),
  transaction_id UUID UNIQUE,
  checkout_id TEXT,
  volume_ml INTEGER,
  price DECIMAL(10, 2),
  payment_method TEXT,
  status TEXT,
  customer_email TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## Environment Variables

Add to `backend/.env`:

```env
# PayMongo API Keys (from PayMongo Dashboard)
PAYMONGO_PUBLIC_KEY=pk_test_your_key_here
PAYMONGO_SECRET_KEY=sk_test_your_key_here

# Supabase (for transaction logging)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
```

---

## Next Steps

1. ✅ Create PayMongo account & get API keys
2. ✅ Add keys to `.env`
3. ✅ Run `pip install -r requirements.txt`
4. ✅ Start backend: `python main.py`
5. ✅ Test endpoints with curl or frontend
6. ⏳ **TODO:** Integrate ESP32 MQTT to signal dispenser when payment confirmed

---

## Troubleshooting

### QR Code Not Generating

- Ensure `qrcode` and `Pillow` are installed: `pip install qrcode Pillow`
- Check `PAYMONGO_PUBLIC_KEY` is set in `.env`

### PayMongo API Errors

- Verify keys are correct (copy from PayMongo dashboard)
- Make sure you're using test keys during development
- Check PayMongo status page: https://status.paymongo.com

### Webhook Not Received

- Set up webhook in PayMongo dashboard pointing to `/api/payments/webhook`
- For local development, use ngrok: `ngrok http 8000`
- PayMongo will retry failed webhook deliveries

---

## References

- [PayMongo API Docs](https://developers.paymongo.com/)
- [PayMongo Dashboard](https://dashboard.paymongo.com)
- [QR Code Python Library](https://github.com/lincolnloop/python-qrcode)
