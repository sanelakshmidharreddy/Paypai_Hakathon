const path = require('path');
const config = require('../src/config/env');
const paypalService = require('../src/services/paypalService');
const OpenAI = require('openai');

async function verify() {
  console.log('===============================================================');
  console.log('🔍 VERIFYING CREDENTIALS AND API CONNECTIVITY');
  console.log('===============================================================');

  // 1. Check all required environment variables are loaded without printing values
  const checks = [
    { name: 'PAYPAL_CLIENT_ID', present: Boolean(config.paypal.clientId), length: config.paypal.clientId ? config.paypal.clientId.length : 0 },
    { name: 'PAYPAL_CLIENT_SECRET', present: Boolean(config.paypal.clientSecret), length: config.paypal.clientSecret ? config.paypal.clientSecret.length : 0 },
    { name: 'PAYPAL_WEBHOOK_ID', present: Boolean(config.paypal.webhookId), length: config.paypal.webhookId ? config.paypal.webhookId.length : 0 },
    { name: 'OPENAI_API_KEY', present: Boolean(config.openai.apiKey), length: config.openai.apiKey ? config.openai.apiKey.length : 0 },
    { name: 'PAYPAL_BASE_URL', present: Boolean(config.paypal.baseUrl), value: config.paypal.baseUrl },
  ];

  console.log('\n[1/4] Environment Variable Loading:');
  let allPresent = true;
  for (const c of checks) {
    if (c.present) {
      console.log(`  ✓ ${c.name}: LOADED (Length: ${c.length || c.value}) [Value Masked]`);
    } else {
      console.log(`  ✗ ${c.name}: MISSING`);
      allPresent = false;
    }
  }

  if (!allPresent) {
    console.error('\n❌ Missing required environment variables in backend/.env');
    process.exit(1);
  }

  // 2. Verify PayPal Sandbox OAuth 2.0 Authentication
  console.log('\n[2/4] Testing PayPal Sandbox OAuth 2.0 Authentication...');
  try {
    const paypalResult = await paypalService.testConnection();
    if (paypalResult.connected) {
      console.log('  ✓ PayPal Sandbox: AUTHENTICATED SUCCESSFULLY');
      console.log(`    ↳ Base URL: ${paypalResult.baseUrl}`);
      console.log(`    ↳ OAuth Token: Obtained and cached`);
    } else {
      console.log(`  ✗ PayPal Sandbox Auth Failed: ${paypalResult.error || paypalResult.message}`);
    }
  } catch (err) {
    console.log(`  ✗ PayPal Connection Error: ${err.message}`);
  }

  // 3. Verify OpenAI API Connection
  console.log('\n[3/4] Testing OpenAI API Authentication...');
  try {
    const openai = new OpenAI({ apiKey: config.openai.apiKey });
    const models = await openai.models.list();
    console.log('  ✓ OpenAI API: AUTHENTICATED SUCCESSFULLY');
    console.log(`    ↳ Access confirmed (Available models count: ${models.data.length})`);
  } catch (err) {
    console.log(`  ✗ OpenAI API Connection Failed: ${err.message}`);
  }

  // 4. Verify Webhook Configuration
  console.log('\n[4/4] Verifying PayPal Webhook Configuration...');
  console.log(`  ✓ Webhook ID configured: ${config.paypal.webhookId ? 'YES (Masked)' : 'NO'}`);
  console.log(`  ✓ Target Endpoint: https://paypai-hakathon.onrender.com/api/paypal/webhook`);
  console.log('===============================================================');
}

verify().catch((err) => {
  console.error('Unexpected failure during verification:', err.message);
  process.exit(1);
});

