# moltin-shippo-tracking

> 📦 Update order payment status when refunded in Stripe

Asynchronous microservice that is triggered by [Stripe](https://stripe.com) webhooks to update Order data inside of [Moltin](https://moltin.com). Built with [Micro](https://github.com/zeit/micro) 🤩

### Prerequisite

When making calls to 'moltin.Orders.payment', please ensure payload contains 'metadata' containing order and customer data

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

[![Deploy to now](https://deploy.now.sh/static/button.svg)](https://deploy.now.sh/?repo=https://github.com/uniquelyparticular/sync-stripe-to-moltin&env=MOLTIN_CLIENT_ID&env=MOLTIN_SECRET_KEY&env=SHIPPO_PRIVATE_KEY&env=MOLTIN_WEBHOOK_SECRET)

Once you have the function deployed, take a note of the immutable `now.sh` URL.


-OR-


Start ngrok
```bash
ngrok http 3000
```

Make a note of the `http` URL ngrok provides.

## ⛽️ Usage
Next head over to the Stripe [Webhook Settings](https://dashboard.stripe.com/account/webhooks) area, add a new webhook with the following details:

'URL to be called': <<ngrok URL or now.sh URL>>
'Webhook version': '2018-05-21 (Default)'
'Filter event': 'Select types to send' > 'charge.refunded'

⚠️ Each time an `charge` is `refunded` this function will be called, only need to update moltin if fully refunded (TODO: may want to add transactions for others).

## 🚀 Deploy

You can easily deploy this function to [now](https://now.sh).
