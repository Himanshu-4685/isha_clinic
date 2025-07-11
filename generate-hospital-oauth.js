const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

// Read credentials from the existing file
const credentials = JSON.parse(fs.readFileSync('./Email_Credentials.json', 'utf8'));

console.log('🔐 Hospital Visit OAuth2 Token Generator');
console.log('📧 Email:', credentials.email);
console.log('🆔 Client ID:', credentials.oauth2.client_id);
console.log('🔑 Has Client Secret:', !!credentials.oauth2.client_secret);
console.log('');

// OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
    credentials.oauth2.client_id,
    credentials.oauth2.client_secret,
    CONFIG.OAUTH_REDIRECT_URI()
);

// Gmail scopes for sending emails only
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

async function generateToken() {
    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });

    console.log('📋 STEP 1: Open this URL in your browser:');
    console.log('');
    console.log(authUrl);
    console.log('');
    console.log('📋 STEP 2: Sign in with', credentials.email);
    console.log('📋 STEP 3: Grant permissions for Gmail access');
    console.log('📋 STEP 4: Copy the authorization code from the URL');
    console.log('');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve, reject) => {
        rl.question('📝 Paste the authorization code here: ', async (code) => {
            rl.close();
            
            try {
                console.log('🔄 Exchanging authorization code for tokens...');
                
                const { tokens } = await oauth2Client.getToken(code);
                
                console.log('✅ Tokens generated successfully!');
                console.log('🔑 Access Token:', tokens.access_token ? 'Generated' : 'Missing');
                console.log('🔄 Refresh Token:', tokens.refresh_token ? 'Generated' : 'Missing');
                
                if (tokens.refresh_token) {
                    // Update credentials file with refresh token
                    credentials.oauth2.refresh_token = tokens.refresh_token;
                    
                    // Save to credentials file
                    fs.writeFileSync('./Email_Credentials.json', JSON.stringify(credentials, null, 2));
                    
                    console.log('');
                    console.log('✅ Email_Credentials.json updated with refresh token!');
                    console.log('🚀 Hospital visit email system is now ready to use!');
                    
                    // Test the email setup
                    console.log('');
                    console.log('🧪 Testing email configuration...');
                    await testEmailSetup(tokens);
                    
                } else {
                    console.log('⚠️  No refresh token received. You may need to revoke existing permissions and try again.');
                }
                
                resolve();
                
            } catch (error) {
                console.error('❌ Error generating tokens:', error.message);
                console.error('Full error details:', error);
                reject(error);
            }
        });
    });
}

async function testEmailSetup(tokens) {
    try {
        // Set credentials
        oauth2Client.setCredentials(tokens);
        
        // Create Gmail API instance
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        // Test by sending a simple test email
        console.log('📤 Sending test email...');
        
        const testMessage = {
            to: credentials.email,
            subject: 'Hospital Visit OAuth2 Test - ' + new Date().toISOString(),
            text: 'This is a test email from the hospital visit OAuth2 configuration. If you receive this, the setup is working correctly!\n\nSent from: Isha Clinic Management System'
        };
        
        // Create email message
        const message = [
            `To: ${testMessage.to}`,
            `Subject: ${testMessage.subject}`,
            `From: ${credentials.from.name} <${credentials.from.email}>`,
            '',
            testMessage.text
        ].join('\n');
        
        const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage
            }
        });
        
        console.log('✅ Test email sent successfully!');
        console.log('📧 Message ID:', result.data.id);
        console.log('🎯 Sent to:', testMessage.to);
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        if (error.code === 403) {
            console.error('💡 This might be a permission issue. Make sure the Gmail API is enabled and you have the correct scopes.');
        }
    }
}

// Run the token generator
generateToken().catch(console.error);
