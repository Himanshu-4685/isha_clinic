const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function testEmailSending() {
    try {
        console.log('🧪 Testing Email Configuration...');
        
        // Read email credentials
        let credentials;
        if (process.env.EMAIL_CREDENTIALS) {
            // Production: Use environment variable
            credentials = JSON.parse(process.env.EMAIL_CREDENTIALS);
            console.log('📧 Using EMAIL_CREDENTIALS from environment variable');
        } else {
            // Development: Use local file
            const credentialsPath = path.join(__dirname, 'Email_Credentials.json');
            if (!fs.existsSync(credentialsPath)) {
                throw new Error('Email credentials file not found');
            }
            credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            console.log('📧 Using EMAIL_CREDENTIALS from local file');
        }
        
        console.log('✅ Email credentials loaded successfully');
        console.log('📧 From Email:', credentials.from.email);
        console.log('🆔 Client ID:', credentials.oauth2.client_id);
        console.log('🔑 Has Refresh Token:', !!credentials.oauth2.refresh_token);
        
        // Check if OAuth2 refresh token is available
        if (!credentials.oauth2 || !credentials.oauth2.refresh_token ||
            credentials.oauth2.refresh_token === 'WILL_BE_GENERATED_AUTOMATICALLY') {
            console.log('❌ OAuth2 refresh token not found or invalid');
            console.log('💡 Please run: node generate-hospital-oauth.js');
            return;
        }
        
        console.log('🔄 Creating OAuth2 client...');
        
        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            credentials.oauth2.client_id,
            credentials.oauth2.client_secret,
            'urn:ietf:wg:oauth:2.0:oob'
        );
        
        // Set refresh token
        oauth2Client.setCredentials({
            refresh_token: credentials.oauth2.refresh_token
        });
        
        console.log('🔑 Getting fresh access token...');
        
        // Get fresh access token with timeout
        let token;
        try {
            const tokenResponse = await Promise.race([
                oauth2Client.getAccessToken(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('OAuth2 token refresh timeout after 10 seconds')), 10000)
                )
            ]);
            token = tokenResponse.token;
        } catch (tokenError) {
            console.error('❌ OAuth2 token refresh failed:', tokenError);
            throw new Error(`OAuth2 token refresh failed: ${tokenError.message}`);
        }
        
        if (!token) {
            throw new Error('Failed to get access token from OAuth2');
        }
        
        console.log('✅ Access token obtained successfully');
        
        // Create Gmail API instance
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        console.log('📤 Sending test email...');
        
        // Create test email content
        const testEmailContent = `To: ${credentials.from.email}
From: ${credentials.from.name} <${credentials.from.email}>
Subject: Test Email - Credit System Check - ${new Date().toISOString()}
Content-Type: text/plain; charset=utf-8

Namaskaram,

This is a test email to verify that the credit email system is working properly.

Test Details:
- Timestamp: ${new Date().toISOString()}
- System: Hospital Visit Credit Email
- Status: Testing OAuth2 and Gmail API integration

If you receive this email, the credit email system is functioning correctly.

Pranam,
Isha Yoga Center - Clinic Management System`;
        
        // Encode email content for Gmail API
        const encodedEmail = Buffer.from(testEmailContent)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        
        // Send email using Gmail API
        const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedEmail
            }
        });
        
        console.log('✅ Test email sent successfully!');
        console.log('📧 Message ID:', result.data.id);
        console.log('🎯 Sent to:', credentials.from.email);
        console.log('');
        console.log('🎉 Credit email system is working properly!');
        
    } catch (error) {
        console.error('❌ Email test failed:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        if (error.message.includes('timeout')) {
            console.log('💡 The OAuth2 token refresh is timing out. This might indicate:');
            console.log('   - Network connectivity issues');
            console.log('   - Invalid or expired refresh token');
            console.log('   - Google API service issues');
        }
        
        if (error.code === 401) {
            console.log('💡 Authentication failed. Please regenerate OAuth token:');
            console.log('   node generate-hospital-oauth.js');
        }
        
        if (error.code === 403) {
            console.log('💡 Permission denied. Check Gmail API permissions and scopes.');
        }
    }
}

// Run the test
testEmailSending();
