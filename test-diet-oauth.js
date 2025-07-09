const { google } = require('googleapis');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Load credentials
const credentialsPath = './dietReq2.json';
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

console.log('🔐 Testing Diet Request OAuth2 Configuration');
console.log('📧 Email:', credentials.email);
console.log('🆔 Client ID:', credentials.oauth2.client_id);
console.log('🔑 Has Refresh Token:', !!credentials.oauth2.refresh_token);

// Get redirect URI from environment or use default
const redirectUri = process.env.OAUTH_REDIRECT_URI ? 
    process.env.OAUTH_REDIRECT_URI.split(',')[0] : 
    'http://localhost:10000';

// OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
    credentials.oauth2.client_id,
    credentials.oauth2.client_secret,
    redirectUri
);

async function testOAuth2() {
    try {
        console.log('\n🧪 Testing OAuth2 token refresh...');
        
        // Set the refresh token
        oauth2Client.setCredentials({
            refresh_token: credentials.oauth2.refresh_token
        });
        
        // Try to get a fresh access token
        const { token } = await oauth2Client.getAccessToken();
        console.log('✅ Access token obtained successfully');
        console.log('🔑 Token preview:', token.substring(0, 20) + '...');
        
        // Test Gmail API (only email sending, not profile access)
        console.log('\n📧 Testing Gmail API email sending capability...');
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        // Test sending a simple email
        console.log('\n📤 Testing email sending...');
        const testMessage = {
            to: credentials.email,
            subject: 'Diet Request OAuth2 Test - ' + new Date().toISOString(),
            text: 'This is a test email from the diet request OAuth2 configuration. If you receive this, the setup is working correctly!'
        };
        
        const rawMessage = [
            `To: ${testMessage.to}`,
            `From: ${credentials.email}`,
            `Subject: ${testMessage.subject}`,
            `Content-Type: text/plain; charset=utf-8`,
            '',
            testMessage.text
        ].join('\n');
        
        const encodedMessage = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        
        const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage
            }
        });
        
        console.log('✅ Test email sent successfully!');
        console.log('📧 Message ID:', result.data.id);
        console.log('🎯 Check your inbox for the test email');
        
        console.log('\n🎉 All tests passed! Diet request email configuration is working correctly.');
        
    } catch (error) {
        console.error('\n❌ OAuth2 test failed:', error.message);
        
        if (error.code) {
            console.log('🔍 Error code:', error.code);
        }
        
        if (error.response && error.response.data) {
            console.log('🔍 Error details:', JSON.stringify(error.response.data, null, 2));
        }
        
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Verify the client ID and secret are correct');
        console.log('2. Check that the OAuth2 client has the correct redirect URI');
        console.log('3. Ensure Gmail API is enabled in Google Cloud Console');
        console.log('4. Try regenerating the refresh token');
        
        process.exit(1);
    }
}

testOAuth2();
