// upload-media.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const apiVersion = process.env.WHATSAPP_API_VERSION || 'v17.0';
const imagePath = path.join(__dirname, 'image.png');

async function uploadImage() {
  if (!fs.existsSync(imagePath)) {
    console.error('Image file not found:', imagePath);
    process.exit(1);
  }
  const form = new FormData();
  form.append('file', fs.createReadStream(imagePath), {
    filename: 'image.png',
    contentType: 'image/png',
  });
  form.append('type', 'image');
  form.append('messaging_product', 'whatsapp');

  const options = {
    method: 'POST',
    host: 'graph.facebook.com',
    path: `/${apiVersion}/${phoneNumberId}/media`,
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log('Response:', data);
      try {
        const json = JSON.parse(data);
        if (json.id) {
          console.log('✅ Media ID:', json.id);
        } else {
          console.error('❌ Upload failed:', data);
        }
      } catch (e) {
        console.error('❌ Invalid response:', data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Request error:', err);
  });

  form.pipe(req);
}

uploadImage(); 