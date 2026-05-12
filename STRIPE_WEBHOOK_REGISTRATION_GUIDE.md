# Stripe Webhook Registration Guide

## Quick Overview

This guide walks you through registering your webhook endpoint with Stripe Dashboard to enable real-time subscription tier updates when users complete checkout.

**What happens:** When a user completes payment through Stripe checkout, Stripe sends a webhook event to your endpoint. Your app then updates the user's subscription tier in the database automatically.

---

## Step 1: Access Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign in with your account
3. Make sure you're in **Test Mode** (toggle in top-right corner)
4. Click **Developers** in the left sidebar
5. Click **Webhooks**

---

## Step 2: Add Endpoint

1. Click the **Add an endpoint** button
2. In the **Endpoint URL** field, paste your webhook URL:

   **For Production:**
   ```
   https://higherself-lqwmd5t8.manus.space/api/stripe/webhook
   ```
   
   **For Development (replace with your sandbox URL):**
   ```
   https://3000-[your-sandbox-id].manus.computer/api/stripe/webhook
   ```

3. Click **Select events** to choose which events to listen for

---

## Step 3: Select Events

Select these **5 events** that your app needs to handle:

| Event | Purpose |
|-------|---------|
| `checkout.session.completed` | User completed payment → Create subscription |
| `customer.subscription.updated` | Subscription status changed → Update tier |
| `customer.subscription.deleted` | Subscription cancelled → Downgrade to free |
| `invoice.paid` | Invoice payment succeeded → Log transaction |
| `payment_intent.succeeded` | Payment processed → Confirm transaction |

**Steps:**
1. Scroll down and find each event type
2. Click the checkbox next to each event
3. Click **Add events** to confirm

---

## Step 4: Retrieve Signing Secret

After creating the endpoint:

1. Stripe will display your **Signing Secret** (starts with `whsec_`)
2. **Copy the entire signing secret** (click the copy icon)
3. Add it to your environment variables:

   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
   ```

⚠️ **Important:** Keep this secret safe! Never commit it to version control.

---

## Step 5: Verify Webhook Configuration

Your webhook endpoint should now be visible in the Webhooks list:

- **Status:** Should show a green checkmark if endpoint is reachable
- **Events:** Should list all 5 selected events
- **Recent Deliveries:** Shows test/live webhook attempts

---

## Testing Your Webhook

### Option A: Using Stripe CLI (Recommended)

**1. Install Stripe CLI:**

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl https://files.stripe.com/stripe-cli/install.sh -O
bash install.sh

# Windows
choco install stripe
```

**2. Login to Stripe:**

```bash
stripe login
```

**3. Forward webhook events to your local dev server:**

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**4. In another terminal, trigger test events:**

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

**5. Check your app logs** — You should see webhook processing messages

### Option B: Using Stripe Dashboard

**1. Go to Developers → Webhooks**

**2. Click on your endpoint**

**3. Scroll to "Recent Deliveries" section**

**4. Click "Send test event"**

**5. Select an event type (e.g., `checkout.session.completed`)**

**6. Click "Send test event"**

**7. Check the response:**
   - ✅ Success: Shows `{"received": true}` or `{"verified": true}`
   - ❌ Error: Shows error message with details

---

## Webhook Event Flow

### When User Completes Checkout

```
1. User clicks "Upgrade to Pro" button
   ↓
2. Opens Stripe checkout page (https://buy.stripe.com/...)
   ↓
3. User enters payment details
   ↓
4. User clicks "Pay" button
   ↓
5. Stripe processes payment
   ↓
6. Stripe sends checkout.session.completed webhook
   ↓
7. Your app receives webhook at /api/stripe/webhook
   ↓
8. Your app verifies webhook signature
   ↓
9. Your app extracts user_id from session metadata
   ↓
10. Your app creates/updates subscription in database
   ↓
11. User's tier changes to "pro" immediately
```

### Expected Webhook Payload

```json
{
  "id": "evt_1234567890",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_a1234567890",
      "customer": "cus_test_a1234567890",
      "subscription": "sub_test_a1234567890",
      "metadata": {
        "user_id": "123",
        "customer_email": "user@example.com",
        "customer_name": "John Doe"
      }
    }
  }
}
```

---

## Troubleshooting

### Webhook Not Triggering

**Problem:** Webhook endpoint not receiving events

**Solutions:**
1. Verify endpoint URL is correct and accessible
2. Check that endpoint is reachable from the internet (not localhost)
3. Verify webhook is enabled in Stripe Dashboard
4. Check Recent Deliveries for error messages

### Signature Verification Failed

**Problem:** "Webhook Error: No matching signing secret found"

**Solutions:**
1. Verify `STRIPE_WEBHOOK_SECRET` matches the one in Stripe Dashboard
2. Ensure secret is copied completely (starts with `whsec_`)
3. Check that webhook is using the correct signing secret
4. Restart your dev server after updating environment variables

### User Not Found

**Problem:** "No user_id in session metadata"

**Solutions:**
1. Verify checkout session includes `client_reference_id` and `metadata.user_id`
2. Check that user exists in database before webhook fires
3. Review checkout session creation in `subscription.create` tRPC procedure

### Test Events Not Working

**Problem:** Test events return 400 or 500 errors

**Solutions:**
1. Ensure test event detection is working (checks `event.id.startsWith('evt_test_')`)
2. Verify response format is correct: `{ verified: true }`
3. Check server logs for detailed error messages
4. Restart dev server and try again

---

## Monitoring Webhooks

### View Recent Deliveries

1. Go to **Developers → Webhooks**
2. Click on your endpoint
3. Scroll to **Recent Deliveries**
4. Click on any delivery to see:
   - Request body (what Stripe sent)
   - Response status (200 = success)
   - Response body (what your app returned)
   - Timestamp and latency

### Set Up Alerts

1. Go to **Settings → Notifications**
2. Enable alerts for:
   - Webhook endpoint failures
   - Webhook delivery issues
   - Suspicious activity

### Monitor Subscription Events

Track these key events in your logs:

| Event | What It Means |
|-------|---------------|
| `checkout.session.completed` | User paid successfully |
| `customer.subscription.updated` | Subscription status changed |
| `customer.subscription.deleted` | User cancelled subscription |
| `invoice.paid` | Recurring payment succeeded |
| `payment_intent.failed` | Payment failed |

---

## Production Deployment Checklist

Before going live, complete these steps:

- [ ] Test webhook with Stripe CLI
- [ ] Verify all environment variables are set
- [ ] Test with real Stripe test card: `4242 4242 4242 4242`
- [ ] Monitor webhook logs for errors
- [ ] Set up Stripe alerts for failures
- [ ] Document webhook endpoint in team wiki
- [ ] Create runbook for webhook troubleshooting
- [ ] Set up monitoring/alerting for webhook failures
- [ ] Test webhook retry behavior
- [ ] Verify database updates are working correctly

---

## Your Checkout Links

**Monthly Pro ($2.99/month):**
```
https://buy.stripe.com/test_14A5kC1EB85s5SQe9fco000
```

**Yearly Pro ($39.99/year - Save 17%):**
```
https://buy.stripe.com/test_7sYdR8dnj71o1CA5CJco001
```

Both links are integrated into your Pricing page at `/pricing`.

---

## References

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Webhook Events Reference](https://stripe.com/docs/api/events)
- [Webhook Security & Signatures](https://stripe.com/docs/webhooks/signatures)
- [Checkout Session API](https://stripe.com/docs/api/checkout/sessions)
- [Subscription API](https://stripe.com/docs/api/subscriptions)

---

## Need Help?

If you encounter issues:

1. **Check Recent Deliveries** in Stripe Dashboard for error details
2. **Review server logs** for webhook processing errors
3. **Verify environment variables** are set correctly
4. **Test with Stripe CLI** to isolate issues
5. **Contact Stripe Support** for account-level issues

---

## Next Steps

1. ✅ Register webhook endpoint in Stripe Dashboard (this guide)
2. ✅ Test webhook with Stripe CLI or Dashboard
3. ✅ Monitor Recent Deliveries for successful events
4. ✅ Verify database updates are working
5. ✅ Deploy to production with live Stripe keys
