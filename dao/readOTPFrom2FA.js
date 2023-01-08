var authenticator = require('authenticator');

async function readOTPFrom2FA(totpKey) {
    const token = authenticator.generateToken(totpKey);
    console.log('Generated TOTP', token)
    return token
}

module.exports = readOTPFrom2FA;