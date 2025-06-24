const { google } = require('googleapis');
const fs = require('fs');

// Simple OAuth2 test with better error handling
async function testOAuth() {
    try {
        console.log('🔧 Simple OAuth2 Test');
        console.log('Reading credentials...');
        
        const credentials = JSON.parse(fs.readFileSync('./Email_Credentials.json', 'utf8'));
        console.log('✅ Credentials loaded for:', credentials.email);
        
        const oauth2Client = new google.auth.OAuth2(
            credentials.oauth2.client_id,
            credentials.oauth2.client_secret,
            'http://localhost'
        );
        
        console.log('✅ OAuth2 client created');
        
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/gmail.send'],
            prompt: 'consent'
        });
        
        console.log('');
        console.log('🔗 Authorization URL:');
        console.log(authUrl);
        console.log('');
        console.log('📋 Steps:');
        console.log('1. Open the URL above in your browser');
        console.log('2. Sign in with:', credentials.email);
        console.log('3. Grant permissions');
        console.log('4. Copy the code from the redirect URL');
        console.log('5. Paste it below');
        console.log('');
        
        // Wait for user input
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('📝 Enter the authorization code: ', async (code) => {
            try {
                console.log('');
                console.log('🔄 Exchanging code for tokens...');
                
                const { tokens } = await oauth2Client.getToken(code.trim());
                
                console.log('✅ Success! Tokens received:');
                console.log('   Access Token:', tokens.access_token ? '✅ Present' : '❌ Missing');
                console.log('   Refresh Token:', tokens.refresh_token ? '✅ Present' : '❌ Missing');
                
                if (tokens.refresh_token) {
                    // Update credentials file
                    credentials.oauth2.refresh_token = tokens.refresh_token;
                    fs.writeFileSync('./Email_Credentials.json', JSON.stringify(credentials, null, 2));
                    console.log('✅ Refresh token saved to Email_Credentials.json');
                    console.log('🎉 OAuth2 setup complete!');
                } else {
                    console.log('⚠️  No refresh token received. This might happen if:');
                    console.log('   - You\'ve authorized this app before');
                    console.log('   - The consent screen wasn\'t shown');
                    console.log('   - Try revoking access at: https://myaccount.google.com/permissions');
                }
                
            } catch (error) {
                console.error('❌ Error exchanging code:', error.message);
                
                if (error.message.includes('invalid_grant')) {
                    console.log('');
                    console.log('💡 Common causes:');
                    console.log('   - Authorization code expired (get a new one)');
                    console.log('   - Code was already used');
                    console.log('   - Copy/paste error');
                } else if (error.message.includes('redirect_uri_mismatch')) {
                    console.log('');
                    console.log('💡 Redirect URI mismatch:');
                    console.log('   - Make sure your OAuth2 app is configured with redirect URI: http://localhost');
                }
                
                console.log('');
                console.log('Full error:', error);
            }
            
            rl.close();
            setTimeout(() => process.exit(0), 3000);
        });
        
    } catch (error) {
        console.error('❌ Setup error:', error.message);
        console.error('Full error:', error);
        setTimeout(() => process.exit(1), 3000);
    }
}

testOAuth();
