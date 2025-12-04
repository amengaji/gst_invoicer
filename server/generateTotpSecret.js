// server/generateTotpSecret.js
// This script will generate a TOTP secret and a QR code
// You will scan the QR code using Google Authenticator / Authy / Microsoft Authenticator.

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

function generateTotpSecret() {
  // 1) Create a new secret
  const secret = speakeasy.generateSecret({
    name: 'Zenith Invoicer Admin', // This name will appear in your Authenticator app
  });

  console.log('==============================');
  console.log(' TOTP SECRET (save this in .env)');
  console.log('==============================\n');
  console.log('TOTP_SECRET=' + secret.base32 + '\n');

  // 2) Create a QR code so you can scan it in Google Authenticator
  qrcode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
    if (err) {
      console.error('Error generating QR code:', err);
      return;
    }

    console.log('==============================');
    console.log(' QR CODE DATA URL');
    console.log('==============================\n');
    console.log('Copy everything below and paste into https://qrcode.tec-it.com/en OR any "view data URL" tool:\n');
    console.log(dataUrl);
    console.log('\nAfter you open the QR image, scan it with your Authenticator app.');
  });
}

generateTotpSecret();
