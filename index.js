const { buffer, send } = require('micro')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { MemoryStorageFactory } = require('@moltin/sdk')
const moltinGateway = require('@moltin/sdk').gateway
const moltin = moltinGateway({
  client_id: process.env.MOLTIN_CLIENT_ID,
  client_secret: process.env.MOLTIN_CLIENT_SECRET,
  storage: new MemoryStorageFactory(),
  application: 'demo-sync-stripe-to-moltin'
})
const cors = require('micro-cors')({
  allowMethods: ['POST'],
  exposeHeaders: ['stripe-signature'],
  allowHeaders: [
    'stripe-signature',
    'user-agent',
    'x-forwarded-proto',
    'X-Requested-With',
    'Access-Control-Allow-Origin',
    'X-HTTP-Method-Override',
    'Content-Type',
    'Authorization',
    'Accept'
  ]
})

const _toJSON = error => {
  return !error
    ? ''
    : Object.getOwnPropertyNames(error).reduce(
        (jsonError, key) => {
          return { ...jsonError, [key]: error[key] }
        },
        { type: 'error' }
      )
}

process.on('unhandledRejection', (reason, p) => {
  console.error(
    'Promise unhandledRejection: ',
    p,
    ', reason:',
    JSON.stringify(reason)
  )
})

module.exports = cors(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return send(res, 200, 'ok!')
  }

  try {
    const sig = await req.headers['stripe-signature']
    const body = await buffer(req)

    const {
      type,
      data: {
        object: {
          id: reference,
          status,
          refunded,
          metadata: { email, order_id }
        }
      }
    } = await stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    if (
      order_id &&
      type === 'charge.refunded' &&
      status === 'succeeded' &&
      refunded === true
    ) {
      // if refunded !== true, then only partial (moltin Order.Payment does not support partial_refund status)
      moltin.Transactions.All({ order: order_id })
        .then(transactions => {
          const moltinTransaction = transactions.data.find(
            transaction => transaction.reference === reference
          )

          moltin.Transactions.Refund({
            order: order_id,
            transaction: moltinTransaction.id
          })
            .then(moltinRefund => {
              return send(res, 200, JSON.stringify({ received: true }))
            })
            .catch(error => {
              const jsonError = _toJSON(error)
              return send(
                res,
                jsonError.type === 'StripeSignatureVerificationError'
                  ? 401
                  : 500,
                jsonError
              )
            })
        })
        .catch(error => {
          const jsonError = _toJSON(error)
          return send(
            res,
            jsonError.type === 'StripeSignatureVerificationError' ? 401 : 500,
            jsonError
          )
        })
    }
  } catch (error) {
    const jsonError = _toJSON(error)
    return send(
      res,
      jsonError.type === 'StripeSignatureVerificationError' ? 401 : 500,
      jsonError
    )
  }
})
