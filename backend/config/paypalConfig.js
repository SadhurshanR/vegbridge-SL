const paypal = require('@paypal/checkout-server-sdk');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Configure PayPal environment
const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,  
  process.env.PAYPAL_CLIENT_SECRET 
);

const client = new paypal.core.PayPalHttpClient(environment);

module.exports = client;
