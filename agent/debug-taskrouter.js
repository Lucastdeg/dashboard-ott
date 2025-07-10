const TaskRouter = require('./services/TaskRouter');

async function debugTaskRouter() {
  console.log('🔍 Debugging TaskRouter output...\n');
  
  try {
    const taskRouter = new TaskRouter();
    
    // Test with a simple message
    const intentData = {
      action: 'send_message',
      intent: 'Send a message to Carlos asking about his Python experience',
      reasoning: 'User wants to send a message to Carlos',
      parameters: {
        candidate_name: 'Carlos',
        language: 'es'
      }
    };
    
    console.log('📤 Testing TaskRouter with intent:', intentData);
    
    const result = await taskRouter.routeTask(intentData, {});
    
    console.log('📊 TaskRouter result structure:');
    console.log('Result type:', typeof result);
    console.log('Result keys:', Object.keys(result));
    console.log('Full result:', JSON.stringify(result, null, 2));
    
    if (result && result.success) {
      console.log('\n✅ TaskRouter succeeded');
      if (result.data) {
        console.log('📝 Data found in result.data:', JSON.stringify(result.data, null, 2));
      } else if (result.result) {
        console.log('📝 Data found in result.result:', JSON.stringify(result.result, null, 2));
      } else {
        console.log('⚠️ No data found in result');
      }
    } else {
      console.log('\n❌ TaskRouter failed:', result?.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugTaskRouter().catch(console.error); 