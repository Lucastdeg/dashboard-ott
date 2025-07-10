const https = require('https');
const fs = require('fs');
const path = require('path');

class WhatsAppService {
  constructor() {
    // Use the new token provided by the user
    this.accessToken = 'EAAF3vDWyEsIBOyznJzqatqm94G8xjsScOkbUSW60xTwoBpc1onqhGMj6ZCHB9ZCjiGQVazFNi3JVofjdr6Tu2M5tOPmO7XUVtXZBKrplNDB6snwjpHdFF9rHJz8QmiPyGVF3ZAtSxD6TsA3MuLezfzZAqhyq7gUjg6edEKA9Lv7wfrOZC6bIKFUAZB3l7ZAtEQZDZD';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    // Force API version to v21.0 since v18.0 is deprecated
    this.apiVersion = 'v21.0';
    this.messagesFile = path.join(__dirname, '..', 'data', 'whatsapp-messages.json');
    
    // Ensure data directory exists
    const dataDir = path.dirname(this.messagesFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  // Send a text message via WhatsApp Business API
  async sendTextMessage(to, message) {
    try {
      console.log(`[WhatsAppService] Starting to send message...`);
      console.log(`[WhatsAppService] To: ${to}`);
      console.log(`[WhatsAppService] Message: ${message}`);
      console.log(`[WhatsAppService] Access Token: ${this.accessToken ? 'Set' : 'NOT SET'}`);
      if (this.accessToken) {
        console.log(`[WhatsAppService] Access Token (first 20 chars): ${this.accessToken.substring(0, 20)}...`);
      }
      console.log(`[WhatsAppService] Phone Number ID: ${this.phoneNumberId}`);
      console.log(`[WhatsAppService] API Version: ${this.apiVersion}`);
      
      if (!this.accessToken) {
        throw new Error('WhatsApp access token is not configured. Please check your .env file.');
      }
      
      if (!this.phoneNumberId) {
        throw new Error('WhatsApp phone number ID is not configured. Please check your .env file.');
      }
      
      const messageData = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      };

      console.log(`[WhatsAppService] Message data:`, JSON.stringify(messageData, null, 2));

      const result = await this.makeRequest('/messages', messageData);
      
      console.log(`[WhatsAppService] WhatsApp API response:`, JSON.stringify(result, null, 2));
      
      // Save outgoing message
      await this.saveMessage({
        id: result.messages?.[0]?.id || `out_${Date.now()}`,
        from: this.phoneNumberId,
        to: to,
        message: message,
        type: 'outgoing',
        timestamp: new Date().toISOString(),
        status: 'sent'
      });
      
      console.log('[WhatsAppService] WhatsApp message sent successfully!');
      return result;
    } catch (error) {
      console.error('[WhatsAppService] Error sending WhatsApp message:', error.message);
      console.error('[WhatsAppService] Full error:', error);
      throw error;
    }
  }

  // Send a template message (for business-initiated conversations)
  async sendTemplateMessage(to, templateName, languageCode = 'es_MX', components = []) {
    try {
      const messageData = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: components
        }
      };

      return await this.makeRequest('/messages', messageData);
    } catch (error) {
      console.error('Error sending template message:', error.message);
      throw error;
    }
  }

  // Make HTTP request to WhatsApp Business API
  makeRequest(endpoint, data) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);
      
      const options = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: `/${this.apiVersion}/${this.phoneNumberId}${endpoint}`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      console.log(`[WhatsAppService] Making HTTP request:`);
      console.log(`   Hostname: ${options.hostname}`);
      console.log(`   Port: ${options.port}`);
      console.log(`   Path: ${options.path}`);
      console.log(`   Method: ${options.method}`);
      console.log(`   Authorization: Bearer ${this.accessToken.substring(0, 20)}...`);
      console.log(`   Content-Length: ${options.headers['Content-Length']}`);

      const req = https.request(options, (res) => {
              console.log(`[WhatsAppService] HTTP Response Status: ${res.statusCode}`);
      console.log(`[WhatsAppService] HTTP Response Headers:`, res.headers);
        
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          console.log(`[WhatsAppService] HTTP Response Body: ${responseData}`);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedResponse = JSON.parse(responseData);
              console.log(`[WhatsAppService] Successfully parsed response`);
              resolve(parsedResponse);
            } catch (error) {
              console.log(`[WhatsAppService] Successfully sent (non-JSON response)`);
              resolve(responseData);
            }
          } else {
            console.error(`[WhatsAppService] HTTP Error: ${res.statusCode}`);
            console.error(`[WhatsAppService] Error Response: ${responseData}`);
            reject(new Error(`WhatsApp API error: ${res.statusCode} - ${responseData}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error(`[WhatsAppService] Request error:`, error.message);
        console.error(`[WhatsAppService] Full error:`, error);
        reject(error);
      });

      console.log(`[WhatsAppService] Writing request data...`);
      req.write(postData);
      req.end();
      console.log(`[WhatsAppService] Request sent`);
    });
  }

  // Save message to JSON file
  async saveMessage(messageData) {
    try {
      console.log('Attempting to save message to:', this.messagesFile);
      
              // Ensure data directory exists
        const dataDir = path.dirname(this.messagesFile);
        if (!fs.existsSync(dataDir)) {
          console.log('Creating data directory:', dataDir);
          fs.mkdirSync(dataDir, { recursive: true });
        }
      
      let messages = [];
      
      // Load existing messages if file exists
      if (fs.existsSync(this.messagesFile)) {
        try {
          const existingData = fs.readFileSync(this.messagesFile, 'utf8');
          messages = JSON.parse(existingData);
          console.log(`Loaded ${messages.length} existing messages`);
        } catch (e) {
          console.error('Error reading existing messages file:', e);
          messages = [];
        }
      } else {
        console.log('Creating new messages file');
      }
      
      // Add new message
      const messageToSave = {
        ...messageData,
        saved_at: new Date().toISOString()
      };
      
      messages.push(messageToSave);
      
      // Save back to file
      fs.writeFileSync(this.messagesFile, JSON.stringify(messages, null, 2));
      
      console.log(`💾 Message saved successfully to ${this.messagesFile}`);
      return true;
    } catch (error) {
      console.error('❌ Error saving message:', error.message);
      console.error('❌ Error stack:', error.stack);
      return false;
    }
  }

  // Get all messages
  async getMessages() {
    try {
      if (fs.existsSync(this.messagesFile)) {
        const data = fs.readFileSync(this.messagesFile, 'utf8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('❌ Error reading messages:', error.message);
      return [];
    }
  }

  // Get messages by phone number
  async getMessagesByNumber(phoneNumber) {
    try {
      console.log(`[WhatsAppService] getMessagesByNumber called with: ${phoneNumber}`);
      
      // Normalize phone number for comparison
      const normalize = (num) => (num || '').replace(/\D/g, '');
      const normalizedQuery = normalize(phoneNumber);
      console.log(`[WhatsAppService] Normalized query: ${normalizedQuery}`);
      
      // First try the main messages file
      let messages = await this.getMessages();
      console.log(`[WhatsAppService] Main messages count: ${messages.length}`);
      
      // Also check whatsapp-messages.json (for legacy or direct access)
      const whatsappMessagesPath = path.join(__dirname, '..', 'data', 'whatsapp-messages.json');
      if (fs.existsSync(whatsappMessagesPath)) {
        try {
          const whatsappMessages = JSON.parse(fs.readFileSync(whatsappMessagesPath, 'utf8'));
          // Add whatsappMessages to the main messages array
          messages = messages.concat(whatsappMessages);
          console.log(`[WhatsAppService] Found ${whatsappMessages.length} messages in whatsapp-messages.json`);
        } catch (e) {
          console.error('Error reading whatsapp-messages.json:', e);
        }
      }
      
      console.log(`[WhatsAppService] Total messages to search: ${messages.length}`);
      
      // Debug: Show first few messages with their normalized numbers
      const firstFewMessages = messages.slice(0, 5);
      firstFewMessages.forEach((msg, index) => {
        const normFrom = normalize(msg.from);
        const normTo = normalize(msg.to);
        console.log(`[WhatsAppService] Message ${index}: from=${msg.from} (norm: ${normFrom}), to=${msg.to} (norm: ${normTo})`);
      });
      
      // Filter messages by normalized phone number and add candidate identification
      const filteredMessages = messages.filter(msg => {
        const normFrom = normalize(msg.from);
        const normTo = normalize(msg.to);
        const matches = normFrom === normalizedQuery || normTo === normalizedQuery;
        if (matches) {
          console.log(`[WhatsAppService] Match found: from=${msg.from} (${normFrom}), to=${msg.to} (${normTo})`);
        }
        return matches;
      }).map(msg => ({
        ...msg,
        candidate_phone: phoneNumber,
        is_from_candidate: normalize(msg.from) === normalizedQuery,
        is_to_candidate: normalize(msg.to) === normalizedQuery
      }));
      
      console.log(`[WhatsAppService] Found ${filteredMessages.length} messages for ${phoneNumber}`);
      return filteredMessages;
    } catch (error) {
      console.error('❌ Error getting messages by number:', error.message);
      return [];
    }
  }

  // Process incoming webhook message
  async processIncomingMessage(webhookData) {
    try {
      console.log('Processing incoming WhatsApp message...');
      console.log('Webhook data:', JSON.stringify(webhookData, null, 2));
      
      // Extract message data from webhook
      const message = this.extractMessageFromWebhook(webhookData);
      
      if (!message) {
        console.log('No valid message found in webhook data');
        return null;
      }
      
      console.log('Extracted message:', JSON.stringify(message, null, 2));
      
      // Check if this is a reference response to referencia_laboral template
      const isReferenceResponse = this.isReferenceResponseToTemplate(message);
      
      // Detect template type
      let templateName = null;
      if (isReferenceResponse) {
        templateName = 'referencia_laboral';
        console.log('Detected reference response to referencia_laboral template');
        const structuredReference = await this.processReferenceResponse(message);
        if (structuredReference) {
          console.log('Processed and saved structured reference response');
        }
      } else {
        // Only referencia_laboral template exists - no other templates
        templateName = null;
      }
      
      // Save incoming message to main messages file
      const saveResult = await this.saveMessage({
        id: message.id,
        from: message.from,
        to: this.phoneNumberId,
        message: message.text,
        type: 'incoming',
        timestamp: new Date(message.timestamp * 1000).toISOString(),
        contact_name: message.contact_name,
        status: 'received',
        is_reference_response: isReferenceResponse
      });
      
      if (!saveResult) {
        console.log('Failed to save message to main file, but continuing...');
      }
      
      // ALSO save to whatsapp-messages.json (for direct access)
      try {
        const whatsappMessagesPath = path.join(__dirname, '..', 'data', 'whatsapp-messages.json');
        let whatsappMessages = [];
        if (fs.existsSync(whatsappMessagesPath)) {
          try {
            whatsappMessages = JSON.parse(fs.readFileSync(whatsappMessagesPath, 'utf8'));
          } catch (e) {
            console.error('Error reading whatsapp-messages.json:', e);
            whatsappMessages = [];
          }
        }
        whatsappMessages.push({
          ...message,
          saved_at: new Date().toISOString(),
          is_reference_response: isReferenceResponse
        });
        fs.writeFileSync(whatsappMessagesPath, JSON.stringify(whatsappMessages, null, 2), 'utf8');
        console.log('Saved incoming WhatsApp message to whatsapp-messages.json');
      } catch (err) {
        console.error('Failed to save message to whatsapp-messages.json:', err);
      }
      
      console.log(`Incoming message processed successfully: ${message.text}`);
      return {
        ...message,
        isReferenceResponse,
        templateName
      };
    } catch (error) {
      console.error('Error processing incoming message:', error.message);
      console.error('Error stack:', error.stack);
      return null;
    }
  }

  // Extract message data from webhook payload
  extractMessageFromWebhook(webhookData) {
    try {
      // Handle WhatsApp Business API format
      if (webhookData.object === 'whatsapp_business_account' && webhookData.entry) {
        const entry = webhookData.entry[0];
        const change = entry.changes[0];
        const value = change.value;
        
        if (value.messages && value.messages.length > 0) {
          const msg = value.messages[0];
          let contactName = 'Unknown';
          if (value.contacts && value.contacts.length > 0) {
            const contact = value.contacts[0];
            if (contact.profile && contact.profile.name) {
              contactName = contact.profile.name;
            }
          }
          return {
            id: msg.id,
            from: msg.from,
            text: msg.text.body,
            timestamp: msg.timestamp,
            contact_name: contactName,
            type: msg.type
          };
        }
      }
      
      // Handle simple format
      if (webhookData.message && webhookData.from) {
        return {
          id: `simple_${Date.now()}`,
          from: webhookData.from,
          text: webhookData.message,
          timestamp: Math.floor(Date.now() / 1000),
          contact_name: 'Unknown',
          type: 'text'
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error extracting message from webhook:', error.message);
      return null;
    }
  }

  // Test the WhatsApp connection
  async testConnection() {
    try {
      console.log('🔍 Testing WhatsApp Business API connection...');
      console.log(`📱 Phone Number ID: ${this.phoneNumberId}`);
      console.log(`🔑 Access Token: ${this.accessToken ? 'Set' : 'Not set'}`);
      
      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error('Missing WhatsApp configuration');
      }
      
      // Try to send a test message (this will fail but test the connection)
      await this.makeRequest('', {});
      return true;
    } catch (error) {
      console.error('❌ WhatsApp API connection failed:', error.message);
      return false;
    }
  }

  // Get messages by candidate (using database service)
  async getMessagesByCandidate(candidateNameOrId, databaseService, token = null, userId = null) {
    try {
      console.log(`👤 Getting messages for candidate: ${candidateNameOrId}`);
      
      // Get all candidates from database service
      const candidates = await databaseService.fetchCandidates(token, userId);
      
      // Find the candidate by name or ID
      const candidate = candidates.find(c => 
        c.id === candidateNameOrId || 
        c.name.toLowerCase().includes(candidateNameOrId.toLowerCase()) ||
        c.email.toLowerCase().includes(candidateNameOrId.toLowerCase())
      );
      
      if (!candidate) {
        console.log(`❌ Candidate not found: ${candidateNameOrId}`);
        return [];
      }
      
      console.log(`✅ Found candidate: ${candidate.name} (${candidate.phone})`);
      
      // Get messages for this candidate's phone number
      const messages = await this.getMessagesByNumber(candidate.phone);
      
      // Add candidate info to each message
      const messagesWithCandidate = messages.map(msg => ({
        ...msg,
        candidate_id: candidate.id,
        candidate_name: candidate.name,
        candidate_email: candidate.email,
        candidate_position: candidate.position
      }));
      
      console.log(`📱 Found ${messagesWithCandidate.length} messages for candidate ${candidate.name}`);
      return messagesWithCandidate;
    } catch (error) {
      console.error('❌ Error getting messages by candidate:', error.message);
      return [];
    }
  }

  // Get messages for multiple candidates
  async getMessagesForCandidates(candidateList, databaseService, token = null, userId = null) {
    try {
      console.log(`👥 Getting messages for ${candidateList.length} candidates`);
      
      const results = {};
      
      for (const candidateIdentifier of candidateList) {
        const messages = await this.getMessagesByCandidate(candidateIdentifier, databaseService, token, userId);
        results[candidateIdentifier] = messages;
      }
      
      console.log(`✅ Retrieved messages for ${Object.keys(results).length} candidates`);
      return results;
    } catch (error) {
      console.error('❌ Error getting messages for multiple candidates:', error.message);
      return {};
    }
  }

  // Get all reference template responses
  async getReferenceTemplateResponses() {
    try {
      console.log('📞 Getting all reference template responses');
      
      // Get all messages
      const allMessages = await this.getMessages();
      
      // Filter for reference responses
      const referenceResponses = allMessages.filter(msg => {
        const messageText = (msg.message || msg.text || '').toLowerCase();
        
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
      });
      
      console.log(`📞 Found ${referenceResponses.length} reference template responses`);
      return referenceResponses;
    } catch (error) {
      console.error('❌ Error getting reference template responses:', error.message);
      return [];
    }
  }

  // Get all messages with candidate information
  async getAllMessagesWithCandidates(databaseService, token = null, userId = null) {
    try {
      console.log('📱 Getting all messages with candidate information');
      
      // Get all messages
      const allMessages = await this.getMessages();
      
      // Get all candidates
      const candidates = await databaseService.fetchCandidates(token, userId);
      
      // Create a map of phone numbers to candidates
      const phoneToCandidate = new Map();
      candidates.forEach(candidate => {
        if (candidate.phone) {
          const normalizedPhone = candidate.phone.replace(/\D/g, '');
          phoneToCandidate.set(normalizedPhone, candidate);
        }
      });
      
      // Add candidate information to messages
      const messagesWithCandidates = allMessages.map(msg => {
        const fromNormalized = (msg.from || '').replace(/\D/g, '');
        const toNormalized = (msg.to || '').replace(/\D/g, '');
        
        const fromCandidate = phoneToCandidate.get(fromNormalized);
        const toCandidate = phoneToCandidate.get(toNormalized);
        
        return {
          ...msg,
          from_candidate: fromCandidate ? {
            id: fromCandidate.id,
            name: fromCandidate.name,
            email: fromCandidate.email,
            position: fromCandidate.position
          } : null,
          to_candidate: toCandidate ? {
            id: toCandidate.id,
            name: toCandidate.name,
            email: toCandidate.email,
            position: toCandidate.position
          } : null
        };
      });
      
      console.log(`📱 Added candidate information to ${messagesWithCandidates.length} messages`);
      return messagesWithCandidates;
    } catch (error) {
      console.error('❌ Error getting messages with candidates:', error.message);
      return [];
    }
  }

  // Save reference response with structured data
  async saveReferenceResponseStructured(referenceData) {
    try {
      console.log('📞 Saving structured reference response...');
      
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
      
      // Create structured reference response
      const structuredReference = {
        id: referenceData.id || `ref_${Date.now()}`,
        timestamp: new Date().toISOString(),
        saved_at: new Date().toISOString(),
        type: 'reference_response_structured',
        source: 'whatsapp_webhook',
        
        // Reference information
        reference_name: referenceData.reference_name || 'Unknown',
        reference_phone: referenceData.reference_phone || referenceData.from,
        reference_position: referenceData.reference_position || 'Unknown',
        reference_company: referenceData.reference_company || 'Unknown',
        
        // Candidate information
        candidate_name: referenceData.candidate_name || 'Unknown',
        candidate_phone: referenceData.candidate_phone || 'Unknown',
        candidate_position: referenceData.candidate_position || 'Unknown',
        
        // Rating and evaluation
        rating: {
          overall: referenceData.rating?.overall || 0,
          reliability: referenceData.rating?.reliability || 0,
          teamwork: referenceData.rating?.teamwork || 0,
          communication: referenceData.rating?.communication || 0,
          technical_skills: referenceData.rating?.technical_skills || 0,
          leadership: referenceData.rating?.leadership || 0,
          problem_solving: referenceData.rating?.problem_solving || 0,
          work_ethic: referenceData.rating?.work_ethic || 0
        },
        
        // Reference details
        relationship: referenceData.relationship || 'Unknown', // supervisor, colleague, client, etc.
        duration: referenceData.duration || 'Unknown', // how long they worked together
        project_context: referenceData.project_context || 'Unknown',
        
        // Response content
        original_message: referenceData.original_message || referenceData.message || '',
        response_text: referenceData.response_text || referenceData.message || '',
        
        // Additional metadata
        response_quality: referenceData.response_quality || 'unknown', // detailed, brief, incomplete
        willingness_to_recommend: referenceData.willingness_to_recommend || 'unknown', // yes, no, maybe
        additional_comments: referenceData.additional_comments || '',
        
        // Status
        status: referenceData.status || 'pending_review', // pending_review, approved, rejected
        reviewed_by: referenceData.reviewed_by || null,
        reviewed_at: referenceData.reviewed_at || null
      };
      
      referenceResponses.push(structuredReference);
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
      
      referenceHistory.push(structuredReference);
      fs.writeFileSync(referenceHistoryPath, JSON.stringify(referenceHistory, null, 2), 'utf8');
      
      console.log('💾 Saved structured reference response to both files');
      return structuredReference;
    } catch (error) {
      console.error('❌ Error saving structured reference response:', error);
      return null;
    }
  }

  // Get reference responses with ratings and structure
  async getReferenceResponsesStructured() {
    try {
      console.log('📞 Getting structured reference responses...');
      
      const fs = require('fs');
      const path = require('path');
      
      // Read from both reference-responses.json and referenceHistory.json
      const referenceResponsesPath = path.join(__dirname, '..', 'data', 'reference-responses.json');
      const referenceHistoryPath = path.join(__dirname, '..', 'data', 'referenceHistory.json');
      let allResponses = [];
      
      // Load from reference-responses.json
      if (fs.existsSync(referenceResponsesPath)) {
        try {
          const referenceResponses = JSON.parse(fs.readFileSync(referenceResponsesPath, 'utf8'));
          allResponses = allResponses.concat(referenceResponses);
          console.log(`📞 Loaded ${referenceResponses.length} responses from reference-responses.json`);
        } catch (e) {
          console.error('Error reading reference-responses.json:', e);
        }
      }
      
      // Load from referenceHistory.json
      if (fs.existsSync(referenceHistoryPath)) {
        try {
          const referenceHistory = JSON.parse(fs.readFileSync(referenceHistoryPath, 'utf8'));
          allResponses = allResponses.concat(referenceHistory);
          console.log(`📞 Loaded ${referenceHistory.length} responses from referenceHistory.json`);
        } catch (e) {
          console.error('Error reading referenceHistory.json:', e);
        }
      }
      
      // Remove duplicates based on id and timestamp
      const uniqueResponses = allResponses.filter((response, index, self) => 
        index === self.findIndex(r => 
          r.id === response.id && 
          r.timestamp === response.timestamp
        )
      );
      
      // Filter for structured responses
      const structuredResponses = uniqueResponses.filter(response => 
        response.type === 'reference_response_structured' || 
        response.rating || 
        response.reference_name
      );
      
      // Sort by timestamp (newest first)
      const sortedResponses = structuredResponses.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.saved_at || 0);
        const timeB = new Date(b.timestamp || b.saved_at || 0);
        return timeB - timeA;
      });
      
      console.log(`📞 Found ${sortedResponses.length} structured reference responses`);
      return sortedResponses;
    } catch (error) {
      console.error('❌ Error getting structured reference responses:', error);
      return [];
    }
  }

  // Get reference responses by candidate
  async getReferenceResponsesByCandidate(candidateNameOrId, databaseService, token = null, userId = null) {
    try {
      console.log(`📞 Getting reference responses for candidate: ${candidateNameOrId}`);
      
      // Get all candidates from database service
      const candidates = await databaseService.fetchCandidates(token, userId);
      
      // Find the candidate by name or ID
      const candidate = candidates.find(c => 
        c.id === candidateNameOrId || 
        c.name.toLowerCase().includes(candidateNameOrId.toLowerCase()) ||
        c.email.toLowerCase().includes(candidateNameOrId.toLowerCase())
      );
      
      if (!candidate) {
        console.log(`❌ Candidate not found: ${candidateNameOrId}`);
        return [];
      }
      
      console.log(`✅ Found candidate: ${candidate.name} (${candidate.phone})`);
      
      // Get all structured reference responses
      const allReferences = await this.getReferenceResponsesStructured();
      
      // Filter references for this candidate
      const candidateReferences = allReferences.filter(ref => {
        const candidatePhone = candidate.phone.replace(/\D/g, '');
        const refCandidatePhone = (ref.candidate_phone || '').replace(/\D/g, '');
        const refCandidateName = (ref.candidate_name || '').toLowerCase();
        const candidateName = candidate.name.toLowerCase();
        
        return refCandidatePhone === candidatePhone || 
               refCandidateName.includes(candidateName) ||
               candidateName.includes(refCandidateName);
      });
      
      // Add candidate info to each reference
      const referencesWithCandidate = candidateReferences.map(ref => ({
        ...ref,
        candidate_id: candidate.id,
        candidate_name: candidate.name,
        candidate_email: candidate.email,
        candidate_position: candidate.position
      }));
      
      console.log(`📞 Found ${referencesWithCandidate.length} reference responses for candidate ${candidate.name}`);
      return referencesWithCandidate;
    } catch (error) {
      console.error('❌ Error getting reference responses by candidate:', error.message);
      return [];
    }
  }

  // Calculate average ratings for a candidate
  async getCandidateRatingSummary(candidateNameOrId, databaseService, token = null, userId = null) {
    try {
      console.log(`📊 Getting rating summary for candidate: ${candidateNameOrId}`);
      
      const references = await this.getReferenceResponsesByCandidate(candidateNameOrId, databaseService, token, userId);
      
      if (references.length === 0) {
        return {
          candidate: candidateNameOrId,
          total_references: 0,
          average_ratings: null,
          summary: 'No reference responses found'
        };
      }
      
      // Calculate average ratings
      const ratingFields = ['overall', 'reliability', 'teamwork', 'communication', 'technical_skills', 'leadership', 'problem_solving', 'work_ethic'];
      const averageRatings = {};
      
      ratingFields.forEach(field => {
        const validRatings = references
          .map(ref => ref.rating?.[field])
          .filter(rating => rating !== null && rating !== undefined && rating > 0);
        
        if (validRatings.length > 0) {
          averageRatings[field] = (validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length).toFixed(2);
        } else {
          averageRatings[field] = 0;
        }
      });
      
      // Calculate overall average
      const overallAverage = Object.values(averageRatings)
        .filter(rating => rating > 0)
        .reduce((sum, rating) => sum + parseFloat(rating), 0) / Object.values(averageRatings).filter(rating => rating > 0).length;
      
      const summary = {
        candidate: candidateNameOrId,
        total_references: references.length,
        average_ratings: {
          ...averageRatings,
          overall_average: overallAverage.toFixed(2)
        },
        rating_breakdown: {
          excellent: references.filter(ref => ref.rating?.overall >= 4.5).length,
          good: references.filter(ref => ref.rating?.overall >= 3.5 && ref.rating?.overall < 4.5).length,
          average: references.filter(ref => ref.rating?.overall >= 2.5 && ref.rating?.overall < 3.5).length,
          below_average: references.filter(ref => ref.rating?.overall < 2.5).length
        },
        summary: `Based on ${references.length} reference responses`
      };
      
      console.log(`📊 Rating summary calculated for ${candidateNameOrId}`);
      return summary;
    } catch (error) {
      console.error('❌ Error getting candidate rating summary:', error.message);
      return {
        candidate: candidateNameOrId,
        total_references: 0,
        average_ratings: null,
        summary: 'Error calculating ratings'
      };
    }
  }

  // Check if message is a reference response to referencia_laboral template
  isReferenceResponseToTemplate(message) {
    try {
      const messageText = (message.text || message.message || '').toLowerCase();
      
      // Keywords that indicate this is a reference response
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
        'performance',
        'supervisor',
        'colaborador',
        'colleague',
        'cliente',
        'client',
        'proyecto',
        'project',
        'empresa',
        'company',
        'puesto',
        'position',
        'responsabilidades',
        'responsibilities',
        'habilidades',
        'skills',
        'fortalezas',
        'strengths',
        'áreas de mejora',
        'areas for improvement',
        'recomendaría',
        'would recommend',
        'calificación',
        'rating',
        'puntuación',
        'score'
      ];
      
      // Check if message contains reference-related keywords
      const hasReferenceKeywords = referenceKeywords.some(keyword => 
        messageText.includes(keyword)
      );
      
      // Check if message is responding to a reference template
      const isResponseToReference = messageText.includes('referencia_laboral') || 
                                   messageText.includes('reference_laboral') ||
                                   messageText.includes('trabajo') ||
                                   messageText.includes('work') ||
                                   messageText.includes('empleo') ||
                                   messageText.includes('job');
      
      // Check for rating patterns (1-10, 1-5, etc.)
      const hasRatingPattern = /\b([1-9]|10)\s*\/\s*10\b|\b([1-5])\s*\/\s*5\b|\b([1-9]|10)\s*de\s*10\b|\b([1-5])\s*de\s*5\b/i.test(messageText);
      
      // Check for yes/no patterns
      const hasYesNoPattern = /\b(sí|si|yes|no|no)\b/i.test(messageText);
      
      return hasReferenceKeywords || isResponseToReference || hasRatingPattern || hasYesNoPattern;
    } catch (error) {
      console.error('Error checking if message is reference response:', error);
      return false;
    }
  }

  // Process and structure reference response
  async processReferenceResponse(message) {
    try {
      console.log('📞 Processing reference response for structuring...');
      
      const messageText = message.text || message.message || '';
      const structuredData = this.parseReferenceResponse(messageText);
      
      // Create structured reference response
      const referenceData = {
        id: message.id || `ref_${Date.now()}`,
        from: message.from,
        reference_phone: message.from,
        reference_name: message.contact_name || 'Unknown',
        original_message: messageText,
        timestamp: new Date(message.timestamp * 1000).toISOString(),
        ...structuredData
      };
      
      // Save structured reference response
      const savedReference = await this.saveReferenceResponseStructured(referenceData);
      
      if (savedReference) {
        console.log('✅ Successfully saved structured reference response');
        return savedReference;
      } else {
        console.log('❌ Failed to save structured reference response');
        return null;
      }
    } catch (error) {
      console.error('❌ Error processing reference response:', error);
      return null;
    }
  }

  // Parse reference response text to extract structured data
  parseReferenceResponse(messageText) {
    try {
      const text = messageText.toLowerCase();
      const structuredData = {
        candidate_name: 'Unknown',
        candidate_position: 'Unknown',
        reference_position: 'Unknown',
        reference_company: 'Unknown',
        relationship: 'Unknown',
        duration: 'Unknown',
        project_context: 'Unknown',
        rating: {
          overall: 0,
          reliability: 0,
          teamwork: 0,
          communication: 0,
          technical_skills: 0,
          leadership: 0,
          problem_solving: 0,
          work_ethic: 0
        },
        response_quality: 'unknown',
        willingness_to_recommend: 'unknown',
        additional_comments: '',
        status: 'pending_review'
      };

      // Extract ratings (look for patterns like "8/10", "4/5", "7 de 10")
      const ratingPatterns = [
        /\b(\d+)\s*\/\s*10\b/g,
        /\b(\d+)\s*\/\s*5\b/g,
        /\b(\d+)\s*de\s*10\b/g,
        /\b(\d+)\s*de\s*5\b/g
      ];
      
      let overallRating = 0;
      ratingPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          const rating = parseInt(matches[0].match(/\d+/)[0]);
          if (rating > 0 && rating <= 10) {
            overallRating = rating;
          }
        }
      });
      
      if (overallRating > 0) {
        structuredData.rating.overall = overallRating;
      }

      // Extract willingness to recommend
      if (text.includes('sí') || text.includes('si') || text.includes('yes')) {
        structuredData.willingness_to_recommend = 'yes';
      } else if (text.includes('no')) {
        structuredData.willingness_to_recommend = 'no';
      } else if (text.includes('tal vez') || text.includes('maybe') || text.includes('quizás')) {
        structuredData.willingness_to_recommend = 'maybe';
      }

      // Extract relationship type
      if (text.includes('supervisor') || text.includes('jefe') || text.includes('manager')) {
        structuredData.relationship = 'supervisor';
      } else if (text.includes('colaborador') || text.includes('colleague') || text.includes('compañero')) {
        structuredData.relationship = 'colleague';
      } else if (text.includes('cliente') || text.includes('client')) {
        structuredData.relationship = 'client';
      }

      // Extract duration patterns
      const durationPatterns = [
        /(\d+)\s*(año|años|year|years)/i,
        /(\d+)\s*(mes|meses|month|months)/i,
        /(\d+)\s*(semana|semanas|week|weeks)/i
      ];
      
      durationPatterns.forEach(pattern => {
        const match = text.match(pattern);
        if (match) {
          structuredData.duration = `${match[1]} ${match[2]}`;
        }
      });

      // Determine response quality based on length and content
      if (messageText.length > 200) {
        structuredData.response_quality = 'detailed';
      } else if (messageText.length > 50) {
        structuredData.response_quality = 'brief';
      } else {
        structuredData.response_quality = 'incomplete';
      }

      // Extract additional comments (anything that doesn't fit other patterns)
      structuredData.additional_comments = messageText;

      return structuredData;
    } catch (error) {
      console.error('❌ Error parsing reference response:', error);
      return {
        candidate_name: 'Unknown',
        candidate_position: 'Unknown',
        reference_position: 'Unknown',
        reference_company: 'Unknown',
        relationship: 'Unknown',
        duration: 'Unknown',
        project_context: 'Unknown',
        rating: {
          overall: 0,
          reliability: 0,
          teamwork: 0,
          communication: 0,
          technical_skills: 0,
          leadership: 0,
          problem_solving: 0,
          work_ethic: 0
        },
        response_quality: 'unknown',
        willingness_to_recommend: 'unknown',
        additional_comments: messageText,
        status: 'pending_review'
      };
    }
  }
}

module.exports = WhatsAppService; 