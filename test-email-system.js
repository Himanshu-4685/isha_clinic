const axios = require('axios');

async function testEmailSystem() {
    try {
        console.log('🧪 Testing Email System');
        console.log('Server URL: http://localhost:3001');
        
        // Test data for a hospital visit
        const testVisitData = {
            dateRequested: '2024-06-09',
            iycNumber: 'TEST123',
            patientName: 'Test Patient',
            phoneNumber: '+91-9876543210',
            hospital: 'Apollo Hospital', // Make sure this exists in Hospital Directory
            purpose: 'Consultation & Investigation',
            doctor: 'Dr. Test',
            priority: 'Medium',
            remarks: 'Test email system',
            status: 'Pending'
        };
        
        console.log('📝 Creating test hospital visit...');
        
        // Create a test hospital visit
        const createResponse = await axios.post('http://localhost:3001/api/hospital-visit', testVisitData);
        
        if (createResponse.data.success) {
            console.log('✅ Test visit created:', createResponse.data.visitId);
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('📧 Testing email sending...');
            
            // Test sending email
            const emailResponse = await axios.post('http://localhost:3001/api/send-credit-email', {
                visitId: createResponse.data.visitId
            });
            
            if (emailResponse.data.success) {
                console.log('✅ Email test successful!');
                console.log('📧 Email sent to:', emailResponse.data.emailAddresses);
                console.log('📝 Email content preview:');
                console.log(emailResponse.data.content.substring(0, 200) + '...');
                
                if (emailResponse.data.demo) {
                    console.log('ℹ️  Note: This was a demo mode (no actual email sent)');
                } else {
                    console.log('🎉 Real email sent! Message ID:', emailResponse.data.messageId);
                }
            } else {
                console.log('❌ Email test failed:', emailResponse.data.message);
            }
            
        } else {
            console.log('❌ Failed to create test visit:', createResponse.data.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testEmailSystem();
