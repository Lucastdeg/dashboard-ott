# AI Agent - New Structure with Full Data Access

## 🎯 Overview

This is a completely reorganized AI Agent system for the recruitment platform that provides **full access to all data** in the data directory. The LLM now has complete context awareness and can make intelligent decisions based on:

- **Candidate profiles** (5 detailed candidates)
- **Message history** (WhatsApp conversations)
- **Chat history** (Previous AI conversations)
- **Context-aware responses**

## 🏗️ Architecture

### Core Components

1. **IntentDetector** (`services/IntentDetector.js`)
   - Analyzes user prompts and determines actions
   - Has access to ALL data from the data directory
   - Returns structured JSON with action, intent, reasoning, and parameters

2. **TaskRouter** (`services/TaskRouter.js`)
   - Handles different actions based on detected intent
   - Uses AI to generate context-aware responses
   - Has full access to all data for intelligent decision making

3. **AIAgent** (`services/AIAgent.js`)
   - Main orchestrator that coordinates IntentDetector and TaskRouter
   - Provides clean interface for processing prompts
   - Handles utility functions like WhatsApp JSON generation

### Data Access

The system now provides **complete data access** to the LLM:

```javascript
// All data is loaded and passed to the LLM
const allData = {
  candidates: candidates,           // Full candidate profiles
  messageHistory: messageHistory,   // WhatsApp conversations
  chatHistory: chatHistory         // Previous AI conversations
};
```

## 🚀 Available Actions

### 1. **send_message**
- Send messages to candidates
- Context-aware (considers previous conversations)
- Generates appropriate content based on history

### 2. **analyze_messages**
- Analyze WhatsApp messages from candidates
- Provides insights on engagement, themes, and recommendations
- Uses full conversation history for context

### 3. **show_candidates**
- Display candidate information
- Can show specific candidate or all candidates
- Includes full profile data

### 4. **generate_questions**
- Generate follow-up questions for candidates
- Builds on previous conversations
- Avoids repeating already asked questions

### 5. **compare_candidates**
- Compare multiple candidates
- Uses message history for communication quality assessment
- Provides detailed comparison with recommendations

### 6. **analyze_resume**
- Analyze resumes in context of existing candidates
- Compares with current pipeline
- Provides recommendations

### 7. **schedule_interview**
- Schedule interviews with context
- Uses candidate profile and message history
- Provides interview format and question suggestions

### 8. **general_chat**
- General conversation with full context
- Can answer questions about recruitment status
- Uses all available data for informed responses

## 📊 Data Structure

### Candidates Data
```javascript
{
  id: "candidate_001",
  name: "Carlos Rodríguez",
  email: "carlos.rodriguez@email.com",
  phone: "+34612345678",
  position: "Frontend Developer",
  status: "interview_scheduled",
  experience: "4 años",
  skills: ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Git"],
  education: [...],
  experience_history: [...],
  languages: ["Español", "Inglés"],
  location: "Madrid, España",
  salary_expectation: "35000-45000",
  availability: "Inmediata",
  interview_date: "2024-01-16T10:00:00Z",
  resume_url: "/resumes/carlos_rodriguez_cv.pdf",
  notes: "Muy buen perfil técnico, experiencia sólida en React"
}
```

### Message History
```javascript
{
  id: "msg_001",
  phoneNumber: "+34612345678",
  type: "incoming|outgoing",
  message: "Hola, estoy interesado en la posición...",
  timestamp: "2024-01-15T10:30:00Z",
  candidateId: "candidate_001",
  conversationId: "conv_001"
}
```

### Chat History
```javascript
{
  conversationId: "conv_1750285573364",
  sender: "user|ai",
  message: "Ask follow up questions about python to Carlos",
  timestamp: "2025-06-18T22:26:33.525Z"
}
```

## 🔧 Usage Examples

### Basic Prompt Processing
```javascript
const AIAgent = require('./services/AIAgent');
const aiAgent = new AIAgent();

// Process any prompt with full context
const result = await aiAgent.processPrompt('Send a follow-up message to Carlos');
console.log(result.intent);        // Structured intent data
console.log(result.result);        // Action result
console.log(aiAgent.getWhatsAppJson(result)); // WhatsApp JSON if applicable
console.log(aiAgent.getActionSummary(result)); // Human-readable summary
```

### Specific Actions
```javascript
// Send message to candidate
const messageResult = await aiAgent.sendMessageToCandidate('Carlos Rodríguez', 'followup');

// Generate questions
const questionsResult = await aiAgent.generateQuestionsForCandidate('Ana García');

// Show candidates
const candidatesResult = await aiAgent.showCandidates();

// Analyze messages
const analyzeResult = await aiAgent.analyzeMessages([]);
```

## 🌐 API Endpoints

### Main Endpoint
```
POST /process-prompt
{
  "prompt": "Send a message to Carlos",
  "context": {}
}
```

### Specific Endpoints
```
POST /send-message
POST /generate-questions
POST /analyze-messages
GET /candidates/:name?
POST /compare-candidates
POST /analyze-resume
POST /schedule-interview
GET /health
```

## 🧪 Testing

Run the test suite to see the enhanced capabilities:

```bash
node test-new-agent.js
```

The tests demonstrate:
- Context-aware message generation
- Conversation history awareness
- Data-driven responses
- Multi-language support (English/Spanish)

## 🎉 Key Improvements

### Before (Old System)
- ❌ Limited data access
- ❌ No conversation context
- ❌ No message history awareness
- ❌ Generic responses
- ❌ Disorganized structure

### After (New System)
- ✅ **Full data access** to all information
- ✅ **Context-aware** responses based on history
- ✅ **Intelligent message generation** that avoids repetition
- ✅ **Structured intent detection** with reasoning
- ✅ **Clean, organized architecture**
- ✅ **Enhanced AI capabilities** with comprehensive prompts

## 🔮 Future Enhancements

1. **Real-time data updates** - Live data synchronization
2. **Advanced analytics** - Candidate scoring and ranking
3. **Automated follow-ups** - Smart scheduling and reminders
4. **Integration hooks** - Easy WhatsApp/email integration
5. **Performance optimization** - Caching and data indexing

## 📝 Notes

- The system now provides **complete context awareness**
- All LLM prompts include full data access
- Responses are intelligent and avoid repetition
- The architecture is clean and maintainable
- Easy to extend with new actions and data sources

## Architecture

```
services/
├── IntentDetector.js    # Analyzes user prompts and returns structured intent
├── TaskRouter.js        # Routes tasks based on detected intent
└── AIAgent.js          # Main orchestrator that coordinates everything

routes-new.js           # Clean API endpoints using the new structure
test-new-agent.js       # Test file to demonstrate functionality
```

## How It Works

### 1. Intent Detection
The `IntentDetector` analyzes user prompts and returns structured JSON:

```json
{
  "action": "send_message",
  "intent": "Send a follow-up message to John Doe",
  "reasoning": "User explicitly requested to send a message to a specific candidate",
  "parameters": {
    "candidate_name": "John Doe",
    "candidate_id": null,
    "message_type": "followup",
    "language": "en"
  }
}
```

### 2. Task Routing
The `TaskRouter` handles different actions based on the detected intent:

- `send_message` - Send messages to candidates
- `analyze_messages` - Analyze WhatsApp messages
- `show_candidates` - Display candidate information
- `generate_questions` - Generate follow-up questions
- `compare_candidates` - Compare multiple candidates
- `analyze_resume` - Analyze candidate resumes
- `schedule_interview` - Schedule interviews
- `general_chat` - General conversation

### 3. AI Agent Orchestrator
The main `AIAgent` class coordinates everything and provides a clean interface.

## Usage Examples

### Basic Usage

```javascript
const AIAgent = require('./services/AIAgent');
const aiAgent = new AIAgent();

// Process any prompt
const result = await aiAgent.processPrompt('Send a message to John Doe');

// Get WhatsApp JSON for integration
const whatsappJson = aiAgent.getWhatsAppJson(result);

// Get summary of what was done
const summary = aiAgent.getActionSummary(result);
```

### API Endpoints

#### Main Endpoint
```http
POST /process-prompt
{
  "prompt": "Send a follow-up message to John Doe",
  "context": {
    "jobDescription": "Senior Developer position",
    "previousMessages": [...]
  }
}
```

#### Specific Endpoints
```http
POST /send-message
{
  "candidateName": "John Doe",
  "messageType": "followup",
  "context": {...}
}

POST /generate-questions
{
  "candidateName": "Maria Garcia",
  "context": {...}
}

GET /candidates/John%20Doe
GET /candidates
```

## Response Format

All endpoints return a consistent format:

```json
{
  "success": true,
  "data": {
    "intent": {
      "action": "send_message",
      "intent": "Send a follow-up message to John Doe",
      "reasoning": "...",
      "parameters": {...}
    },
    "result": {
      "success": true,
      "data": {...},
      "summary": "..."
    },
    "whatsappJson": {
      "action": "send_whatsapp",
      "candidate": "John Doe",
      "number": "+1234567890",
      "message": "Hello John, here are some follow-up questions..."
    },
    "summary": "I sent a message to John Doe. Here is what I sent them...",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

## WhatsApp Integration

The system automatically generates WhatsApp JSON when sending messages:

```json
{
  "action": "send_whatsapp",
  "candidate": "John Doe",
  "number": "+1234567890",
  "message": "Hello John, here are some follow-up questions:\n\n1. What has been your greatest achievement?\n2. How do you handle challenges?\n3. Which technical tools are you most proficient with?"
}
```

## Testing

Run the test file to see the system in action:

```bash
node test-new-agent.js
```

This will test various scenarios:
- Sending messages to candidates
- Generating follow-up questions
- Showing candidate information
- Analyzing messages
- General chat
- Spanish language support

## Migration from Old System

### Old vs New

**Old System:**
- Mixed logic in `routes.js`
- Complex intent detection in `AIAgentTaskRouter.js`
- Inconsistent response formats
- Hard to maintain and extend

**New System:**
- Clean separation of concerns
- Structured intent detection
- Consistent JSON responses
- Easy to maintain and extend
- Clear API endpoints

### Steps to Migrate

1. **Replace the old routes.js** with `routes-new.js`
2. **Update server.js** to use the new routes
3. **Test the new endpoints** using the test file
4. **Update frontend** to use the new response format

## Environment Variables

Make sure you have these environment variables set:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Future Enhancements

- **Message History Integration** - Store and retrieve conversation history
- **Candidate Database** - Replace mock data with real database
- **WhatsApp Webhook** - Handle incoming messages
- **Calendar Integration** - Schedule interviews automatically
- **Resume Analysis** - Parse and analyze uploaded resumes
- **Multi-language Support** - Better language detection and responses

## Troubleshooting

### Common Issues

1. **OpenAI API Key Missing**
   - Ensure `OPENAI_API_KEY` is set in environment variables

2. **Candidate Not Found**
   - Check the candidate name spelling
   - Verify the candidate exists in the data

3. **Intent Detection Fails**
   - Check the prompt clarity
   - Verify the system prompt in `IntentDetector.js`

### Debug Mode

Enable debug logging by setting:

```javascript
console.log('Intent detected:', intentData);
console.log('Task result:', result);
```

## Contributing

When adding new features:

1. **Add new actions** to `IntentDetector.js`
2. **Implement handlers** in `TaskRouter.js`
3. **Add convenience methods** to `AIAgent.js`
4. **Create API endpoints** in `routes-new.js`
5. **Add tests** to `test-new-agent.js`
6. **Update documentation** in this README 