require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DatabaseService = require('./DatabaseService');
const messageHistory = require('../data/messageHistory');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class IntentDetector {
  constructor() {
    this.openai = openai;
    this.databaseService = new DatabaseService();
    this.ollamaUrl = 'http://localhost:11434';
    this.ollamaModel = 'llama3.2';
  }

  async detectIntent(userPrompt, allData, context = {}) {
    console.log('🎯 IntentDetector: Analyzing user prompt for intent');
    
    // Load only basic data for intent detection to reduce tokens
    const basicData = await this.loadBasicData(context);
    console.log(`📊 Intent detection using: ${basicData.chatHistory.length} chat messages`);
    
    const systemPrompt = `
Eres un agente de IA para una plataforma de reclutamiento. Analiza las consultas del usuario y determina la acción apropiada.

DETECCIÓN DE IDIOMA:
- Detecta el idioma del mensaje del usuario
- Si el usuario escribe en español, establece language como "es" y responde en español
- Si el usuario escribe en inglés, establece language como "en" y responde en inglés
- Por defecto usa español ("es") si el idioma no está claro
- El sistema comienza en español por defecto

Acciones disponibles:
- send_message: Enviar mensaje de WhatsApp a candidato(s) o números de teléfono
- send_reference_message: Enviar mensaje de referencia usando plantilla "referencia_laboral" a referencias de candidatos
- provide_info: Proporcionar información del candidato (teléfono, email, detalles) sin enviar mensajes
- analyze_messages: Analizar mensajes de WhatsApp de candidatos
- retrieve_messages: Recuperar y resumir mensajes de una conversación de WhatsApp
- retrieve_reference_responses: Recuperar respuestas a mensajes de referencia enviados
- show_candidates: Mostrar listas de candidatos para posiciones específicas o todos los candidatos
- show_positions: Mostrar posiciones de trabajo disponibles (NO candidatos)
- show_references: Mostrar referencias de candidato(s)
- generate_questions: Generar preguntas de seguimiento para candidato(s)
- compare_candidates: Comparar múltiples candidatos
- analyze_resume: Analizar el currículum de un candidato
- schedule_interview: Programar una entrevista
- analyze_aihistory: Recordar historial previo de IA/usuario
- general_chat: Conversación general

REGLAS IMPORTANTES:
- Si el usuario pide información de candidato (teléfono, email, detalles) usa provide_info
- Si el usuario quiere ENVIAR un mensaje usa send_message
- Si el usuario pide enviar mensaje de REFERENCIA o verificación de referencias usa send_reference_message
- Si el usuario pide información de contacto de un candidato específico usa provide_info
- Si el usuario pregunta por el número de teléfono de alguien usa provide_info
- Si el usuario pide enviar mensaje a un número de teléfono específico usa send_message
- Si el usuario pide "posiciones disponibles", "puestos de trabajo", "available positions", "job positions" usa show_positions
- Si el usuario pide "candidatos para X posición" o "candidates for X" usa show_candidates
- Si el usuario menciona una posición de trabajo específica (como "Programación Full Stack", "Desarrollador", "Frontend", etc.) usa show_candidates
- Si el usuario pide "ver mensajes", "recuperar mensajes", "ver conversación", "retrieve messages", "get messages" usa retrieve_messages
- Si el usuario pide "recuperar respuestas", "ver respuestas de referencia", "respuestas a referencias", "retrieve reference responses", "get reference responses" usa retrieve_reference_responses
- Siempre detecta y establece el idioma correcto en los parámetros
- Extrae nombres de candidatos mencionados en la consulta
- Extrae números de teléfono mencionados en la consulta
- Extrae posiciones de trabajo mencionadas en la consulta (ej: "Programación Full Stack", "Desarrollador Frontend", "Backend", etc.)

Responde SOLO con un objeto JSON:
{
  "action": "nombre_de_la_accion",
  "intent": "descripcion_breve_del_intento",
  "reasoning": "por_que_se_elegio_esta_accion",
  "parameters": {
    "candidate_name": "nombre_si_se_menciona_o_all_para_masivo",
    "candidate_names": ["array", "de", "nombres", "especificos"],
    "job_position": "posicion_si_se_menciona",
    "phone_number": "numero_de_telefono_si_se_menciona",
    "message": "mensaje_si_se_proporciona",
    "language": "es|en"
  }
}

Contexto: ${JSON.stringify(context, null, 2)}
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 150
      });

      const response = completion.choices[0].message.content;
      const intentData = JSON.parse(response);
      
      // Add the original user prompt to the intent data for context
      intentData.originalPrompt = userPrompt;
      
      // If a phone_number is present and action is send_reference_message, change to send_direct_reference_message
      if (intentData.action === 'send_reference_message' && intentData.parameters && intentData.parameters.phone_number) {
        intentData.action = 'send_direct_reference_message';
        // Use candidate_name as reference_name if present
        if (intentData.parameters.candidate_name) {
          intentData.parameters.reference_name = intentData.parameters.candidate_name;
        }
      }
      
      return intentData;

    } catch (error) {
      console.error('Error detecting intent:', error);
      
      // Check if it's a quota error
      if (error.message && error.message.includes('quota')) {
        console.log('⚠️ OpenAI quota exceeded, using fallback intent detection');
        return this.fallbackIntentDetection(userPrompt, basicData);
      }
      
      return {
        action: 'general_chat',
        intent: 'fallback_to_general_chat',
        reasoning: 'Error occurred during intent detection',
        parameters: {
          language: 'es'
        },
        originalPrompt: userPrompt
      };
    }
  }

  // New method to load only basic data (no candidates) for intent detection
  async loadBasicData(context = {}) {
    const data = {
      messageHistory: [],
      chatHistory: [],
      whatsappHistory: []
    };

    // Load only recent chat history (last 5 messages) to reduce tokens
    try {
      const chatHistoryPath = path.join(__dirname, '..', 'data', 'chatHistory.json');
      if (fs.existsSync(chatHistoryPath)) {
        const chatHistoryData = fs.readFileSync(chatHistoryPath, 'utf8');
        const allChatHistory = JSON.parse(chatHistoryData);
        // Only keep last 5 messages to reduce tokens
        data.chatHistory = allChatHistory.slice(-5);
        console.log(`📝 Loaded ${data.chatHistory.length} recent chat messages for intent detection`);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }

    // Load WhatsApp history for candidate analysis
    try {
      const whatsappHistoryPath = path.join(__dirname, '..', 'data', 'whatsappHistory.json');
      if (fs.existsSync(whatsappHistoryPath)) {
        const whatsappHistoryData = fs.readFileSync(whatsappHistoryPath, 'utf8');
        const allWhatsappHistory = JSON.parse(whatsappHistoryData);
        // Keep all WhatsApp messages for candidate analysis
        data.whatsappHistory = allWhatsappHistory;
        console.log(`📱 Loaded ${data.whatsappHistory.length} WhatsApp messages for intent detection`);
      }
    } catch (error) {
      console.error('Error loading WhatsApp history:', error);
    }

    return data;
  }

  detectLanguage(text) {
    const spanishWords = ['pregunta', 'candidato', 'entrevista', 'trabajo', 'por favor', 'gracias', 'puedes', 'enviar', 'seguimiento', 'mensaje', 'haz', 'dime', 'cuéntame', 'hola'];
    const lower = text.toLowerCase();
    return spanishWords.some(word => lower.includes(word)) ? 'es' : 'en';
  }

  fallbackIntentDetection(userPrompt, allData) {
    const prompt = userPrompt.toLowerCase();
    const language = this.detectLanguage(userPrompt);
    
        // Check for retrieve reference responses intent first
    const retrieveReferencePatterns = [
      /recuperar\s+respuestas\s+(?:de\s+)?referencia/i,
      /ver\s+respuestas\s+(?:de\s+)?referencia/i,
      /respuestas\s+a\s+referencias/i,
      /retrieve\s+reference\s+responses/i,
      /get\s+reference\s+responses/i,
      /show\s+reference\s+responses/i
    ];
    
    for (const pattern of retrieveReferencePatterns) {
      if (pattern.test(userPrompt)) {
        console.log(`📞 Detected retrieve reference responses intent`);
        
        return {
          action: 'retrieve_reference_responses',
          intent: 'retrieve_reference_responses',
          reasoning: 'Retrieve reference responses intent detected',
          parameters: {
            language: language
          },
          originalPrompt: userPrompt
        };
      }
    }
    
    // Check for retrieve messages intent first
    const retrievePatterns = [
      /recuperar\s+mensajes\s+de\s+(\+?\d{1,3}\s+\d{6,15})/i,
      /ver\s+conversación\s+con\s+(\+?\d{1,3}\s+\d{6,15})/i,
      /mostrar\s+mensajes\s+de\s+(\+?\d{1,3}\s+\d{6,15})/i,
      /recibir\s+los\s+mensajes\s+de\s+(\+?\d{1,3}\s+\d{6,15})/i,
      /puedes\s+recibir\s+los\s+mensajes\s+de\s+(\+?\d{1,3}\s+\d{6,15})/i,
      /retrieve\s+messages\s+from\s+(\+?\d{1,3}\s+\d{6,15})/i,
      /get\s+conversation\s+with\s+(\+?\d{1,3}\s+\d{6,15})/i,
      /show\s+messages\s+from\s+(\+?\d{1,3}\s+\d{6,15})/i,
      /can\s+you\s+get\s+messages\s+from\s+(\+?\d{1,3}\s+\d{6,15})/i
    ];
    
    for (const pattern of retrievePatterns) {
      const match = userPrompt.match(pattern);
      if (match) {
        const phoneNumber = match[1].replace(/\s+/g, ''); // Remove spaces
        console.log(`📱 Detected retrieve messages for phone number: ${phoneNumber}`);
        
        return {
          action: 'retrieve_messages',
          intent: 'retrieve_messages_for_phone',
          reasoning: 'Retrieve messages intent detected with phone number',
          parameters: {
            phone_number: phoneNumber,
            language: language
          },
          originalPrompt: userPrompt
        };
      }
    }
    
    // Enhanced phone number extraction for any message-related query
    const phonePatterns = [
      /\+?\d{1,3}\s+\d{6,15}/,  // +507 66756081
      /\+?\d{1,3}\d{6,15}/,     // +50766756081
      /\d{1,3}\s+\d{6,15}/,     // 507 66756081
      /\d{1,3}\d{6,15}/         // 50766756081
    ];
    
    // Function to normalize and validate phone numbers
    const normalizePhoneNumber = (phoneNumber) => {
      const cleaned = phoneNumber.replace(/\s+/g, ''); // Remove spaces
      const digits = cleaned.replace(/\D/g, ''); // Keep only digits
      
      // Must have at least 8 digits
      if (digits.length < 8) return null;
      
      // If it starts with country code, ensure it's complete
      if (cleaned.startsWith('+')) {
        // For Panama numbers, ensure it's +507 followed by 8 digits
        if (cleaned.startsWith('+507') && digits.length === 10) {
          return cleaned;
        }
        // For other international numbers, ensure it's valid
        if (digits.length >= 10) {
          return cleaned;
        }
        return null;
      }
      
      // If it's just digits, assume it's a local number
      // For Panama, local numbers should be 8 digits
      if (digits.length === 8) {
        return cleaned;
      }
      
      return null;
    };
    
    // Check if this is a message-related query first
    const messageRelatedPatterns = [
      /recibir\s+los?\s+mensajes/i,
      /puedes\s+recibir/i,
      /ver\s+mensajes/i,
      /mostrar\s+mensajes/i,
      /recuperar\s+mensajes/i,
      /get\s+messages/i,
      /retrieve\s+messages/i,
      /show\s+messages/i,
      /can\s+you\s+get/i
    ];
    
    const isMessageRelated = messageRelatedPatterns.some(pattern => pattern.test(userPrompt));
    
    if (isMessageRelated) {
      // Look for phone numbers in the message
      for (const pattern of phonePatterns) {
        const phoneMatch = userPrompt.match(pattern);
        if (phoneMatch) {
          const normalizedPhone = normalizePhoneNumber(phoneMatch[0]);
          if (normalizedPhone) {
            console.log(`📱 Detected phone number in message-related query: ${normalizedPhone}`);
            
            return {
              action: 'retrieve_messages',
              intent: 'retrieve_messages_for_phone',
              reasoning: 'Message-related query with phone number detected',
              parameters: {
                phone_number: normalizedPhone,
                language: language
              },
              originalPrompt: userPrompt
            };
          }
        }
      }
    }
    
    // Check for natural language questions about candidates that might need message retrieval
    const candidateQuestionPatterns = [
      /what\s+did\s+(?:this\s+)?(?:candidate|person|he|she|they)\s+say/i,
      /what\s+(?:did|does)\s+(?:this\s+)?(?:candidate|person)\s+(?:say|respond|reply)/i,
      /(?:qué|que)\s+(?:dijo|respondió|contestó)\s+(?:este\s+)?(?:candidato|persona)/i,
      /(?:qué|que)\s+(?:dice|dijo)\s+(?:este\s+)?(?:candidato|persona)/i,
      /(?:what|qué|que)\s+(?:about|sobre)\s+(?:this\s+)?(?:candidate|person)/i
    ];
    
    const isCandidateQuestion = candidateQuestionPatterns.some(pattern => 
      pattern.test(userPrompt)
    );
    
    // Check for any message retrieval intent (with or without keywords)
    
    // Look for multiple phone numbers first
    let foundPhoneNumbers = [];
    for (const pattern of phonePatterns) {
      const phoneMatches = userPrompt.match(new RegExp(pattern.source, 'g'));
      if (phoneMatches) {
        phoneMatches.forEach(match => {
          const normalizedPhone = normalizePhoneNumber(match);
          if (normalizedPhone && !foundPhoneNumbers.includes(normalizedPhone)) {
            foundPhoneNumbers.push(normalizedPhone);
          }
        });
      }
    }

    // Filter to only the most complete version of each number
    // E.g., if both '+50766756081' and '66756081' are present, keep only '+50766756081'
    foundPhoneNumbers = foundPhoneNumbers.filter((num, idx, arr) => {
      // If any other number in the array ends with this number and is longer, skip this one
      return !arr.some(other => other !== num && other.endsWith(num) && other.length > num.length);
    });
    // Remove duplicates
    foundPhoneNumbers = [...new Set(foundPhoneNumbers)];
    // Remove empty/undefined
    foundPhoneNumbers = foundPhoneNumbers.filter(Boolean);
    console.log('📱 Final filtered phone numbers:', foundPhoneNumbers);
    
    // If we found phone numbers, check if this is a message retrieval request
    if (foundPhoneNumbers.length > 0) {
      const messageRetrievalPatterns = [
        /what\s+did\s+(?:this\s+)?(?:candidate|person|he|she|they)\s+say/i,
        /what\s+(?:did|does)\s+(?:this\s+)?(?:candidate|person)\s+(?:say|respond|reply)/i,
        /(?:show|get|retrieve|see|view)\s+(?:the\s+)?(?:messages?|conversation|chat)/i,
        /(?:recuperar|ver|mostrar|obtener)\s+(?:los\s+)?(?:mensajes?|conversación|chat)/i,
        /(?:qué|que)\s+(?:dijo|respondió|contestó)\s+(?:este\s+)?(?:candidato|persona)/i,
        /(?:qué|que)\s+(?:dice|dijo)\s+(?:este\s+)?(?:candidato|persona)/i,
        /(?:mensajes?|conversación|chat)\s+(?:de|con)/i,
        /(?:messages?|conversation|chat)\s+(?:from|with)/i,
        /(?:these|those|the)\s+\d+\s+(?:candidates?|people)/i,
        /(?:estos|esos|las)\s+\d+\s+(?:candidatos?|personas)/i
      ];
      
      const isMessageRetrieval = messageRetrievalPatterns.some(pattern => 
        pattern.test(userPrompt)
      );
      
      if (isMessageRetrieval || isCandidateQuestion) {
        if (foundPhoneNumbers.length === 1) {
          console.log(`📱 Detected message retrieval intent for single phone number: ${foundPhoneNumbers[0]}`);
          
          return {
            action: 'retrieve_messages',
            intent: 'retrieve_messages_for_phone',
            reasoning: 'Message retrieval intent detected with single phone number',
            parameters: {
              phone_number: foundPhoneNumbers[0],
              language: language
            },
            originalPrompt: userPrompt
          };
        } else {
          console.log(`📱 Detected message retrieval intent for multiple phone numbers: ${foundPhoneNumbers.join(', ')}`);
          
          return {
            action: 'retrieve_messages',
            intent: 'retrieve_messages_for_multiple_phones',
            reasoning: 'Message retrieval intent detected with multiple phone numbers',
            parameters: {
              phone_numbers: foundPhoneNumbers,
              language: language
            },
            originalPrompt: userPrompt
          };
        }
      }
    }
    
    // If it's a candidate question but no phone numbers found, try to get context from recent conversations
    if (isCandidateQuestion && foundPhoneNumbers.length === 0) {
      console.log(`🤔 Candidate question detected but no phone numbers found, will need context`);
      
      return {
        action: 'retrieve_messages',
        intent: 'retrieve_messages_context_needed',
        reasoning: 'Candidate question detected, need to find relevant conversation',
        parameters: {
          language: language,
          needs_context: true
        },
        originalPrompt: userPrompt
      };
    }
    
    // Check for direct phone number messaging (if not already handled as retrieve_messages)
    if (foundPhoneNumbers.length === 0) {
      for (const pattern of phonePatterns) {
        const phoneMatch = userPrompt.match(pattern);
        if (phoneMatch) {
          const normalizedPhone = normalizePhoneNumber(phoneMatch[0]);
          if (normalizedPhone) {
            console.log(`📱 Detected phone number for direct message: ${normalizedPhone}`);
            
            // Extract message content if provided
            let messageContent = null;
            const messagePatterns = [
              /diciendo\s+"([^"]+)"/,
              /diciendo\s+([^"]+?)(?:\s+al|\s*$)/,
              /saying\s+"([^"]+)"/,
              /saying\s+([^"]+?)(?:\s+to|\s*$)/
            ];
            
            for (const pattern of messagePatterns) {
              const match = userPrompt.match(pattern);
              if (match) {
                messageContent = match[1].trim();
                break;
              }
            }
            
            return {
              action: 'send_message',
              intent: 'send_direct_message_to_phone',
              reasoning: 'Phone number detected with optional message content',
              parameters: {
                phone_number: normalizedPhone,
                message: messageContent || 'Hola',
                language: language
              },
              originalPrompt: userPrompt
            };
          }
        }
      }
    }
    
    // Check for specific job position queries
    if (prompt.includes('programador') || prompt.includes('programmador') || prompt.includes('full stack')) {
      return {
        action: 'show_candidates',
        intent: 'show_candidates_for_position',
        reasoning: 'Keyword-based detection: Programador Full Stack query',
        parameters: {
          candidate_name: 'all',
          job_position: 'Programador Full Stack',
          language: language
        },
        originalPrompt: userPrompt
      };
    }
    
    // Simple fallback for candidate-related queries
    if (prompt.includes('candidate') || prompt.includes('candidato')) {
      return {
        action: 'show_candidates',
        intent: 'show_candidates_fallback',
        reasoning: 'Keyword-based detection: candidate-related query',
        parameters: {
          candidate_name: 'all',
          language: language
        },
        originalPrompt: userPrompt
      };
    }
    
    // Simple keyword-based intent detection
    if (prompt.includes('show') && (prompt.includes('candidate') || prompt.includes('candidato'))) {
      return {
        action: 'show_candidates',
        intent: 'show_candidates_fallback',
        reasoning: 'Keyword-based detection: show + candidate',
        parameters: {
          candidate_name: this.extractCandidateName(prompt, allData.candidates),
          language: language
        }
      };
    }
    
    if (prompt.includes('reference') || prompt.includes('referencia')) {
      return {
        action: 'show_candidates',
        intent: 'show_candidates_with_references',
        reasoning: 'Keyword-based detection: reference request',
        parameters: {
          candidate_name: this.extractCandidateName(prompt, allData.candidates),
          language: language
        },
        originalPrompt: userPrompt
      };
    }
    
    if (prompt.includes('send') && prompt.includes('message')) {
      return {
        action: 'send_message',
        intent: 'send_message_fallback',
        reasoning: 'Keyword-based detection: send + message',
        parameters: {
          candidate_name: this.extractCandidateName(prompt, allData.candidates),
          language: language
        },
        originalPrompt: userPrompt
      };
    }
    
    // Check for reference messaging (sending messages to references)
    if ((prompt.includes('send') || prompt.includes('enviar')) && (prompt.includes('reference') || prompt.includes('referencia'))) {
      return {
        action: 'send_reference_message',
        intent: 'send_reference_message_fallback',
        reasoning: 'Keyword-based detection: sending reference messages',
        parameters: {
          candidate_name: this.extractCandidateName(prompt, allData.candidates),
          job_position: this.extractJobPosition(prompt),
          language: language
        },
        originalPrompt: userPrompt
      };
    }
    
    // Check for showing references (not sending messages)
    if (prompt.includes('reference') || prompt.includes('referencia')) {
      return {
        action: 'show_references',
        intent: 'show_references_fallback',
        reasoning: 'Keyword-based detection: reference request',
        parameters: {
          candidate_name: this.extractCandidateName(prompt, allData.candidates),
          job_position: this.extractJobPosition(prompt),
          language: language
        },
        originalPrompt: userPrompt
      };
    }
    
    if (prompt.includes('question') || prompt.includes('pregunta')) {
      return {
        action: 'generate_questions',
        intent: 'generate_questions_fallback',
        reasoning: 'Keyword-based detection: question generation',
        parameters: {
          candidate_name: this.extractCandidateName(prompt, allData.candidates),
          language: language
        },
        originalPrompt: userPrompt
      };
    }
    
    // Default fallback
    return {
      action: 'general_chat',
      intent: 'general_chat_fallback',
      reasoning: 'No specific intent detected, using general chat',
      parameters: {
        language: language
      },
      originalPrompt: userPrompt
    };
  }

  extractCandidateName(prompt, candidates) {
    // Try to find a candidate name in the prompt
    for (const candidate of candidates) {
      if (prompt.includes(candidate.name.toLowerCase())) {
        return candidate.name;
      }
    }
    return null;
  }

  extractJobPosition(prompt) {
    // This method is deprecated - use AI-driven position matching instead
    // The TaskRouter now handles position matching with AI
    return null;
  }

  // New method to get relevant candidates based on the prompt
  getRelevantCandidates(prompt, allCandidates) {
    const lowerPrompt = prompt.toLowerCase();
    
    // If asking about specific candidates by name
    const candidateNames = allCandidates.map(c => c.name.toLowerCase());
    const mentionedCandidates = candidateNames.filter(name => 
      lowerPrompt.includes(name)
    );
    
    if (mentionedCandidates.length > 0) {
      const relevant = allCandidates.filter(c => 
        mentionedCandidates.includes(c.name.toLowerCase())
      );
      console.log(`🎯 Found ${relevant.length} specific candidates mentioned in prompt`);
      return relevant;
    }
    
    // If asking about jobs/offers/positions
    if (lowerPrompt.includes('job') || lowerPrompt.includes('offer') || lowerPrompt.includes('position') || 
        lowerPrompt.includes('what are') || lowerPrompt.includes('show me') || lowerPrompt.includes('list')) {
      // Get unique job titles
      const jobTitles = [...new Set(allCandidates.map(c => c.position).filter(Boolean))];
      const relevant = allCandidates.filter(c => c.position);
      console.log(`💼 Found ${relevant.length} candidates with job positions`);
      return relevant.slice(0, 10); // Limit to 10 for token efficiency
    }
    
    // If asking about all candidates, return a small sample
    if (lowerPrompt.includes('all') || lowerPrompt.includes('everyone') || lowerPrompt.includes('candidates')) {
      console.log(`👥 Returning sample of ${Math.min(5, allCandidates.length)} candidates for "all" query`);
      return allCandidates.slice(0, 5); // Only send 5 candidates to OpenAI
    }
    
    // Default: return empty array to minimize tokens
    console.log(`🔍 No specific query detected, returning minimal data`);
    return [];
  }

  // New lightweight classification using Ollama
  async classifyWithOllama(userPrompt, context = {}) {
    console.log('🎯 IntentDetector: Lightweight classification with Llama 3.2');
    
    try {
      const recentChatHistory = await this.loadRecentChatHistory();
      
      const systemPrompt = `Classify this recruitment prompt into one action:

ACTIONS:
- general_chat: Hello, thanks, casual conversation
- show_candidates: Show candidates, job positions, list data
- send_message: Send WhatsApp messages to candidates
- analyze_messages: Analyze WhatsApp messages
- generate_questions: Generate follow-up questions
- compare_candidates: Compare candidates
- analyze_resume: Analyze resumes
- draft_communication: Draft emails/messages

Respond with ONLY: {"action": "action_name", "confidence": 0.95}`;

      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.ollamaModel,
        prompt: `${systemPrompt}\n\nRecent chat: ${JSON.stringify(recentChatHistory.slice(-2))}\n\nUser: ${userPrompt}\n\nClassify:`,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 100
        }
      });

      const result = response.data.response;
      console.log('📊 Llama 2 classification:', result);

      try {
        const parsed = JSON.parse(result);
        return parsed;
      } catch (parseError) {
        console.error('❌ Failed to parse Llama 2 response:', parseError);
        return this.fallbackClassification(userPrompt);
      }

    } catch (error) {
      console.error('❌ Error in Ollama classification:', error);
      return this.fallbackClassification(userPrompt);
    }
  }

  fallbackClassification(userPrompt) {
    const prompt = userPrompt.toLowerCase();
    
    // Check for phone number patterns (international format)
    const phonePattern = /\+?\d{10,15}/;
    const phoneMatch = userPrompt.match(phonePattern);
    const hasPhoneNumber = phoneMatch !== null;
    
    // Check for direct messaging patterns
    const directMessagePatterns = [
      /send.*message.*to.*\+?\d/,
      /send.*to.*\+?\d/,
      /message.*\+?\d/,
      /\+?\d.*message/
    ];
    
    const isDirectMessage = directMessagePatterns.some(pattern => pattern.test(prompt));
    
    // If it has a phone number or direct message pattern, classify as send_message
    if (hasPhoneNumber || isDirectMessage) {
      console.log('📱 Detected phone number or direct message pattern in fallback classification');
      
      // Extract phone number
      const phoneMatch = userPrompt.match(/\+?\d{10,15}/);
      const phoneNumber = phoneMatch ? phoneMatch[0] : null;
      
      // Extract message content if provided
      let messageContent = null;
      
      // Try different patterns for message extraction
      const messagePatterns = [
        /saying\s+"([^"]+)"/,
        /saying\s+([^"]+?)(?:\s+to|\s*$)/,
        /send\s+"([^"]+)"\s+to/,
        /message\s+"([^"]+)"/,
        /"([^"]+)"\s+to\s+\+?\d/,
        /saying\s+(.+?)(?:\s+to\s+\+?\d|\s*$)/
      ];
      
      for (const pattern of messagePatterns) {
        const match = userPrompt.match(pattern);
        if (match) {
          messageContent = match[1].trim();
          break;
        }
      }
      
      console.log('📱 Extracted phone number:', phoneNumber);
      console.log('📱 Extracted message content:', messageContent);
      
      // If no quoted message found, try to extract message after "send" or "message"
      if (!messageContent) {
        const sendMatch = userPrompt.match(/send\s+(?:a\s+)?(?:message\s+)?(?:to\s+)?\+?\d+\s+(.+)/i);
        if (sendMatch) {
          messageContent = sendMatch[1].trim();
        }
      }
      
      return {
        action: 'send_message',
        intent: 'Send a direct message to a specific phone number',
        reasoning: 'The user has requested to send a message to a specific phone number',
        parameters: {
          phone_number: phoneNumber,
          message: messageContent,
          direct_phone: true,
          language: 'es'
        },
        originalPrompt: userPrompt
      };
    }
    
    if (prompt.includes('hello') || prompt.includes('hi') || prompt.includes('how are you')) {
      return { action: 'general_chat', confidence: 0.8, originalPrompt: userPrompt };
    }
    
    // Check for job position patterns
    const jobPositionPatterns = [
      /programación\s+full\s+stack/i,
      /desarrollador\s+full\s+stack/i,
      /full\s+stack/i,
      /frontend/i,
      /backend/i,
      /desarrollador/i,
      /programador/i,
      /ingeniero/i,
      /developer/i,
      /programming/i
    ];
    
    const hasJobPosition = jobPositionPatterns.some(pattern => pattern.test(userPrompt));
    
    if (hasJobPosition) {
      // Extract the job position from the user prompt
      let jobPosition = null;
      for (const pattern of jobPositionPatterns) {
        const match = userPrompt.match(pattern);
        if (match) {
          jobPosition = match[0];
          break;
        }
      }
      
      return {
        action: 'show_candidates',
        intent: `Show candidates for ${jobPosition} position`,
        reasoning: `Detected job position: ${jobPosition}`,
        parameters: {
          job_position: jobPosition,
          language: 'es'
        },
        originalPrompt: userPrompt
      };
    }
    
    if (prompt.includes('show') || prompt.includes('list') || prompt.includes('what are')) {
      return { action: 'show_candidates', confidence: 0.8, originalPrompt: userPrompt };
    }
    
    if (prompt.includes('send message') || prompt.includes('message')) {
      return { action: 'send_message', confidence: 0.8, originalPrompt: userPrompt };
    }
    
    if (prompt.includes('question') || prompt.includes('pregunta')) {
      return { action: 'generate_questions', confidence: 0.8, originalPrompt: userPrompt };
    }
    
    return { action: 'general_chat', confidence: 0.6, originalPrompt: userPrompt };
  }

  async loadRecentChatHistory() {
    try {
      const chatHistoryPath = path.join(__dirname, '..', 'data', 'chatHistory.json');
      if (fs.existsSync(chatHistoryPath)) {
        const chatHistoryData = fs.readFileSync(chatHistoryPath, 'utf8');
        const allChatHistory = JSON.parse(chatHistoryData);
        return allChatHistory.slice(-3);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
    return [];
  }
}

module.exports = IntentDetector; 