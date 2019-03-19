const { buffer, send } = require('micro')
const cors = require('micro-cors')({
  allowMethods: ['POST'],
  exposeHeaders: ['stripe-signature'],
  allowHeaders: ['stripe-signature', 'user-agent', 'x-forwarded-proto', 'X-Requested-With','Access-Control-Allow-Origin','X-HTTP-Method-Override','Content-Type','Authorization','Accept']
})
const { MemoryStorageFactory } = require('@moltin/sdk')
const moltinGateway = require('@moltin/sdk').gateway

const moltin = moltinGateway({
  client_id: process.env.MOLTIN_CLIENT_ID,
  client_secret: process.env.MOLTIN_CLIENT_SECRET,
  storage: new MemoryStorageFactory(),
  application: 'example-sync-stripe-to-moltin'
})

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const toJSON = (error) => {
  console.log('error', error)
  return (!error)?'':Object.getOwnPropertyNames(error).reduce((jsonError, key) => {
    return { ...jsonError, [key]: error[key]}
  }, { type: 'error' });
}

process.on('unhandledRejection', (reason, p) => {
  console.error('Promise unhandledRejection: ', p, ', reason:', JSON.stringify(reason));
});

module.exports = cors(async (req, res) => {
  console.error('process.env.NODE_ENV',process.env.NODE_ENV)
  
  if (req.method === 'OPTIONS') {
    return send(res, 200, 'ok!')
  }

  try {
    const sig = await req.headers['stripe-signature']
    const body = await buffer(req)

    // NOTE: expects metadata field to be populated w/ moltin order data when charges were first created, email is automatically there
    const {
      type,
      data: {
        object: {
          id: reference,
          status,
          refunded,
          metadata: {
            email,
            order_id
          }
        }
      }
    } = await stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    send(res, 200, JSON.stringify({received: true})) // immediately respond back w/ 200, then continue processing
    // continue processing this event before return
    console.error('type',type)
    console.error('status',status)
    console.error('refunded',refunded)
    if(type === 'charge.refunded' && status === 'succeeded' && refunded === true) { // if refunded !== true, then only partial (moltin Order.Payment does not support partial_refund status)

      console.error('order_id',order_id)
      if(order_id) {
        moltin.Transactions.All({ order: order_id }).then(transactions => {
          const moltinTransaction = transactions.data.find(transaction => transaction.reference === reference)

          console.error('moltinTransaction',moltinTransaction)

          moltin.Transactions.Refund({
            order: order_id,
            transaction: moltinTransaction.id
          }).then(moltinRefund => {
            console.error('moltinRefund',moltinRefund)
          }).catch(error=>console.error(error))
        }).catch(error=>console.error(error))
      }

      return
    }
  }
  catch (error) {
    const jsonError = toJSON(error);
    return send(res, (jsonError.type === 'StripeSignatureVerificationError') ? 401: 500, jsonError)
  }
})
