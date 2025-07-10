require('dotenv').config();
const OpenAI = require('openai');

async function debugQuota() {
  console.log('🔍 Debugging OpenAI API quota and limits...');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ No OpenAI API key found');
    return;
  }
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // Test 1: Check if we can get model list
  try {
    console.log('\n📋 Testing model list access...');
    const models = await openai.models.list();
    console.log('✅ Can access models list');
    console.log(`📊 Available models: ${models.data.length}`);
  } catch (error) {
    console.log('❌ Cannot access models list:', error.message);
  }
  
  // Test 2: Try different models with minimal tokens
  const testModels = [
    { name: 'gpt-3.5-turbo', maxTokens: 5 },
    { name: 'gpt-4o-mini', maxTokens: 5 },
    { name: 'gpt-4o', maxTokens: 5 }
  ];
  
  for (const model of testModels) {
    try {
      console.log(`\n📡 Testing ${model.name} with ${model.maxTokens} tokens...`);
      
      const completion = await openai.chat.completions.create({
        model: model.name,
        messages: [
          { role: 'user', content: 'Hi' }
        ],
        max_tokens: model.maxTokens
      });
      
      console.log(`✅ ${model.name} works!`);
      console.log(`📝 Response: "${completion.choices[0].message.content}"`);
      
    } catch (error) {
      console.log(`❌ ${model.name} failed:`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Status: ${error.status}`);
      console.log(`   Code: ${error.code}`);
      
      if (error.response) {
        console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }
  
  // Test 3: Check if it's a rate limit issue
  console.log('\n⏱️ Testing rate limiting...');
  console.log('Waiting 2 seconds between requests...');
  
  for (let i = 0; i < 3; i++) {
    try {
      console.log(`\n📡 Request ${i + 1}/3...`);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: 'user', content: 'Test' }
        ],
        max_tokens: 5
      });
      
      console.log(`✅ Request ${i + 1} successful`);
      
      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`❌ Request ${i + 1} failed: ${error.message}`);
      break;
    }
  }
}

debugQuota(); 