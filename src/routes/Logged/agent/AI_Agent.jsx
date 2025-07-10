import React, { useState, useRef, useEffect } from "react";
import { FaPaperPlane, FaPlus, FaTrash, FaUpload, FaFileAlt, FaSpinner } from "react-icons/fa";

const API_BASE_URL = 'http://localhost:4001/api';

const defaultWelcomeMessage = {
  sender: "ai",
  text: "¡Hola! Soy tu asistente de reclutamiento. Puedo ayudarte a encontrar y analizar candidatos, comparar perfiles, y gestionar el proceso de contratación. ¿En qué puedo asistirte hoy?"
};

export const AI_Agent = ({ user, token }) => {
  const [messages, setMessages] = useState([defaultWelcomeMessage]);
  const [input, setInput] = useState("");
  const [chats, setChats] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [resumes, setResumes] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadUserConversations();
  }, []); // Load on mount

  useEffect(() => {
    if (user?.id) {
      // Refresh conversations when user changes
      loadUserConversations();
    }
  }, [user]);

  // Clean up empty conversations when component unmounts
  useEffect(() => {
    return () => {
      cleanupEmptyConversations();
    };
  }, []);

  const loadUserConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`);
      const data = await response.json();
      
      if (data.success) {
        // Filter out conversations that only have the welcome message or are empty
        const validConversations = data.data.filter(conv => {
          const userMessages = conv.messages.filter(msg => msg.sender === 'user');
          return userMessages.length > 0; // Only include conversations with actual user messages
        });
        
        setChats(validConversations.map(conv => {
          // Get the first user message to use as title
          const firstUserMessage = conv.messages.find(msg => msg.sender === 'user');
          const title = firstUserMessage 
            ? firstUserMessage.message.substring(0, 30) + (firstUserMessage.message.length > 30 ? '...' : '')
            : `Chat ${conv.id}`;
          
          return {
            id: conv.id,
            title: title,
            active: false,
            createdAt: conv.messages[0]?.timestamp || new Date().toISOString()
          };
        }));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const createNewChat = async () => {
    try {
      setIsLoading(true);
      
      // Clean up any empty conversations before creating new one
      cleanupEmptyConversations();
      
      // Create a mock conversation ID for new chats
      const newConversationId = `conv_${Date.now()}`;
      const newChat = {
        id: newConversationId,
          title: "Nuevo Chat",
        active: true,
        createdAt: new Date().toISOString()
      };

      setChats(prev => prev.map(chat => ({ ...chat, active: false })).concat(newChat));
      setCurrentConversationId(newConversationId);
      setMessages([defaultWelcomeMessage]);
      setResumes([]); // Clear resumes for new chat
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update chat title when first message is sent
  const updateChatTitle = (conversationId, message) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === conversationId && chat.title === "Nuevo Chat") {
        return {
          ...chat,
          title: message.substring(0, 30) + (message.length > 30 ? '...' : '')
        };
      }
      return chat;
    }));
  };

  const selectChat = async (id) => {
    try {
      setIsLoading(true);
      
      // Clean up any empty conversations before switching
      cleanupEmptyConversations();
      
      const response = await fetch(`${API_BASE_URL}/conversations/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setChats(prev => prev.map(chat => ({
          ...chat,
          active: chat.id === id
        })));
        
        setCurrentConversationId(id);
        setMessages(data.data.messages.map(msg => ({
          sender: msg.sender === 'user' ? 'user' : 'ai',
          text: msg.message
        })));
        
        setResumes([]); // Clear resumes for new chat
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (id) => {
    try {
      // Delete from backend first
      const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // If this is the active chat, clear the current state
        if (chats.find(chat => chat.id === id && chat.active)) {
          setMessages([defaultWelcomeMessage]);
          setCurrentConversationId(null);
          setResumes([]);
        }
        
        // Remove from chats list
        setChats(prev => prev.filter(chat => chat.id !== id));
        console.log('Chat deleted successfully:', id);
      } else {
        console.error('Failed to delete chat from backend:', id);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  // Clean up empty conversations (those with only welcome message)
  const cleanupEmptyConversations = () => {
    setChats(prev => prev.filter(chat => {
      // Keep chats that have more than just the welcome message
      return chat.title !== "Nuevo Chat" || chat.messages?.length > 1;
    }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentConversationId) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message immediately
    setMessages(prev => [...prev, { sender: "user", text: userMessage }]);
    
    // Update chat title if this is the first message
    updateChatTitle(currentConversationId, userMessage);
    
    setIsLoading(true);

    try {
      // Use the new /process-prompt endpoint
      const response = await fetch(`${API_BASE_URL}/process-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: userMessage,
          context: {
            conversationId: currentConversationId,
            userId: user?._id,
            token: token
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const result = data.data;
        // Special handling for send_message: show WhatsApp JSON first, then explanation
        if (result.intentData.action === 'send_message' && result.whatsappJson) {
          // Then show explanation
          if (result.explanation) {
            setMessages(prev => [...prev, { sender: "ai", text: result.explanation }]);
          } else {
            setMessages(prev => [...prev, { sender: "ai", text: "Message sent successfully!" }]);
          }
        } else if (result.intentData.action === 'generate_questions' && result.whatsappJson) {
          // Show raw JSON first
          //const jsonDisplay = `Questions JSON:\n\n${JSON.stringify(result.whatsappJson, null, 2)}`;
          //setMessages(prev => [...prev, { sender: "ai", text: jsonDisplay }]);
          
          // Then show explanation
          if (result.explanation) {
            setMessages(prev => [...prev, { sender: "ai", text: result.explanation }]);
          }
        } else if (result.intentData.action === 'analyze_messages' && result.result.data && result.result.data.insights) {
          setMessages(prev => [...prev, { sender: "ai", text: result.result.data.insights }]);
        } else if (result.intentData.action === 'retrieve_messages' && result.result.data) {
          const data = result.result.data;
          let message = `**Conversación con ${data.phoneNumber}**\n\n`;
          message += `**Resumen:**\n${data.summary}\n\n`;
          message += `**Estadísticas:**\n`;
          message += `• Total de mensajes: ${data.count}\n`;
          if (data.firstMessage) {
            message += `• Primer mensaje: ${new Date(data.firstMessage.timestamp || data.firstMessage.saved_at).toLocaleString()}\n`;
          }
          if (data.lastMessage) {
            message += `• Último mensaje: ${new Date(data.lastMessage.timestamp || data.lastMessage.saved_at).toLocaleString()}\n`;
          }
          setMessages(prev => [...prev, { sender: "ai", text: message }]);
        } else if (result.intentData.action === 'retrieve_reference_responses' && result.result.data) {
          const data = result.result.data;
          let message = `**Respuestas de Referencia**\n\n`;
          message += `**Resumen:**\n${data.summary}\n\n`;
          message += `**Estadísticas:**\n`;
          message += `• Total de respuestas: ${data.count}\n`;
          if (data.latestResponse) {
            message += `• Última respuesta: ${new Date(data.latestResponse.timestamp || data.latestResponse.received_at).toLocaleString()}\n`;
          }
          if (data.oldestResponse) {
            message += `• Primera respuesta: ${new Date(data.oldestResponse.timestamp || data.oldestResponse.received_at).toLocaleString()}\n`;
          }
          setMessages(prev => [...prev, { sender: "ai", text: message }]);
        } else if (result.intentData.action === 'show_candidates' && Array.isArray(result.result.data)) {
          const candidatesData = result.result.data;
          const candidatesDisplay = candidatesData.map(candidate => (
            `• **${candidate.name}** (${candidate.position}, ${candidate.status})\n  Email: ${candidate.email}\n  Phone: ${candidate.phone}\n  Skills: ${candidate.skills?.slice(0, 3).join(', ') || 'N/A'}`
          )).join('\n\n');
          setMessages(prev => [...prev, { sender: "ai", text: `Here are the candidates:\n\n${candidatesDisplay}` }]);
        } else if (result.intentData.action === 'show_candidates' && !Array.isArray(result.result.data)) {
          // Check if this is a job positions response (has message field)
          if (result.result.data.message) {
            setMessages(prev => [...prev, { sender: "ai", text: result.result.data.message }]);
          } else {
          // Handle single candidate display (including references)
          const candidate = result.result.data;
          let candidateDisplay = `**${candidate.name}** (${candidate.position}, ${candidate.status})\n`;
          candidateDisplay += `Email: ${candidate.email}\n`;
          candidateDisplay += `Phone: ${candidate.phone}\n`;
          candidateDisplay += `Location: ${candidate.location}\n`;
          candidateDisplay += `Experience: ${candidate.experience}\n`;
          candidateDisplay += `Skills: ${candidate.skills?.join(', ') || 'N/A'}\n`;
          candidateDisplay += `Salary Expectation: ${candidate.salary_expectation}\n`;
          candidateDisplay += `Availability: ${candidate.availability}\n`;
          
          // Check if user is asking for references specifically
          const userMessage = messages[messages.length - 1]?.text?.toLowerCase() || '';
          const isAskingForReferences = userMessage.includes('reference') || userMessage.includes('referencia');
          
          if (isAskingForReferences && candidate.references && candidate.references.length > 0) {
            candidateDisplay += `\n**References:**\n`;
            candidate.references.forEach((ref, index) => {
              candidateDisplay += `\n${index + 1}. **${ref.name}**\n`;
              candidateDisplay += `   Relationship: ${ref.relationship}\n`;
              candidateDisplay += `   Phone: ${ref.contact.phone}\n`;
              candidateDisplay += `   Email: ${ref.contact.email}\n`;
            });
          } else if (candidate.references && candidate.references.length > 0) {
            candidateDisplay += `\nReferences: ${candidate.references.length} reference(s) available`;
          }
          
          if (candidate.notes) {
            candidateDisplay += `\n\nNotes: ${candidate.notes}`;
          }
          
          setMessages(prev => [...prev, { sender: "ai", text: candidateDisplay }]);
          }
        } else if (result.result && result.result.data && result.result.data.message) {
          setMessages(prev => [...prev, { sender: "ai", text: result.result.data.message }]);
        } else if (result.result && result.result.data && result.result.data.analysis) {
          // Handle analysis content from analyze_resume action
          let analysisMessage = `**Candidate Analysis Complete!**\n\n`;
          analysisMessage += `**Action:** ${result.intentData?.action || 'analyze_resume'}\n`;
          analysisMessage += `**Summary:** ${result.summary || 'Analysis completed'}\n\n`;
          analysisMessage += `**Analysis:**\n${result.result.data.analysis}`;
          setMessages(prev => [...prev, { sender: "ai", text: analysisMessage }]);
        } else if (result.result && result.result.data && result.result.data.comparison) {
          // Handle comparison content from compare_candidates action
          let comparisonMessage = `**Candidate Comparison Complete!**\n\n`;
          comparisonMessage += `**Action:** ${result.intentData?.action || 'compare_candidates'}\n`;
          comparisonMessage += `**Summary:** ${result.summary || 'Comparison completed'}\n`;
          if (result.result.data.candidatesAnalyzed) {
            comparisonMessage += `\n**Candidates Analyzed:** ${result.result.data.candidatesAnalyzed}`;
          }
          if (result.result.data.jobPosition) {
            comparisonMessage += `\n**Job Position:** ${result.result.data.jobPosition}`;
          }
          comparisonMessage += `\n\n**Comparison:**\n${result.result.data.comparison}`;
          setMessages(prev => [...prev, { sender: "ai", text: comparisonMessage }]);
        } else if (result.explanation) {
          setMessages(prev => [...prev, { sender: "ai", text: result.explanation }]);
        } else if (result.summary) {
          setMessages(prev => [...prev, { sender: "ai", text: result.summary }]);
        } else {
          setMessages(prev => [...prev, { sender: "ai", text: "(No response message from AI)" }]);
        }
      } else {
        setMessages(prev => [...prev, { sender: "ai", text: `Error: ${data.error || 'Unknown error occurred'}` }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        sender: "ai", 
        text: "Sorry, I'm having trouble connecting. Please check your connection and try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !currentConversationId) return;

    setUploadingFile(true);
    
    try {
      // Read file content as text
      const text = await file.text();
      
      const response = await fetch(`${API_BASE_URL}/analyze-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          resumeText: text,
          context: {
            conversationId: currentConversationId,
            userId: user?._id,
            token: token
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const result = data.data;
        setResumes(prev => [...prev, result]);
        
        let analysisMessage = `**Resume Analysis Complete!**\n\n`;
        analysisMessage += `**Action:** ${result.intentData.action}\n`;
        analysisMessage += `**Summary:** ${result.summary}\n\n`;
        
        if (result.result.data.analysis) {
          analysisMessage += `**Analysis:**\n${result.result.data.analysis}`;
        }
        
        setMessages(prev => [...prev, { sender: "ai", text: analysisMessage }]);
      } else {
        setMessages(prev => [...prev, {
          sender: "ai",
          text: `Error processing resume: ${data.error}`
        }]);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessages(prev => [...prev, {
        sender: "ai",
        text: "Error uploading file. Please try again."
      }]);
    } finally {
      setUploadingFile(false);
      event.target.value = ''; // Reset file input
    }
  };

  const refreshData = async () => {
    try {
      setIsLoading(true);
      
      // Clear the cache
      const response = await fetch(`${API_BASE_URL}/cache/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setMessages(prev => [...prev, { 
          sender: "ai", 
          text: "Cache cleared! Next time you ask for candidates, fresh data will be fetched from the database." 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          sender: "ai", 
          text: "Error clearing cache. Please try again." 
        }]);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      setMessages(prev => [...prev, { 
        sender: "ai", 
        text: "Error updating data. Please check your connection." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to render markdown text (bold, italic, etc.)
  const renderMarkdown = (text) => {
    if (!text) return '';
    
    // Handle line breaks first
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Split by ** for bold text
      const parts = line.split(/(\*\*.*?\*\*)/g);
      
      const renderedParts = parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Bold text
          const boldText = part.slice(2, -2);
          return <strong key={`${lineIndex}-${index}`} className="font-bold text-gray-900">{boldText}</strong>;
        } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          // Italic text
          const italicText = part.slice(1, -1);
          return <em key={`${lineIndex}-${index}`} className="italic">{italicText}</em>;
        } else {
          // Regular text
          return part;
        }
      });
      
      return (
        <span key={lineIndex}>
          {renderedParts}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  const retrieveMessages = async () => {
    const phoneInput = prompt("Ingresa los números de teléfono (ej: +507 66756081, +507 12345678, +507 87654321):");
    if (!phoneInput) return;
    
    // Parse multiple phone numbers (comma or space separated)
    const phoneNumbers = phoneInput
      .split(/[,\s]+/)
      .map(phone => phone.trim())
      .filter(phone => phone.length > 0)
      .map(phone => phone.replace(/\s+/g, '')); // Remove spaces from each number
    
    if (phoneNumbers.length === 0) {
      setMessages(prev => [...prev, { 
        sender: "ai", 
        text: "No valid phone numbers detected." 
      }]);
      return;
    }

    setIsLoading(true);
    try {
      if (phoneNumbers.length === 1) {
        // Single phone number - use existing endpoint
        const response = await fetch(`${API_BASE_URL}/whatsapp/retrieve-messages?phoneNumber=${encodeURIComponent(phoneNumbers[0])}`);
        const data = await response.json();
        
        if (data.success) {
          const result = data.data;
          let message = `**Conversación con ${phoneNumbers[0]}**\n\n`;
          message += `**Resumen:**\n${result.summary}\n\n`;
          message += `**Estadísticas:**\n`;
          message += `• Total de mensajes: ${result.count}\n`;
          message += `• Primer mensaje: ${new Date(result.firstMessage?.timestamp || result.firstMessage?.saved_at).toLocaleString()}\n`;
          message += `• Último mensaje: ${new Date(result.lastMessage?.timestamp || result.lastMessage?.saved_at).toLocaleString()}\n`;
          
          setMessages(prev => [...prev, { sender: "ai", text: message }]);
        } else {
          setMessages(prev => [...prev, { 
            sender: "ai", 
            text: `Error retrieving messages: ${data.error}` 
          }]);
        }
      } else {
        // Multiple phone numbers - use new endpoint
        const response = await fetch(`${API_BASE_URL}/whatsapp/retrieve-multiple-messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phoneNumbers: phoneNumbers
          })
        });
        const data = await response.json();
        
        if (data.success) {
          const result = data.data;
          let message = `**Análisis de ${phoneNumbers.length} Candidatos**\n\n`;
          message += `**Análisis Completo:**\n${result.comprehensiveAnalysis}\n\n`;
          message += `**Resumen General:**\n`;
          message += `• Total de candidatos: ${result.totalCandidates}\n`;
          message += `• Total de mensajes: ${result.totalMessages}\n`;
          message += `• Promedio por candidato: ${Math.round(result.totalMessages / result.totalCandidates)}\n`;
          
          // Add individual summaries
          message += `\n**Detalles por Candidato:**\n`;
          result.results.forEach((candidateResult, index) => {
            message += `\n${index + 1}. **${candidateResult.phoneNumber}**: ${candidateResult.count} mensajes\n`;
            if (candidateResult.lastMessage) {
              const lastContent = (candidateResult.lastMessage.message || candidateResult.lastMessage.text || '').substring(0, 50);
              message += `   Último: "${lastContent}${lastContent.length >= 50 ? '...' : ''}"\n`;
            }
          });
          
          setMessages(prev => [...prev, { sender: "ai", text: message }]);
        } else {
          setMessages(prev => [...prev, { 
            sender: "ai", 
            text: `Error retrieving multiple messages: ${data.error}` 
          }]);
        }
      }
    } catch (error) {
      console.error('Error retrieving messages:', error);
      setMessages(prev => [...prev, { 
        sender: "ai", 
        text: "Error connecting to server. Check your connection." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: "Mostrar Candidatos", action: () => setInput("Mostrar todos los candidatos"), icon: "👥" },
    { label: "Mostrar Referencias", action: () => setInput("Mostrar referencias de un candidato"), icon: "📞" },
    { label: "Actualizar Datos", action: () => refreshData(), icon: "🔄" },
    { label: "Analizar Mensajes", action: () => setInput("Analizar los mensajes de WhatsApp de candidatos"), icon: "📊" },
    { label: "Recuperar Mensajes", action: () => retrieveMessages(), icon: "📱" },
    { label: "Múltiples Candidatos", action: () => setInput("Analizar estos 3 candidatos: +507 66756081, +507 12345678, +507 87654321"), icon: "👥👥👥" },
    { label: "Respuestas Referencia", action: () => setInput("Recuperar respuestas de referencia"), icon: "📋" },
    { label: "Subir CV", action: () => fileInputRef.current?.click(), icon: "📄" },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-white flex flex-col overflow-hidden items-center">
        <div className="p-4 flex-shrink-0">
          <button
            onClick={createNewChat}
            disabled={isLoading}
            className="flex items-center justify-center w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-2 disabled:opacity-50"
          >
            {isLoading ? <FaSpinner className="w-3 h-3 animate-spin" /> : <FaPlus className="w-3 h-3" />}
            Nuevo Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {chats.map((chat) => (
            <div key={chat.id} className="flex items-center mb-1">
              <button
                onClick={() => selectChat(chat.id)}
                className={`flex-1 px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                  chat.active
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {chat.title}
              </button>
              <button
                onClick={() => deleteChat(chat.id)}
                className="ml-2 p-1 text-gray-400 hover:text-red-500"
                title="Delete chat"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {chats.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Bienvenido al Asistente IA</h2>
              <p className="text-gray-600 mb-4">Comienza creando un nuevo chat para analizar candidatos y generar insights.</p>
              <button
                onClick={createNewChat}
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? <FaSpinner className="w-4 h-4 animate-spin" /> : "Crear Nuevo Chat"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Quick Actions */}
            {currentConversationId && (
              <div className="border-b border-gray-200 p-4 flex-shrink-0">
                <div className="flex gap-2 flex-wrap">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      disabled={isLoading || uploadingFile}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      <span>{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
                {resumes.length > 0 && (
                  <div className="mt-3 text-sm text-gray-600">
                    {resumes.length} CV{resumes.length > 1 ? 's' : ''} procesado{resumes.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`py-4 ${
                      msg.sender === "user" ? "flex justify-end" : ""
                    }`}
                  >
                    <div className={`$ {
                      msg.sender === "user" ? "max-w-[80%]" : "max-w-[95%]"
                    }`}>
                      <p className={`text-sm mb-1 ${
                        msg.sender === "user" ? "text-right text-gray-600" : "text-gray-400"
                      }`}>
                        {msg.sender === "user" ? "Tú" : "Asistente"}
                      </p>
                      <div className={`text-gray-800 ${
                        msg.sender === "ai" ? "whitespace-pre-line" : ""
                      }`}>
                        {renderMarkdown(msg.text)}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      La IA está pensando...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input area */}
            <div className="border-t border-gray-200 p-4 flex-shrink-0">
              <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSend} className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
                    placeholder="Escribe tu mensaje... (ej: 'Enviar mensaje a un candidato', 'Mostrar todos los candidatos', 'Generar preguntas para un candidato')"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading || !currentConversationId}
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 disabled:text-gray-300 transition-colors"
                    disabled={!input.trim() || isLoading || !currentConversationId}
                  >
                    <FaPaperPlane className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}; 