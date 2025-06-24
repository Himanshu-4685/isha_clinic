const axios = require('axios');

async function testSimpleEmail() {
    try {
        console.log('🧪 Testing Simple Email System');
        
        // First, let's check what hospitals are available
        console.log('📋 Checking available hospitals...');
        const hospitalsResponse = await axios.get('http://localhost:3001/api/hospitals');
        console.log('Available hospitals:', hospitalsResponse.data.hospitals);
        
        // Get pending visits to test with
        console.log('📋 Getting pending visits...');
        const visitsResponse = await axios.get('http://localhost:3001/api/hospital-visits/Pending');
        console.log('Pending visits:', visitsResponse.data.visits.length);
        
        if (visitsResponse.data.visits.length > 0) {
            const testVisit = visitsResponse.data.visits[0];
            console.log('🎯 Testing with visit:', testVisit.id, '-', testVisit.patientName);
            
            // Test simple email
            console.log('📧 Sending simple test email...');
            const emailResponse = await axios.post('http://localhost:3001/api/test-simple-email', {
                visitId: testVisit.id
            });
            
            if (emailResponse.data.success) {
                console.log('✅ Simple email test successful!');
                console.log('📧 Sent to:', emailResponse.data.emailAddresses);
                console.log('📝 Content preview:', emailResponse.data.content.substring(0, 100) + '...');
                
                if (emailResponse.data.demo) {
                    console.log('ℹ️  Demo mode - no actual email sent');
                } else {
                    console.log('🎉 Real email sent! Message ID:', emailResponse.data.messageId);
                }
            } else {
                console.log('❌ Email test failed:', emailResponse.data.message);
                if (emailResponse.data.availableHospitals) {
                    console.log('Available hospitals in directory:', emailResponse.data.availableHospitals);
                }
            }
        } else {
            console.log('❌ No pending visits found to test with');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testSimpleEmail();
