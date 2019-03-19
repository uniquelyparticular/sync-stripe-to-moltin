# @particular./sync-stripe-to-moltin

> 📦 Update order payment status when refunded in Stripe

Asynchronous microservice that is triggered by [Stripe](https://stripe.com) webhooks to update Order data inside of [Moltin](https://moltin.com). Built with [Micro](https://github.com/zeit/micro) 🤩

### Prerequisite

When making calls to 'moltin.Orders.Payment', please ensure payload contains 'metadata' containing order and customer data

```
const payload = {
    gateway: 'stripe',
    method: 'purchase',
    payment: stripeSource.id, // The Stripe source (refunds don't work on tokens)
    options: {
        customer: stripeCustomer.id  // The Stripe customer ID (required as sending source instead of token above)
```

            metadata: {
                order_id: moltinOrder.id
            }

```
    }
};

return moltin.Orders.Payment(moltinOrder.id, payload) ...
```

## 🛠 Setup

Both a moltin _and_ Stripe account are needed for this to function.

Create a `.env` at the project root with the following credentials.

```dosini
MOLTIN_CLIENT_ID=
MOLTIN_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

```bash
yarn install
```

### Start the server

Start the development server

```bash
yarn dev
```

The server will typically start on PORT `3000`, if not, make a note for the next step.

### Expose the service

This will expose PORT `3000` to the outside world.

Start ngrok (change ngrok port below from 3000 if yarn dev deployed locally on different port)

```bash
ngrok http 3000
```

Make a note of the `http` URL ngrok provides.

## ⛽️ Usage

Next head over to the Stripe [Webhook Settings](https://dashboard.stripe.com/account/webhooks) area, add a new webhook with the following details:

```
'URL to be called': <ngrok URL above>

'Webhook version': '2018-05-21 (Default)'

'Filter event': 'Select types to send' > 'charge.refunded'
```

⚠️ Each time a `charge` is `refunded` this function will be called, but it will only call moltin to update order if 'fully refunded' in Stripe (TODO: if Moltin add support for order.payment = partial_refund then can update to handle).

## 🚀 Deploy

You can easily deploy this function to [now](https://now.sh).
