import { WebSocket } from 'ws';

const apiKey = process.env.HUME_API_KEY;
const secretKey = process.env.HUME_SECRET_KEY;
const configId = process.env.HUME_CONFIG_ID;

console.log('API Key set:', !!apiKey, apiKey?.substring(0, 8) + '...');
console.log('Secret Key set:', !!secretKey);
console.log('Config ID:', configId);

// Step 1: Mint token
const basic = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
const tokenRes = await fetch('https://api.hume.ai/oauth2-cc/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Basic ${basic}`,
  },
  body: 'grant_type=client_credentials',
});
console.log('Token status:', tokenRes.status);
const tokenJson = await tokenRes.json();
if (!tokenRes.ok) {
  console.error('Token error:', tokenJson);
  process.exit(1);
}
const token = tokenJson.access_token;
console.log('Token minted OK (first 30 chars):', token.substring(0, 30));

// Step 2: Open WebSocket to Hume EVI
const params = new URLSearchParams({ access_token: token });
if (configId) params.set('config_id', configId);
const wsUrl = `wss://api.hume.ai/v0/evi/chat?${params.toString()}`;
console.log('\nConnecting to Hume EVI...');

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ WebSocket opened successfully!');
  setTimeout(() => {
    ws.close(1000, 'test_complete');
    console.log('Test complete — closing connection');
    process.exit(0);
  }, 2000);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Message from Hume:', msg.type, JSON.stringify(msg).substring(0, 100));
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log('WebSocket closed:', code, reason?.toString());
});

// Timeout after 10s
setTimeout(() => {
  console.error('❌ Timeout — no connection after 10s');
  process.exit(1);
}, 10000);
