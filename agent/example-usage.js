const AIAgent = require('./services/AIAgent');

// Initialize the AI Agent
const aiAgent = new AIAgent();

async function demonstrateUsage() {
  console.log('🎯 AI Agent Usage Examples\n');

  // Example 1: Send a message to a candidate
  console.log('📤 Example 1: Send message to candidate');
  const messageResult = await aiAgent.processPrompt('Send a follow-up message to John Doe');
  
  if (messageResult.success) {
    console.log('✅ Intent detected:', messageResult.intent.action);
    console.log('📋 Reasoning:', messageResult.intent.reasoning);
    
    const whatsappJson = aiAgent.getWhatsAppJson(messageResult);
    if (whatsappJson) {
      console.log('📱 WhatsApp JSON:', JSON.stringify(whatsappJson, null, 2));
    }
    
    console.log('📝 Summary:', aiAgent.getActionSummary(messageResult));
  } else {
    console.log('❌ Error:', messageResult.error);
  }
  console.log('---\n');

  // Example 2: Generate questions for a candidate
  console.log('❓ Example 2: Generate questions for candidate');
  const questionsResult = await aiAgent.processPrompt('Generate follow-up questions for Maria Garcia');
  
  if (questionsResult.success) {
    console.log('✅ Intent detected:', questionsResult.intent.action);
    console.log('📋 Reasoning:', questionsResult.intent.reasoning);
    
    const whatsappJson = aiAgent.getWhatsAppJson(questionsResult);
    if (whatsappJson) {
      console.log('📱 WhatsApp JSON:', JSON.stringify(whatsappJson, null, 2));
    }
    
    console.log('📝 Summary:', aiAgent.getActionSummary(questionsResult));
  } else {
    console.log('❌ Error:', questionsResult.error);
  }
  console.log('---\n');

  // Example 3: Show candidates
  console.log('👥 Example 3: Show candidates');
  const candidatesResult = await aiAgent.processPrompt('Show all candidates');
  
  if (candidatesResult.success) {
    console.log('✅ Intent detected:', candidatesResult.intent.action);
    console.log('📋 Reasoning:', candidatesResult.intent.reasoning);
    console.log('📝 Summary:', aiAgent.getActionSummary(candidatesResult));
  } else {
    console.log('❌ Error:', candidatesResult.error);
  }
  console.log('---\n');

  // Example 4: Spanish prompt
  console.log('🇪🇸 Example 4: Spanish prompt');
  const spanishResult = await aiAgent.processPrompt('Enviar un mensaje a Juan Pérez');
  
  if (spanishResult.success) {
    console.log('✅ Intent detected:', spanishResult.intent.action);
    console.log('📋 Reasoning:', spanishResult.intent.reasoning);
    console.log('🌐 Language detected:', spanishResult.intent.parameters.language);
    
    const whatsappJson = aiAgent.getWhatsAppJson(spanishResult);
    if (whatsappJson) {
      console.log('📱 WhatsApp JSON:', JSON.stringify(whatsappJson, null, 2));
    }
    
    console.log('📝 Summary:', aiAgent.getActionSummary(spanishResult));
  } else {
    console.log('❌ Error:', spanishResult.error);
  }
  console.log('---\n');

  // Example 5: General chat
  console.log('💬 Example 5: General chat');
  const chatResult = await aiAgent.processPrompt('Hello, how are you today?');
  
  if (chatResult.success) {
    console.log('✅ Intent detected:', chatResult.intent.action);
    console.log('📋 Reasoning:', chatResult.intent.reasoning);
    console.log('📝 Summary:', aiAgent.getActionSummary(chatResult));
  } else {
    console.log('❌ Error:', chatResult.error);
  }
  console.log('---\n');
}

async function demonstrateSpecificMethods() {
  console.log('🔧 Specific Method Examples\n');

  // Using the convenience methods
  console.log('📤 Using sendMessageToCandidate method');
  const result = await aiAgent.sendMessageToCandidate('John Doe', 'followup', {
    jobDescription: 'Senior Developer position',
    previousMessages: ['Initial contact made']
  });
  
  if (result.success) {
    console.log('✅ Message sent successfully');
    console.log('📱 WhatsApp JSON:', JSON.stringify(aiAgent.getWhatsAppJson(result), null, 2));
    console.log('📝 Summary:', aiAgent.getActionSummary(result));
  } else {
    console.log('❌ Error:', result.error);
  }
  console.log('---\n');

  console.log('❓ Using generateQuestionsForCandidate method');
  const questionsResult = await aiAgent.generateQuestionsForCandidate('Maria Garcia', {
    jobDescription: 'Frontend Developer position'
  });
  
  if (questionsResult.success) {
    console.log('✅ Questions generated successfully');
    console.log('📱 WhatsApp JSON:', JSON.stringify(aiAgent.getWhatsAppJson(questionsResult), null, 2));
    console.log('📝 Summary:', aiAgent.getActionSummary(questionsResult));
  } else {
    console.log('❌ Error:', questionsResult.error);
  }
  console.log('---\n');
}

async function demonstrateAPIUsage() {
  console.log('🌐 API Usage Examples\n');

  console.log('📋 Example API calls you can make:');
  console.log('');
  console.log('1. Process any prompt:');
  console.log('   POST /api/process-prompt');
  console.log('   {');
  console.log('     "prompt": "Send a message to John Doe",');
  console.log('     "context": { "jobDescription": "Senior Developer" }');
  console.log('   }');
  console.log('');
  console.log('2. Send message to candidate:');
  console.log('   POST /api/send-message');
  console.log('   {');
  console.log('     "candidateName": "John Doe",');
  console.log('     "messageType": "followup",');
  console.log('     "context": { "jobDescription": "Senior Developer" }');
  console.log('   }');
  console.log('');
  console.log('3. Generate questions:');
  console.log('   POST /api/generate-questions');
  console.log('   {');
  console.log('     "candidateName": "Maria Garcia",');
  console.log('     "context": { "jobDescription": "Frontend Developer" }');
  console.log('   }');
  console.log('');
  console.log('4. Show candidates:');
  console.log('   GET /api/candidates');
  console.log('   GET /api/candidates/John%20Doe');
  console.log('');
  console.log('5. Health check:');
  console.log('   GET /api/health');
  console.log('   GET /api/ping');
  console.log('');
}

// Run examples
async function runExamples() {
  try {
    await demonstrateUsage();
    await demonstrateSpecificMethods();
    await demonstrateAPIUsage();
    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runExamples();
}

module.exports = { 
  demonstrateUsage, 
  demonstrateSpecificMethods, 
  demonstrateAPIUsage 
}; 