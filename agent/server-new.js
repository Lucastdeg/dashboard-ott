const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes - Using the new clean structure
const routes = require('./routes-new');
app.use('/api', routes);

// WhatsApp webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    console.log('WhatsApp webhook received:', JSON.stringify(req.body, null, 2));
    
    // Import services
    const WhatsAppService = require('./services/WhatsAppService');
    const AIAgent = require('./services/AIAgent');
    
    const whatsapp = new WhatsAppService();
    const aiAgent = new AIAgent();
    
    // Process the incoming message
    const message = await whatsapp.processIncomingMessage(req.body);
    
    if (message) {
      console.log(`Processed message from ${message.from}: ${message.text}`);
      
      // Check if this is a reference response template
      if (message.isReferenceResponse) {
        console.log('Reference response detected, processing with AI Agent...');
        
        // Process with AI Agent to get insights
        const context = {
          conversationId: `webhook_${Date.now()}`,
          userId: 'webhook_user',
          token: null
        };
        
        const prompt = `Analyze this reference response: ${message.text}. Provide insights about the candidate's performance, reliability, and suitability for future positions.`;
        
        try {
          const aiResult = await aiAgent.processPrompt(prompt, context);
          console.log('AI Agent analysis completed for reference response');
          
          // You could send a notification or store the analysis
          if (aiResult.success && aiResult.result) {
            console.log('Reference analysis:', aiResult.result.data || aiResult.explanation);
          }
        } catch (aiError) {
          console.error('Error processing reference response with AI Agent:', aiError);
        }
      }
      
      // Check if this is a general template response that needs processing
      if (message.templateName) {
        console.log(`Template response detected: ${message.templateName}`);
        
        // Process template-specific logic
        const context = {
          conversationId: `template_${Date.now()}`,
          userId: 'template_user',
          token: null
        };
        
        let prompt = '';
        if (message.templateName === 'referencia_laboral') {
          prompt = `Process this reference survey response: ${message.text}. Extract key insights about the candidate's performance, relationship with the reference, and overall recommendation.`;
        } else {
          prompt = `Process this message: ${message.text}. Provide relevant insights.`;
        }
        
        try {
          const aiResult = await aiAgent.processPrompt(prompt, context);
          console.log('Template response processed with AI Agent');
        } catch (aiError) {
          console.error('Error processing template response with AI Agent:', aiError);
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Health check endpoint
app.get('/api/ping', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'AI Agent API is alive (New Structure)',
    services: {
      openai: 'connected',
      intent_detector: 'active',
      task_router: 'active',
      whatsapp: 'ready_for_integration'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    available_endpoints: [
      'POST /webhook (WhatsApp webhook)',
      'POST /api/process-prompt',
      'POST /api/send-message',
      'POST /api/generate-questions',
      'POST /api/analyze-messages',
      'GET /api/whatsapp/retrieve-messages (Retrieve and summarize messages)',
    'POST /api/whatsapp/retrieve-multiple-messages (Retrieve and analyze multiple candidates)',
      'GET /api/whatsapp/messages (Get all messages)',
      'POST /api/whatsapp/send (Send WhatsApp message)',
      'GET /api/whatsapp/test (Test WhatsApp connection)',
      'GET /api/candidates',
      'GET /api/candidates/:name',
      'POST /api/compare-candidates',
      'POST /api/analyze-resume',
      'POST /api/schedule-interview',
      'GET /api/health',
      'GET /api/ping'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`AI Agent API server running on port ${PORT} (New Structure)`);
  console.log(`Health check: http://localhost:${PORT}/api/ping`);
  console.log(`Services status:`);
  console.log(`   - OpenAI: Connected`);
  console.log(`   - Intent Detector: Active`);
  console.log(`   - Task Router: Active`);
  console.log(`   - WhatsApp: Integrated`);
  console.log(`Available endpoints:`);
  console.log(`   - POST /webhook (WhatsApp webhook)`);
  console.log(`   - POST /api/process-prompt (Main endpoint)`);
  console.log(`   - POST /api/send-message (Send to candidate)`);
  console.log(`   - POST /api/generate-questions (Generate questions)`);
        console.log(`   - GET /api/whatsapp/retrieve-messages (Retrieve and summarize messages)`);
      console.log(`   - POST /api/whatsapp/retrieve-multiple-messages (Retrieve and analyze multiple candidates)`);
  console.log(`   - GET /api/whatsapp/messages (Get all messages)`);
  console.log(`   - POST /api/whatsapp/send (Send WhatsApp message)`);
  console.log(`   - GET /api/whatsapp/test (Test WhatsApp connection)`);
  console.log(`   - GET /api/candidates (Show candidates)`);
  console.log(`   - GET /api/health (Health check)`);
  console.log(`   - GET /api/cache/stats (Cache statistics)`);
  console.log(`   - POST /api/cache/clear (Clear cache)`);
});

module.exports = app; 