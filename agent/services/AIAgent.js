const IntentDetector = require('./IntentDetector');
const TaskRouter = require('./TaskRouter');
const WhatsAppService = require('./WhatsAppService');
const DatabaseService = require('./DatabaseService');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');

class AIAgent {
  constructor() {
    this.intentDetector = new IntentDetector();
    this.taskRouter = new TaskRouter();
    this.whatsapp = new WhatsAppService();
    this.databaseService = new DatabaseService();
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Context memory for conversation
    this.conversationContext = new Map();
  }

  async processUserPrompt(userPrompt, context = {}) {
    console.log('🤖 AI Agent processing user prompt with 3-step architecture:', userPrompt);
    
    try {
      // Step 1: Lightweight classification with Ollama Llama 2
      console.log('🔄 Step 1: Classifying prompt with Llama 2...');
      const classification = await this.intentDetector.classifyWithOllama(userPrompt, context);
      console.log('✅ Classification result:', classification);

      // Step 2: Smart data loading based on classification
      console.log('🔄 Step 2: Loading data based on classification...');
      let allData = {};
      
      // Only load data for complex operations
      const needsData = ['send_message', 'analyze_messages', 'retrieve_messages', 'retrieve_reference_responses', 'generate_questions', 'compare_candidates', 'analyze_resume', 'show_candidates', 'show_positions', 'send_reference_message', 'receive_reference_message', 'send_direct_reference_message'];
      
      if (needsData.includes(classification.action)) {
        allData = await this.loadEssentialData(context);
        console.log(`📊 Loaded data: ${allData.candidates.length} candidates, ${allData.messageHistory.length} messages, ${allData.chatHistory.length} chat history`);
      } else {
        console.log('✅ Simple operation - no data loading needed');
      }

      // Step 3: Use existing TaskRouter with optimized approach
      console.log('🔄 Step 3: Processing with TaskRouter...');
      
      // For simple operations, create minimal intent data
      const intentData = {
        action: classification.action,
        intent: userPrompt,
        reasoning: `Classified as ${classification.action} with confidence ${classification.confidence}`,
        parameters: {
          ...classification.parameters,
          language: 'es'
        }
      };

      const result = await this.taskRouter.routeTask(intentData, context, allData);
      console.log('✅ Task completed:', result.success ? 'Success' : 'Failed');

      // Step 4: If this is a WhatsApp action, actually send the messages
      if (result && result.success && intentData.action === 'send_message') {
        console.log('📱 This is a WhatsApp action, sending messages...');
        
        if (result.data) {
          console.log('📱 Found message data, sending via WhatsApp...');
          const whatsappResults = await this.sendWhatsAppMessages(result.data, intentData.action);
          
          // Add WhatsApp results to the response
          result.whatsappResults = whatsappResults;
          console.log('📱 WhatsApp sending completed');
        }
      }

      return result;

    } catch (error) {
      console.error('❌ Error in AI Agent:', error);
      return {
        success: false,
        error: error.message,
        data: {
          message: "I'm having trouble processing your request. Please try again or contact support if the issue persists."
        }
      };
    }
  }

  // New method to load only essential data to reduce tokens
  async loadEssentialData(context = {}) {
    const data = {
      candidates: [],
      messageHistory: [],
      chatHistory: []
    };

    // Load candidates (this is essential for most operations)
    try {
      const candidates = await this.databaseService.fetchCandidates(context.token, context.userId);
      data.candidates = candidates;
      console.log(`📊 Loaded ${candidates.length} candidates`);
    } catch (error) {
      console.error('Error loading candidates:', error);
    }

    // Load only recent message history (last 10 messages) to reduce tokens
    try {
      const messageHistoryPath = path.join(__dirname, '..', 'data', 'messageHistory.js');
      if (fs.existsSync(messageHistoryPath)) {
        const messageHistory = require(messageHistoryPath);
        // Only keep last 10 messages to reduce tokens
        data.messageHistory = messageHistory.slice(-10);
        console.log(`📝 Loaded ${data.messageHistory.length} recent messages`);
      }
    } catch (error) {
      console.error('Error loading message history:', error);
    }

    // Load chat history with better debugging
    try {
      const chatHistoryPath = path.join(__dirname, '..', 'data', 'chatHistory.json');
      console.log(`🔍 Looking for chat history at: ${chatHistoryPath}`);
      
      if (fs.existsSync(chatHistoryPath)) {
        const chatHistoryData = fs.readFileSync(chatHistoryPath, 'utf8');
        console.log(`📄 Chat history file content length: ${chatHistoryData.length} characters`);
        
        const allChatHistory = JSON.parse(chatHistoryData);
        console.log(`📋 Total chat history entries: ${allChatHistory.length}`);
        
        // Filter by conversation ID if provided
        if (context.conversationId) {
          const conversationHistory = allChatHistory.filter(msg => 
            msg.conversationId === context.conversationId
          );
          console.log(`💬 Found ${conversationHistory.length} messages for conversation: ${context.conversationId}`);
          data.chatHistory = conversationHistory.slice(-10); // Keep last 10 messages for this conversation
        } else {
          // Only keep last 10 messages to reduce tokens
          data.chatHistory = allChatHistory.slice(-10);
        }
        
        console.log(`📝 Loaded ${data.chatHistory.length} recent chat messages`);
        console.log(`📝 Chat history preview:`, data.chatHistory.map(msg => ({
          sender: msg.sender,
          message: msg.message.substring(0, 50) + '...',
          timestamp: msg.timestamp
        })));
      } else {
        console.log(`⚠️ Chat history file not found at: ${chatHistoryPath}`);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }

    return data;
  }

  async processPrompt(userPrompt, context = {}) {
    console.log('🤖 AI Agent processing prompt:', userPrompt);
    console.log('👤 User context:', { userId: context.userId, hasToken: !!context.token });
    
    try {
      // Step 1: Detect intent and get structured response
      const intentData = await this.intentDetector.detectIntent(userPrompt, context);
      console.log('📋 Intent detected:', intentData);

      // Step 2: Load data if needed for the action
      let allData = {};
      const needsData = ['send_message', 'analyze_messages', 'retrieve_messages', 'retrieve_reference_responses', 'generate_questions', 'compare_candidates', 'analyze_resume', 'show_candidates', 'show_positions', 'send_reference_message', 'receive_reference_message', 'send_direct_reference_message'];
      
      if (needsData.includes(intentData.action)) {
        allData = await this.loadEssentialData(context);
        console.log(`📊 Loaded data: ${allData.candidates.length} candidates, ${allData.messageHistory.length} messages, ${allData.chatHistory.length} chat history`);
      }

      // Step 3: ALWAYS check conversation context first
      const conversationId = context.conversationId;
      const conversationContext = this.getConversationContext(conversationId);
      
      console.log('🔍 ALWAYS checking conversation context first:');
      console.log('  - Last action:', conversationContext.lastAction);
      console.log('  - Has candidates:', !!conversationContext.candidates);
      console.log('  - Job position:', conversationContext.jobPosition);
      console.log('  - Last prompt:', conversationContext.lastPrompt);
      
      let result;
      // Route to task router for specific actions, regardless of context
      const specificActions = ['show_positions', 'show_candidates', 'provide_info', 'send_message', 'show_references', 'send_reference_message', 'receive_reference_message', 'send_direct_reference_message'];
      
      if (specificActions.includes(intentData.action)) {
        console.log(`🔍 Specific action detected: ${intentData.action}, routing to task router...`);
        result = await this.taskRouter.routeTask(intentData, context, allData);
      } else if (conversationContext.candidates || conversationContext.lastAction) {
        console.log('🔍 Using conversation context for response...');
        result = await this.handleContextualQuestion(userPrompt, context, intentData);
      } else {
        // Only route to task router if NO context exists
        console.log('🔍 No conversation context found, routing to task router...');
        result = await this.taskRouter.routeTask(intentData, context, allData);
      }
      
      console.log('✅ Task completed:', result);

      // Step 4: Save conversation context for future reference
      if (result && result.success) {
        // Save candidates from the result or from allData if available
        let candidatesToSave = result.data?.candidates;
        if ((!candidatesToSave || candidatesToSave.length === 0) && allData.candidates && allData.candidates.length > 0) {
          // If no candidates in result but we have candidates in allData, save them
          candidatesToSave = allData.candidates;
        }
        // Only update context if we have a non-empty candidate list
        if (candidatesToSave && candidatesToSave.length > 0) {
          this.saveConversationContext(conversationId, {
            lastAction: intentData.action,
            lastIntent: intentData.intent,
            lastPrompt: userPrompt,
            jobPosition: result.data?.jobPosition || intentData.parameters?.job_position,
            candidates: candidatesToSave,
            timestamp: new Date().toISOString()
          });
          console.log(`💾 Saved conversation context: action=${intentData.action}, candidates=${candidatesToSave?.length || 0}`);
        } else {
          console.log('⚠️ Not updating conversation context: candidate list is empty.');
        }
      }

      // Step 5: Handle analysis if needed
      if (result && result.success && result.data && result.data.needsAnalysis) {
        console.log('🧠 Processing analysis request...');
        try {
          const analysisResult = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: "You are an expert HR recruiter and candidate analyst. Provide detailed, professional analysis of candidates based on their skills, experience, salary expectations, and overall fit. Be specific and actionable in your recommendations."
              },
              {
                role: "user",
                content: result.data.analysisPrompt
              }
            ],
            max_tokens: 2000,
            temperature: 0.3
          });

          const analysis = analysisResult.choices[0].message.content;
          
          // Update the result with the analysis
          result.data.message = analysis;
          result.data.analysis = analysis;
          delete result.data.needsAnalysis;
          delete result.data.analysisPrompt;
          
          console.log('✅ Analysis completed and added to result');
        } catch (analysisError) {
          console.error('❌ Error during analysis:', analysisError);
          result.data.message = "I encountered an error while analyzing the candidates. Here are the candidates without analysis:\n\n" + 
            result.data.candidates.map((c, i) => `${i + 1}. ${c.name} (${c.position}) - ${c.experience}`).join('\n');
        }
      }

      // Step 5: If this is a WhatsApp action, actually send the messages
      console.log(`🔍 [AIAgent] Checking if this is a WhatsApp action...`);
      console.log(`🔍 [AIAgent] Intent action: ${intentData.action}`);
      console.log(`🔍 [AIAgent] Result success: ${result?.success}`);
      console.log(`🔍 [AIAgent] Is WhatsApp action: ${intentData.action === 'send_message' || intentData.action === 'generate_questions'}`);
      
      if (result && result.success && (intentData.action === 'send_message' || intentData.action === 'generate_questions')) {
        console.log(`📱 [AIAgent] This IS a WhatsApp action, checking for message data...`);
        
        // Check if result has the expected structure
        if (result.data) {
          console.log(`📱 [AIAgent] Found result.data:`, JSON.stringify(result.data, null, 2));
          await this.sendWhatsAppMessages(result.data, intentData.action);
        } else if (result.result && result.result.data) {
          console.log(`📱 [AIAgent] Found result.result.data:`, JSON.stringify(result.result.data, null, 2));
          await this.sendWhatsAppMessages(result.result.data, intentData.action);
        } else {
          console.log('⚠️ No message data found in result, skipping WhatsApp sending');
          console.log('⚠️ Result structure:', JSON.stringify(result, null, 2));
        }
      } else {
        console.log(`📱 [AIAgent] This is NOT a WhatsApp action or result is not successful`);
      }

      // Step 5: Return comprehensive response with intentData
      return {
        success: true,
        intentData: intentData,
        result: result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in AI Agent:', error);
      return {
        success: false,
        error: error.message,
        intentData: null,
        result: null,
        timestamp: new Date().toISOString()
      };
    }
  }

  // New method to actually send WhatsApp messages
  async sendWhatsAppMessages(data, action) {
    try {
      console.log(`📤 [AIAgent] Starting sendWhatsAppMessages for action: ${action}`);
      console.log(`📤 [AIAgent] Input data:`, JSON.stringify(data, null, 2));
      
      // Handle both single message and bulk messages
      const messages = Array.isArray(data) ? data : [data];
      console.log(`📤 [AIAgent] Processing ${messages.length} message(s)`);
      
      const results = [];
      
      for (const message of messages) {
        console.log(`📤 [AIAgent] Processing message:`, JSON.stringify(message, null, 2));
        
        if (message.number && message.message) {
          console.log(`📱 [AIAgent] Sending to ${message.candidate} (${message.number}): ${message.message.substring(0, 50)}...`);
          
          try {
            console.log(`📱 [AIAgent] Calling whatsapp.sendTextMessage...`);
            const whatsappResult = await this.whatsapp.sendTextMessage(message.number, message.message);
            console.log(`📱 [AIAgent] WhatsApp API returned:`, JSON.stringify(whatsappResult, null, 2));
            
            results.push({
              candidate: message.candidate,
              number: message.number,
              success: true,
              whatsappId: whatsappResult.messages?.[0]?.id
            });
            console.log(`✅ [AIAgent] Message sent successfully to ${message.candidate}`);
          } catch (whatsappError) {
            console.error(`❌ [AIAgent] Failed to send message to ${message.candidate}:`, whatsappError.message);
            console.error(`❌ [AIAgent] Full error:`, whatsappError);
            results.push({
              candidate: message.candidate,
              number: message.number,
              success: false,
              error: whatsappError.message
            });
          }
        } else {
          console.log(`⚠️ [AIAgent] Skipping message for ${message.candidate} - missing number or message`);
          console.log(`⚠️ [AIAgent] Message object:`, JSON.stringify(message, null, 2));
        }
      }
      
      console.log(`📊 [AIAgent] WhatsApp sending results: ${results.filter(r => r.success).length}/${results.length} successful`);
      console.log(`📊 [AIAgent] Full results:`, JSON.stringify(results, null, 2));
      return results;
      
    } catch (error) {
      console.error('❌ [AIAgent] Error sending WhatsApp messages:', error);
      console.error('❌ [AIAgent] Full error:', error);
      throw error;
    }
  }

  async sendMessageToCandidate(candidateName, messageType = 'general', context = {}) {
    const prompt = `Send a ${messageType} message to candidate ${candidateName}`;
    return await this.processPrompt(prompt, {
      ...context,
      candidate_name: candidateName,
      message_type: messageType
    });
  }

  async generateQuestionsForCandidate(candidateName, context = {}) {
    const prompt = `Generate follow-up questions for candidate ${candidateName}`;
    return await this.processPrompt(prompt, {
      ...context,
      candidate_name: candidateName,
      message_type: 'followup'
    });
  }

  async analyzeMessages(messages, context = {}) {
    const prompt = `Analyze the following WhatsApp messages from candidates`;
    return await this.processPrompt(prompt, {
      ...context,
      messages: messages
    });
  }

  async showCandidates(candidateName = null, context = {}) {
    const prompt = candidateName 
      ? `Show information for candidate ${candidateName}`
      : `Show all candidates`;
    return await this.processPrompt(prompt, {
      ...context,
      candidate_name: candidateName
    });
  }

  async compareCandidates(candidateIds, jobDescription, context = {}) {
    const prompt = `Compare the following candidates for the job position`;
    return await this.processPrompt(prompt, {
      ...context,
      candidateIds: candidateIds,
      jobDescription: jobDescription
    });
  }

  async analyzeResume(resumeText, context = {}) {
    const prompt = `Analyze this resume`;
    return await this.processPrompt(prompt, {
      ...context,
      resumeText: resumeText
    });
  }

  async scheduleInterview(candidateId, interviewDetails, context = {}) {
    const prompt = `Schedule an interview for the candidate`;
    return await this.processPrompt(prompt, {
      ...context,
      candidateId: candidateId,
      interviewDetails: interviewDetails
    });
  }

  // Utility method to get the JSON structure for WhatsApp integration
  // Only for send_message and generate_questions actions
  getWhatsAppJson(result) {
    if (result.success && result.result.success && result.result.data) {
      const data = result.result.data;
      const action = result.intentData?.action;
      
      // Only return WhatsApp JSON for actions that actually send messages
      if ((action === 'send_message' || action === 'generate_questions')) {
        // Handle bulk messages (array of messages)
        if (Array.isArray(data)) {
          return data.map(msg => ({
            candidate: msg.candidate,
            number: msg.number,
            message: msg.message
          }));
        }
        // Handle single message
        else if (data.candidate && data.number && data.message) {
          return {
            candidate: data.candidate,
            number: data.number,
            message: data.message
          };
        }
      }
    }
    
    return null;
  }

  // Method to get explanation of what the agent did
  // Only for actions that actually DO something (not just analyze/summarize)
  getActionExplanation(result) {
    if (result.success && result.result.success && result.result.explanation) {
      return result.result.explanation;
    }
    
    return null;
  }

  // Method to get a summary of what the agent did (for all actions)
  getActionSummary(result) {
    if (result.success && result.result.success) {
      const action = result.intentData?.action;
      const data = result.result.data;
      
      // For actions that actually do something, return the explanation
      if (result.result.explanation) {
        return result.result.explanation;
      }
      
      // For analysis/summary actions, return a simple summary
      switch (action) {
        case 'analyze_messages':
          return `Analyzed ${data.analyzed || 0} messages from candidates`;
        case 'show_candidates':
          return `Showing ${Array.isArray(data) ? data.length : 1} candidate(s)`;
        case 'compare_candidates':
          return `Compared ${data.candidates?.length || 0} candidates`;
        case 'analyze_resume':
          if (data.analysis) {
            return `Analyzed ${data.candidatesAnalyzed || 0} candidates and found ${data.bestCandidate || 'no suitable'} candidate`;
          } else {
            return `Analyzed resume (${data.resumeLength || 0} characters)`;
          }
        case 'general_chat':
          return `Provided information about recruitment status`;
        default:
          return 'Action completed successfully';
      }
    }
    
    return result.error || 'Action failed';
  }

  // Method to save conversation context
  saveConversationContext(conversationId, context) {
    this.conversationContext.set(conversationId, {
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  // Method to get conversation context
  getConversationContext(conversationId) {
    return this.conversationContext.get(conversationId) || {};
  }

  // Method to handle contextual questions
  async handleContextualQuestion(userPrompt, context = {}, intentData = {}) {
    try {
      console.log('🤖 [AIAgent] Handling contextual question:', userPrompt);
      
      // Check if this is a query about reference responses
      const referenceKeywords = [
        'referencia', 'reference', 'referencias', 'references', 
        'referencia_laboral', 'reference_laboral', 'respuestas de referencia',
        'reference responses', 'evaluaciones', 'evaluations', 'calificaciones',
        'ratings', 'recomendaciones', 'recommendations'
      ];
      
      const isReferenceQuery = referenceKeywords.some(keyword => 
        userPrompt.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isReferenceQuery) {
        console.log('📞 Detected reference response query, retrieving reference data...');
        
        // Load reference responses
        const referenceResponses = await this.whatsapp.getReferenceResponsesStructured();
        
        if (referenceResponses && referenceResponses.length > 0) {
          // Create detailed analysis
          const analysis = this.analyzeReferenceResponsesForQuery(referenceResponses, userPrompt);
          
          return {
            success: true,
            data: {
              referenceResponses: referenceResponses,
              analysis: analysis,
              summary: this.createReferenceQuerySummary(referenceResponses, analysis, userPrompt)
            },
            explanation: `📞 Analicé ${referenceResponses.length} respuestas de referencia y encontré información relevante sobre ${analysis.candidatesMentioned.length} candidatos.`
          };
        } else {
          return {
            success: true,
            data: {
              referenceResponses: [],
              analysis: {},
              summary: 'No se encontraron respuestas de referencia en el sistema.'
            },
            explanation: '📞 No hay respuestas de referencia disponibles en el sistema.'
          };
        }
      }
      
      // Check if this is a language detection question
      const languageKeywords = ['mejor', 'best', 'cuál', 'which', 'qué', 'what'];
      const isLanguageQuestion = languageKeywords.some(keyword => 
        userPrompt.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isLanguageQuestion) {
        // Detect if the question is in Spanish
        const spanishWords = ['mejor', 'cuál', 'qué', 'cómo', 'dónde', 'cuándo', 'por qué', 'para qué'];
        const isSpanish = spanishWords.some(word => userPrompt.toLowerCase().includes(word.toLowerCase()));
        
        if (isSpanish) {
          console.log('🇪🇸 Detected Spanish question, responding in Spanish');
          
          // For Spanish questions about candidates, provide a detailed response
          if (userPrompt.toLowerCase().includes('mejor') || userPrompt.toLowerCase().includes('cuál')) {
            const allData = await this.loadEssentialData(context);
            
            if (allData.candidates && allData.candidates.length > 0) {
              // Analyze candidates and find the best one
              const bestCandidate = this.analyzeBestCandidate(allData.candidates);
              
              return {
                success: true,
                data: {
                  bestCandidate: bestCandidate,
                  allCandidates: allData.candidates,
                  analysis: this.createCandidateAnalysis(allData.candidates)
                },
                explanation: `🇪🇸 Analicé ${allData.candidates.length} candidatos y encontré que ${bestCandidate.name} es el mejor candidato basado en su experiencia y calificaciones.`
              };
            } else {
              return {
                success: true,
                data: {
                  message: "No hay candidatos disponibles para analizar en este momento."
                },
                explanation: "🇪🇸 No se encontraron candidatos en el sistema para realizar el análisis."
              };
            }
          }
        }
      }
      
      // Default contextual response
      const conversationId = context.conversationId;
      const conversationContext = this.getConversationContext(conversationId);
      
      if (conversationContext.candidates && conversationContext.candidates.length > 0) {
        // We have candidates in context, provide a contextual response
        const relevantCandidate = this.findRelevantCandidate(userPrompt, conversationContext.candidates);
        
        if (relevantCandidate) {
          return {
            success: true,
            data: {
              candidate: relevantCandidate,
              message: `Basándome en el contexto de nuestra conversación, ${relevantCandidate.name} parece ser el candidato más relevante para tu consulta. ¿Te gustaría que analice más detalles sobre este candidato?`
            },
            explanation: `Encontré un candidato relevante (${relevantCandidate.name}) en el contexto de la conversación.`
          };
        }
      }
      
      // Fallback to general response
      return {
        success: true,
        data: {
          message: "Entiendo tu pregunta. ¿Podrías proporcionar más contexto o especificar qué tipo de información necesitas?"
        },
        explanation: "Proporcioné una respuesta general ya que no pude determinar el contexto específico de la pregunta."
      };
      
    } catch (error) {
      console.error('❌ Error in handleContextualQuestion:', error);
      return {
        success: false,
        error: error.message,
        data: {
          message: "Lo siento, tuve un problema procesando tu pregunta. ¿Podrías intentar de nuevo?"
        }
      };
    }
  }

  // New method to analyze reference responses for specific queries
  analyzeReferenceResponsesForQuery(referenceResponses, query) {
    try {
      const queryLower = query.toLowerCase();
      const analysis = {
        candidatesMentioned: [],
        highRatedCandidates: [],
        willingToRecommend: [],
        recentResponses: [],
        averageRating: 0,
        totalResponses: referenceResponses.length
      };

      // Calculate average rating
      const responsesWithRatings = referenceResponses.filter(r => r.rating && r.rating.overall > 0);
      if (responsesWithRatings.length > 0) {
        analysis.averageRating = responsesWithRatings.reduce((sum, r) => sum + r.rating.overall, 0) / responsesWithRatings.length;
      }

      // Group by candidate
      const candidatesMap = new Map();
      referenceResponses.forEach(response => {
        const candidateName = response.candidate_name || response.reference_for || 'Unknown';
        if (!candidatesMap.has(candidateName)) {
          candidatesMap.set(candidateName, {
            name: candidateName,
            responses: [],
            averageRating: 0,
            willingToRecommend: 0,
            totalResponses: 0
          });
        }
        
        const candidate = candidatesMap.get(candidateName);
        candidate.responses.push(response);
        candidate.totalResponses++;
        
        if (response.rating && response.rating.overall > 0) {
          candidate.averageRating = (candidate.averageRating * (candidate.responses.length - 1) + response.rating.overall) / candidate.responses.length;
        }
        
        if (response.willingness_to_recommend === 'yes') {
          candidate.willingToRecommend++;
        }
      });

      // Convert to arrays and sort
      analysis.candidatesMentioned = Array.from(candidatesMap.values());
      analysis.highRatedCandidates = analysis.candidatesMentioned
        .filter(c => c.averageRating >= 7)
        .sort((a, b) => b.averageRating - a.averageRating);
      
      analysis.willingToRecommend = analysis.candidatesMentioned
        .filter(c => c.willingToRecommend > 0)
        .sort((a, b) => b.willingToRecommend - a.willingToRecommend);

      // Get recent responses (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      analysis.recentResponses = referenceResponses.filter(response => {
        const responseDate = new Date(response.timestamp || response.received_at || response.saved_at);
        return responseDate >= sevenDaysAgo;
      });

      return analysis;
    } catch (error) {
      console.error('Error analyzing reference responses for query:', error);
      return {};
    }
  }

  // New method to create summary for reference queries
  createReferenceQuerySummary(referenceResponses, analysis, query) {
    try {
      const queryLower = query.toLowerCase();
      let summary = '📞 Análisis de Respuestas de Referencia\n\n';

      if (analysis.totalResponses === 0) {
        return 'No se encontraron respuestas de referencia en el sistema.';
      }

      summary += `📊 Resumen General:\n`;
      summary += `• Total de respuestas: ${analysis.totalResponses}\n`;
      summary += `• Candidatos evaluados: ${analysis.candidatesMentioned.length}\n`;
      summary += `• Calificación promedio: ${analysis.averageRating.toFixed(1)}/10\n`;

      if (analysis.highRatedCandidates.length > 0) {
        summary += `\n⭐ Candidatos Mejor Calificados:\n`;
        analysis.highRatedCandidates.slice(0, 3).forEach((candidate, index) => {
          summary += `${index + 1}. ${candidate.name} - ${candidate.averageRating.toFixed(1)}/10 (${candidate.totalResponses} referencias)\n`;
        });
      }

      if (analysis.willingToRecommend.length > 0) {
        summary += `\n👍 Candidatos Más Recomendados:\n`;
        analysis.willingToRecommend.slice(0, 3).forEach((candidate, index) => {
          summary += `${index + 1}. ${candidate.name} - ${candidate.willingToRecommend}/${candidate.totalResponses} referencias positivas\n`;
        });
      }

      if (analysis.recentResponses.length > 0) {
        summary += `\n🕒 Actividad Reciente (últimos 7 días):\n`;
        summary += `• ${analysis.recentResponses.length} nuevas respuestas\n`;
        analysis.recentResponses.slice(0, 3).forEach((response, index) => {
          const time = new Date(response.timestamp || response.received_at || response.saved_at).toLocaleString();
          const rating = response.rating?.overall || 'N/A';
          summary += `${index + 1}. ${time} - ${response.reference_name || 'Unknown'} - Rating: ${rating}/10\n`;
        });
      }

      return summary;
    } catch (error) {
      console.error('Error creating reference query summary:', error);
      return 'Error al crear resumen de referencias.';
    }
  }

  // Helper method to extract candidate name from prompt
  extractCandidateName(prompt) {
    console.log('🔍 Extracting candidate name from:', prompt);
    
    // Skip extraction if this looks like a direct phone message
    if (prompt.includes('+') && /\+\d{10,15}/.test(prompt)) {
      console.log('🔍 Detected phone number in prompt, skipping candidate name extraction');
      return null;
    }
    
    // Common patterns for asking about specific candidates
    const patterns = [
      /(?:give me|what is|show me|get|find)\s+(\w+(?:\s+\w+)*?)(?:'s|\s+phone|\s+number|\s+contact)/i,
      /(\w+(?:\s+\w+)*?)(?:'s|\s+phone|\s+number|\s+contact)/i,
      /(?:phone|number|contact)\s+(?:for|of)\s+(\w+(?:\s+\w+)*)/i
    ];
    
    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match && match[1]) {
        console.log('🎯 Pattern match found:', match[1]);
        return match[1].trim();
      }
    }
    
    // Only extract if it's clearly asking for a specific person's info
    if (prompt.toLowerCase().includes('phone') || prompt.toLowerCase().includes('number') || prompt.toLowerCase().includes('contact')) {
      const words = prompt.split(/\s+/);
      const nameWords = words.filter(word => 
        word.length > 2 && 
        /^[A-Za-z]+$/.test(word) && 
        !['give', 'me', 'what', 'is', 'show', 'get', 'find', 'phone', 'number', 'contact', 'the', 'a', 'an', 'for', 'of'].includes(word.toLowerCase())
      );
      
      console.log('🔍 Filtered name words:', nameWords);
      const result = nameWords.length > 0 ? nameWords.join(' ') : null;
      console.log('🎯 Extracted candidate name:', result);
      return result;
    }
    
    return null;
  }

  // Helper method to analyze and find the best candidate
  analyzeBestCandidate(candidates) {
    if (!candidates || candidates.length === 0) {
      return null;
    }
    
    // Score each candidate based on multiple factors
    const scoredCandidates = candidates.map(candidate => {
      let score = 0;
      
      // Experience scoring (0-30 points)
      const experience = candidate.experience || '';
      const experienceLower = experience.toLowerCase();
      
      if (experienceLower.includes('años') || experienceLower.includes('years')) {
        const yearMatch = experienceLower.match(/(\d+)/);
        if (yearMatch) {
          const years = parseInt(yearMatch[1]);
          score += Math.min(years * 2, 30); // Max 30 points for experience
        }
      } else if (experienceLower.includes('meses') || experienceLower.includes('months')) {
        const monthMatch = experienceLower.match(/(\d+)/);
        if (monthMatch) {
          const months = parseInt(monthMatch[1]);
          score += Math.min(months / 2, 10); // Max 10 points for months
        }
      }
      
      // Skills scoring (0-25 points)
      const skills = candidate.skills || [];
      score += Math.min(skills.length * 3, 25); // 3 points per skill, max 25
      
      // Language scoring (0-15 points)
      const languages = candidate.languages || [];
      if (languages.some(lang => lang.toLowerCase().includes('inglés') || lang.toLowerCase().includes('english'))) {
        score += 15;
      } else if (languages.length > 0) {
        score += 5;
      }
      
      // Location scoring (0-10 points)
      if (candidate.location && candidate.location.toLowerCase().includes('panamá')) {
        score += 10;
      } else if (candidate.location) {
        score += 5;
      }
      
      // Availability scoring (0-10 points)
      if (candidate.availability && candidate.availability.toLowerCase().includes('presencial')) {
        score += 10;
      } else if (candidate.availability) {
        score += 5;
      }
      
      // Position relevance (0-10 points)
      if (candidate.position && candidate.position !== 'Unknown Position') {
        score += 10;
      }
      
      return { ...candidate, score };
    });
    
    // Sort by score (highest first) and return the best
    scoredCandidates.sort((a, b) => b.score - a.score);
    return scoredCandidates[0];
  }

  // Helper method to find a relevant candidate based on the user's query
  findRelevantCandidate(query, candidates) {
    const queryLower = query.toLowerCase();
    const relevantCandidate = candidates.find(candidate => {
      const candidateLower = candidate.name.toLowerCase();
      return candidateLower.includes(queryLower) || queryLower.includes(candidateLower);
    });
    return relevantCandidate;
  }

  // Helper method to create a summary of candidate analysis
  createCandidateAnalysis(candidates) {
    if (!candidates || candidates.length === 0) {
      return "No se pudieron analizar los candidatos.";
    }

    const analysis = {
      totalCandidates: candidates.length,
      averageExperience: 0,
      averageSalary: 0,
      averageRating: 0,
      topSkills: [],
      topLanguages: [],
      topLocations: [],
      bestCandidate: null,
      candidatesAnalyzed: 0
    };

    const candidatesWithData = candidates.filter(c => c.experience && c.salary && c.rating);
    analysis.candidatesAnalyzed = candidatesWithData.length;

    if (analysis.candidatesAnalyzed > 0) {
      analysis.averageExperience = candidatesWithData.reduce((sum, c) => sum + parseInt(c.experience.replace('años', '').replace('years', '').replace('meses', '').replace('months', '')), 0) / analysis.candidatesAnalyzed;
      analysis.averageSalary = candidatesWithData.reduce((sum, c) => sum + parseInt(c.salary.replace('USD', '').replace('USD', '')), 0) / analysis.candidatesAnalyzed;
      analysis.averageRating = candidatesWithData.reduce((sum, c) => sum + parseInt(c.rating.overall), 0) / analysis.candidatesAnalyzed;

      // Top skills
      const skillCounts = {};
      candidatesWithData.forEach(c => {
        c.skills.forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      });
      analysis.topSkills = Object.entries(skillCounts)
        .sort(([, aCount], [, bCount]) => bCount - aCount)
        .slice(0, 5)
        .map(([skill, count]) => `${skill} (${count})`);

      // Top languages
      const languageCounts = {};
      candidatesWithData.forEach(c => {
        c.languages.forEach(lang => {
          languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        });
      });
      analysis.topLanguages = Object.entries(languageCounts)
        .sort(([, aCount], [, bCount]) => bCount - aCount)
        .slice(0, 5)
        .map(([lang, count]) => `${lang} (${count})`);

      // Top locations
      const locationCounts = {};
      candidatesWithData.forEach(c => {
        locationCounts[c.location] = (locationCounts[c.location] || 0) + 1;
      });
      analysis.topLocations = Object.entries(locationCounts)
        .sort(([, aCount], [, bCount]) => bCount - aCount)
        .slice(0, 5)
        .map(([loc, count]) => `${loc} (${count})`);

      // Find the best candidate
      analysis.bestCandidate = this.analyzeBestCandidate(candidates);
    }

    return analysis;
  }
}

module.exports = AIAgent;