require('dotenv').config();
const messageHistory = require('../data/messageHistory');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DatabaseService = require('./DatabaseService');
const fs = require('fs');
const path = require('path');

class TaskRouter {
  constructor() {
    this.openai = openai;
    this.databaseService = new DatabaseService();
  }

  async routeTask(intentData, context = {}, allData = {}) {
    console.log('TaskRouter: Routing task based on intent');
    console.log('Intent data:', intentData);

    const { action } = intentData;
    
    // Simple operations that don't need OpenAI
    if (action === 'general_chat') {
      return await this.handleGeneralChatSimple(intentData, context, allData);
    }
    
    if (action === 'show_candidates') {
      return await this.handleShowCandidatesSimple(intentData, context, allData);
    }
    
    if (action === 'provide_info') {
      return await this.handleProvideInfo(intentData, context, allData);
    }
    
    if (action === 'show_references') {
      return await this.handleShowReferences(intentData, context, allData);
    }
    
    if (action === 'show_positions') {
      return await this.handleShowPositions(intentData, context, allData);
    }

    if (action === 'send_reference_message') {
      return await this.handleSendReferenceMessage(intentData, context, allData);
    }

    if (action === 'receive_reference_message') {
      return await this.handleReceiveReferenceMessage(intentData, context, allData);
    }

    if (action === 'send_direct_reference_message') {
      return await this.handleSendDirectReferenceMessage(intentData, context, allData);
    }

    // Complex operations that need OpenAI
    switch (action) {
      case 'send_message':
        return await this.handleSendMessage(intentData, context, allData);
      
      case 'analyze_messages':
        return await this.handleAnalyzeMessages(intentData, context, allData);
      
      case 'retrieve_messages':
        return await this.handleRetrieveMessages(intentData, context, allData);
      
      case 'retrieve_reference_responses':
        return await this.handleRetrieveReferenceResponses(intentData, context, allData);
      
      case 'analyze_aihistory':
        return await this.handleAnalyzeAIHistory(intentData, context, allData);
      
      case 'generate_questions':
        return await this.handleGenerateQuestions(intentData, context, allData);
      
      case 'compare_candidates':
        return await this.handleCompareCandidates(intentData, context, allData);
      
      case 'analyze_resume':
        return await this.handleAnalyzeResume(intentData, context, allData);
      
      case 'draft_communication':
        return await this.handleDraftCommunication(intentData, context, allData);
      
      default:
        return await this.handleGeneralChatSimple(intentData, context, allData);
    }
  }

  // Simple handlers (no OpenAI needed)
  async handleGeneralChatSimple(intentData, context, allData) {
    console.log('💬 Handling general chat with context awareness');
    
    // Get recent chat history for context
    const recentChatHistory = allData.chatHistory ? allData.chatHistory.slice(-6) : []; // Get last 6 messages (3 exchanges)
    console.log(`📝 Using ${recentChatHistory.length} recent chat messages for context`);
    
    // Get detected language from intent data
    const language = intentData.parameters?.language || 'es'; // Default to Spanish
    console.log('🌍 Using language:', language);
    
    const userPrompt = intentData.intent.toLowerCase();
    
    // Check if this is a question about job positions or candidates
    const isJobQuestion = userPrompt.includes('job') || userPrompt.includes('position') || 
                         userPrompt.includes('candidate') || userPrompt.includes('most') ||
                         userPrompt.includes('which one') || userPrompt.includes('out of');
    
    if (isJobQuestion) {
      // Use AI to determine which job position the user is asking about
      let jobPosition = null;
      
      // Check recent chat history for job position context using AI
      if (recentChatHistory.length > 0) {
        const recentContext = recentChatHistory.map(msg => `${msg.sender}: ${msg.message}`).join('\n');
        const allPositions = [...new Set(allData.candidates.map(c => c.position))];
        
        try {
          const jobExtractionPrompt = `Analiza el siguiente contexto de conversación y extrae la posición de trabajo mencionada.

CONTEXTO DE CONVERSACIÓN:
${recentContext}

POSICIONES DISPONIBLES:
${allPositions.map((pos, index) => `${index + 1}. ${pos}`).join('\n')}

INSTRUCCIONES:
- Si se menciona una posición de trabajo específica, responde solo con el nombre exacto de la posición
- Si no se menciona ninguna posición, responde "NINGUNA"
- Considera variaciones de escritura y sinónimos

Posición de trabajo:`;

          const completion = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              { role: 'system', content: jobExtractionPrompt }
            ],
            temperature: 0.1,
            max_tokens: 50
          });

          const extractedPosition = completion.choices[0].message.content.trim();
          if (extractedPosition && extractedPosition !== 'NINGUNA' && allPositions.includes(extractedPosition)) {
            jobPosition = extractedPosition;
            console.log(`🤖 AI extracted job position from context: "${jobPosition}"`);
          }
        } catch (error) {
          console.error('Error extracting job position from context:', error);
        }
      }
      
      if (jobPosition) {
        // Count candidates for this position
        const candidatesForPosition = allData.candidates.filter(c => 
          c.position === jobPosition
        );
        
        const message = language === 'es' 
          ? `Para la posición "${jobPosition}", encontré ${candidatesForPosition.length} candidatos.`
          : `For the "${jobPosition}" position, I found ${candidatesForPosition.length} candidates.`;
          
        return {
          success: true,
          data: { 
            message: message
          },
          intentData: intentData
        };
      } else {
        // Count candidates for all positions
        const positionCounts = {};
        if (allData.candidates && Array.isArray(allData.candidates)) {
          allData.candidates.forEach(c => {
            if (c.position) {
              positionCounts[c.position] = (positionCounts[c.position] || 0) + 1;
            }
          });
        }
        
        const sortedPositions = Object.entries(positionCounts)
          .sort(([,a], [,b]) => b - a)
          .map(([position, count]) => `${position}: ${count} candidates`);
        
        const message = language === 'es'
          ? `Aquí están las posiciones de trabajo y sus conteos de candidatos:\n\n${sortedPositions.join('\n')}`
          : `Here are the job positions and their candidate counts:\n\n${sortedPositions.join('\n')}`;
          
        return {
          success: true,
          data: { 
            message: message
          },
          intentData: intentData
        };
      }
    }
    
    // Check if this is a follow-up question about candidates
    const isFollowUpQuestion = userPrompt.includes('which one') || 
                              userPrompt.includes('pick') || 
                              userPrompt.includes('choose') ||
                              userPrompt.includes('best') ||
                              userPrompt.includes('recommend');
    
    if (isFollowUpQuestion && recentChatHistory.length > 0) {
      // Look for recent AI responses that might indicate candidate analysis
      const recentAIResponses = recentChatHistory.filter(msg => 
        msg.sender === 'ai' && 
        (msg.message.includes('comparison') || 
         msg.message.includes('analysis') || 
         msg.message.includes('candidates') ||
         msg.message.includes('ranked') ||
         msg.message.includes('recommend'))
      );
      
      if (recentAIResponses.length > 0) {
        const lastAIResponse = recentAIResponses[recentAIResponses.length - 1];
        console.log(`🎯 Found recent AI response: ${lastAIResponse.message}`);
        
        // If the last response was about comparison or analysis, provide a helpful follow-up
        if (lastAIResponse.message.includes('comparison') || lastAIResponse.message.includes('analysis')) {
                  const message = language === 'es'
          ? `Basándome en el análisis reciente, recomiendo hacer seguimiento con el candidato principal identificado. ¿Te gustaría que te muestre su información de contacto o te ayude a generar preguntas de seguimiento para él?`
          : `Based on the recent analysis, I recommend following up with the top candidate identified. Would you like me to show you their contact information or help you generate follow-up questions for them?`;
          
        return {
          success: true,
          data: { 
            message: message
          },
          intentData: intentData
        };
        }
        
        // If the last response was about candidates, suggest comparison
        if (lastAIResponse.message.includes('candidates')) {
                  const message = language === 'es'
          ? `Veo que estabas viendo candidatos. Para ayudarte a elegir el mejor, te recomiendo ejecutar un análisis de comparación. ¿Te gustaría que compare los candidatos por ti?`
          : `I see you were looking at candidates. To help you choose the best one, I'd recommend running a comparison analysis. Would you like me to compare the candidates for you?`;
          
        return {
          success: true,
          data: { 
            message: message
          },
          intentData: intentData
        };
        }
      }
      
      // Look for recent user messages about job positions using AI
      const recentUserMessages = recentChatHistory.filter(msg => 
        msg.sender === 'user' && 
        (msg.message.toLowerCase().includes('position') ||
         msg.message.toLowerCase().includes('trabajo') ||
         msg.message.toLowerCase().includes('job') ||
         msg.message.toLowerCase().includes('candidato') ||
         msg.message.toLowerCase().includes('candidate'))
      );
      
      if (recentUserMessages.length > 0) {
        const lastUserMessage = recentUserMessages[recentUserMessages.length - 1];
        console.log(`🎯 Found recent user message about job: ${lastUserMessage.message}`);
        
        const message = language === 'es'
          ? `Veo que estabas preguntando sobre candidatos para una posición específica. Para ayudarte a elegir el mejor candidato, te recomiendo ejecutar un análisis de comparación. ¿Te gustaría que compare los candidatos para esta posición?`
          : `I see you were asking about candidates for a specific position. To help you choose the best candidate, I'd recommend running a comparison analysis. Would you like me to compare the candidates for this position?`;
          
        return {
          success: true,
          data: { 
            message: message
          },
          intentData: intentData
        };
      }
    }
    
    // Use OpenAI for natural conversation handling instead of hard-coded responses
    const systemPrompt = `Eres un asistente de reclutamiento amigable y útil. Responde de manera natural y apropiada.

Si el usuario expresa gratitud (gracias, thank you, etc.), responde de manera cálida y amigable diciendo que estás aquí para ayudar.

Si el usuario hace una pregunta general, responde de manera útil y profesional.

Mantén las respuestas concisas y en el idioma del usuario (${language === 'es' ? 'español' : 'inglés'}).

Contexto de la conversación: ${recentChatHistory.length > 0 ? 'Conversación previa disponible' : 'Nueva conversación'}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 100
      });

      return {
        success: true,
        data: { 
          message: completion.choices[0].message.content
        },
        intentData: intentData
      };
    } catch (error) {
      console.error('Error in general chat:', error);
      // Fallback response
      const fallbackMessage = language === 'es' 
        ? '¡De nada! Estoy aquí para ayudarte cuando me necesites.'
        : 'You\'re welcome! I\'m here to help whenever you need me.';
        
      return {
        success: true,
        data: { 
          message: fallbackMessage
        },
        intentData: intentData
      };
    }

    // Default response with context awareness
    if (recentChatHistory.length > 0) {
      const message = language === 'es'
        ? 'Puedo ayudarte con tus tareas de reclutamiento. Basándome en nuestra conversación reciente, podrías querer comparar candidatos, analizar currículums, o obtener más detalles sobre candidatos específicos. ¿Qué te gustaría hacer a continuación?'
        : 'I can help you with your recruitment tasks. Based on our recent conversation, you might want to compare candidates, analyze resumes, or get more details about specific candidates. What would you like to do next?';
        
      return {
        success: true,
        data: { 
          message: message
        },
        intentData: intentData
      };
    }

    // Default response
    const defaultMessage = language === 'es'
      ? '¡Hola! Soy tu asistente de reclutamiento. Puedo ayudarte a encontrar y analizar candidatos, comparar perfiles, y gestionar el proceso de contratación. ¿En qué puedo asistirte hoy?'
      : 'I\'m here to help you with your recruitment tasks. You can ask me to show candidates, send messages, analyze data, and more!';
      
    return {
      success: true,
      data: { 
        message: defaultMessage
      },
      intentData: intentData
    };
  }

  async handleProvideInfo(intentData, context, allData) {
    console.log('Handling provide info request');
    
    // Use DatabaseService to get fresh candidate data
    let candidates = [];
    try {
      // Pass token and userId from context to DatabaseService
      const token = context.token || allData.token;
      const userId = context.userId || allData.userId;
      candidates = await this.databaseService.fetchCandidates(token, userId);
      console.log(`Using candidates from database: ${candidates.length} candidates`);
    } catch (error) {
      console.error('Error fetching candidates from database:', error);
      // Fallback to context or allData if database fails
      candidates = context.candidates && context.candidates.length ? context.candidates : (allData.candidates || []);
      console.log(`Falling back to context/allData: ${candidates.length} candidates`);
    }

    if (!candidates || candidates.length === 0) {
      return {
        success: true,
        data: { 
          message: "No se pudo acceder a la base de datos de candidatos. Por favor, revisa la conexión o los permisos." 
        },
        intentData: intentData
      };
    }

    const parameters = intentData.parameters || {};
    const originalPrompt = intentData.originalPrompt || '';
    
    // Extract candidate name from parameters or original prompt
    let candidateName = parameters.candidate_name;
    
    if (!candidateName) {
      // Try to extract from original prompt using a more flexible approach
      const prompt = originalPrompt.toLowerCase();
      console.log(`Extracting candidate name from prompt: "${originalPrompt}"`);
      
      // Look for candidate names in the prompt
      for (const candidate of candidates) {
        const candidateNameLower = candidate.name.toLowerCase();
        if (prompt.includes(candidateNameLower)) {
          candidateName = candidate.name;
          console.log(`Found candidate name: "${candidateName}"`);
          break;
        }
      }
      
      // If still not found, try to extract from the prompt more broadly
      if (!candidateName) {
        console.log(`No exact match found, trying broader extraction...`);
        // Look for patterns like "numero de X" or "telefono de X"
        const patterns = [
          /(?:numero|telefono|phone|number)\s+(?:de|of)\s+([a-zA-Z\s]+)/i,
          /([a-zA-Z\s]+)\s+(?:numero|telefono|phone|number)/i
        ];
        
        for (const pattern of patterns) {
          const match = originalPrompt.match(pattern);
          if (match && match[1]) {
            const extractedName = match[1].trim();
            console.log(`Extracted potential name: "${extractedName}"`);
            
            // Try to find a close match
            for (const candidate of candidates) {
              if (candidate.name.toLowerCase().includes(extractedName.toLowerCase()) || 
                  extractedName.toLowerCase().includes(candidate.name.toLowerCase())) {
                candidateName = candidate.name;
                console.log(`Found close match: "${candidateName}"`);
                break;
              }
            }
            if (candidateName) break;
          }
        }
      }
    }

    // Robust candidate name matching (accent/case-insensitive, partial)
    function normalize(str) {
      return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    let candidate = candidates.find(c => normalize(c.name) === normalize(candidateName));
    if (!candidate && candidateName) {
      candidate = candidates.find(c => normalize(c.name).includes(normalize(candidateName)));
    }
    if (!candidate && candidateName) {
      candidate = candidates.find(c => normalize(candidateName).includes(normalize(c.name)));
    }
    if (!candidate) {
      // Log available candidates for debugging
      console.log('Available candidates:', candidates.map(c => c.name));
      return {
        success: true,
        data: { 
          message: `No pude encontrar un candidato llamado "${candidateName}". ¿Podrías verificar la ortografía o proporcionar un nombre diferente?` 
        },
        intentData: intentData
      };
    }

    // Format the candidate information in Spanish
    const language = intentData.parameters?.language || 'es';
    
    let info = `**${candidate.name}**\n` +
               `Email: ${candidate.email || 'No proporcionado'}\n` +
               `Teléfono: ${candidate.phone || 'No proporcionado'}\n` +
               `Posición: ${candidate.position || 'No especificada'}\n` +
               `Experiencia: ${candidate.experience || 'No especificada'}\n` +
               `Habilidades: ${(candidate.skills || []).join(', ') || 'No especificadas'}\n` +
               `Idiomas: ${(candidate.languages || []).join(', ') || 'No especificados'}\n` +
               `Ubicación: ${candidate.location || 'No especificada'}\n` +
               `Expectativa Salarial: ${candidate.salary_expectation || 'No especificada'}\n` +
               `Disponibilidad: ${candidate.availability || 'No especificada'}`;
    
    // Add references if available
    if (candidate.references && candidate.references.length > 0) {
      info += `\n\nReferencias (${candidate.references.length}):\n`;
      candidate.references.forEach((ref, index) => {
        info += `${index + 1}. ${ref.name}\n` +
                `   • Posición: ${ref.position || 'No especificada'}\n` +
                `   • Empresa: ${ref.company || 'No especificada'}\n` +
                `   • Teléfono: ${ref.contact?.phone || 'No disponible'}\n` +
                `   • Email: ${ref.contact?.email || 'No disponible'}\n`;
      });
    } else {
      info += `\n\nReferencias: No disponibles`;
    }
    
    return {
      success: true,
      data: {
        message: info,
        candidate: candidate,
        candidateName: candidate.name
      },
      intentData: intentData
    };
  }

  async handleShowPositions(intentData, context, allData) {
    console.log('Handling show positions request');
    
    const language = intentData.parameters?.language || 'es';
    
    // Count candidates for all positions
    const positionCounts = {};
    if (allData.candidates && Array.isArray(allData.candidates)) {
      allData.candidates.forEach(c => {
        if (c.position) {
          positionCounts[c.position] = (positionCounts[c.position] || 0) + 1;
        }
      });
    }
    
    const sortedPositions = Object.entries(positionCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([position, count]) => `${position}: ${count} candidatos`);
    
    const message = language === 'es'
      ? `Aquí están las posiciones de trabajo disponibles:\n\n${sortedPositions.join('\n')}`
      : `Here are the available job positions:\n\n${sortedPositions.join('\n')}`;
      
    return {
      success: true,
      data: { 
        message: message,
        positions: Object.keys(positionCounts),
        positionCounts: positionCounts
      },
      intentData: intentData
    };
  }

  async handleShowReferences(intentData, context, allData) {
    console.log('Handling show references request');
    
    const { parameters } = intentData;
    
    // Handle specific candidate references
    if (parameters.candidate_name && parameters.candidate_name !== 'all') {
      const candidate = this.findCandidate(parameters.candidate_name, null, allData);
      if (candidate) {
        const references = candidate.references || [];
        if (references.length > 0) {
          const referenceInfo = references.map((ref, i) => 
            `**${i + 1}. ${ref.name}**\n` +
            `   • Position: ${ref.position || 'Not specified'}\n` +
            `   • Company: ${ref.company || 'Not specified'}\n` +
            `   • Phone: ${ref.contact?.phone || 'Not available'}\n` +
            `   • Email: ${ref.contact?.email || 'Not available'}`
          ).join('\n\n');
          
          return {
            success: true,
            data: {
              message: `References for **${candidate.name}**:\n\n${referenceInfo}`,
              candidate: candidate,
              references: references,
              count: references.length
            },
            intentData: intentData
          };
        } else {
          return {
            success: true,
            data: {
              message: `**${candidate.name}** doesn't have any references in the database.`,
              candidate: candidate,
              references: [],
              count: 0
            },
            intentData: intentData
          };
        }
      }
    }
    
    // Handle job position references (show references for all candidates in that position)
    if (parameters.job_position) {
      const targetPosition = parameters.job_position.toLowerCase().trim();
      const candidatesForPosition = allData.candidates.filter(c => {
        if (!c.position) return false;
        const candidatePosition = c.position.toLowerCase().trim();
        return candidatePosition.includes(targetPosition) || targetPosition.includes(candidatePosition);
      });
      
      let allReferences = [];
      let candidatesWithReferences = [];
      
      for (const candidate of candidatesForPosition) {
        const references = candidate.references || [];
        if (references.length > 0) {
          candidatesWithReferences.push(candidate);
          allReferences.push(...references.map(ref => ({
            ...ref,
            candidateName: candidate.name
          })));
        }
      }
      
      if (allReferences.length > 0) {
        const referenceInfo = allReferences.map((ref, i) => 
          `**${i + 1}. ${ref.name}** (Reference for ${ref.candidateName})\n` +
          `   • Position: ${ref.position || 'Not specified'}\n` +
          `   • Company: ${ref.company || 'Not specified'}\n` +
          `   • Phone: ${ref.contact?.phone || 'Not available'}\n` +
          `   • Email: ${ref.contact?.email || 'Not available'}`
        ).join('\n\n');
        
        return {
          success: true,
          data: {
            message: `References for **${parameters.job_position}** candidates:\n\n${referenceInfo}`,
            candidates: candidatesWithReferences,
            references: allReferences,
            jobPosition: parameters.job_position,
            count: allReferences.length
          },
          intentData: intentData
        };
      } else {
        return {
          success: true,
          data: {
            message: `No references found for any candidates in the **${parameters.job_position}** position.`,
            candidates: candidatesForPosition,
            references: [],
            jobPosition: parameters.job_position,
            count: 0
          },
          intentData: intentData
        };
      }
    }
    
    return {
      success: true,
      data: {
        message: "Please specify a candidate name or job position to show references for."
      },
      intentData: intentData
    };
  }

  async handleShowCandidatesSimple(intentData, context, allData) {
    console.log('Handling show candidates (data formatting only)');
    
    // Use DatabaseService to get fresh candidate data
    let candidates = [];
    try {
      // Pass token and userId from context to DatabaseService
      const token = context.token || allData.token;
      const userId = context.userId || allData.userId;
      candidates = await this.databaseService.fetchCandidates(token, userId);
      console.log(`Total candidates loaded from database: ${candidates.length}`);
    } catch (error) {
      console.error('Error fetching candidates from database:', error);
      // Fallback to allData if database fails
      candidates = allData.candidates || [];
      console.log(`Falling back to allData: ${candidates.length} candidates`);
    }
    
    if (!candidates || candidates.length === 0) {
      console.log('No candidates data available');
      return {
        success: true,
        data: { 
          message: "No tengo acceso a los datos de candidatos en este momento. Esto podría deberse a problemas de autenticación o que los datos no estén disponibles." 
        },
        intentData: intentData
      };
    }
    
    console.log(`Sample candidate positions:`, candidates.slice(0, 5).map(c => `${c.name}: ${c.position}`));

    const prompt = intentData.intent.toLowerCase();
    const parameters = intentData.parameters || {};
    
    // Get job position from parameters, context, or recent conversation
    let jobPosition = parameters.job_position;
    
    // If no job position in parameters, try to get it from context
    if (!jobPosition && context.jobPosition) {
      jobPosition = context.jobPosition;
    }
    
    // If still no job position, try to extract from the current user request and recent chat history using AI
    if (!jobPosition) {
      const userRequest = intentData.originalPrompt || intentData.intent || '';
      const recentMessages = allData.chatHistory ? allData.chatHistory.slice(-4) : []; // Last 4 messages
      const recentContext = recentMessages.map(msg => `${msg.sender}: ${msg.message}`).join('\n');
      
      const jobExtractionPrompt = `Analiza la siguiente solicitud del usuario y el contexto de conversación para extraer la posición de trabajo mencionada.

SOLICITUD ACTUAL DEL USUARIO: "${userRequest}"

CONTEXTO DE CONVERSACIÓN RECIENTE:
${recentContext}

POSICIONES DISPONIBLES EN LA BASE DE DATOS:
${[...new Set(candidates.map(c => c.position))].join(', ')}

INSTRUCCIONES:
- Analiza la solicitud del usuario y encuentra la posición de trabajo más apropiada de la lista disponible
- Considera variaciones de escritura, sinónimos y términos relacionados
- Si hay una coincidencia clara, responde solo con el nombre exacto de la posición
- Si no hay coincidencia clara, responde "NINGUNA"

Posición de trabajo:`;

      try {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: 'system', content: jobExtractionPrompt }
          ],
          temperature: 0.1,
          max_tokens: 50
        });

        const extractedPosition = completion.choices[0].message.content.trim();
        if (extractedPosition && extractedPosition !== 'NINGUNA') {
          // Find the exact position from the database (handling trailing spaces)
          const exactPosition = candidates.map(c => c.position).find(pos => 
            pos && pos.trim() === extractedPosition.trim()
          );
          if (exactPosition) {
            jobPosition = exactPosition; // Use the exact position from database
            console.log(`AI extracted job position from context: "${jobPosition}"`);
          }
        }
      } catch (error) {
        console.error('Error extracting job position from context:', error);
        // No fallback: if AI fails, do not attempt to match with any hard-coded or fallback keywords
        // Just leave jobPosition as null
      }
    }
    
    console.log(`Job position context: "${jobPosition}"`);

    // Handle "best X candidates" - this should trigger analysis, not just listing
    if (prompt.includes('top') || prompt.includes('best') || parameters.candidate_name === 'all') {
      console.log('Handling request for best candidates - redirecting to analysis');
      
      // Determine how many candidates to analyze
      let candidateCount = 3; // Default
      
      // First try to get from parameters
      if (parameters.number_of_candidates) {
        candidateCount = parseInt(parameters.number_of_candidates);
        console.log(`Using candidate count from parameters: ${candidateCount}`);
      } else {
        // Try to extract from the original user prompt
        const originalPrompt = intentData.originalPrompt || intentData.intent || '';
        const numberMatch = originalPrompt.match(/(\d+)/);
        if (numberMatch) {
          candidateCount = parseInt(numberMatch[1]);
          console.log(`Extracted candidate count from prompt: ${candidateCount}`);
        } else {
          console.log(`Using default candidate count: ${candidateCount}`);
        }
      }
      
      // Use the job position we determined above
      if (!jobPosition) {
        return {
          success: true,
          data: {
            message: "Necesito saber qué posición de trabajo estás preguntando. ¿Podrías especificar la posición?",
            candidates: [],
            count: 0
          },
          intentData: intentData
        };
      }
      
      console.log(`Analyzing candidates for position: "${jobPosition}"`);
      
      // Filter candidates for the specific job position
      const targetPosition = jobPosition.toLowerCase().trim();
      console.log(`Filtering candidates for position: "${targetPosition}"`);
      
      const qualifiedCandidates = candidates.filter(c => {
        if (!c.position || c.position === 'Unknown Position') {
          console.log(`Skipping candidate ${c.name} - no position or Unknown Position`);
          return false;
        }
        
        const candidatePosition = c.position.toLowerCase().trim();
        console.log(`Checking candidate ${c.name}: "${candidatePosition}" vs target "${targetPosition}"`);
        
        // More flexible matching - check if either contains the other
        const positionMatch = candidatePosition.includes(targetPosition) || targetPosition.includes(candidatePosition);
        
        // Also check for common spelling variations
        const normalizedTarget = targetPosition.replace(/[^a-z]/g, ''); // Remove spaces and special chars
        const normalizedCandidate = candidatePosition.replace(/[^a-z]/g, '');
        const normalizedMatch = normalizedCandidate.includes(normalizedTarget) || normalizedTarget.includes(normalizedCandidate);
        
        // No hard-coded variation logic. Only AI should determine position similarity.
        return positionMatch || normalizedMatch;
      }).slice(0, 60); // LIMIT TO 60 CANDIDATES MAX
      
      console.log(`Found ${qualifiedCandidates.length} candidates for position "${jobPosition}"`);
      
      // Take top N candidates for analysis
      const candidatesToAnalyze = qualifiedCandidates.slice(0, Math.min(candidateCount, qualifiedCandidates.length));
      
      if (candidatesToAnalyze.length === 0) {
        return {
          success: true,
          data: {
            message: "No pude encontrar candidatos calificados con posiciones específicas. La mayoría de candidatos tienen estado 'Posición Desconocida'.",
            candidates: [],
            count: 0
          },
          intentData: intentData
        };
      }
      
      // Create analysis prompt for OpenAI
      const analysisPrompt = `Analyze and rank the top ${candidateCount} candidates for the "${jobPosition}" position from this list based on their skills, experience, salary expectations, and overall fit. Consider:
      
1. **Skills Match**: How well their skills align with the "${jobPosition}" position
2. **Experience Quality**: Not just years, but relevance and depth for this role
3. **Salary Expectations**: Reasonableness and market alignment for this position
4. **Overall Profile**: Education, languages, location, availability

Candidates to analyze for "${jobPosition}" position:
${candidatesToAnalyze.map((c, i) => `${i + 1}. ${c.name} (${c.position})
   - Experience: ${c.experience}
   - Skills: ${(c.skills || []).join(', ')}
   - Salary: ${c.salary_expectation}
   - Location: ${c.location}
   - Availability: ${c.availability}
   - Languages: ${(c.languages || []).join(', ')}`).join('\n\n')}

Please provide:
1. Top ${candidateCount} candidates ranked by overall fit for the "${jobPosition}" position
2. Brief analysis of why each was selected for this specific role
3. Key strengths and potential concerns for each candidate in this position
4. Overall recommendation for the "${jobPosition}" role`;

      // Return the analysis prompt to be processed by OpenAI
      return {
        success: true,
        data: {
          message: `Analizaré los mejores ${candidateCount} candidatos para ti basándome en sus habilidades, experiencia, expectativas salariales y ajuste general. Déjame procesar este análisis...`,
          analysisPrompt: analysisPrompt,
          candidates: candidatesToAnalyze,
          count: candidateCount,
          needsAnalysis: true,
          jobPosition: jobPosition // Use the actual job position being analyzed
        },
        intentData: intentData
      };
    }

    // Check if asking for candidates of a specific job position (either from parameters or AI extraction)
    if (parameters.job_position || jobPosition) {
      const requestedPosition = parameters.job_position || jobPosition;
      console.log(`🎯 AI-driven filtering for position: "${requestedPosition}"`);
      
      // Use AI to find the best matching position from available positions
      const allPositions = [...new Set(allData.candidates.map(c => c.position))];
      
      try {
        const positionMatchingPrompt = `Analiza la siguiente solicitud del usuario y encuentra la posición de trabajo más apropiada de la lista disponible.

SOLICITUD DEL USUARIO: "${requestedPosition}"

POSICIONES DISPONIBLES:
${allPositions.map((pos, index) => `${index + 1}. ${pos}`).join('\n')}

INSTRUCCIONES:
- Analiza la solicitud del usuario y encuentra la posición que mejor coincida
- Considera variaciones de escritura, sinónimos y términos relacionados
- Busca la posición que contenga palabras similares o relacionadas con lo que dijo el usuario
- Responde solo con el nombre exacto de la posición de la lista
- Si no hay coincidencia clara, responde "NINGUNA_COINCIDENCIA"

Posición más apropiada:`;

        const completion = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: 'system', content: positionMatchingPrompt }
          ],
          temperature: 0.1,
          max_tokens: 50
        });

        const aiMatchedPosition = completion.choices[0].message.content.trim();
        
        if (aiMatchedPosition && aiMatchedPosition !== 'NINGUNA_COINCIDENCIA' && allPositions.some(pos => pos.trim() === aiMatchedPosition.trim())) {
          console.log(`🤖 AI matched "${requestedPosition}" to "${aiMatchedPosition}"`);
          
          // Filter candidates using the AI-matched position (handle trailing spaces)
          const filteredCandidates = allData.candidates.filter(c => 
            c.position && c.position.trim() === aiMatchedPosition.trim()
          );

          console.log(`📊 Found ${filteredCandidates.length} candidates for "${aiMatchedPosition}"`);

          if (filteredCandidates.length === 0) {
            // If AI matching fails or no match found, show all available positions
            return {
              success: true,
              data: {
                message: `No candidates found for the position "${requestedPosition}". Available positions are: ${allPositions.join(', ')}`,
                candidates: [],
                jobPosition: requestedPosition,
                availablePositions: allPositions
              },
              intentData: intentData
            };
          }

          // Format candidates nicely for specific position
          const candidateList = filteredCandidates.map((c, index) => {
            return `**${index + 1}. ${c.name}**\n` +
                   `   Position: ${c.position}\n` +
                   `   Experience: ${c.experience || 'Not specified'}\n` +
                   `   Skills: ${(c.skills || []).slice(0, 3).join(', ')}${c.skills && c.skills.length > 3 ? '...' : ''}\n` +
                   `   Location: ${c.location || 'Not specified'}\n` +
                   `   Salary: ${c.salary_expectation || 'Not specified'}\n`;
          }).join('\n');

          return {
            success: true,
            data: {
              message: `Candidates for ${requestedPosition} (matched to "${aiMatchedPosition}"):\n\n${candidateList}`,
              candidates: filteredCandidates,
              jobPosition: aiMatchedPosition,
              originalRequest: requestedPosition,
              count: filteredCandidates.length
            },
            intentData: intentData
          };
        }
      } catch (error) {
        console.error('Error in AI position matching:', error);
      }
      
      // If AI matching fails, show available positions
      const availablePositions = [...new Set(allData.candidates.map(c => c.position))];
      return {
        success: true,
        data: {
          message: `No candidates found for the position "${requestedPosition}". Available positions are: ${availablePositions.join(', ')}`,
          candidates: [],
          jobPosition: requestedPosition,
          availablePositions: availablePositions
        },
        intentData: intentData
      };
    }

    // Let the AI handle job position queries through the intent detection
    // No more hard-coded keyword matching

    // Show only first 60 candidates to avoid overwhelming
    const limitedCandidates = allData.candidates.slice(0, 60);
    const candidateList = limitedCandidates.map((c, index) => {
      return `**${index + 1}. ${c.name}**\n` +
             `   Position: ${c.position}\n` +
             `   Experience: ${c.experience || 'Not specified'}\n` +
             `   Skills: ${(c.skills || []).slice(0, 2).join(', ')}${c.skills && c.skills.length > 2 ? '...' : ''}\n` +
             `   Location: ${c.location || 'Not specified'}\n` +
             `   Salary: ${c.salary_expectation || 'Not specified'}\n`;
    }).join('\n');

    const totalCount = allData.candidates.length;
    const message = totalCount > 60 
      ? `Here are the first 60 of your ${totalCount} candidates:\n\n${candidateList}\n\n*Showing ${limitedCandidates.length} of ${totalCount} total candidates*`
      : `Here are your ${totalCount} candidates:\n\n${candidateList}`;

    return {
      success: true,
      data: {
        message: message,
        candidates: limitedCandidates,
        totalCount: totalCount
      },
      intentData: intentData
    };
  }

  async handleSendMessage(intentData, context, allData) {
    const { parameters } = intentData;
    
    // Helper function to format phone number for WhatsApp
    const formatPhoneNumber = (phone) => {
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
    };
    
    // NEW: Handle direct phone number messaging (without candidate requirement)
    if (parameters.direct_phone || parameters.phone_number || (parameters.phone && !parameters.candidate_name && !parameters.reference_name)) {
      const phoneNumber = parameters.phone_number || parameters.phone;
      console.log('📞 Direct phone messaging detected:', phoneNumber);
      
      if (!phoneNumber) {
        return {
          success: false,
          error: 'Phone number is required for direct messaging',
          data: null,
          intentData: intentData
        };
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log('📞 Formatted phone number:', formattedPhone);
      
      if (!formattedPhone) {
        return {
          success: false,
          error: 'Invalid phone number format',
          data: null,
          intentData: intentData
        };
      }

      // Get message content from parameters or generate it
      let messageContent = parameters.message;
      if (!messageContent) {
        messageContent = await this.generateDirectMessageContent(intentData, context, allData);
      }
      
      console.log('📞 Message content:', messageContent);
      
      const result = {
        candidate: `Direct Message (${formattedPhone})`,
        number: formattedPhone,
        message: messageContent
      };

      return {
        success: true,
        data: result,
        intentData: intentData,
        explanation: this.generateExplanation(result, parameters.language)
      };
    }

    // NEW: Handle bulk reference messaging
    if (parameters.all_references) {
      let candidatesToProcess = [];
      
      if (parameters.candidate_names && Array.isArray(parameters.candidate_names)) {
        // Handle multiple specific candidates' references
        candidatesToProcess = allData.candidates.filter(c => 
          parameters.candidate_names.some(name => 
            c.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(c.name.toLowerCase())
          )
        );
      } else if (parameters.candidate_name && parameters.candidate_name !== 'all') {
        // Handle single candidate's references
        const candidate = this.findCandidate(parameters.candidate_name, null, allData);
        if (candidate) {
          candidatesToProcess = [candidate];
        }
      } else {
        // Handle all candidates' references
        candidatesToProcess = allData.candidates;
      }

      if (candidatesToProcess.length === 0) {
        return {
          success: false,
          error: 'No candidates found for reference messaging',
          data: null,
          intentData: intentData
        };
      }

      const messages = [];
      const allReferences = [];

      // Collect all references from the candidates
      for (const candidate of candidatesToProcess) {
        if (candidate.references && Array.isArray(candidate.references)) {
          for (const reference of candidate.references) {
            // Check if this reference should be excluded
            if (parameters.exclude_references && Array.isArray(parameters.exclude_references)) {
              const shouldExclude = parameters.exclude_references.some(excludeName => 
                reference.name.toLowerCase().includes(excludeName.toLowerCase()) ||
                excludeName.toLowerCase().includes(reference.name.toLowerCase())
              );
              if (shouldExclude) {
                console.log(`🚫 Excluding reference: ${reference.name}`);
                continue;
              }
            }
            
            allReferences.push({
              ...reference,
              candidateName: candidate.name
            });
          }
        }
      }

      if (allReferences.length === 0) {
        return {
          success: false,
          error: 'No references found for the specified candidates',
          data: null,
          intentData: intentData
        };
      }

      console.log(`📞 Sending messages to ${allReferences.length} references`);

      for (const reference of allReferences) {
        const messageContent = await this.generateReferenceMessageContent(intentData, reference, context, allData);
        const formattedPhone = formatPhoneNumber(reference.contact.phone);
        
        if (formattedPhone) {
          messages.push({
            candidate: `${reference.name} (Reference for ${reference.candidateName})`,
            number: formattedPhone,
            message: messageContent
          });
        } else {
          console.log(`⚠️ Skipping reference ${reference.name} - no valid phone number`);
        }
      }

      return {
        success: true,
        data: messages,
        intentData: intentData,
        explanation: this.generateBulkReferenceExplanation(messages, parameters.language)
      };
    }
    
    // Handle bulk messaging to all candidates
    if (parameters.candidate_name === 'all' || parameters.candidate_names) {
      let candidatesToMessage;
      
      // Check for contextual references like "her" or "him"
      const originalPrompt = intentData.originalPrompt || '';
      const recentContext = context.candidates || [];
      
      if ((originalPrompt.includes('her') || originalPrompt.includes('him')) && recentContext.length > 0) {
        console.log('🎯 Detected contextual reference (her/him), using recent candidate context');
        candidatesToMessage = recentContext;
      } else if (parameters.candidate_names && Array.isArray(parameters.candidate_names)) {
        // Handle multiple specific candidates
        candidatesToMessage = allData.candidates.filter(c => 
          parameters.candidate_names.some(name => 
            c.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(c.name.toLowerCase())
          )
        );
      } else {
        // NEVER send to all candidates - this is a safety measure
        console.log('🚫 BLOCKED: Attempting to message ALL candidates. This is not allowed for safety reasons.');
        return {
          success: false,
          error: 'For safety reasons, I cannot send messages to all candidates. Please specify a specific candidate name or job position.',
          data: null,
          intentData: intentData
        };
      }
      
      // Handle exclusions
      if (parameters.exclude_candidates && Array.isArray(parameters.exclude_candidates)) {
        console.log('🚫 Excluding candidates:', parameters.exclude_candidates);
        
        // Normalize text to remove accents for better matching
        const normalizeText = (text) => {
          return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        };
        
        candidatesToMessage = candidatesToMessage.filter(candidate => {
          const candidateNameLower = candidate.name.toLowerCase();
          const normalizedCandidateName = normalizeText(candidateNameLower);
          
          // Check if this candidate should be excluded
          const shouldExclude = parameters.exclude_candidates.some(excludeName => {
            const excludeNameLower = excludeName.toLowerCase();
            const normalizedExcludeName = normalizeText(excludeNameLower);
            
            return candidateNameLower.includes(excludeNameLower) ||
                   excludeNameLower.includes(candidateNameLower) ||
                   normalizedCandidateName.includes(normalizedExcludeName) ||
                   normalizedExcludeName.includes(normalizedCandidateName) ||
                   candidateNameLower.split(' ')[0] === excludeNameLower ||
                   candidateNameLower.split(' ')[1] === excludeNameLower;
          });
          
          if (shouldExclude) {
            console.log(`🚫 Excluding candidate: ${candidate.name}`);
            return false;
          }
          
          return true;
        });
      }
      
      if (candidatesToMessage.length === 0) {
        return {
          success: false,
          error: 'No candidates found matching the specified criteria',
          data: null,
          intentData: intentData
        };
      }
      
      console.log('✅ Final candidates to message:', candidatesToMessage.map(c => c.name));
      
      const messages = [];
      
      for (const candidate of candidatesToMessage) {
        const messageContent = await this.generateMessageContent(intentData, candidate, context, allData);
        const formattedPhone = formatPhoneNumber(candidate.phone);
        
        if (formattedPhone) {
          messages.push({
            candidate: candidate.name,
            number: formattedPhone,
            message: messageContent
          });
        } else {
          console.log(`⚠️ Skipping ${candidate.name} - no valid phone number`);
        }
      }
      
      return {
        success: true,
        data: messages,
        intentData: intentData,
        explanation: this.generateBulkExplanation(messages, parameters.language)
      };
    }
    
    // Handle messaging a candidate's reference
    if (parameters.reference_name) {
      const candidate = this.findCandidate(parameters.candidate_name, null, allData);
      if (!candidate) {
        return {
          success: false,
          error: `Candidate not found: ${parameters.candidate_name}`,
          data: null,
          intentData: intentData
        };
      }
      
      const reference = candidate.references.find(ref => 
        ref.name.toLowerCase().includes(parameters.reference_name.toLowerCase())
      );
      
      if (!reference) {
        return {
          success: false,
          error: `Reference not found for ${candidate.name}: ${parameters.reference_name}`,
          data: null,
          intentData: intentData
        };
      }
      
      const messageContent = await this.generateMessageContent(intentData, candidate, context, allData, reference);
      const formattedPhone = formatPhoneNumber(reference.contact.phone);
      
      if (!formattedPhone) {
        return {
          success: false,
          error: `No valid phone number found for reference: ${reference.name}`,
          data: null,
          intentData: intentData
        };
      }
      
      const result = {
        candidate: `${reference.name} (Reference for ${candidate.name})`,
        number: formattedPhone,
        message: messageContent
      };
      
      return {
        success: true,
        data: result,
        intentData: intentData,
        explanation: this.generateExplanation(result, parameters.language)
      };
    }
    
    // Fallback: Check if the intent text contains a specific candidate name
    const intentText = intentData.intent ? intentData.intent.toLowerCase() : '';
    const originalPrompt = intentData.originalPrompt ? intentData.originalPrompt.toLowerCase() : '';
    const searchText = intentText || originalPrompt;
    
    // Normalize text to remove accents for better matching
    const normalizeText = (text) => {
      if (!text) return '';
      return text.normalize('NFD').replace(/\u0300-\u036f/g, '');
    };
    
    const normalizedSearchText = normalizeText(searchText);
    
    // Look for EXACT candidate name matches first
    const exactMatches = allData.candidates.filter(c => {
      const candidateNameLower = c.name.toLowerCase();
      const normalizedCandidateName = normalizeText(candidateNameLower);
      
      return searchText.includes(candidateNameLower) ||
             normalizedSearchText.includes(normalizedCandidateName);
    });
    
    console.log('🔍 Debug - Search text:', searchText);
    console.log('🔍 Debug - Exact matches:', exactMatches.map(c => c.name));
    
    // If we found exactly one exact match, use it
    if (exactMatches.length === 1) {
      console.log('🎯 Found single exact match:', exactMatches[0].name);
      const candidate = exactMatches[0];
        const messageContent = await this.generateMessageContent(intentData, candidate, context, allData);
        const formattedPhone = formatPhoneNumber(candidate.phone);
        
      if (!formattedPhone) {
        return {
          success: false,
          error: `No valid phone number found for candidate: ${candidate.name}`,
          data: null,
          intentData: intentData
        };
      }
      
      const result = {
            candidate: candidate.name,
            number: formattedPhone,
            message: messageContent
      };
      
      return {
        success: true,
        data: result,
        intentData: intentData,
        explanation: this.generateExplanation(result, parameters.language)
      };
    }
    
    // If we found multiple exact matches, that's an error
    if (exactMatches.length > 1) {
      console.log('🚫 Multiple exact matches found:', exactMatches.map(c => c.name));
      return {
        success: false,
        error: `Multiple candidates found with similar names. Please be more specific: ${exactMatches.map(c => c.name).join(', ')}`,
        data: null,
        intentData: intentData
      };
    }
    
    // Single candidate messaging - check if we have a specific candidate name first
    if (parameters.candidate_name && parameters.candidate_name !== 'all') {
      console.log(`🎯 Looking for specific candidate: ${parameters.candidate_name}`);
      const candidate = this.findCandidate(parameters.candidate_name, parameters.candidate_id, allData);
    
    if (!candidate) {
        // Check if we have a recent candidate context
        const recentContext = context.candidates || [];
        if (recentContext.length > 0) {
          console.log('🎯 Using recent candidate context as fallback');
          const contextCandidate = recentContext[0]; // Use the first candidate from recent context
          const messageContent = await this.generateMessageContent(intentData, contextCandidate, context, allData);
          const formattedPhone = formatPhoneNumber(contextCandidate.phone);
          
          if (!formattedPhone) {
      return {
        success: false,
              error: `No valid phone number found for candidate: ${contextCandidate.name}`,
        data: null,
        intentData: intentData
      };
    }
          
          const result = {
            candidate: contextCandidate.name,
            number: formattedPhone,
            message: messageContent
          };
          
          return {
            success: true,
            data: result,
            intentData: intentData,
            explanation: this.generateExplanation(result, parameters.language)
          };
        }
        
        return {
          success: false,
          error: `Candidate not found: ${parameters.candidate_name}. Please specify a valid candidate name.`,
          data: null,
          intentData: intentData
        };
      }
      
      console.log('🔍 Debug - Candidate found:', candidate.name);
      console.log('🔍 Debug - Candidate phone:', candidate.phone);
      console.log('🔍 Debug - Candidate data:', JSON.stringify(candidate, null, 2));
    
    const messageContent = await this.generateMessageContent(intentData, candidate, context, allData);
    const formattedPhone = formatPhoneNumber(candidate.phone);
      
      console.log('🔍 Debug - Formatted phone:', formattedPhone);
    
    if (!formattedPhone) {
        console.log('❌ No valid phone number found for candidate:', candidate.name);
      return {
        success: false,
          error: `No valid phone number found for candidate: ${candidate.name}. The candidate's profile doesn't contain a phone number.`,
        data: null,
        intentData: intentData
      };
    }
    
    const result = {
      candidate: candidate.name,
      number: formattedPhone,
      message: messageContent
    };
    
    return {
      success: true,
      data: result,
      intentData: intentData,
      explanation: this.generateExplanation(result, parameters.language)
      };
    }
    
    // If no specific candidate name provided, return error
    return {
      success: false,
      error: 'Please specify a candidate name to send a message to.',
      data: null,
      intentData: intentData
    };
  }

  async handleAnalyzeMessages(intentData, context, allData) {
    const { parameters } = intentData;
    // Accept phone, phone_number, or candidate_name
    const phone = parameters.phone || parameters.phone_number;
    const candidateName = parameters.candidate_name;
    if (!phone && !candidateName) {
      return {
        success: true,
        data: {
          message: "Hey, I need you to provide the phone number or name of the individual to retrieve the chat history."
        },
        intentData: intentData
      };
    }
    // Filter messages if phone or candidate name is provided
    let filteredMessages = allData.messageHistory;
    if (phone) {
      filteredMessages = filteredMessages.filter(m => m.phoneNumber === phone);
    } else if (candidateName) {
      // Try to find candidate by name
      const candidate = allData.candidates.find(c => c.name.toLowerCase().includes(candidateName.toLowerCase()));
      if (candidate) {
        filteredMessages = filteredMessages.filter(m => m.candidateId === candidate.id);
      }
    }
    const analysis = await this.analyzeIncomingMessages(filteredMessages, allData);
    return {
      success: true,
      data: analysis,
      intentData: intentData
    };
  }

  async handleAnalyzeAIHistory(intentData, context, allData) {
    console.log('📋 Handling AI history analysis');
    console.log(`📝 Chat history available: ${allData.chatHistory?.length || 0} messages`);
    
    // Analyze the AI/user chat history (chatHistory)
    const { parameters } = intentData;
    let filteredHistory = allData.chatHistory || [];
    
    // Optionally filter by conversationId or user if provided
    if (parameters.conversationId) {
      filteredHistory = filteredHistory.filter(h => h.conversationId === parameters.conversationId);
    }
    
    console.log(`📋 Filtered history: ${filteredHistory.length} messages`);
    console.log(`📋 History preview:`, filteredHistory.map(msg => ({
      sender: msg.sender,
      message: msg.message.substring(0, 100) + '...',
      timestamp: msg.timestamp
    })));
    
    if (filteredHistory.length === 0) {
    return {
      success: true,
      data: {
          message: "I don't have any previous conversation history to analyze. This might be a new conversation or the history hasn't been saved properly."
        },
        intentData: intentData
      };
    }
    
    // Look for recent recommendations or candidate analysis
    const recentAIResponses = filteredHistory.filter(msg => 
      msg.sender === 'ai' && 
      (msg.message.includes('recommend') || 
       msg.message.includes('best') || 
       msg.message.includes('top') ||
       msg.message.includes('analysis') ||
       msg.message.includes('candidate'))
    );
    
    if (recentAIResponses.length > 0) {
      const lastRecommendation = recentAIResponses[recentAIResponses.length - 1];
      console.log(`🎯 Found recent recommendation: ${lastRecommendation.message.substring(0, 200)}...`);
      
      return {
        success: true,
        data: {
          message: `Based on our recent conversation, here's what I recommended:\n\n${lastRecommendation.message}`,
          originalMessage: lastRecommendation.message,
          timestamp: lastRecommendation.timestamp
        },
        intentData: intentData
      };
    }
    
    // If no specific recommendations found, provide a general summary
    const userMessages = filteredHistory.filter(msg => msg.sender === 'user');
    const aiMessages = filteredHistory.filter(msg => msg.sender === 'ai');
    
    return {
      success: true,
      data: {
        message: `Based on our conversation history (${userMessages.length} user messages, ${aiMessages.length} AI responses), I can see we've been discussing recruitment topics. However, I don't see any specific candidate recommendations in our recent conversation. Would you like me to analyze candidates for you?`,
        summary: {
          userMessages: userMessages.length,
          aiMessages: aiMessages.length,
          lastUserMessage: userMessages[userMessages.length - 1]?.message,
          lastAIMessage: aiMessages[aiMessages.length - 1]?.message
        }
      },
      intentData: intentData
    };
  }

  async handleShowCandidates(intentData, context, allData) {
    const { parameters } = intentData;
    
    // Check if this is a job position query
    const isJobQuery = intentData.intent.toLowerCase().includes('job') || 
                      intentData.intent.toLowerCase().includes('position') ||
                      intentData.intent.toLowerCase().includes('what are');
    

    
    if (parameters.candidate_name && parameters.candidate_name !== 'all') {
      const candidate = this.findCandidate(parameters.candidate_name, null, allData);
      if (candidate) {
        return {
          success: true,
          data: candidate,
          intentData: intentData
        };
      }
    }

    // If no candidates available, provide a helpful response
    if (allData.candidates.length === 0) {
      if (isJobQuery) {
        return {
          success: true,
          data: {
            message: "I don't have access to job position data at the moment. This could be due to authentication issues or the data not being available. Please try refreshing your session or contact support if the issue persists."
          },
          intentData: intentData
        };
      } else {
        return {
          success: true,
          data: {
            message: "I don't have access to candidate data at the moment. This could be due to authentication issues or the data not being available. Please try refreshing your session or contact support if the issue persists."
          },
          intentData: intentData
        };
      }
    }



    // Let the AI handle all queries through proper intent detection
    // No more hard-coded keyword matching

    // Return all candidates for general queries
    return {
      success: true,
      data: allData.candidates,
      intentData: intentData
    };
  }

  async handleGenerateQuestions(intentData, context, allData) {
    const { parameters } = intentData;
    
    // Helper function to format phone number for WhatsApp (same as in handleSendMessage)
    const formatPhoneNumber = (phone) => {
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
    };
    
    // Handle bulk questions for all candidates
    if (parameters.candidate_name === 'all' || parameters.candidate_names) {
      let candidatesToQuestion;
      
      if (parameters.candidate_names && Array.isArray(parameters.candidate_names)) {
        // Handle multiple specific candidates
        candidatesToQuestion = allData.candidates.filter(c => 
          parameters.candidate_names.some(name => 
            c.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(c.name.toLowerCase())
          )
        );
      } else {
        // Handle "all" candidates
        candidatesToQuestion = allData.candidates;
      }
      
      // Handle exclusions
      if (parameters.exclude_candidates && Array.isArray(parameters.exclude_candidates)) {
        console.log('🚫 Excluding candidates:', parameters.exclude_candidates);
        
        // Normalize text to remove accents for better matching
        const normalizeText = (text) => {
          return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        };
        
        candidatesToQuestion = candidatesToQuestion.filter(candidate => {
          const candidateNameLower = candidate.name.toLowerCase();
          const normalizedCandidateName = normalizeText(candidateNameLower);
          
          // Check if this candidate should be excluded
          const shouldExclude = parameters.exclude_candidates.some(excludeName => {
            const excludeNameLower = excludeName.toLowerCase();
            const normalizedExcludeName = normalizeText(excludeNameLower);
            
            return candidateNameLower.includes(excludeNameLower) ||
                   excludeNameLower.includes(candidateNameLower) ||
                   normalizedCandidateName.includes(normalizedExcludeName) ||
                   normalizedExcludeName.includes(normalizedCandidateName) ||
                   candidateNameLower.split(' ')[0] === excludeNameLower ||
                   candidateNameLower.split(' ')[1] === excludeNameLower;
          });
          
          if (shouldExclude) {
            console.log(`🚫 Excluding candidate: ${candidate.name}`);
            return false;
          }
          
          return true;
        });
      }
      
      if (candidatesToQuestion.length === 0) {
        return {
          success: false,
          error: 'No candidates found matching the specified criteria',
          data: null,
          intentData: intentData
        };
      }
      
      console.log('✅ Final candidates to question:', candidatesToQuestion.map(c => c.name));
      
      const messages = [];
      
      for (const candidate of candidatesToQuestion) {
        const questions = await this.generateFollowUpQuestions(candidate, context.jobDescription, allData);
        const formattedPhone = formatPhoneNumber(candidate.phone);
        
        if (formattedPhone) {
          messages.push({
            candidate: candidate.name,
            number: formattedPhone,
            message: this.formatQuestionsMessage(questions, candidate, parameters.language)
          });
        } else {
          console.log(`⚠️ Skipping ${candidate.name} - no valid phone number`);
        }
      }
      
      return {
        success: true,
        data: messages,
        intentData: intentData,
        explanation: this.generateBulkExplanation(messages, parameters.language)
      };
    }
    
    // Fallback: Check if the intent text contains multiple candidate names
    const intentText = intentData.intent ? intentData.intent.toLowerCase() : '';
    const originalPrompt = intentData.originalPrompt ? intentData.originalPrompt.toLowerCase() : '';
    const searchText = intentText || originalPrompt;
    const candidateNames = allData.candidates.map(c => c.name.toLowerCase());
    
    // Normalize text to remove accents for better matching
    const normalizeText = (text) => {
      if (!text) return '';
      return text.normalize('NFD').replace(/\u0300-\u036f/g, '');
    };
    
    const normalizedSearchText = normalizeText(searchText);
    
    // Look for patterns like "David and Maria", "Carlos, Ana, Maria"
    const foundCandidates = candidateNames.filter(name => 
      searchText.includes(name.toLowerCase())
    );
    
    // Also check for partial matches (e.g., "Maria" matches "María López")
    const partialMatches = allData.candidates.filter(c => {
      const candidateNameLower = c.name.toLowerCase();
      const normalizedCandidateName = normalizeText(candidateNameLower);
      const firstName = candidateNameLower.split(' ')[0]; // Get first name
      const lastName = candidateNameLower.split(' ')[1]; // Get last name
      const normalizedFirstName = normalizeText(firstName);
      const normalizedLastName = normalizeText(lastName);
      
      return searchText.includes(firstName) || 
             searchText.includes(lastName) ||
             normalizedSearchText.includes(normalizedFirstName) ||
             normalizedSearchText.includes(normalizedLastName);
    });
    
    const allFoundCandidates = [...new Set([...foundCandidates, ...partialMatches.map(c => c.name.toLowerCase())])];
    
    console.log('🔍 Debug - Search text:', searchText);
    console.log('🔍 Debug - Normalized search text:', normalizedSearchText);
    console.log('🔍 Debug - Found candidates:', foundCandidates);
    console.log('🔍 Debug - Partial matches:', partialMatches.map(c => c.name));
    console.log('🔍 Debug - All found candidates:', allFoundCandidates);
    
    if (allFoundCandidates.length > 1) {
      console.log('🔄 Fallback: Found multiple candidates in intent text:', allFoundCandidates);
      
      const candidatesToQuestion = allData.candidates.filter(c => 
        allFoundCandidates.some(name => 
          c.name.toLowerCase().includes(name) ||
          name.includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().split(' ')[0] === name ||
          c.name.toLowerCase().split(' ')[1] === name ||
          normalizeText(c.name.toLowerCase()).includes(normalizeText(name)) ||
          normalizeText(name).includes(normalizeText(c.name.toLowerCase()))
        )
      );
      
      console.log('🔄 Fallback: Candidates to question:', candidatesToQuestion.map(c => c.name));
      
      const messages = [];
      
      for (const candidate of candidatesToQuestion) {
        const questions = await this.generateFollowUpQuestions(candidate, context.jobDescription, allData);
        const formattedPhone = formatPhoneNumber(candidate.phone);
        
        if (formattedPhone) {
          messages.push({
            candidate: candidate.name,
            number: formattedPhone,
            message: this.formatQuestionsMessage(questions, candidate, parameters.language)
          });
        } else {
          console.log(`⚠️ Skipping ${candidate.name} - no valid phone number`);
        }
      }
      
      return {
        success: true,
        data: messages,
        intentData: intentData,
        explanation: this.generateBulkExplanation(messages, parameters.language)
      };
    }
    
    // Handle single candidate
    const candidate = this.findCandidate(parameters.candidate_name, parameters.candidate_id, allData);
    
    if (!candidate) {
      return {
        success: false,
        error: `Candidate not found: ${parameters.candidate_name}`,
        data: null,
        intentData: intentData
      };
    }
    
    const questions = await this.generateFollowUpQuestions(candidate, context.jobDescription, allData);
    const formattedPhone = formatPhoneNumber(candidate.phone);
    
    if (!formattedPhone) {
      return {
        success: false,
        error: `No valid phone number found for candidate: ${candidate.name}`,
        data: null,
        intentData: intentData
      };
    }
    
    const result = {
      candidate: candidate.name,
      number: formattedPhone,
      message: this.formatQuestionsMessage(questions, candidate, parameters.language)
    };
    
    return {
      success: true,
      data: result,
      intentData: intentData,
      explanation: this.generateExplanation(result, parameters.language)
    };
  }

  async handleCompareCandidates(intentData, context, allData) {
    const { parameters } = intentData;
    
    console.log('📊 Comparing candidates for job position analysis');
    
    // Get candidates to compare - either from parameters or from available data
    let candidatesToCompare = [];
    
    // Determine job position using AI if not provided
    let jobPosition = parameters.job_position;
    
    if (!jobPosition && allData.chatHistory && allData.chatHistory.length > 0) {
      const recentMessages = allData.chatHistory.slice(-4);
      const recentContext = recentMessages.map(msg => `${msg.sender}: ${msg.message}`).join('\n');
      
      const jobExtractionPrompt = `Analiza el siguiente contexto de conversación y extrae la posición de trabajo mencionada.

CONTEXTO DE CONVERSACIÓN:
${recentContext}

INSTRUCCIONES:
- Si se menciona una posición de trabajo específica, responde solo con el nombre exacto de la posición
- Si no se menciona ninguna posición, responde "NINGUNA"
- Ejemplos de posiciones: "[CUALQUIER POSICIÓN DISPONIBLE EN LA LISTA]"

Posición de trabajo:`;

      try {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: 'system', content: jobExtractionPrompt }
          ],
          temperature: 0.1,
          max_tokens: 50
        });

        const extractedPosition = completion.choices[0].message.content.trim();
        if (extractedPosition && extractedPosition !== 'NINGUNA') {
          jobPosition = extractedPosition;
          console.log(`🎯 AI extracted job position for comparison: "${jobPosition}"`);
        }
      } catch (error) {
        console.error('Error extracting job position for comparison:', error);
      }
    }
    
    // If specific job position is mentioned, filter candidates for that position
    if (jobPosition) {
      const targetPosition = jobPosition.toLowerCase().trim();
      candidatesToCompare = allData.candidates.filter(c => {
        const candidatePosition = (c.position || '').toLowerCase().trim();
        return candidatePosition.includes(targetPosition) || targetPosition.includes(candidatePosition);
      });
      console.log(`📊 Found ${candidatesToCompare.length} candidates for position "${jobPosition}"`);
    } else {
      // If no specific position, use recent candidates (up to 5)
      candidatesToCompare = allData.candidates.slice(0, 5);
      console.log(`📊 Using ${candidatesToCompare.length} recent candidates for comparison`);
    }
    
    if (candidatesToCompare.length === 0) {
    return {
      success: true,
        data: {
          comparison: "No candidates found to compare. Please specify a job position or ensure candidates are available.",
          candidates: []
        },
      intentData: intentData
      };
    }
    
    // Get the number of candidates to compare from parameters
    const candidateCount = parameters.number_of_candidates || 3;
    const limitedCandidates = candidatesToCompare.slice(0, candidateCount);
    console.log(`📊 Comparing ${limitedCandidates.length} candidates (requested: ${candidateCount})`);
    
    const systemPrompt = `
Compara los siguientes candidatos para la posición "${jobPosition || 'especificada'}".

CANDIDATOS A COMPARAR (${limitedCandidates.length} candidatos):
${limitedCandidates.map((c, index) => `
CANDIDATO ${index + 1}: ${c.name}
- Posición: ${c.position}
- Experiencia: ${c.experience}
- Habilidades: ${c.skills ? c.skills.join(', ') : 'No especificadas'}
- Idiomas: ${c.languages ? c.languages.join(', ') : 'No especificados'}
- Ubicación: ${c.location}
- Disponibilidad: ${c.availability}
- Email: ${c.email}
- Teléfono: ${c.phone}
`).join('\n')}

Posición de Trabajo: ${jobPosition || 'No especificada'}

Proporciona una comparación detallada incluyendo:
1. **Comparación de Habilidades Técnicas**: Qué tan bien coinciden las habilidades de cada candidato con los requisitos de la posición "${jobPosition || 'especificada'}"
2. **Evaluación de Experiencia**: Experiencia relevante para esta posición específica
3. **Dominio de Idiomas**: Evaluación de habilidades de comunicación
4. **Ranking General**: Clasifica los candidatos del mejor al peor para esta posición con razonamiento breve
5. **Recomendaciones**: Qué preguntas de seguimiento hacer al mejor candidato

Enfócate en los requisitos específicos de la posición "${jobPosition || 'especificada'}" y proporciona insights accionables.
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        temperature: 0.3,
        max_tokens: 600
      });
      
      return {
        success: true,
        data: {
          comparison: completion.choices[0].message.content,
          candidates: limitedCandidates.map(c => c.name),
          candidatesAnalyzed: limitedCandidates.length,
          jobPosition: jobPosition
        },
        intentData: intentData
      };
    } catch (error) {
      console.error('Error comparing candidates:', error);
      return {
        success: true,
        data: {
          comparison: "I'm having trouble comparing the candidates right now. Here are the candidates found:\n\n" + 
                     limitedCandidates.map(c => `- ${c.name}: ${c.experience} experience, Skills: ${c.skills ? c.skills.join(', ') : 'None'}`).join('\n'),
          candidates: limitedCandidates.map(c => c.name),
          candidatesAnalyzed: limitedCandidates.length
        },
        intentData: intentData
      };
    }
  }

  async handleAnalyzeResume(intentData, context, allData) {
    const { parameters } = intentData;
    
    // If no specific resume text provided, analyze the candidates that were just shown
    if (!parameters.resumeText) {
      console.log('📊 Analyzing resumes of available candidates to find the best one');
      
      // Get the most recent candidates (likely the ones just shown)
      const candidatesToAnalyze = allData.candidates.slice(0, 10); // Analyze up to 10 candidates
      console.log(`📊 Analyzing ${candidatesToAnalyze.length} candidates for comparison`);
      
      const systemPrompt = `
Eres un experto en reclutamiento. Analiza los siguientes candidatos y determina cuál es el mejor ajuste para una posición de Programador Full Stack.

CANDIDATOS A ANALIZAR:
${candidatesToAnalyze.map((c, index) => `
CANDIDATO ${index + 1}: ${c.name}
- Posición: ${c.position}
- Experiencia: ${c.experience}
- Habilidades: ${c.skills ? c.skills.join(', ') : 'No especificadas'}
- Idiomas: ${c.languages ? c.languages.join(', ') : 'No especificados'}
- Ubicación: ${c.location}
- Disponibilidad: ${c.availability}
- Email: ${c.email}
- Teléfono: ${c.phone}
`).join('\n')}

Por favor proporciona un análisis detallado incluyendo:
1. **Recomendación del Mejor Candidato**: Cuál candidato es el mejor ajuste y por qué
2. **Evaluación de Habilidades**: Qué tan bien coinciden las habilidades de cada candidato con los requisitos de Desarrollador Full Stack
3. **Evaluación de Experiencia**: Experiencia relevante para la posición
4. **Dominio de Idiomas**: Evaluación de habilidades de comunicación
5. **Ranking General**: Clasifica los candidatos del mejor al peor con razonamiento breve
6. **Recomendaciones**: Qué preguntas de seguimiento hacer al mejor candidato

Enfócate en habilidades técnicas, experiencia relevante y potencial para el rol de Desarrollador Full Stack.
`;

      try {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: 'system', content: systemPrompt }
          ],
          temperature: 0.3,
          max_tokens: 800
        });
    
    return {
      success: true,
          data: {
            analysis: completion.choices[0].message.content,
            candidatesAnalyzed: candidatesToAnalyze.length,
            bestCandidate: candidatesToAnalyze[0]?.name || 'None found'
          },
      intentData: intentData
        };
      } catch (error) {
        console.error('Error analyzing candidates:', error);
        return {
          success: true,
          data: {
            analysis: "I'm having trouble analyzing the candidates right now. Based on the data I can see, here are the candidates for Programador Full Stack:\n\n" + 
                     candidatesToAnalyze.map(c => `- ${c.name}: ${c.experience} experience, Skills: ${c.skills ? c.skills.join(', ') : 'None'}`).join('\n'),
            candidatesAnalyzed: candidatesToAnalyze.length
          },
          intentData: intentData
        };
      }
    }
    
    // Original logic for specific resume text analysis
    const sampleCandidates = allData.candidates.slice(0, 3);
    console.log(`📊 Analyzing resume with ${sampleCandidates.length} sample candidates for comparison`);
    
    const systemPrompt = `
Analiza este currículum en el contexto de nuestros datos de reclutamiento.

TEXTO DEL CURRÍCULUM:
${parameters.resumeText}

DATOS DE CANDIDATOS DE MUESTRA (${sampleCandidates.length} candidatos para comparación):
${JSON.stringify(sampleCandidates, null, 2)}

HISTORIAL DE MENSAJES:
${JSON.stringify(allData.messageHistory, null, 2)}

Proporciona análisis incluyendo:
1. Habilidades y experiencia clave
2. Ajuste para posiciones disponibles
3. Comparación con candidatos existentes
4. Preguntas de seguimiento recomendadas
5. Evaluación general
`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    return {
      success: true,
      data: {
        analysis: completion.choices[0].message.content,
        resumeLength: parameters.resumeText.length
      },
      intentData: intentData
    };
  }

  async handleScheduleInterview(intentData, context, allData) {
    const { parameters } = intentData;
    
    // Schedule an interview with full context
    const schedule = await this.scheduleInterview(context.candidateId, context.interviewDetails, allData);
    
    return {
      success: true,
      data: schedule,
      intentData: intentData,
      explanation: `Interview scheduled for ${schedule.candidate}. ${schedule.details}`
    };
  }

  async handleGeneralChat(intentData, context, allData) {
    const { parameters } = intentData;
    
    // Check if this is a job position query
    const isJobQuery = intentData.intent.toLowerCase().includes('job') || 
                      intentData.intent.toLowerCase().includes('position') ||
                      intentData.intent.toLowerCase().includes('what are');
    
    // If no candidates available, provide a helpful response
    if (allData.candidates.length === 0) {
      if (isJobQuery) {
        return {
          success: true,
          data: {
            message: "I don't have access to job position data at the moment. This could be due to authentication issues or the data not being available. Please try refreshing your session or contact support if the issue persists."
          },
          intentData: intentData
        };
      } else {
        return {
          success: true,
          data: {
            message: "I don't have access to candidate data at the moment. This could be due to authentication issues or the data not being available. Please try refreshing your session or contact support if the issue persists."
          },
          intentData: intentData
        };
      }
    }
    
    // Check if OpenAI is available
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: true,
        data: {
          message: "I'm currently running in fallback mode due to OpenAI API limitations. I can still help you with basic tasks like showing candidates and their references. Try asking me to 'Show all candidates' or 'Show references for [candidate name]'."
        },
        intentData: intentData
      };
    }
    
    // Use a much shorter system prompt to reduce tokens
    const systemPrompt = `Eres un asistente de reclutamiento. Proporciona una respuesta breve y útil en ${parameters.language || 'es'}.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: intentData.intent }
        ],
        temperature: 0.7,
        max_tokens: 100
      });

      return {
        success: true,
        data: {
          message: completion.choices[0].message.content
        },
        intentData: intentData
      };
    } catch (error) {
      console.error('Error in general chat:', error);
      return {
        success: true,
        data: {
          message: "I'm having trouble processing your request right now. I can still help you with basic tasks like showing candidates and their references. Try asking me to 'Show all candidates' or 'Show references for [candidate name]'."
        },
        intentData: intentData
      };
    }
  }

  // Helper methods
  findCandidate(name, id, allData) {
    if (id) {
      return allData.candidates.find(c => c.id === id);
    }
    if (name) {
      return allData.candidates.find(c => 
        c.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(c.name.toLowerCase())
      );
    }
    return null;
  }

  async generateMessageContent(intentData, candidate, context, allData, reference) {
    // If a specific message is provided in the parameters, use it
    if (intentData.parameters && intentData.parameters.message) {
      return intentData.parameters.message;
    }

    // Get only the most recent message for this candidate to reduce tokens
    const candidateMessages = allData.messageHistory.filter(m => m.candidateId === candidate.id).slice(-1);
    console.log(`📊 Generating message with ${candidateMessages.length} recent message for context`);

    const systemPrompt = `
Genera un mensaje casual de WhatsApp para ${reference ? `una referencia (${reference.name})` : `un candidato (${candidate.name})`}.

${candidateMessages.length > 0 ? `Mensaje reciente: ${JSON.stringify(candidateMessages[0], null, 2)}` : ''}

Genera un mensaje amigable y profesional en ${intentData.parameters.language || 'es'}.
Manténlo conciso (máximo 2-3 oraciones).
Sin marcadores de posición o cierres formales.
`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: intentData.intent }
      ],
      temperature: 0.7,
      max_tokens: 100
    });

    return completion.choices[0].message.content;
  }

  async generateFollowUpQuestions(candidate, jobDescription, allData) {
    // Get only the most recent message for this candidate to reduce tokens
    const candidateMessages = allData.messageHistory.filter(m => m.candidateId === candidate.id).slice(-1);
    console.log(`📊 Generating questions with ${candidateMessages.length} recent message for context`);

    const systemPrompt = `
Genera 2-3 preguntas de seguimiento para ${candidate.name}.

Candidato: ${candidate.name}, ${candidate.position}, ${candidate.experience}
${candidateMessages.length > 0 ? `Mensaje reciente: ${JSON.stringify(candidateMessages[0], null, 2)}` : ''}

Genera preguntas concisas en ${parameters.language || 'es'}.
`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: intentData.intent }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    return completion.choices[0].message.content;
  }

  formatQuestionsMessage(questions, candidate, language) {
    const questionsText = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    
    if (language === 'es') {
      return `Hola ${candidate.name}, te envío algunas preguntas de seguimiento:\n\n${questionsText}`;
    } else {
      return `Hello ${candidate.name}, here are some follow-up questions:\n\n${questionsText}`;
    }
  }

  generateExplanation(result, language) {
    if (language === 'es') {
      return `Envié un mensaje a ${result.candidate}. Esto es lo que le envié:\n\n${result.message}`;
    } else {
      return `I sent a message to ${result.candidate}. Here is what I sent them:\n\n${result.message}`;
    }
  }

  generateBulkExplanation(messages, language) {
    if (language === 'es') {
      const messageList = messages.map(msg => `• ${msg.candidate}: ${msg.message.substring(0, 100)}...`).join('\n');
      return `Envié mensajes a ${messages.length} candidatos:\n\n${messageList}`;
    } else {
      const messageList = messages.map(msg => `• ${msg.candidate}: ${msg.message.substring(0, 100)}...`).join('\n');
      return `I sent messages to ${messages.length} candidates:\n\n${messageList}`;
    }
  }

  async generateGeneralResponse(intentData, context, allData) {
    // Get only a small sample of data for general responses
    const sampleCandidates = allData.candidates.slice(0, 3);
    const sampleMessages = allData.messageHistory.slice(0, 5);
    console.log(`📊 Generating general response with ${sampleCandidates.length} sample candidates and ${sampleMessages.length} sample messages`);

    const systemPrompt = `
Eres un asistente de reclutamiento útil. Proporciona una respuesta útil a la consulta del usuario.

DATOS DISPONIBLES:
Candidatos de Muestra (${sampleCandidates.length}): ${JSON.stringify(sampleCandidates, null, 2)}
Historial de Mensajes de Muestra (${sampleMessages.length}): ${JSON.stringify(sampleMessages, null, 2)}
Historial de Chat: ${JSON.stringify(allData.chatHistory, null, 2)}

Contexto: ${JSON.stringify(context, null, 2)}

Usa los datos disponibles para proporcionar respuestas informadas y útiles.
`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: intentData.intent }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    return completion.choices[0].message.content;
  }

  // New method to get relevant candidates based on the prompt or intent
  getRelevantCandidates(intentData, allCandidates) {
    const { parameters } = intentData;
    
    // If specific candidate names are mentioned
    if (parameters.candidate_names && Array.isArray(parameters.candidate_names)) {
      const relevant = allCandidates.filter(c => 
        parameters.candidate_names.some(name => 
          c.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(c.name.toLowerCase())
        )
      );
      console.log(`🎯 Found ${relevant.length} specific candidates from intent`);
      return relevant;
    }
    
    // If single candidate name is mentioned
    if (parameters.candidate_name && parameters.candidate_name !== 'all') {
      const relevant = allCandidates.filter(c => 
        c.name.toLowerCase().includes(parameters.candidate_name.toLowerCase()) ||
        parameters.candidate_name.toLowerCase().includes(c.name.toLowerCase())
      );
      console.log(`🎯 Found ${relevant.length} candidates matching "${parameters.candidate_name}"`);
      return relevant;
    }
    
    // If asking for all candidates, return a small sample
    if (parameters.candidate_name === 'all') {
      console.log(`👥 Returning sample of ${Math.min(10, allCandidates.length)} candidates for "all" query`);
      return allCandidates.slice(0, 10); // Only send 10 candidates to OpenAI
    }
    
    // Default: return empty array to minimize tokens
    console.log(`🔍 No specific candidates requested, returning minimal data`);
    return [];
  }

  // Enhanced methods with full data access
  async analyzeIncomingMessages(messages, allData) {
    // Get relevant candidates based on the messages
    const candidateNames = messages.map(m => m.candidateName).filter(Boolean);
    const relevantCandidates = allData.candidates.filter(c => 
      candidateNames.some(name => 
        c.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(c.name.toLowerCase())
      )
    ).slice(0, 5); // Limit to 5 candidates for token efficiency
    
    console.log(`📊 Analyzing messages with ${relevantCandidates.length} relevant candidates`);

    const systemPrompt = `
Analiza los siguientes mensajes de WhatsApp de candidatos y proporciona insights.

MENSAJES A ANALIZAR:
${JSON.stringify(messages, null, 2)}

DATOS DE CANDIDATOS RELEVANTES (${relevantCandidates.length} candidatos):
${JSON.stringify(relevantCandidates, null, 2)}

HISTORIAL DE CHAT:
${JSON.stringify(allData.chatHistory, null, 2)}

Proporciona análisis incluyendo:
1. Temas clave en las conversaciones
2. Niveles de compromiso de candidatos
3. Preguntas o preocupaciones comunes
4. Recomendaciones de seguimiento
5. Cualquier señal de advertencia o positiva
`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return {
      analyzed: messages.length,
      insights: completion.choices[0].message.content,
      summary: `Analyzed ${messages.length} messages with AI insights`
    };
  }

  async scheduleInterview(candidateId, interviewDetails, allData) {
    const candidate = allData.candidates.find(c => c.id === candidateId);
    
    // Get only relevant message history for this candidate
    const candidateMessages = allData.messageHistory.filter(m => m.candidateId === candidateId).slice(0, 5);
    console.log(`📊 Scheduling interview with ${candidateMessages.length} relevant messages`);
    
    const systemPrompt = `
Programa una entrevista para este candidato.

CANDIDATO:
${JSON.stringify(candidate, null, 2)}

DETALLES DE LA ENTREVISTA:
${JSON.stringify(interviewDetails, null, 2)}

HISTORIAL DE MENSAJES RELEVANTES (${candidateMessages.length} mensajes):
${JSON.stringify(candidateMessages, null, 2)}

HISTORIAL DE CHAT:
${JSON.stringify(allData.chatHistory, null, 2)}

Proporciona detalles de programación de entrevista incluyendo:
1. Formato de entrevista sugerido
2. Temas clave a cubrir
3. Preguntas a hacer basadas en su perfil
4. Cualquier consideración especial
`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: 0.3,
      max_tokens: 400
    });

    return {
      scheduled: true,
      details: completion.choices[0].message.content,
      candidate: candidate?.name || 'Unknown'
    };
  }

  // NEW: Generate message content for direct phone messaging
  async generateDirectMessageContent(intentData, context, allData) {
    const { parameters } = intentData;
    const language = parameters.language || 'es';
    
    // Get only a small sample of data for context
    const sampleCandidates = allData.candidates.slice(0, 2);
    const sampleMessages = allData.messageHistory.slice(0, 3);
    console.log(`📊 Generating direct message with ${sampleCandidates.length} sample candidates and ${sampleMessages.length} sample messages`);
    
    const systemPrompt = `
Eres un asistente de IA para una plataforma de reclutamiento. Genera un mensaje profesional para comunicación telefónica directa.

CONTEXTO:
${JSON.stringify(context, null, 2)}

INTENTO:
${intentData.intent}

DATOS DE MUESTRA:
Candidatos de Muestra (${sampleCandidates.length}): ${JSON.stringify(sampleCandidates, null, 2)}
Historial de Mensajes de Muestra (${sampleMessages.length}): ${JSON.stringify(sampleMessages, null, 2)}
Historial de Chat: ${JSON.stringify(allData.chatHistory, null, 2)}

Genera un mensaje profesional y amigable que:
1. Sea apropiado para el contexto
2. Mantenga un tono profesional
3. Esté en ${language === 'es' ? 'español' : 'inglés'}
4. Sea conciso pero informativo
5. Incluya una llamada a la acción clara si es apropiado
6. NO use texto de marcador de posición como [Tu Nombre], [Nombre de la Empresa], [Posición], etc.
7. Use lenguaje natural y conversacional
8. Sea directo y al punto

Si el usuario proporcionó un mensaje específico en parameters.message, úsalo como base y mejóralo.
Si no se proporcionó un mensaje específico, crea un mensaje general de acercamiento de reclutamiento.
`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: intentData.intent }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    return completion.choices[0].message.content;
  }

  // NEW: Generate message content for reference messaging
  async generateReferenceMessageContent(intentData, reference, context, allData) {
    const { parameters } = intentData;
    const language = parameters.language || 'es';
    
    // Get only a small sample of data for context
    const sampleCandidates = allData.candidates.slice(0, 2);
    const sampleMessages = allData.messageHistory.slice(0, 3);
    console.log(`📊 Generating reference message with ${sampleCandidates.length} sample candidates and ${sampleMessages.length} sample messages`);
    
    const systemPrompt = `
Eres un asistente de IA para una plataforma de reclutamiento. Genera un mensaje profesional para contactar la referencia de un candidato.

INFORMACIÓN DE REFERENCIA:
${JSON.stringify(reference, null, 2)}

INTENTO:
${intentData.intent}

DATOS DE MUESTRA:
Candidatos de Muestra (${sampleCandidates.length}): ${JSON.stringify(sampleCandidates, null, 2)}
Historial de Mensajes de Muestra (${sampleMessages.length}): ${JSON.stringify(sampleMessages, null, 2)}
Historial de Chat: ${JSON.stringify(allData.chatHistory, null, 2)}

Genera un mensaje profesional que:
1. Introduzca el propósito de la llamada
2. Mencione el candidato del cual son referencia
3. Explique qué información estás buscando
4. Sea respetuoso y profesional
5. Esté en ${language === 'es' ? 'español' : 'inglés'}
6. Incluya una llamada a la acción clara
7. Proporcione información de contacto para seguimiento

El mensaje debe ser apropiado para contactar una referencia profesional.
`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: intentData.intent }
      ],
      temperature: 0.7,
      max_tokens: 250
    });

    return completion.choices[0].message.content;
  }

  // NEW: Generate explanation for bulk reference messaging
  generateBulkReferenceExplanation(messages, language) {
    const count = messages.length;
    if (language === 'es') {
      return `✅ Se enviaron ${count} mensajes a referencias de candidatos exitosamente.`;
    } else {
      return `✅ Successfully sent ${count} messages to candidate references.`;
    }
  }

  // NEW: Handle sending reference messages using template
  async handleSendReferenceMessage(intentData, context, allData) {
    console.log('📞 [TaskRouter] Handling send reference message request');
    
    const ReferenceMessagingService = require('./ReferenceMessagingService');
    const referenceService = new ReferenceMessagingService();
    
    const { parameters } = intentData;
    const language = parameters.language || 'es';
    
    try {
      // Test the service first
      const testResult = await referenceService.testService();
      if (!testResult.success) {
        return {
          success: false,
          error: `Service test failed: ${testResult.error}`,
          data: null,
          intentData: intentData
        };
      }

      let result;
      
      // Handle different types of reference messaging
      if (parameters.candidate_name && parameters.candidate_name !== 'all') {
        // Send to specific candidate's references
        console.log(`📞 Sending reference messages for candidate: ${parameters.candidate_name}`);
        result = await referenceService.sendReferenceMessagesForCandidate(
          parameters.candidate_name,
          {
            customMessage: parameters.custom_message,
            headerText: parameters.header_text
          }
        );
      } else if (parameters.job_position) {
        // Send to all references of candidates in a specific position
        console.log(`📞 Sending reference messages for position: ${parameters.job_position}`);
        result = await referenceService.sendReferenceMessagesForPosition(
          parameters.job_position,
          {
            customMessage: parameters.custom_message,
            headerText: parameters.header_text
          }
        );
      } else if (parameters.candidate_names && Array.isArray(parameters.candidate_names)) {
        // Send to multiple specific candidates' references
        console.log(`📞 Sending reference messages for multiple candidates: ${parameters.candidate_names.join(', ')}`);
        const allResults = [];
        
        for (const candidateName of parameters.candidate_names) {
          const candidateResult = await referenceService.sendReferenceMessagesForCandidate(
            candidateName,
            {
              customMessage: parameters.custom_message,
              headerText: parameters.header_text
            }
          );
          allResults.push(candidateResult);
        }
        
        result = {
          success: true,
          data: {
            type: 'multiple_candidates',
            candidates: parameters.candidate_names,
            results: allResults
          }
        };
      } else {
        return {
          success: false,
          error: 'Please specify a candidate name, job position, or multiple candidate names for reference messaging',
          data: null,
          intentData: intentData
        };
      }

      if (result.success) {
        return {
          success: true,
          data: result.data,
          intentData: intentData,
          explanation: this.generateReferenceMessageExplanation(result.data, language)
        };
      } else {
        return {
          success: false,
          error: result.error,
          data: result.data,
          intentData: intentData
        };
      }

    } catch (error) {
      console.error('❌ [TaskRouter] Error in handleSendReferenceMessage:', error);
      return {
        success: false,
        error: error.message,
        data: null,
        intentData: intentData
      };
    }
  }

  // NEW: Generate explanation for reference messaging
  generateReferenceMessageExplanation(data, language) {
    if (language === 'es') {
      if (data.type === 'multiple_candidates') {
        return `✅ Se enviaron mensajes de referencia para ${data.candidates.length} candidatos usando la plantilla "referencia_laboral".`;
      } else if (data.candidate) {
        return `✅ Se enviaron ${data.totalReferences} mensajes de referencia para ${data.candidate} usando la plantilla "referencia_laboral".`;
      } else if (data.summary) {
        return `✅ Se enviaron mensajes de referencia para ${data.summary.totalCandidates} candidatos en la posición "${data.summary.position}" usando la plantilla "referencia_laboral".`;
      } else {
        return `✅ Mensajes de referencia enviados exitosamente usando la plantilla "referencia_laboral".`;
      }
    } else {
      if (data.type === 'multiple_candidates') {
        return `✅ Reference messages sent for ${data.candidates.length} candidates using the "referencia_laboral" template.`;
      } else if (data.candidate) {
        return `✅ Sent ${data.totalReferences} reference messages for ${data.candidate} using the "referencia_laboral" template.`;
      } else if (data.summary) {
        return `✅ Reference messages sent for ${data.summary.totalCandidates} candidates in the "${data.summary.position}" position using the "referencia_laboral" template.`;
      } else {
        return `✅ Reference messages sent successfully using the "referencia_laboral" template.`;
      }
    }
  }

  // NEW: Handle receiving reference responses for a candidate
  async handleReceiveReferenceMessage(intentData, context, allData) {
    const fs = require('fs');
    const path = require('path');
    const { parameters } = intentData;
    const candidateName = parameters.candidate_name;
    const phoneNumber = parameters.phone_number;
    const filePath = path.join(__dirname, '..', 'data', 'reference-responses.json');
    let allResponses = [];
    if (fs.existsSync(filePath)) {
      try {
        allResponses = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        allResponses = [];
      }
    }
    // Filter responses for the candidate (case-insensitive)
    let candidateResponses = allResponses.filter(r =>
      r.reference_for && r.reference_for.toLowerCase() === candidateName.toLowerCase()
    );
    // If phone number is provided, filter further
    if (phoneNumber) {
      candidateResponses = candidateResponses.filter(r =>
        r.from && r.from.replace(/\D/g, '') === phoneNumber.replace(/\D/g, '')
      );
    }
    return {
      success: true,
      data: {
        candidate: candidateName,
        phone_number: phoneNumber || null,
        responses: candidateResponses
      },
      intentData: intentData,
      explanation: `✅ Acción completada exitosamente. Se encontraron ${candidateResponses.length} respuestas de referencia para ${candidateName}${phoneNumber ? ' del número ' + phoneNumber : ''}.`
    };
  }

  // NEW: Handle sending a direct reference message to a phone number
  async handleSendDirectReferenceMessage(intentData, context, allData) {
    const ReferenceMessagingService = require('./ReferenceMessagingService');
    const referenceService = new ReferenceMessagingService();
    const { parameters } = intentData;
    const phoneNumber = parameters.phone_number;
    const referenceName = parameters.reference_name || 'el candidato';
    try {
      const result = await referenceService.sendReferenceMessage(
        phoneNumber,
        { name: referenceName }, // candidateData
        { name: referenceName }, // referenceData (not used in template, but required by method)
        {}
      );
      return {
        success: result.success,
        data: result.data,
        intentData: intentData,
        explanation: result.success ? '✅ Acción completada exitosamente.' : `❌ Error al enviar el mensaje de referencia: ${result.error}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null,
        intentData: intentData,
        explanation: `❌ Error al enviar el mensaje de referencia: ${error.message}`
      };
    }
  }

  // NEW: Handle retrieving and summarizing WhatsApp messages
  async handleRetrieveMessages(intentData, context, allData) {
    console.log('[TaskRouter] Handling retrieve messages request');
    console.log('Intent data:', JSON.stringify(intentData, null, 2));
    
    const WhatsAppService = require('./WhatsAppService');
    const whatsapp = new WhatsAppService();
    const { parameters } = intentData;
    const language = parameters.language || 'es';
    
    try {
      // Check if this is multiple phone numbers request
      if (parameters.phone_numbers && Array.isArray(parameters.phone_numbers)) {
        console.log('Multiple phone numbers detected:', parameters.phone_numbers);
        return await this.handleRetrieveMultipleMessages(parameters.phone_numbers, language, whatsapp, intentData);
      }
      
      // Extract single phone number from parameters or user prompt
      let phoneNumber = parameters.phone_number;
      let candidateName = parameters.candidate_name;
      console.log('Initial phone number from parameters:', phoneNumber);
      console.log('Initial candidate name from parameters:', candidateName);
      
      // If we have a candidate name, try to find their phone number using DatabaseService
      if (!phoneNumber && candidateName) {
        console.log(`Looking for phone number for candidate: ${candidateName}`);
        
        // Use DatabaseService to get fresh candidate data
        const token = context.token || allData.token;
        const userId = context.userId || allData.userId;
        const candidates = await this.databaseService.fetchCandidates(token, userId);
        const candidate = candidates?.find(c => 
          c.name.toLowerCase().includes(candidateName.toLowerCase()) ||
          candidateName.toLowerCase().includes(c.name.toLowerCase())
        );
        
        if (candidate && candidate.phone) {
          phoneNumber = candidate.phone;
          console.log(`Found phone number for candidate ${candidate.name}: ${phoneNumber}`);
        } else {
          console.log(`No phone number found for candidate: ${candidateName}`);
        }
      }
      
      if (!phoneNumber) {
        // Try to extract phone number from the user prompt
        const phonePatterns = [
          /\+?\d{1,3}\s+\d{6,15}/,  // +507 66756081
          /\+?\d{1,3}\d{6,15}/,     // +50766756081
          /\d{1,3}\s+\d{6,15}/,     // 507 66756081
          /\d{1,3}\d{6,15}/         // 50766756081
        ];
        
        for (const pattern of phonePatterns) {
          const phoneMatch = intentData.originalPrompt.match(pattern);
          if (phoneMatch) {
            phoneNumber = phoneMatch[0].replace(/\s+/g, ''); // Remove spaces
            console.log('Extracted phone number from prompt:', phoneNumber);
            break;
          }
        }
        
        // If still no phone number, try to extract from the full prompt text
        if (!phoneNumber && intentData.intent) {
          const fullPrompt = intentData.intent + ' ' + (intentData.originalPrompt || '');
          for (const pattern of phonePatterns) {
            const phoneMatch = fullPrompt.match(pattern);
            if (phoneMatch) {
              phoneNumber = phoneMatch[0].replace(/\s+/g, ''); // Remove spaces
              console.log('Extracted phone number from full prompt:', phoneNumber);
              break;
            }
          }
        }
        
        // If still no phone number, try to extract candidate name and find their phone
        if (!phoneNumber) {
          const candidatePatterns = [
            /(?:de|del|para|con)\s+(\w+(?:\s+\w+)*)/i,  // "mensajes de Carlos"
            /(\w+(?:\s+\w+)*)\s+(?:mensajes|conversación)/i  // "Carlos mensajes"
          ];
          
          for (const pattern of candidatePatterns) {
            const candidateMatch = intentData.originalPrompt.match(pattern);
            if (candidateMatch && candidateMatch[1]) {
              const extractedName = candidateMatch[1].trim();
              console.log(`Extracted candidate name from prompt: ${extractedName}`);
              
              // Use DatabaseService to get fresh candidate data
              const token = context.token || allData.token;
              const userId = context.userId || allData.userId;
              const candidates = await this.databaseService.fetchCandidates(token, userId);
              const candidate = candidates?.find(c => 
                c.name.toLowerCase().includes(extractedName.toLowerCase()) ||
                extractedName.toLowerCase().includes(c.name.toLowerCase())
              );
              
              if (candidate && candidate.phone) {
                phoneNumber = candidate.phone;
                candidateName = candidate.name;
                console.log(`Found phone number for candidate ${candidate.name}: ${phoneNumber}`);
                break;
              }
            }
          }
        }
      }
      
      if (!phoneNumber) {
        // Check if this is a context-needed request
        if (parameters.needs_context) {
          return {
            success: false,
            error: language === 'es' 
              ? 'Por favor proporciona un número de teléfono específico para recuperar los mensajes del candidato.' 
              : 'Please provide a specific phone number to retrieve the candidate\'s messages.',
            data: null,
            intentData: intentData
          };
        }
        
        return {
          success: false,
          error: language === 'es' ? 'Por favor proporciona un número de teléfono para recuperar los mensajes.' : 'Please provide a phone number to retrieve messages.',
          data: null,
          intentData: intentData
        };
      }

      console.log(`Retrieving messages for phone number: ${phoneNumber}`);
      
      // Get messages from WhatsApp service
      const messages = await whatsapp.getMessagesByNumber(phoneNumber);
      
      // Try to get candidate information from database if we don't have it yet
      if (!candidateName) {
        try {
          const token = context.token || allData.token;
          const userId = context.userId || allData.userId;
          const candidates = await this.databaseService.fetchCandidates(token, userId);
          const candidate = candidates?.find(c => {
            const normalize = (num) => (num || '').replace(/\D/g, '');
            return normalize(c.phone) === normalize(phoneNumber);
          });
          if (candidate) {
            candidateName = candidate.name;
            console.log(`Found candidate for phone ${phoneNumber}: ${candidateName}`);
          }
        } catch (error) {
          console.log('Could not fetch candidate data:', error.message);
        }
      }
      
      if (messages.length === 0) {
        return {
          success: true,
          data: {
            phoneNumber: phoneNumber,
            candidateName: candidateName,
            messages: [],
            summary: language === 'es' ? 'No se encontraron mensajes para esta conversación.' : 'No messages found for this conversation.',
            count: 0
          },
          intentData: intentData,
          explanation: language === 'es' 
            ? `No se encontraron mensajes para el número ${phoneNumber}.`
            : `No messages found for number ${phoneNumber}.`
        };
      }

      // Sort messages by timestamp
      const sortedMessages = messages.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.saved_at);
        const timeB = new Date(b.timestamp || b.saved_at);
        return timeA - timeB;
      });

      // Create conversation summary
      const conversationSummary = this.createConversationSummary(sortedMessages, phoneNumber, language, candidateName);

      // Get candidate details if available
      let candidateDetails = null;
      if (candidateName) {
        try {
          const token = context.token || allData.token;
          const userId = context.userId || allData.userId;
          const candidates = await this.databaseService.fetchCandidates(token, userId);
          const candidate = candidates?.find(c => c.name === candidateName);
          if (candidate) {
            candidateDetails = {
              name: candidate.name,
              position: candidate.position,
              email: candidate.email,
              phone: candidate.phone,
              status: candidate.status
            };
          }
        } catch (error) {
          console.log('Could not fetch candidate details:', error.message);
        }
      }

      return {
        success: true,
        data: {
          phoneNumber: phoneNumber,
          candidateName: candidateName,
          candidateDetails: candidateDetails,
          messages: sortedMessages,
          summary: conversationSummary,
          count: sortedMessages.length,
          lastMessage: sortedMessages[sortedMessages.length - 1],
          firstMessage: sortedMessages[0]
        },
        intentData: intentData,
        explanation: language === 'es'
          ? `Se recuperaron ${sortedMessages.length} mensajes de la conversación con ${candidateName || phoneNumber}.`
          : `Retrieved ${sortedMessages.length} messages from conversation with ${candidateName || phoneNumber}.`
      };

    } catch (error) {
      console.error('[TaskRouter] Error in handleRetrieveMessages:', error);
      return {
        success: false,
        error: error.message,
        data: null,
        intentData: intentData,
        explanation: language === 'es'
          ? `Error al recuperar mensajes: ${error.message}`
          : `Error retrieving messages: ${error.message}`
      };
    }
  }

  // Helper function to create conversation summary
  createConversationSummary(messages, phoneNumber, language, candidateName = null) {
    try {
      if (!messages || messages.length === 0) {
        return language === 'es' ? 'No hay mensajes en esta conversación.' : 'No messages in this conversation.';
      }

      // Normalize phone number for comparison
      const normalizePhone = (num) => (num || '').replace(/\D/g, '');
      const normalizedPhoneNumber = normalizePhone(phoneNumber);

      const incomingMessages = messages.filter(msg => {
        const msgFrom = normalizePhone(msg.from);
        const msgTo = normalizePhone(msg.to);
        return msg.type === 'incoming' || msgFrom === normalizedPhoneNumber;
      });
      
      const outgoingMessages = messages.filter(msg => {
        const msgFrom = normalizePhone(msg.from);
        const msgTo = normalizePhone(msg.to);
        return msg.type === 'outgoing' || msgTo === normalizedPhoneNumber;
      });
      
      const totalMessages = messages.length;
      const incomingCount = incomingMessages.length;
      const outgoingCount = outgoingMessages.length;
      
      // Get the last message content safely
      const lastMessage = messages[messages.length - 1];
      const lastMessageContent = lastMessage?.message || lastMessage?.text || (language === 'es' ? 'Sin contenido' : 'No content');
      
      // Get conversation duration safely
      let durationHours = 0;
      if (messages.length > 1) {
        const firstMessageTime = new Date(messages[0]?.timestamp || messages[0]?.saved_at || Date.now());
        const lastMessageTime = new Date(messages[messages.length - 1]?.timestamp || messages[messages.length - 1]?.saved_at || Date.now());
        const durationMs = lastMessageTime - firstMessageTime;
        durationHours = Math.round(durationMs / (1000 * 60 * 60) * 100) / 100;
      }
      
      // Get last 5 messages for detailed view
      const last5Messages = messages.slice(-5);
      
      // Create summary
      const displayName = candidateName || phoneNumber;
      let summary = language === 'es' 
        ? `📱 Conversación con ${displayName}\n\n`
        : `📱 Conversation with ${displayName}\n\n`;
      summary += language === 'es'
        ? `📊 Resumen:\n`
        : `📊 Summary:\n`;
      summary += language === 'es'
        ? `• Total de mensajes: ${totalMessages}\n`
        : `• Total messages: ${totalMessages}\n`;
      summary += language === 'es'
        ? `• Mensajes entrantes: ${incomingCount}\n`
        : `• Incoming messages: ${incomingCount}\n`;
      summary += language === 'es'
        ? `• Mensajes salientes: ${outgoingCount}\n`
        : `• Outgoing messages: ${outgoingCount}\n`;
      summary += language === 'es'
        ? `• Duración: ${durationHours} horas\n`
        : `• Duration: ${durationHours} hours\n`;
      summary += language === 'es'
        ? `• Primer mensaje: ${new Date(messages[0]?.timestamp || messages[0]?.saved_at || Date.now()).toLocaleString()}\n`
        : `• First message: ${new Date(messages[0]?.timestamp || messages[0]?.saved_at || Date.now()).toLocaleString()}\n`;
      summary += language === 'es'
        ? `• Último mensaje: ${new Date(messages[messages.length - 1]?.timestamp || messages[messages.length - 1]?.saved_at || Date.now()).toLocaleString()}\n`
        : `• Last message: ${new Date(messages[messages.length - 1]?.timestamp || messages[messages.length - 1]?.saved_at || Date.now()).toLocaleString()}\n`;
      
      // Add last 5 messages timeline
      summary += language === 'es' ? `\n📈 Últimos 5 mensajes:\n` : `\n📈 Last 5 messages:\n`;
      last5Messages.forEach((msg, index) => {
        const time = new Date(msg?.timestamp || msg?.saved_at || Date.now()).toLocaleString();
        const direction = (msg?.type === 'incoming' || normalizePhone(msg?.from) === normalizedPhoneNumber) ? '📥' : '📤';
        const content = (msg?.message || msg?.text || (language === 'es' ? 'Sin contenido' : 'No content')).substring(0, 80);
        summary += `${index + 1}. ${direction} ${time}: ${content}${content.length >= 80 ? '...' : ''}\n`;
      });

      return summary;
    } catch (error) {
      console.error('Error creating conversation summary:', error);
      return language === 'es' ? 'Error al crear resumen de conversación.' : 'Error creating conversation summary.';
    }
  }

  // NEW: Handle retrieving reference responses
  async handleRetrieveReferenceResponses(intentData, context, allData) {
    console.log('📞 [TaskRouter] Handling retrieve reference responses request');
    
    const fs = require('fs');
    const path = require('path');
    const { parameters } = intentData;
    const language = parameters.language || 'es';
    
    try {
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
      
      if (uniqueResponses.length === 0) {
        return {
          success: true,
          data: {
            responses: [],
            summary: language === 'es' ? 'No se encontraron respuestas de referencia.' : 'No reference responses found.',
            count: 0
          },
          intentData: intentData,
          explanation: language === 'es' 
            ? `📞 No se encontraron respuestas de referencia.`
            : `📞 No reference responses found.`
        };
      }

      // Sort responses by timestamp (newest first)
      const sortedResponses = uniqueResponses.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.received_at || a.saved_at || 0);
        const timeB = new Date(b.timestamp || b.received_at || b.saved_at || 0);
        return timeB - timeA;
      });

      // Create detailed summary with analysis
      const summary = this.createDetailedReferenceResponsesSummary(sortedResponses, language);

      return {
        success: true,
        data: {
          responses: sortedResponses,
          summary: summary,
          count: sortedResponses.length,
          latestResponse: sortedResponses[0],
          oldestResponse: sortedResponses[sortedResponses.length - 1],
          analysis: this.analyzeReferenceResponses(sortedResponses, language)
        },
        intentData: intentData,
        explanation: language === 'es'
          ? `📞 Se recuperaron ${sortedResponses.length} respuestas de referencia con análisis detallado.`
          : `📞 Retrieved ${sortedResponses.length} reference responses with detailed analysis.`
      };

    } catch (error) {
      console.error('❌ [TaskRouter] Error in handleRetrieveReferenceResponses:', error);
      return {
        success: false,
        error: error.message,
        data: null,
        intentData: intentData,
        explanation: language === 'es'
          ? `❌ Error al recuperar respuestas de referencia: ${error.message}`
          : `❌ Error retrieving reference responses: ${error.message}`
      };
    }
  }

  // Enhanced helper function to create detailed reference responses summary
  createDetailedReferenceResponsesSummary(responses, language) {
    try {
      if (responses.length === 0) {
        return language === 'es' ? 'No hay respuestas de referencia.' : 'No reference responses.';
      }

      // Group responses by candidate
      const responsesByCandidate = {};
      responses.forEach(response => {
        const candidateName = response.reference_for || response.candidate_name || 'Unknown';
        if (!responsesByCandidate[candidateName]) {
          responsesByCandidate[candidateName] = [];
        }
        responsesByCandidate[candidateName].push(response);
      });

      let summary = language === 'es' 
        ? `📞 Resumen de Respuestas de Referencia Laboral\n\n`
        : `📞 Reference Responses Summary\n\n`;
      
      summary += language === 'es'
        ? `📊 Estadísticas Generales:\n`
        : `📊 General Statistics:\n`;
      summary += language === 'es'
        ? `• Total de respuestas: ${responses.length}\n`
        : `• Total responses: ${responses.length}\n`;
      summary += language === 'es'
        ? `• Candidatos con referencias: ${Object.keys(responsesByCandidate).length}\n`
        : `• Candidates with references: ${Object.keys(responsesByCandidate).length}\n`;
      
      // Calculate average ratings
      const responsesWithRatings = responses.filter(r => r.rating && r.rating.overall > 0);
      if (responsesWithRatings.length > 0) {
        const avgRating = responsesWithRatings.reduce((sum, r) => sum + r.rating.overall, 0) / responsesWithRatings.length;
        summary += language === 'es'
          ? `• Calificación promedio: ${avgRating.toFixed(1)}/10\n`
          : `• Average rating: ${avgRating.toFixed(1)}/10\n`;
      }
      
      // Analyze willingness to recommend
      const willingToRecommend = responses.filter(r => r.willingness_to_recommend === 'yes').length;
      const notWillingToRecommend = responses.filter(r => r.willingness_to_recommend === 'no').length;
      const maybeRecommend = responses.filter(r => r.willingness_to_recommend === 'maybe').length;
      
      summary += language === 'es'
        ? `• Dispuestos a recomendar: ${willingToRecommend}\n`
        : `• Willing to recommend: ${willingToRecommend}\n`;
      summary += language === 'es'
        ? `• No dispuestos a recomendar: ${notWillingToRecommend}\n`
        : `• Not willing to recommend: ${notWillingToRecommend}\n`;
      summary += language === 'es'
        ? `• Tal vez recomendarían: ${maybeRecommend}\n`
        : `• Maybe would recommend: ${maybeRecommend}\n`;
      
      // Analyze response quality
      const detailedResponses = responses.filter(r => r.response_quality === 'detailed').length;
      const briefResponses = responses.filter(r => r.response_quality === 'brief').length;
      const incompleteResponses = responses.filter(r => r.response_quality === 'incomplete').length;
      
      summary += language === 'es'
        ? `• Respuestas detalladas: ${detailedResponses}\n`
        : `• Detailed responses: ${detailedResponses}\n`;
      summary += language === 'es'
        ? `• Respuestas breves: ${briefResponses}\n`
        : `• Brief responses: ${briefResponses}\n`;
      summary += language === 'es'
        ? `• Respuestas incompletas: ${incompleteResponses}\n`
        : `• Incomplete responses: ${incompleteResponses}\n`;

      // Add recent responses
      summary += language === 'es' ? `\n📈 Respuestas Recientes:\n` : `\n📈 Recent Responses:\n`;
      const recentResponses = responses.slice(0, 5);
      recentResponses.forEach((response, index) => {
        const time = new Date(response.timestamp || response.received_at || response.saved_at).toLocaleString();
        const rating = response.rating?.overall || 'N/A';
        const recommend = response.willingness_to_recommend || 'unknown';
        const quality = response.response_quality || 'unknown';
        
        summary += `${index + 1}. ${time} - ${response.reference_name || 'Unknown'} - Rating: ${rating}/10 - Recommend: ${recommend} - Quality: ${quality}\n`;
      });

      return summary;
    } catch (error) {
      console.error('Error creating detailed reference responses summary:', error);
      return language === 'es' ? 'Error al crear resumen detallado.' : 'Error creating detailed summary.';
    }
  }

  // New method to analyze reference responses
  analyzeReferenceResponses(responses, language) {
    try {
      const analysis = {
        totalResponses: responses.length,
        averageRating: 0,
        recommendationRate: 0,
        responseQualityBreakdown: {},
        relationshipBreakdown: {},
        topRatedCandidates: [],
        recentActivity: []
      };

      // Calculate average rating
      const responsesWithRatings = responses.filter(r => r.rating && r.rating.overall > 0);
      if (responsesWithRatings.length > 0) {
        analysis.averageRating = responsesWithRatings.reduce((sum, r) => sum + r.rating.overall, 0) / responsesWithRatings.length;
      }

      // Calculate recommendation rate
      const willingToRecommend = responses.filter(r => r.willingness_to_recommend === 'yes').length;
      analysis.recommendationRate = (willingToRecommend / responses.length) * 100;

      // Response quality breakdown
      analysis.responseQualityBreakdown = {
        detailed: responses.filter(r => r.response_quality === 'detailed').length,
        brief: responses.filter(r => r.response_quality === 'brief').length,
        incomplete: responses.filter(r => r.response_quality === 'incomplete').length
      };

      // Relationship breakdown
      analysis.relationshipBreakdown = {
        supervisor: responses.filter(r => r.relationship === 'supervisor').length,
        colleague: responses.filter(r => r.relationship === 'colleague').length,
        client: responses.filter(r => r.relationship === 'client').length,
        unknown: responses.filter(r => !r.relationship || r.relationship === 'Unknown').length
      };

      // Top rated candidates
      const candidatesWithRatings = {};
      responses.forEach(response => {
        const candidateName = response.candidate_name || response.reference_for || 'Unknown';
        if (!candidatesWithRatings[candidateName]) {
          candidatesWithRatings[candidateName] = { ratings: [], count: 0 };
        }
        if (response.rating && response.rating.overall > 0) {
          candidatesWithRatings[candidateName].ratings.push(response.rating.overall);
        }
        candidatesWithRatings[candidateName].count++;
      });

      analysis.topRatedCandidates = Object.entries(candidatesWithRatings)
        .map(([name, data]) => ({
          name,
          averageRating: data.ratings.length > 0 ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length : 0,
          referenceCount: data.count
        }))
        .filter(candidate => candidate.averageRating > 0)
        .sort((a, b) => b.averageRating - a.averageRating)
        .slice(0, 5);

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      analysis.recentActivity = responses
        .filter(response => {
          const responseDate = new Date(response.timestamp || response.received_at || response.saved_at);
          return responseDate >= sevenDaysAgo;
        })
        .length;

      return analysis;
    } catch (error) {
      console.error('Error analyzing reference responses:', error);
      return {};
    }
  }

  // NEW: Handle retrieving messages from multiple phone numbers
  async handleRetrieveMultipleMessages(phoneNumbers, language, whatsapp, intentData) {
    console.log(`📱 [TaskRouter] Retrieving messages for ${phoneNumbers.length} phone numbers`);
    
    try {
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
        
        const conversationSummary = this.createConversationSummary(sortedMessages, phoneNumber, language);
        
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
      const comprehensiveAnalysis = this.createComprehensiveAnalysis(results, allMessages, language);
      
      return {
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
        intentData: intentData,
        explanation: language === 'es'
          ? `📱 Se recuperaron mensajes de ${phoneNumbers.length} candidatos (${totalMessages} mensajes total).`
          : `📱 Retrieved messages from ${phoneNumbers.length} candidates (${totalMessages} total messages).`
      };
      
    } catch (error) {
      console.error('❌ [TaskRouter] Error in handleRetrieveMultipleMessages:', error);
      return {
        success: false,
        error: error.message,
        data: null,
        intentData: intentData,
        explanation: language === 'es'
          ? `❌ Error al recuperar mensajes múltiples: ${error.message}`
          : `❌ Error retrieving multiple messages: ${error.message}`
      };
    }
  }

  // Helper function to create comprehensive analysis of multiple conversations
  createComprehensiveAnalysis(results, allMessages, language) {
    try {
      if (results.length === 0) {
        return language === 'es' ? 'No hay conversaciones para analizar.' : 'No conversations to analyze.';
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
      const incomingMessages = allMessages.filter(msg => msg.type === 'incoming' || msg.is_from_candidate);
      const outgoingMessages = allMessages.filter(msg => msg.type === 'outgoing' || msg.is_to_candidate);
      
      // Get date range
      const firstMessage = sortedAllMessages[0];
      const lastMessage = sortedAllMessages[sortedAllMessages.length - 1];
      const firstDate = new Date(firstMessage.timestamp || firstMessage.saved_at).toLocaleDateString();
      const lastDate = new Date(lastMessage.timestamp || lastMessage.saved_at).toLocaleDateString();
      
      // Find most active candidate
      const candidateActivity = results.map(result => ({
        phoneNumber: result.phoneNumber,
        messageCount: result.count,
        lastActivity: result.lastMessage ? new Date(result.lastMessage.timestamp || result.lastMessage.saved_at) : new Date(0),
        candidateMessages: result.messages.filter(msg => msg.is_from_candidate || msg.from === result.phoneNumber)
      }));
      
      const mostActive = candidateActivity.reduce((prev, current) => 
        prev.messageCount > current.messageCount ? prev : current
      );
      
      const mostRecent = candidateActivity.reduce((prev, current) => 
        prev.lastActivity > current.lastActivity ? prev : current
      );

      // Create comprehensive summary
      let analysis = language === 'es' 
        ? `📊 **Análisis Completo de ${totalCandidates} Candidatos**\n\n`
        : `📊 **Comprehensive Analysis of ${totalCandidates} Candidates**\n\n`;
      
      analysis += language === 'es'
        ? `📈 **Estadísticas Generales:**\n`
        : `📈 **General Statistics:**\n`;
      analysis += language === 'es'
        ? `• Total de mensajes: ${totalMessages}\n`
        : `• Total messages: ${totalMessages}\n`;
      analysis += language === 'es'
        ? `• Mensajes entrantes: ${incomingMessages.length}\n`
        : `• Incoming messages: ${incomingMessages.length}\n`;
      analysis += language === 'es'
        ? `• Mensajes salientes: ${outgoingMessages.length}\n`
        : `• Outgoing messages: ${outgoingMessages.length}\n`;
      analysis += language === 'es'
        ? `• Rango de fechas: ${firstDate} - ${lastDate}\n`
        : `• Date range: ${firstDate} - ${lastDate}\n`;
      
      analysis += language === 'es'
        ? `\n🏆 **Candidato Más Activo:** ${mostActive.phoneNumber} (${mostActive.messageCount} mensajes)\n`
        : `\n🏆 **Most Active Candidate:** ${mostActive.phoneNumber} (${mostActive.messageCount} messages)\n`;
      analysis += language === 'es'
        ? `🕒 **Última Actividad:** ${mostRecent.phoneNumber} (${mostRecent.lastActivity.toLocaleString()})\n`
        : `🕒 **Last Activity:** ${mostRecent.phoneNumber} (${mostRecent.lastActivity.toLocaleString()})\n`;
      
      // Add individual candidate summaries with message content
      analysis += language === 'es' ? `\n**Resúmenes por Candidato:**\n` : `\n**Candidate Summaries:**\n`;
      results.forEach((result, index) => {
        const candidateMessages = result.messages.filter(msg => msg.is_from_candidate || msg.from === result.phoneNumber);
        analysis += `\n${index + 1}. 📱 **${result.phoneNumber}**: ${result.count} mensajes\n`;
        analysis += `   📝 **Mensajes del candidato:** ${candidateMessages.length}\n`;
        
        if (result.lastMessage) {
          const lastContent = (result.lastMessage.message || result.lastMessage.text || '').substring(0, 50);
          analysis += `   📝 Último mensaje: "${lastContent}${lastContent.length >= 50 ? '...' : ''}"\n`;
        }
        
        // Show sample of candidate's messages
        if (candidateMessages.length > 0) {
          analysis += `   💬 **Mensajes del candidato:**\n`;
          candidateMessages.slice(0, 3).forEach((msg, msgIndex) => {
            const content = (msg.message || msg.text || '').substring(0, 100);
            const time = new Date(msg.timestamp || msg.saved_at).toLocaleString();
            analysis += `      ${msgIndex + 1}. ${time}: "${content}${content.length >= 100 ? '...' : ''}"\n`;
          });
          if (candidateMessages.length > 3) {
            analysis += `      ... y ${candidateMessages.length - 3} mensajes más\n`;
          }
        }
      });
      
      // Add insights
      analysis += language === 'es' ? `\n💡 **Insights:**\n` : `\n💡 **Insights:**\n`;
      if (totalMessages > 0) {
        const avgMessagesPerCandidate = Math.round(totalMessages / totalCandidates);
        analysis += language === 'es'
          ? `• Promedio de mensajes por candidato: ${avgMessagesPerCandidate}\n`
          : `• Average messages per candidate: ${avgMessagesPerCandidate}\n`;
      }
      
      const candidatesWithMessages = results.filter(r => r.count > 0).length;
      analysis += language === 'es'
        ? `• Candidatos con mensajes: ${candidatesWithMessages}/${totalCandidates}\n`
        : `• Candidates with messages: ${candidatesWithMessages}/${totalCandidates}\n`;

      return analysis;
    } catch (error) {
      console.error('Error creating comprehensive analysis:', error);
      return language === 'es' ? 'Error al crear análisis completo.' : 'Error creating comprehensive analysis.';
    }
  }
}

module.exports = TaskRouter; 