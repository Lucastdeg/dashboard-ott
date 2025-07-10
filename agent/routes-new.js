const express = require('express');
const router = express.Router();
const AIAgent = require('./services/AIAgent');
const fs = require('fs');
const path = require('path');

// Initialize the AI Agent
const aiAgent = new AIAgent();

// Helper function to save chat history
const saveChatHistory = (conversationId, sender, message) => {
  try {
    const chatHistoryPath = path.join(__dirname, 'data', 'chatHistory.json');
    let chatHistory = [];
    
    // Load existing chat history
    if (fs.existsSync(chatHistoryPath)) {
      const data = fs.readFileSync(chatHistoryPath, 'utf8');
      chatHistory = JSON.parse(data);
    }
    
    // Add new message
    chatHistory.push({
      conversationId: conversationId,
      sender: sender,
      message: message,
      timestamp: new Date().toISOString()
    });
    
    // Save back to file
    fs.writeFileSync(chatHistoryPath, JSON.stringify(chatHistory, null, 2));
    console.log('Chat history saved for conversation:', conversationId);
  } catch (error) {
    console.error('Error saving chat history:', error);
  }
};

// Main endpoint to process any prompt
router.post('/process-prompt', async (req, res) => {
  try {
    const { prompt, context = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt is required' 
      });
    }

    console.log('Processing prompt:', prompt);
    console.log('User context received:', { 
      userId: context.userId, 
      hasToken: !!context.token,
      conversationId: context.conversationId 
    });
    
    // Save user message to chat history
    if (context.conversationId) {
      saveChatHistory(context.conversationId, 'user', prompt);
    }
    
    // Process the prompt through the AI Agent with user context
    const result = await aiAgent.processPrompt(prompt, context);
    
    // Get WhatsApp JSON if applicable (only for send_message and generate_questions)
    const whatsappJson = aiAgent.getWhatsAppJson(result);
    
    // Debug logging
    console.log('Debug - Result:', JSON.stringify(result, null, 2));
    console.log('Debug - WhatsApp JSON:', JSON.stringify(whatsappJson, null, 2));
    console.log('Debug - Action:', result.intentData?.action);
    console.log('Debug - Data type:', Array.isArray(result.result?.data) ? 'array' : typeof result.result?.data);
    console.log('Debug - Data length:', Array.isArray(result.result.data) ? result.result.data.length : 'N/A');
    
    // Get explanation if the action actually did something
    const explanation = aiAgent.getActionExplanation(result);
    
    // Get action summary for all actions
    const summary = aiAgent.getActionSummary(result);

    // Save AI response to chat history
    if (context.conversationId) {
      let aiResponse = '';
      
      // Priority: actual message > explanation > summary
      if (result.result && result.result.data) {
        if (Array.isArray(result.result.data)) {
          // Handle bulk messages
          aiResponse = `Sent messages to ${result.result.data.length} candidates`;
        } else if (result.result.data.message) {
          aiResponse = result.result.data.message;
        } else if (result.result.data.candidate && result.result.data.message) {
          aiResponse = `Message sent to ${result.result.data.candidate}: ${result.result.data.message}`;
        }
      }
      
      // Only use explanation/summary if no actual message was found
      if (!aiResponse && explanation) {
        aiResponse = explanation;
      }
      if (!aiResponse && summary) {
        aiResponse = summary;
      }
      
      if (aiResponse) {
        console.log(`Saving AI response to chat history: ${aiResponse.substring(0, 100)}...`);
        saveChatHistory(context.conversationId, 'ai', aiResponse);
      }
    }

    res.json({
      success: true,
      data: {
        intentData: result.intentData,
        result: result.result,
        whatsappJson: whatsappJson,
        explanation: explanation,
        summary: summary,
        timestamp: result.timestamp
      }
    });

  } catch (error) {
    console.error('Error processing prompt:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process prompt' 
    });
  }
});

// Specific endpoints for common actions
router.post('/send-message', async (req, res) => {
  try {
    const { candidateName, messageType = 'general', context = {} } = req.body;
    
    if (!candidateName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Candidate name is required' 
      });
    }

    const result = await aiAgent.sendMessageToCandidate(candidateName, messageType, context);
    const whatsappJson = aiAgent.getWhatsAppJson(result);
    const explanation = aiAgent.getActionExplanation(result);
    const summary = aiAgent.getActionSummary(result);

    res.json({
      success: true,
      data: {
        intentData: result.intentData,
        result: result.result,
        whatsappJson: whatsappJson,
        explanation: explanation,
        summary: summary,
        timestamp: result.timestamp
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send message' 
    });
  }
});

router.post('/generate-questions', async (req, res) => {
  try {
    const { candidateName, context = {} } = req.body;
    
    if (!candidateName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Candidate name is required' 
      });
    }

    const result = await aiAgent.generateQuestionsForCandidate(candidateName, context);
    const whatsappJson = aiAgent.getWhatsAppJson(result);
    const explanation = aiAgent.getActionExplanation(result);
    const summary = aiAgent.getActionSummary(result);

    res.json({
      success: true,
      data: {
        intentData: result.intentData,
        result: result.result,
        whatsappJson: whatsappJson,
        explanation: explanation,
        summary: summary,
        timestamp: result.timestamp
      }
    });

  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate questions' 
    });
  }
});

router.post('/analyze-messages', async (req, res) => {
  try {
    const { messages, context = {} } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Messages array is required' 
      });
    }

    const result = await aiAgent.analyzeMessages(messages, context);
    const explanation = aiAgent.getActionExplanation(result);
    const summary = aiAgent.getActionSummary(result);

    res.json({
      success: true,
      data: {
        intentData: result.intentData,
        result: result.result,
        explanation: explanation,
        summary: summary,
        timestamp: result.timestamp
      }
    });

  } catch (error) {
    console.error('Error analyzing messages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze messages' 
    });
  }
});

router.get('/candidates/:name?', async (req, res) => {
  try {
    const { name } = req.params;
    const context = req.query;

    const result = await aiAgent.showCandidates(name, context);
    const explanation = aiAgent.getActionExplanation(result);
    const summary = aiAgent.getActionSummary(result);

    res.json({
      success: true,
      data: {
        intentData: result.intentData,
        result: result.result,
        explanation: explanation,
        summary: summary,
        timestamp: result.timestamp
      }
    });

  } catch (error) {
    console.error('Error showing candidates:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to show candidates' 
    });
  }
});

router.post('/compare-candidates', async (req, res) => {
  try {
    const { candidateIds, jobDescription, context = {} } = req.body;
    
    if (!candidateIds || !Array.isArray(candidateIds)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Candidate IDs array is required' 
      });
    }

    const result = await aiAgent.compareCandidates(candidateIds, jobDescription, context);
    const explanation = aiAgent.getActionExplanation(result);
    const summary = aiAgent.getActionSummary(result);

    res.json({
      success: true,
      data: {
        intentData: result.intentData,
        result: result.result,
        explanation: explanation,
        summary: summary,
        timestamp: result.timestamp
      }
    });

  } catch (error) {
    console.error('Error comparing candidates:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to compare candidates' 
    });
  }
});

router.post('/analyze-resume', async (req, res) => {
  try {
    const { resumeText, context = {} } = req.body;
    
    if (!resumeText) {
      return res.status(400).json({ 
        success: false, 
        error: 'Resume text is required' 
      });
    }

    const result = await aiAgent.analyzeResume(resumeText, context);
    const explanation = aiAgent.getActionExplanation(result);
    const summary = aiAgent.getActionSummary(result);

    res.json({
      success: true,
      data: {
        intentData: result.intentData,
        result: result.result,
        explanation: explanation,
        summary: summary,
        timestamp: result.timestamp
      }
    });

  } catch (error) {
    console.error('Error analyzing resume:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze resume' 
    });
  }
});

router.post('/schedule-interview', async (req, res) => {
  try {
    const { candidateId, interviewDetails, context = {} } = req.body;
    
    if (!candidateId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Candidate ID is required' 
      });
    }

    const result = await aiAgent.scheduleInterview(candidateId, interviewDetails, context);
    const explanation = aiAgent.getActionExplanation(result);
    const summary = aiAgent.getActionSummary(result);

    res.json({
      success: true,
      data: {
        intentData: result.intentData,
        result: result.result,
        explanation: explanation,
        summary: summary,
        timestamp: result.timestamp
      }
    });

  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to schedule interview' 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Agent is running',
    timestamp: new Date().toISOString()
  });
});

// Get all conversations
router.get('/conversations', async (req, res) => {
  try {
    const chatHistoryPath = path.join(__dirname, 'data', 'chatHistory.json');
    let chatHistory = [];
    
    if (fs.existsSync(chatHistoryPath)) {
      const data = fs.readFileSync(chatHistoryPath, 'utf8');
      chatHistory = JSON.parse(data);
    }
    
    // Group messages by conversationId
    const conversations = {};
    chatHistory.forEach(msg => {
      if (!conversations[msg.conversationId]) {
        conversations[msg.conversationId] = {
          id: msg.conversationId,
          messages: []
        };
      }
      conversations[msg.conversationId].messages.push(msg);
    });
    
    // Convert to array and sort by latest message
    const conversationsArray = Object.values(conversations).map(conv => ({
      ...conv,
      messages: conv.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    })).sort((a, b) => {
      const aLatest = a.messages[a.messages.length - 1]?.timestamp || 0;
      const bLatest = b.messages[b.messages.length - 1]?.timestamp || 0;
      return new Date(bLatest) - new Date(aLatest);
    });
    
    res.json({
      success: true,
      data: conversationsArray
    });
    
  } catch (error) {
    console.error('Error loading conversations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load conversations' 
    });
  }
});

// Get specific conversation
router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chatHistoryPath = path.join(__dirname, 'data', 'chatHistory.json');
    let chatHistory = [];
    
    if (fs.existsSync(chatHistoryPath)) {
      const data = fs.readFileSync(chatHistoryPath, 'utf8');
      chatHistory = JSON.parse(data);
    }
    
    // Filter messages for this conversation
    const conversationMessages = chatHistory
      .filter(msg => msg.conversationId === id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (conversationMessages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: id,
        messages: conversationMessages
      }
    });
    
  } catch (error) {
    console.error('Error loading conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load conversation' 
    });
  }
});

// Delete conversation
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chatHistoryPath = path.join(__dirname, 'data', 'chatHistory.json');
    let chatHistory = [];
    
    if (fs.existsSync(chatHistoryPath)) {
      const data = fs.readFileSync(chatHistoryPath, 'utf8');
      chatHistory = JSON.parse(data);
    }
    
    // Remove messages for this conversation
    const filteredHistory = chatHistory.filter(msg => msg.conversationId !== id);
    
    // Save updated history
    fs.writeFileSync(chatHistoryPath, JSON.stringify(filteredHistory, null, 2));
    
    res.json({
      success: true,
      data: { message: 'Conversation deleted successfully' }
    });
    
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete conversation' 
    });
  }
});

// Debug endpoint to test candidate name matching
router.post('/debug-candidates', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt is required' 
      });
    }

    console.log('Debug prompt:', prompt);
    
    // Test intent detection
    const intentData = await aiAgent.intentDetector.detectIntent(prompt, {});
    console.log('Debug intent:', JSON.stringify(intentData, null, 2));
    
    // Test candidate matching
    const allData = await aiAgent.taskRouter.loadAllData();
    const intentText = prompt.toLowerCase();
    const candidateNames = allData.candidates.map(c => c.name.toLowerCase());
    
    const foundCandidates = candidateNames.filter(name => 
      intentText.includes(name.toLowerCase())
    );
    
    const partialMatches = allData.candidates.filter(c => {
      const candidateNameLower = c.name.toLowerCase();
      const firstName = candidateNameLower.split(' ')[0];
      const lastName = candidateNameLower.split(' ')[1];
      
      return intentText.includes(firstName) || intentText.includes(lastName);
    });
    
    const allFoundCandidates = [...new Set([...foundCandidates, ...partialMatches.map(c => c.name.toLowerCase())])];
    
    // Test exclusions
    const normalizeText = (text) => {
      return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };
    
    let excludedCandidates = [];
    if (intentData.parameters.exclude_candidates) {
      excludedCandidates = allData.candidates.filter(candidate => {
        const candidateNameLower = candidate.name.toLowerCase();
        const normalizedCandidateName = normalizeText(candidateNameLower);
        
        return intentData.parameters.exclude_candidates.some(excludeName => {
          const excludeNameLower = excludeName.toLowerCase();
          const normalizedExcludeName = normalizeText(excludeNameLower);
          
          return candidateNameLower.includes(excludeNameLower) ||
                 excludeNameLower.includes(candidateNameLower) ||
                 normalizedCandidateName.includes(normalizedExcludeName) ||
                 normalizedExcludeName.includes(normalizedCandidateName) ||
                 candidateNameLower.split(' ')[0] === excludeNameLower ||
                 candidateNameLower.split(' ')[1] === excludeNameLower;
        });
      });
    }
    
    res.json({
      success: true,
      data: {
        prompt: prompt,
        intentData: intentData,
        foundCandidates: foundCandidates,
        partialMatches: partialMatches.map(c => c.name),
        allFoundCandidates: allFoundCandidates,
        excludeCandidates: intentData.parameters.exclude_candidates || [],
        excludedCandidates: excludedCandidates.map(c => c.name),
        allCandidates: allData.candidates.map(c => c.name)
      }
    });

  } catch (error) {
    console.error('Error in debug:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to debug' 
    });
  }
});

// WhatsApp endpoints
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and message are required' 
      });
    }

    console.log(`📤 Sending WhatsApp message to ${phoneNumber}: ${message}`);

    // Import WhatsApp service
    const WhatsAppService = require('./services/WhatsAppService');
    const whatsapp = new WhatsAppService();

    // Send the message
    const result = await whatsapp.sendTextMessage(phoneNumber, message);
    
    console.log('WhatsApp message sent successfully!');

    res.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ WhatsApp send failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send WhatsApp message',
      details: error.message
    });
  }
});

router.get('/whatsapp/messages', async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    
    // Import WhatsApp service
    const WhatsAppService = require('./services/WhatsAppService');
    const whatsapp = new WhatsAppService();

    let messages;
    if (phoneNumber) {
      messages = await whatsapp.getMessagesByNumber(phoneNumber);
    } else {
      messages = await whatsapp.getMessages();
    }
    
    res.json({
      success: true,
      data: messages,
      count: messages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting WhatsApp messages:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get WhatsApp messages',
      details: error.message
    });
  }
});

// Retrieve and summarize messages from a conversation
router.get('/whatsapp/retrieve-messages', async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }

    console.log(`📥 Retrieving messages for conversation with ${phoneNumber}`);

    // Import WhatsApp service
    const WhatsAppService = require('./services/WhatsAppService');
    const whatsapp = new WhatsAppService();

    // Get all messages for this phone number
    const messages = await whatsapp.getMessagesByNumber(phoneNumber);
    
    if (messages.length === 0) {
      return res.json({
        success: true,
        data: {
          phoneNumber: phoneNumber,
          messages: [],
          summary: 'No messages found for this conversation',
          count: 0
        },
        timestamp: new Date().toISOString()
      });
    }

    // Sort messages by timestamp
    const sortedMessages = messages.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.saved_at);
      const timeB = new Date(b.timestamp || b.saved_at);
      return timeA - timeB;
    });

    // Create conversation summary
    const conversationSummary = createConversationSummary(sortedMessages, phoneNumber);

    res.json({
      success: true,
      data: {
        phoneNumber: phoneNumber,
        messages: sortedMessages,
        summary: conversationSummary,
        count: sortedMessages.length,
        lastMessage: sortedMessages[sortedMessages.length - 1],
        firstMessage: sortedMessages[0]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error retrieving WhatsApp messages:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve WhatsApp messages',
      details: error.message
    });
  }
});

// Helper function to create conversation summary
function createConversationSummary(messages, phoneNumber) {
  try {
    if (messages.length === 0) {
      return 'No messages in this conversation';
    }

    const incomingMessages = messages.filter(msg => msg.type === 'incoming' || msg.from === phoneNumber);
    const outgoingMessages = messages.filter(msg => msg.type === 'outgoing' || msg.to === phoneNumber);
    
    const totalMessages = messages.length;
    const incomingCount = incomingMessages.length;
    const outgoingCount = outgoingMessages.length;
    
    // Get the last message content
    const lastMessage = messages[messages.length - 1];
    const lastMessageContent = lastMessage.message || lastMessage.text || 'No content';
    
    // Get conversation duration
    const firstMessageTime = new Date(messages[0].timestamp || messages[0].saved_at);
    const lastMessageTime = new Date(messages[messages.length - 1].timestamp || messages[messages.length - 1].saved_at);
    const durationMs = lastMessageTime - firstMessageTime;
    const durationHours = Math.round(durationMs / (1000 * 60 * 60) * 100) / 100;
    
    // Create summary
    let summary = `Conversation with ${phoneNumber}:\n`;
    summary += `• Total messages: ${totalMessages}\n`;
    summary += `• Incoming messages: ${incomingCount}\n`;
    summary += `• Outgoing messages: ${outgoingCount}\n`;
    summary += `• Duration: ${durationHours} hours\n`;
    summary += `• Last message: "${lastMessageContent.substring(0, 100)}${lastMessageContent.length > 100 ? '...' : ''}"\n`;
    
    // Add message timeline
    summary += `\nMessage timeline:\n`;
    messages.forEach((msg, index) => {
      const time = new Date(msg.timestamp || msg.saved_at).toLocaleString();
      const direction = msg.type === 'incoming' || msg.from === phoneNumber ? '📥' : '📤';
      const content = (msg.message || msg.text || 'No content').substring(0, 50);
      summary += `${index + 1}. ${direction} ${time}: ${content}${content.length >= 50 ? '...' : ''}\n`;
    });

    return summary;
  } catch (error) {
    console.error('Error creating conversation summary:', error);
    return 'Error creating conversation summary';
  }
}

// Retrieve and summarize messages from multiple conversations
router.post('/whatsapp/retrieve-multiple-messages', async (req, res) => {
  try {
    const { phoneNumbers } = req.body;
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone numbers array is required' 
      });
    }

    console.log(`📥 Retrieving messages for ${phoneNumbers.length} conversations:`, phoneNumbers);

    // Import WhatsApp service
    const WhatsAppService = require('./services/WhatsAppService');
    const whatsapp = new WhatsAppService();

    const results = [];
    const allMessages = [];
    let totalMessages = 0;
    
    // Retrieve messages for each phone number
    for (const phoneNumber of phoneNumbers) {
      console.log(`📱 Processing phone number: ${phoneNumber}`);
      
      const messages = await whatsapp.getMessagesByNumber(phoneNumber);
      const sortedMessages = messages.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.saved_at);
        const timeB = new Date(b.timestamp || b.saved_at);
        return timeA - timeB;
      });
      
      const conversationSummary = createConversationSummary(sortedMessages, phoneNumber);
      
      results.push({
        phoneNumber: phoneNumber,
        messages: sortedMessages,
        summary: conversationSummary,
        count: sortedMessages.length,
        lastMessage: sortedMessages[sortedMessages.length - 1],
        firstMessage: sortedMessages[0]
      });
      
      totalMessages += sortedMessages.length;
      allMessages.push(...sortedMessages.map(msg => ({ ...msg, source_phone: phoneNumber })));
    }
    
    // Create comprehensive analysis
    const comprehensiveAnalysis = createComprehensiveAnalysis(results, allMessages);

    res.json({
      success: true,
      data: {
        phoneNumbers: phoneNumbers,
        results: results,
        comprehensiveAnalysis: comprehensiveAnalysis,
        totalMessages: totalMessages,
        totalCandidates: phoneNumbers.length,
        allMessages: allMessages,
        summary: comprehensiveAnalysis
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error retrieving multiple WhatsApp messages:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve multiple WhatsApp messages',
      details: error.message
    });
  }
});

// Helper function to create comprehensive analysis of multiple conversations
function createComprehensiveAnalysis(results, allMessages) {
  try {
    if (results.length === 0) {
      return 'No conversations to analyze.';
    }

    // Sort all messages by timestamp
    const sortedAllMessages = allMessages.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.saved_at);
      const timeB = new Date(b.timestamp || b.saved_at);
      return timeA - timeB;
    });

    // Calculate overall statistics
    const totalMessages = allMessages.length;
    const totalCandidates = results.length;
    const incomingMessages = allMessages.filter(msg => msg.type === 'incoming');
    const outgoingMessages = allMessages.filter(msg => msg.type === 'outgoing');
    
    // Get date range
    const firstMessage = sortedAllMessages[0];
    const lastMessage = sortedAllMessages[sortedAllMessages.length - 1];
    const firstDate = new Date(firstMessage.timestamp || firstMessage.saved_at).toLocaleDateString();
    const lastDate = new Date(lastMessage.timestamp || lastMessage.saved_at).toLocaleDateString();
    
    // Find most active candidate
    const candidateActivity = results.map(result => ({
      phoneNumber: result.phoneNumber,
      messageCount: result.count,
      lastActivity: result.lastMessage ? new Date(result.lastMessage.timestamp || result.lastMessage.saved_at) : new Date(0)
    }));
    
    const mostActive = candidateActivity.reduce((prev, current) => 
      prev.messageCount > current.messageCount ? prev : current
    );
    
    const mostRecent = candidateActivity.reduce((prev, current) => 
      prev.lastActivity > current.lastActivity ? prev : current
    );

    // Create comprehensive summary
    let analysis = `📊 **Comprehensive Analysis of ${totalCandidates} Candidates**\n\n`;
    
    analysis += `📈 **General Statistics:**\n`;
    analysis += `• Total messages: ${totalMessages}\n`;
    analysis += `• Incoming messages: ${incomingMessages.length}\n`;
    analysis += `• Outgoing messages: ${outgoingMessages.length}\n`;
    analysis += `• Date range: ${firstDate} - ${lastDate}\n`;
    
    analysis += `\n🏆 **Most Active Candidate:** ${mostActive.phoneNumber} (${mostActive.messageCount} messages)\n`;
    analysis += `🕒 **Last Activity:** ${mostRecent.phoneNumber} (${mostRecent.lastActivity.toLocaleString()})\n`;
    
    // Add individual candidate summaries
    analysis += `\n**Candidate Summaries:**\n`;
    results.forEach((result, index) => {
      analysis += `\n${index + 1}. 📱 **${result.phoneNumber}**: ${result.count} messages\n`;
      if (result.lastMessage) {
        const lastContent = (result.lastMessage.message || result.lastMessage.text || '').substring(0, 50);
        analysis += `   📝 Last message: "${lastContent}${lastContent.length >= 50 ? '...' : ''}"\n`;
      }
    });
    
    // Add insights
    analysis += `\n💡 **Insights:**\n`;
    if (totalMessages > 0) {
      const avgMessagesPerCandidate = Math.round(totalMessages / totalCandidates);
      analysis += `• Average messages per candidate: ${avgMessagesPerCandidate}\n`;
    }
    
    const candidatesWithMessages = results.filter(r => r.count > 0).length;
    analysis += `• Candidates with messages: ${candidatesWithMessages}/${totalCandidates}\n`;

    return analysis;
  } catch (error) {
    console.error('Error creating comprehensive analysis:', error);
    return 'Error creating comprehensive analysis.';
  }
}

// WhatsApp webhook endpoint for incoming messages
router.post('/whatsapp/webhook', async (req, res) => {
  try {
    console.log('📥 Received WhatsApp webhook:', JSON.stringify(req.body, null, 2));
    
    // Import WhatsApp service
    const WhatsAppService = require('./services/WhatsAppService');
    const whatsapp = new WhatsAppService();

    // Process the incoming message
    const processedMessage = await whatsapp.processIncomingMessage(req.body);
    
    if (processedMessage) {
      console.log(`✅ Processed incoming message from ${processedMessage.from}: ${processedMessage.text}`);
      
      // Check if this might be a reference response
      const isReferenceResponse = checkIfReferenceResponse(processedMessage);
      
      if (isReferenceResponse) {
        console.log(`📞 Detected reference response from ${processedMessage.from}`);
        saveReferenceResponse(processedMessage);
      }
      
      // You can add additional processing here, such as:
      // - Auto-reply logic
      // - Message analysis
      // - Integration with AI agent
      
      res.json({
        success: true,
        message: 'Webhook processed successfully',
        data: processedMessage,
        isReferenceResponse: isReferenceResponse
      });
    } else {
      console.log('⚠️ No valid message found in webhook');
      res.json({
        success: true,
        message: 'Webhook received but no valid message found'
      });
    }

  } catch (error) {
    console.error('❌ Error processing webhook:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process webhook',
      details: error.message
    });
  }
});

// Helper function to check if a message is a reference response
function checkIfReferenceResponse(message) {
  try {
    const messageText = (message.text || message.message || '').toLowerCase();
    
    // Check for reference response indicators
    const referenceKeywords = [
      'referencia',
      'reference',
      'candidato',
      'candidate',
      'trabajo',
      'work',
      'empleo',
      'job',
      'recomendación',
      'recommendation',
      'evaluación',
      'evaluation',
      'desempeño',
      'performance'
    ];
    
    // Check if message contains reference-related keywords
    const hasReferenceKeywords = referenceKeywords.some(keyword => 
      messageText.includes(keyword)
    );
    
    // Check if message is responding to a reference template
    const isResponseToReference = messageText.includes('referencia_laboral') || 
                                 messageText.includes('reference_laboral') ||
                                 messageText.includes('trabajo') ||
                                 messageText.includes('work');
    
    return hasReferenceKeywords || isResponseToReference;
  } catch (error) {
    console.error('Error checking if message is reference response:', error);
    return false;
  }
}

// Helper function to save reference response
function saveReferenceResponse(message) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Save to reference-responses.json (existing file)
    const referenceResponsesPath = path.join(__dirname, '..', 'data', 'reference-responses.json');
    let referenceResponses = [];
    
    if (fs.existsSync(referenceResponsesPath)) {
      try {
        referenceResponses = JSON.parse(fs.readFileSync(referenceResponsesPath, 'utf8'));
      } catch (e) {
        console.error('Error reading reference-responses.json:', e);
        referenceResponses = [];
      }
    }
    
    // Add new reference response
    const referenceResponse = {
      id: message.id || `ref_${Date.now()}`,
      from: message.from,
      phone_number: message.from,
      message: message.text || message.message,
      text: message.text || message.message,
      timestamp: new Date().toISOString(),
      received_at: new Date().toISOString(),
      type: 'reference_response',
      source: 'whatsapp_webhook',
      candidate_name: 'Unknown', // Will be updated when we can identify the candidate
      reference_for: 'Unknown'   // Will be updated when we can identify the candidate
    };
    
    referenceResponses.push(referenceResponse);
    fs.writeFileSync(referenceResponsesPath, JSON.stringify(referenceResponses, null, 2), 'utf8');
    
    // ALSO save to referenceHistory.json (new dedicated file)
    const referenceHistoryPath = path.join(__dirname, '..', 'data', 'referenceHistory.json');
    let referenceHistory = [];
    
    if (fs.existsSync(referenceHistoryPath)) {
      try {
        referenceHistory = JSON.parse(fs.readFileSync(referenceHistoryPath, 'utf8'));
      } catch (e) {
        console.error('Error reading referenceHistory.json:', e);
        referenceHistory = [];
      }
    }
    
    referenceHistory.push({
      ...referenceResponse,
      saved_at: new Date().toISOString()
    });
    
    fs.writeFileSync(referenceHistoryPath, JSON.stringify(referenceHistory, null, 2), 'utf8');
    
    console.log('💾 Saved reference response to both reference-responses.json and referenceHistory.json');
    return true;
  } catch (error) {
    console.error('❌ Error saving reference response:', error);
    return false;
  }
}

// WhatsApp webhook verification endpoint
router.get('/whatsapp/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('🔍 Webhook verification request:', { mode, token, challenge });
    
    // You should set this verify token in your WhatsApp app settings
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token_here';
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Webhook verification failed');
      res.status(403).send('Forbidden');
    }
  } catch (error) {
    console.error('❌ Error in webhook verification:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/whatsapp/test', async (req, res) => {
  try {
    // Import WhatsApp service
    const WhatsAppService = require('./services/WhatsAppService');
    const whatsapp = new WhatsAppService();

    const isConnected = await whatsapp.testConnection();
    
    res.json({
      success: true,
      connected: isConnected,
      message: isConnected ? 'WhatsApp service is connected' : 'WhatsApp service connection failed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ WhatsApp test failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'WhatsApp test failed',
      details: error.message
    });
  }
});

// Cache management endpoints
router.get('/cache/stats', (req, res) => {
  try {
    const stats = aiAgent.intentDetector.databaseService.getCacheStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get cache stats' 
    });
  }
});

router.post('/cache/clear', (req, res) => {
  try {
    aiAgent.intentDetector.databaseService.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear cache' 
    });
  }
});

// Get messages by candidate
router.get('/whatsapp/messages/candidate/:candidateIdentifier', async (req, res) => {
  try {
    const { candidateIdentifier } = req.params;
    const { token, userId } = req.query;
    
    console.log(`👤 Getting messages for candidate: ${candidateIdentifier}`);
    
    // Import services
    const WhatsAppService = require('./services/WhatsAppService');
    const DatabaseService = require('./services/DatabaseService');
    const whatsapp = new WhatsAppService();
    const databaseService = new DatabaseService();
    
    const messages = await whatsapp.getMessagesByCandidate(candidateIdentifier, databaseService, token, userId);
    
    res.json({
      success: true,
      data: {
        candidate: candidateIdentifier,
        messages: messages,
        count: messages.length,
        summary: messages.length > 0 ? `Found ${messages.length} messages for ${candidateIdentifier}` : `No messages found for ${candidateIdentifier}`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting messages by candidate:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get messages by candidate',
      details: error.message
    });
  }
});

// Get messages for multiple candidates
router.post('/whatsapp/messages/candidates', async (req, res) => {
  try {
    const { candidates, token, userId } = req.body;
    
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Candidates array is required' 
      });
    }
    
    console.log(`👥 Getting messages for ${candidates.length} candidates:`, candidates);
    
    // Import services
    const WhatsAppService = require('./services/WhatsAppService');
    const DatabaseService = require('./services/DatabaseService');
    const whatsapp = new WhatsAppService();
    const databaseService = new DatabaseService();
    
    const results = await whatsapp.getMessagesForCandidates(candidates, databaseService, token, userId);
    
    // Calculate totals
    const totalMessages = Object.values(results).reduce((sum, messages) => sum + messages.length, 0);
    const candidatesWithMessages = Object.values(results).filter(messages => messages.length > 0).length;
    
    res.json({
      success: true,
      data: {
        candidates: candidates,
        results: results,
        totalMessages: totalMessages,
        candidatesWithMessages: candidatesWithMessages,
        summary: `Found ${totalMessages} total messages across ${candidatesWithMessages} candidates`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting messages for multiple candidates:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get messages for multiple candidates',
      details: error.message
    });
  }
});

// Get all reference template responses
router.get('/whatsapp/messages/reference-responses', async (req, res) => {
  try {
    console.log('📞 Getting all reference template responses');
    
    // Import WhatsApp service
    const WhatsAppService = require('./services/WhatsAppService');
    const whatsapp = new WhatsAppService();
    
    const referenceResponses = await whatsapp.getReferenceTemplateResponses();
    
    res.json({
      success: true,
      data: {
        referenceResponses: referenceResponses,
        count: referenceResponses.length,
        summary: `Found ${referenceResponses.length} reference template responses`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting reference template responses:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get reference template responses',
      details: error.message
    });
  }
});

// Get all messages with candidate information
router.get('/whatsapp/messages/with-candidates', async (req, res) => {
  try {
    const { token, userId } = req.query;
    
    console.log('📱 Getting all messages with candidate information');
    
    // Import services
    const WhatsAppService = require('./services/WhatsAppService');
    const DatabaseService = require('./services/DatabaseService');
    const whatsapp = new WhatsAppService();
    const databaseService = new DatabaseService();
    
    const messagesWithCandidates = await whatsapp.getAllMessagesWithCandidates(databaseService, token, userId);
    
    // Group by candidate
    const groupedByCandidate = {};
    messagesWithCandidates.forEach(msg => {
      const candidate = msg.from_candidate || msg.to_candidate;
      if (candidate) {
        const candidateKey = candidate.id;
        if (!groupedByCandidate[candidateKey]) {
          groupedByCandidate[candidateKey] = {
            candidate: candidate,
            messages: []
          };
        }
        groupedByCandidate[candidateKey].messages.push(msg);
      }
    });
    
    res.json({
      success: true,
      data: {
        messages: messagesWithCandidates,
        groupedByCandidate: groupedByCandidate,
        totalMessages: messagesWithCandidates.length,
        totalCandidates: Object.keys(groupedByCandidate).length,
        summary: `Found ${messagesWithCandidates.length} messages across ${Object.keys(groupedByCandidate).length} candidates`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting messages with candidates:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get messages with candidates',
      details: error.message
    });
  }
});

// Save structured reference response
router.post('/whatsapp/references/structured', async (req, res) => {
  try {
    const referenceData = req.body;
    
    console.log('Saving structured reference response:', JSON.stringify(referenceData, null, 2));
    
    // Import WhatsApp service
    const WhatsAppService = require('./services/WhatsAppService');
    const whatsapp = new WhatsAppService();
    
    const savedReference = await whatsapp.saveReferenceResponseStructured(referenceData);
    
    if (savedReference) {
      res.json({
        success: true,
        data: savedReference,
        message: 'Structured reference response saved successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save structured reference response'
      });
    }

  } catch (error) {
    console.error('❌ Error saving structured reference response:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save structured reference response',
      details: error.message
    });
  }
});

// Get structured reference responses
router.get('/whatsapp/references/structured', async (req, res) => {
  try {
    console.log('Getting structured reference responses');
    
    // Import WhatsApp service
    const WhatsAppService = require('./services/WhatsAppService');
    const whatsapp = new WhatsAppService();
    
    const structuredReferences = await whatsapp.getReferenceResponsesStructured();
    
    res.json({
      success: true,
      data: {
        references: structuredReferences,
        count: structuredReferences.length,
        summary: `Found ${structuredReferences.length} structured reference responses`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting structured reference responses:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get structured reference responses',
      details: error.message
    });
  }
});

// Get reference responses by candidate
router.get('/whatsapp/references/candidate/:candidateIdentifier', async (req, res) => {
  try {
    const { candidateIdentifier } = req.params;
    const { token, userId } = req.query;
    
    console.log(`Getting reference responses for candidate: ${candidateIdentifier}`);
    
    // Import services
    const WhatsAppService = require('./services/WhatsAppService');
    const DatabaseService = require('./services/DatabaseService');
    const whatsapp = new WhatsAppService();
    const databaseService = new DatabaseService();
    
    const references = await whatsapp.getReferenceResponsesByCandidate(candidateIdentifier, databaseService, token, userId);
    
    res.json({
      success: true,
      data: {
        candidate: candidateIdentifier,
        references: references,
        count: references.length,
        summary: references.length > 0 ? `Found ${references.length} reference responses for ${candidateIdentifier}` : `No reference responses found for ${candidateIdentifier}`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting reference responses by candidate:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get reference responses by candidate',
      details: error.message
    });
  }
});

// Get candidate rating summary
router.get('/whatsapp/references/rating-summary/:candidateIdentifier', async (req, res) => {
  try {
    const { candidateIdentifier } = req.params;
    const { token, userId } = req.query;
    
    console.log(`Getting rating summary for candidate: ${candidateIdentifier}`);
    
    // Import services
    const WhatsAppService = require('./services/WhatsAppService');
    const DatabaseService = require('./services/DatabaseService');
    const whatsapp = new WhatsAppService();
    const databaseService = new DatabaseService();
    
    const ratingSummary = await whatsapp.getCandidateRatingSummary(candidateIdentifier, databaseService, token, userId);
    
    res.json({
      success: true,
      data: ratingSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting candidate rating summary:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get candidate rating summary',
      details: error.message
    });
  }
});

// Get all candidates with rating summaries
router.get('/whatsapp/references/rating-summaries', async (req, res) => {
  try {
    const { token, userId } = req.query;
    
    console.log('Getting rating summaries for all candidates');
    
    // Import services
    const WhatsAppService = require('./services/WhatsAppService');
    const DatabaseService = require('./services/DatabaseService');
    const whatsapp = new WhatsAppService();
    const databaseService = new DatabaseService();
    
    // Get all candidates
    const candidates = await databaseService.fetchCandidates(token, userId);
    
    // Get rating summaries for each candidate
    const ratingSummaries = [];
    for (const candidate of candidates) {
      const summary = await whatsapp.getCandidateRatingSummary(candidate.name, databaseService, token, userId);
      if (summary.total_references > 0) {
        ratingSummaries.push({
          ...summary,
          candidate_info: {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            position: candidate.position
          }
        });
      }
    }
    
    // Sort by overall average rating (highest first)
    ratingSummaries.sort((a, b) => {
      const ratingA = parseFloat(a.average_ratings?.overall_average || 0);
      const ratingB = parseFloat(b.average_ratings?.overall_average || 0);
      return ratingB - ratingA;
    });
    
    res.json({
      success: true,
      data: {
        summaries: ratingSummaries,
        total_candidates_with_references: ratingSummaries.length,
        summary: `Found rating summaries for ${ratingSummaries.length} candidates with references`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting rating summaries:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get rating summaries',
      details: error.message
    });
  }
});

// Test template response processing
router.post('/test-template-response', async (req, res) => {
  try {
    const { messageText, templateName } = req.body;
    
    if (!messageText) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message text is required' 
      });
    }

    console.log('Testing template response processing:', { messageText, templateName });
    
    // Create a mock message object
    const mockMessage = {
      id: `test_${Date.now()}`,
      from: '+1234567890',
      text: messageText,
      timestamp: Math.floor(Date.now() / 1000),
      contact_name: 'Test User',
      type: 'text'
    };
    
    // Process with AI Agent
    const context = {
      conversationId: `test_template_${Date.now()}`,
      userId: 'test_user',
      token: null
    };
    
    let prompt = '';
    if (templateName === 'referencia_laboral') {
      prompt = `Process this reference survey response: ${messageText}. Extract key insights about the candidate's performance, relationship with the reference, and overall recommendation.`;
    } else {
      prompt = `Process this message: ${messageText}. Provide relevant insights.`;
    }
    
    const aiResult = await aiAgent.processPrompt(prompt, context);
    
    res.json({
      success: true,
      data: {
        originalMessage: mockMessage,
        templateName,
        aiResult
      }
    });

  } catch (error) {
    console.error('Error testing template response:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test template response' 
    });
  }
});

module.exports = router; 