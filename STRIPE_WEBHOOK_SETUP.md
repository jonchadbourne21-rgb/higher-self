# Stripe Webhook Registration Guide

## Overview
This guide walks you through registering the webhook endpoint with Stripe to enable real-time subscription tier updates when users complete checkout.

## Webhook Endpoint Details

**Endpoint URL:** `https://[your-domain]/api/stripe/webhook`

**Expected Domains:**
- Production: `https://higherself-lqwmd5t8.manus.space/api/stripe/webhook`
- Production: `https://synapset.manus.space/api/stripe/webhook`
- Production: `https://higherself.cloud/api/stripe/webhook`
- Production: `https://www.higherself.cloud/api/stripe/webhook`
- Development: `https://3000-[your-sandbox-id].manus.computer/api/stripe/webhook`

## Step-by-Step Registration

### 1. Access Stripe Dashboard
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign in to your account
3. Navigate to **Developers** → **Webhooks** (left sidebar)

### 2. Add Endpoint
1. Click **Add an endpoint** button
2. In the "Endpoint URL" field, paste: `https://higherself-lqwmd5t8.manus.space/api/stripe/webhook`
3. Click **Select events**

### 3. Select Events
Select the following events to listen for:
- ✅ `checkout.session.completed` — User completed payment
- ✅ `customer.subscription.updated` — Subscription status changed
- ✅ `customer.subscription.deleted` — Subscription was cancelled
- ✅ `invoice.paid` — Invoice payment succeeded

Click **Add events** to confirm.

### 4. Verify Signing Secret
1. After creating the endpoint, Stripe will display the **Signing Secret**
2. Copy the signing secret (starts with `whsec_`)
3. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## Environment Variables Required

Ensure these are set in your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
```

## Testing the Webhook

### Using Stripe CLI (Recommended)

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Linux
   curl https://files.stripe.com/stripe-cli/install.sh -O
   bash install.sh

   # Windows
   choco install stripe
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward Webhook Events:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Trigger Test Events:**
   ```bash
   # In another terminal
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.updated
   stripe trigger customer.subscription.deleted
   ```

### Using Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click on your endpoint
3. Scroll to **Events** section
4. Click **Send test event** for each event type
5. Verify the response shows `received: true`

## Event Handling

The webhook handler processes these events:

### `checkout.session.completed`
- Extracts user ID from session metadata
- Retrieves subscription details from Stripe
- Updates subscription tier in database
- Sets subscription status to "active"

### `customer.subscription.updated`
- Updates subscription status (active/canceled)
- Updates tier based on price ID
- Updates renewal date

### `customer.subscription.deleted`
- Downgrades user to free tier
- Sets subscription status to "canceled"

## Webhook Response

The endpoint should respond with:
```json
{
  "received": true
}
```

For test events:
```json
{
  "verified": true
}
```

## Troubleshooting

### Webhook Not Triggering
1. Verify endpoint URL is correct and accessible
2. Check Stripe Dashboard → Developers → Webhooks → your endpoint → Recent Deliveries
3. Look for error messages in the response logs
4. Ensure `STRIPE_WEBHOOK_SECRET` is correctly set

### Signature Verification Failed
1. Verify `STRIPE_WEBHOOK_SECRET` matches the one in Stripe Dashboard
2. Check that the webhook is using the correct signing secret
3. Ensure the request body is not being modified before reaching the handler

### User Not Found
1. Verify `user_id` is included in checkout session metadata
2. Check that the user exists in the database before webhook fires
3. Review checkout session creation in `subscription.create` tRPC procedure

## Production Deployment

Before deploying to production:

1. ✅ Test webhook with Stripe CLI
2. ✅ Verify all environment variables are set
3. ✅ Test with real Stripe test card: `4242 4242 4242 4242`
4. ✅ Monitor webhook logs for errors
5. ✅ Set up Stripe alerts for webhook failures
6. ✅ Document webhook endpoint in team wiki

## Monitoring

### View Webhook Deliveries
1. Go to **Developers** → **Webhooks**
2. Click on your endpoint
3. Scroll to **Recent Deliveries**
4. Click on each delivery to see:
   - Request body
   - Response status
   - Response body
   - Timestamp

### Set Up Alerts
1. Go to **Settings** → **Notifications**
2. Enable email alerts for:
   - Webhook endpoint failures
   - Webhook delivery issues
   - Suspicious activity

## References

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Events Documentation](https://stripe.com/docs/api/events)
- [Webhook Security](https://stripe.com/docs/webhooks/signatures)
