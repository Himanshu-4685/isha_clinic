const { google } = require('googleapis');
const fs = require('fs');

async function testGmailAPI() {
    try {
        console.log('🧪 Testing Gmail API Direct Access');
        
        // Read credentials
        const credentials = JSON.parse(fs.readFileSync('./Email_Credentials.json', 'utf8'));
        console.log('✅ Credentials loaded for:', credentials.email);
        
        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            credentials.oauth2.client_id,
            credentials.oauth2.client_secret,
            'http://localhost'
        );
        
        // Set refresh token
        oauth2Client.setCredentials({
            refresh_token: credentials.oauth2.refresh_token
        });
        
        console.log('🔄 Getting fresh access token...');
        const { token } = await oauth2Client.getAccessToken();
        console.log('✅ Access token obtained');
        
        // Create Gmail API instance
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        console.log('📧 Testing Gmail API access...');
        
        // Test by getting user profile
        const profile = await gmail.users.getProfile({ userId: 'me' });
        console.log('✅ Gmail API access successful!');
        console.log('📧 Email address:', profile.data.emailAddress);
        console.log('📊 Total messages:', profile.data.messagesTotal);
        
        // Test sending a simple email using Gmail API
        console.log('📤 Testing email send via Gmail API...');
        
        const emailContent = `To: sahil.suman9939@gmail.com
Subject: Test Email from Clinic Management System
Content-Type: text/plain; charset=utf-8

This is a test email sent via Gmail API from the clinic management system.

Patient: Test Patient
Hospital: Test Hospital
Purpose: Testing email functionality

Best regards,
Isha Yoga Center - Clinic Management`;

        // Encode email content
        const encodedEmail = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        const sendResult = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedEmail
            }
        });
        
        console.log('✅ Email sent successfully via Gmail API!');
        console.log('📧 Message ID:', sendResult.data.id);
        console.log('🎉 Gmail API email system is working!');
        
    } catch (error) {
        console.error('❌ Gmail API test failed:', error.message);
        
        if (error.message.includes('insufficient authentication scopes')) {
            console.log('');
            console.log('💡 Scope issue detected. Required scopes:');
            console.log('   - https://www.googleapis.com/auth/gmail.send');
            console.log('   - https://www.googleapis.com/auth/gmail.readonly');
        }
        
        console.error('Full error:', error);
    }
}

testGmailAPI();
