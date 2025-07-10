# AI Agent Backend

A comprehensive AI-powered HR assistant that can handle recruitment tasks, schedule interviews, generate follow-up questions, and communicate with candidates via WhatsApp.

## 🎯 Features

### 🤖 AI-Powered Conversations
- **Natural Language Processing**: Handle any user query about recruitment
- **Context-Aware Responses**: Remember conversation history and context
- **Resume Analysis**: Extract structured information from uploaded resumes
- **Follow-up Questions**: Generate relevant interview questions based on candidate profiles

### 📅 Calendar Integration
- **Google Calendar**: Schedule interviews and meetings automatically
- **Available Slots**: Find free time slots for scheduling
- **Interview Management**: Track interview status and details
- **Reminders**: Automatic notifications for upcoming interviews

### 📱 WhatsApp Integration
- **Candidate Communication**: Send interview invitations via WhatsApp
- **Follow-up Questions**: Automatically send questions to candidates
- **Interview Reminders**: Send reminders before scheduled interviews
- **Feedback**: Send interview feedback to candidates

### 💾 Data Management
- **Conversation Logs**: Persistent chat history with MongoDB
- **Candidate Profiles**: Store and manage candidate information
- **Interview Tracking**: Track interview status and outcomes
- **File Processing**: Handle resume uploads (PDF, DOCX, TXT)

## 🏗️ Architecture

```
agent/
├── models/
│   └── Conversation.js          # MongoDB schema for conversations
├── services/
│   ├── OpenAIService.js         # OpenAI API integration
│   ├── CalendarService.js       # Google Calendar integration
│   └── WhatsAppService.js       # WhatsApp Web integration
├── database/
│   └── connection.js            # MongoDB connection management
├── routes.js                    # API endpoints
├── server.js                    # Express server setup
├── package.json                 # Dependencies
└── README.md                    # This file
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd agent
npm install
```

### 2. Environment Configuration

Copy the environment example file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=4001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ai_agent_db

# Google Calendar Configuration
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
GOOGLE_CALENDAR_ID=primary

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./whatsapp-session
```

### 3. Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Calendar API
4. Create a service account and download the JSON credentials
5. Save the JSON file as `google-credentials.json` in the agent directory
6. Share your Google Calendar with the service account email

### 4. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:4001`

## 📡 API Endpoints

### Conversations

#### Create New Conversation
```http
POST /api/conversations
Content-Type: application/json

{
  "userId": "user123",
  "context": {
    "currentTask": "Resume Analysis",
    "jobDescription": "Software Engineer position"
  }
}
```

#### Get Conversation
```http
GET /api/conversations/:conversationId
```

#### Get User Conversations
```http
GET /api/users/:userId/conversations
```

#### Delete Conversation
```http
DELETE /api/conversations/:conversationId
```

### Messages

#### Send Message
```http
POST /api/conversations/:conversationId/messages
Content-Type: application/json

{
  "message": "Schedule an interview with John Doe for tomorrow"
}
```

### Resume Processing

#### Upload Resume
```http
POST /api/conversations/:conversationId/resumes
Content-Type: multipart/form-data

Form data:
- resume: [file] (PDF, DOCX, DOC, TXT)
```

#### Generate Follow-up Questions
```http
POST /api/conversations/:conversationId/follow-up-questions
Content-Type: application/json

{
  "candidateId": "candidate-uuid",
  "context": {}
}
```

### Interview Management

#### Schedule Interview
```http
POST /api/conversations/:conversationId/schedule-interview
Content-Type: application/json

{
  "candidateId": "candidate-uuid",
  "interviewData": {
    "date": "2024-01-15T10:00:00Z",
    "duration": 60,
    "location": "Online",
    "description": "Technical interview"
  }
}
```

#### Send Questions via WhatsApp
```http
POST /api/conversations/:conversationId/send-questions
Content-Type: application/json

{
  "candidateId": "candidate-uuid",
  "questions": [
    {
      "question": "Tell me about your experience with React",
      "category": "technical"
    }
  ]
}
```

### Calendar Integration

#### Get Available Slots
```http
GET /api/calendar/available-slots?startDate=2024-01-15T00:00:00Z&endDate=2024-01-16T00:00:00Z&duration=60
```

### WhatsApp Integration

#### Get QR Code
```http
GET /api/whatsapp/qr
```

#### Get Status
```http
GET /api/whatsapp/status
```

## 💬 Usage Examples

### 1. Basic Conversation Flow

```javascript
// 1. Create a new conversation
const conversation = await fetch('/api/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    context: { currentTask: 'Interview Scheduling' }
  })
});

// 2. Send a message
const response = await fetch(`/api/conversations/${conversationId}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "I need to schedule an interview with John Doe for tomorrow at 2 PM"
  })
});
```

### 2. Resume Analysis Workflow

```javascript
// 1. Upload resume
const formData = new FormData();
formData.append('resume', resumeFile);

const analysis = await fetch(`/api/conversations/${conversationId}/resumes`, {
  method: 'POST',
  body: formData
});

// 2. Generate follow-up questions
const questions = await fetch(`/api/conversations/${conversationId}/follow-up-questions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ candidateId: 'candidate-uuid' })
});
```

### 3. Interview Scheduling

```javascript
// Schedule interview with calendar and WhatsApp integration
const interview = await fetch(`/api/conversations/${conversationId}/schedule-interview`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    candidateId: 'candidate-uuid',
    interviewData: {
      date: '2024-01-15T14:00:00Z',
      duration: 60,
      location: 'Online',
      description: 'Technical interview for React position'
    }
  })
});
```

## 🔧 Configuration

### OpenAI API
- Get your API key from [OpenAI Platform](https://platform.openai.com/)
- Add it to your `.env` file as `OPENAI_API_KEY`

### Google Calendar
- Enable Google Calendar API in Google Cloud Console
- Create service account and download credentials
- Share your calendar with the service account email

### WhatsApp Web
- The system will generate a QR code on first run
- Scan the QR code with your WhatsApp mobile app
- The session will be saved for future use

### MongoDB
- Install MongoDB locally or use MongoDB Atlas
- Update `MONGODB_URI` in your `.env` file

## 🛡️ Security Features

- **File Validation**: Only allowed file types (PDF, DOCX, DOC, TXT)
- **File Size Limits**: Maximum 10MB per file
- **Input Sanitization**: All inputs are validated and sanitized
- **CORS Configuration**: Restricted to frontend URL
- **Error Handling**: Comprehensive error handling and logging

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check if MongoDB is running
   - Verify `MONGODB_URI` in `.env`
   - Ensure network connectivity

2. **OpenAI API Errors**
   - Verify your API key is correct
   - Check API usage limits
   - Ensure internet connectivity

3. **WhatsApp QR Code Not Appearing**
   - Wait a few seconds for initialization
   - Check browser console for errors
   - Restart the server if needed

4. **Google Calendar Errors**
   - Verify service account credentials
   - Check calendar sharing permissions
   - Ensure Google Calendar API is enabled

### Logs

Check the console output for detailed error messages and service status:

```bash
npm run dev
```

## 📝 Development

### Adding New Features

1. **New AI Capabilities**: Extend `OpenAIService.js`
2. **New Calendar Features**: Extend `CalendarService.js`
3. **New WhatsApp Features**: Extend `WhatsAppService.js`
4. **New API Endpoints**: Add to `routes.js`

### Testing

```bash
npm test
```

## 📄 License

MIT License - see LICENSE file for details 