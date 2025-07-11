const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Read diet request credentials
const credentialsPath = path.join(__dirname, 'dietReq2.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
    credentials.oauth2.client_id,
    credentials.oauth2.client_secret,
    CONFIG.OAUTH_REDIRECT_URI()  
);

// Gmail scopes for sending emails only (minimal required scope)
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

async function generateToken() {
    console.log('🔐 OAuth2 Token Generator for Diet Request Emails');
    console.log('📧 Email:', credentials.email);
    console.log('🍽️  Purpose: Diet Request Module');
    console.log('');

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Force consent screen to get refresh token
    });

    console.log('🌐 Please visit this URL to authorize the application:');
    console.log('');
    console.log(authUrl);
    console.log('');
    console.log('📋 Steps:');
    console.log('1. Click the URL above or copy-paste it into your browser');
    console.log('2. Log in with clinic.backoffice@ishafoundation.org');
    console.log('3. Grant permissions to send emails');
    console.log('4. Copy the authorization code from the browser');
    console.log('5. Paste it below');
    console.log('');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('📝 Paste the authorization code here: ', async (code) => {
        try {
            // Exchange authorization code for tokens
            const { tokens } = await oauth2Client.getToken(code);
            
            console.log('');
            console.log('✅ Tokens generated successfully!');
            console.log('🔑 Access Token:', tokens.access_token ? 'Generated' : 'Missing');
            console.log('🔄 Refresh Token:', tokens.refresh_token ? 'Generated' : 'Missing');
            
            if (tokens.refresh_token) {
                // Update credentials file with refresh token
                credentials.oauth2.refresh_token = tokens.refresh_token;
                
                fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
                
                console.log('');
                console.log('✅ dietReq2.json updated with refresh token!');
                console.log('🚀 Diet request email system is now ready to use!');
                
                // Test the email setup
                console.log('');
                console.log('🧪 Testing email configuration...');
                await testEmailSetup(tokens);
                
            } else {
                console.log('');
                console.log('⚠️  No refresh token received. This might happen if:');
                console.log('   - You\'ve already authorized this app before');
                console.log('   - The consent screen wasn\'t shown');
                console.log('');
                console.log('💡 Try revoking app permissions and running this again:');
                console.log('   https://myaccount.google.com/permissions');
            }
            
        } catch (error) {
            console.error('❌ Error generating tokens:', error.message);
        }
        
        rl.close();
    });
}

async function testEmailSetup(tokens) {
    try {
        // Set credentials
        oauth2Client.setCredentials(tokens);
        
        // Create Gmail API instance
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        // Test by getting user profile
        const profile = await gmail.users.getProfile({ userId: 'me' });
        
        console.log('✅ Gmail API connection successful!');
        console.log('📧 Email address verified:', profile.data.emailAddress);
        console.log('📊 Total messages:', profile.data.messagesTotal);
        
        if (profile.data.emailAddress !== credentials.email) {
            console.log('');
            console.log('⚠️  WARNING: Email mismatch!');
            console.log('   Expected:', credentials.email);
            console.log('   Actual:', profile.data.emailAddress);
            console.log('   Make sure you logged in with the correct account!');
        }
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
    }
}

// Run the token generator
generateToken().catch(console.error);
