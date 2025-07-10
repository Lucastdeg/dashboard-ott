const WhatsAppService = require('./WhatsAppService');
const DatabaseService = require('./DatabaseService');

class ReferenceMessagingService {
  constructor() {
    this.whatsappService = new WhatsAppService();
    this.databaseService = new DatabaseService();
    this.templateName = 'referencia_laboral';
    this.languageCode = 'es'; // Try with 'es' instead of 'es_ES'
  }

  /**
   * Send reference check message to a specific reference
   * @param {string} referencePhone - Phone number of the reference
   * @param {Object} candidateData - Candidate information
   * @param {Object} referenceData - Reference information
   * @param {Object} options - Additional options for the message
   */
  async sendReferenceMessage(referencePhone, candidateData, referenceData, options = {}) {
    try {
      console.log('📞 [ReferenceMessagingService] Sending reference message...');
      console.log('👤 Candidate:', candidateData.name);
      console.log('📞 Reference:', referenceData.name);
      console.log('📱 Phone:', referencePhone);

      // Format phone number for WhatsApp
      const formattedPhone = this.formatPhoneNumber(referencePhone);
      if (!formattedPhone) {
        throw new Error(`Invalid phone number format: ${referencePhone}`);
      }

      // Prepare template components
      const components = this.prepareTemplateComponents(candidateData, referenceData, options);

      // Send template message using the proper WhatsApp API structure
      const messageData = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: this.templateName,
          language: {
            code: this.languageCode,
            policy: 'deterministic'
          },
          components: components
        }
      };

      const result = await this.whatsappService.makeRequest('/messages', messageData);

      console.log('✅ [ReferenceMessagingService] Reference message sent successfully');
      return {
        success: true,
        data: {
          candidate: candidateData.name,
          reference: referenceData.name,
          phone: formattedPhone,
          template: this.templateName,
          result: result
        }
      };

    } catch (error) {
      console.error('❌ [ReferenceMessagingService] Error sending reference message:', error.message);
      return {
        success: false,
        error: error.message,
        data: {
          candidate: candidateData?.name,
          reference: referenceData?.name,
          phone: referencePhone
        }
      };
    }
  }

  /**
   * Send reference messages to all references of a specific candidate
   * @param {string} candidateName - Name of the candidate
   * @param {Object} options - Additional options for the messages
   */
  async sendReferenceMessagesForCandidate(candidateName, options = {}) {
    try {
      console.log('📞 [ReferenceMessagingService] Sending reference messages for candidate:', candidateName);

      // Get candidate data
      const allCandidates = await this.databaseService.fetchCandidates();
      const candidate = allCandidates.find(c => 
        c.name.toLowerCase().includes(candidateName.toLowerCase()) ||
        candidateName.toLowerCase().includes(c.name.toLowerCase())
      );

      if (!candidate) {
        throw new Error(`Candidate not found: ${candidateName}`);
      }

      if (!candidate.references || candidate.references.length === 0) {
        throw new Error(`No references found for candidate: ${candidateName}`);
      }

      const results = [];
      const successfulMessages = [];
      const failedMessages = [];

      // Send messages to all references
      for (const reference of candidate.references) {
        if (!reference.contact || !reference.contact.phone) {
          console.log(`⚠️ Skipping reference ${reference.name} - no phone number`);
          failedMessages.push({
            reference: reference.name,
            reason: 'No phone number available'
          });
          continue;
        }

        const result = await this.sendReferenceMessage(
          reference.contact.phone,
          candidate,
          reference,
          options
        );

        results.push(result);

        if (result.success) {
          successfulMessages.push(result.data);
        } else {
          failedMessages.push({
            reference: reference.name,
            phone: reference.contact.phone,
            reason: result.error
          });
        }
      }

      return {
        success: true,
        data: {
          candidate: candidate.name,
          totalReferences: candidate.references.length,
          successfulMessages,
          failedMessages,
          results
        }
      };

    } catch (error) {
      console.error('❌ [ReferenceMessagingService] Error sending reference messages:', error.message);
      return {
        success: false,
        error: error.message,
        data: {
          candidate: candidateName
        }
      };
    }
  }

  /**
   * Send reference messages to all references of candidates in a specific job position
   * @param {string} jobPosition - Job position to filter candidates
   * @param {Object} options - Additional options for the messages
   */
  async sendReferenceMessagesForPosition(jobPosition, options = {}) {
    try {
      console.log('📞 [ReferenceMessagingService] Sending reference messages for position:', jobPosition);

      // Get all candidates
      const allCandidates = await this.databaseService.fetchCandidates();
      
      // Filter candidates by position
      const candidatesInPosition = allCandidates.filter(candidate => 
        candidate.position && 
        candidate.position.toLowerCase().includes(jobPosition.toLowerCase())
      );

      if (candidatesInPosition.length === 0) {
        throw new Error(`No candidates found for position: ${jobPosition}`);
      }

      const allResults = [];
      const summary = {
        position: jobPosition,
        totalCandidates: candidatesInPosition.length,
        totalReferences: 0,
        successfulMessages: 0,
        failedMessages: 0,
        candidates: []
      };

      // Process each candidate
      for (const candidate of candidatesInPosition) {
        const candidateResult = await this.sendReferenceMessagesForCandidate(candidate.name, options);
        allResults.push(candidateResult);

        if (candidateResult.success) {
          summary.totalReferences += candidateResult.data.totalReferences;
          summary.successfulMessages += candidateResult.data.successfulMessages.length;
          summary.failedMessages += candidateResult.data.failedMessages.length;
          summary.candidates.push({
            name: candidate.name,
            references: candidateResult.data.totalReferences,
            successful: candidateResult.data.successfulMessages.length,
            failed: candidateResult.data.failedMessages.length
          });
        }
      }

      return {
        success: true,
        data: {
          summary,
          results: allResults
        }
      };

    } catch (error) {
      console.error('❌ [ReferenceMessagingService] Error sending reference messages for position:', error.message);
      return {
        success: false,
        error: error.message,
        data: {
          position: jobPosition
        }
      };
    }
  }

  /**
   * Prepare template components for the referencia_laboral template
   * @param {Object} candidateData - Candidate information
   * @param {Object} referenceData - Reference information
   * @param {Object} options - Additional options
   */
  prepareTemplateComponents(candidateData, referenceData, options = {}) {
    return [
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: candidateData.name || 'el candidato',
            parameter_name: 'name'
          }
        ]
      },
      {
        type: 'button',
        sub_type: 'flow',
        index: '0',
        parameters: [
          {
            type: 'action',
            action: {
              // Add flow-specific fields here if needed
            }
          }
        ]
      }
    ];
  }

  /**
   * Format phone number for WhatsApp
   * @param {string} phone - Phone number to format
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Ensure it starts with + and has country code
    if (!cleaned.startsWith('+')) {
      // If it starts with 507, add +, otherwise assume it needs country code
      if (cleaned.startsWith('507')) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+507' + cleaned;
      }
    }
    
    return cleaned;
  }

  /**
   * Test the reference messaging service
   */
  async testService() {
    try {
      console.log('🧪 [ReferenceMessagingService] Testing service...');
      
      // Test WhatsApp connection
      const whatsappTest = await this.whatsappService.testConnection();
      console.log('✅ WhatsApp connection test:', whatsappTest);
      
      // Test database connection
      const candidates = await this.databaseService.fetchCandidates();
      console.log(`✅ Database connection test: Found ${candidates.length} candidates`);
      
      return {
        success: true,
        whatsapp: whatsappTest,
        database: {
          candidatesCount: candidates.length
        }
      };
      
    } catch (error) {
      console.error('❌ [ReferenceMessagingService] Service test failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ReferenceMessagingService; 