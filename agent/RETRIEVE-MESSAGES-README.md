# Retrieve Messages Functionality

## Overview

The retrieve messages functionality allows you to retrieve and summarize WhatsApp conversations with specific phone numbers. This feature is integrated into both the API endpoints and the AI Agent system.

## Features

- **Message Retrieval**: Get all messages from a specific phone number conversation
- **Conversation Summarization**: Automatic summary generation with statistics
- **Timeline View**: Chronological list of all messages with timestamps
- **Bilingual Support**: Works in both Spanish and English
- **AI Integration**: Can be triggered through natural language prompts

## API Endpoints

### 1. Direct API Endpoint

**GET** `/api/whatsapp/retrieve-messages`

**Parameters:**
- `phoneNumber` (required): The phone number to retrieve messages for (e.g., +50766756081)

**Example:**
```bash
curl "http://localhost:4001/api/whatsapp/retrieve-messages?phoneNumber=+50766756081"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "phoneNumber": "+50766756081",
    "messages": [...],
    "summary": "Conversation with +50766756081:\n• Total messages: 5\n• Incoming messages: 3\n• Outgoing messages: 2\n...",
    "count": 5,
    "lastMessage": {...},
    "firstMessage": {...}
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. AI Agent Integration

You can also trigger message retrieval through natural language prompts:

**Spanish:**
- "Recuperar mensajes de +50766756081"
- "Ver conversación con +50766756081"
- "Mostrar mensajes de +50766756081"

**English:**
- "Retrieve messages from +50766756081"
- "Get conversation with +50766756081"
- "Show messages from +50766756081"

## Frontend Integration

### Quick Action Button

A new "Recuperar Mensajes" button has been added to the AI Agent interface. When clicked, it will:

1. Prompt for a phone number
2. Call the retrieve messages API
3. Display the conversation summary in the chat

### Response Format

The AI Agent will display:
- 📱 **Conversation header** with phone number
- 📊 **Summary** with conversation statistics
- 📈 **Statistics** including message counts and timestamps
- 📝 **Message timeline** with all messages in chronological order

## Implementation Details

### Backend Components

1. **Routes** (`routes-new.js`):
   - `GET /whatsapp/retrieve-messages` - Direct API endpoint
   - `POST /whatsapp/webhook` - Webhook for incoming messages
   - `GET /whatsapp/webhook` - Webhook verification

2. **Intent Detector** (`IntentDetector.js`):
   - Added `retrieve_messages` action
   - Supports both Spanish and English prompts
   - Extracts phone numbers from user input

3. **Task Router** (`TaskRouter.js`):
   - `handleRetrieveMessages()` method
   - `createConversationSummary()` helper function
   - Bilingual response generation

4. **WhatsApp Service** (`WhatsAppService.js`):
   - `getMessagesByNumber()` method
   - Message storage and retrieval
   - Webhook processing

### Frontend Components

1. **AI Agent** (`AI_Agent.jsx`):
   - `retrieveMessages()` function
   - "Recuperar Mensajes" quick action button
   - Response handling for `retrieve_messages` action

## Usage Examples

### 1. Using the Quick Action Button

1. Open the AI Agent interface
2. Click the "Recuperar Mensajes" button
3. Enter the phone number (e.g., +50766756081)
4. View the conversation summary

### 2. Using Natural Language

Type in the chat:
```
Recuperar mensajes de +50766756081
```

The AI will automatically:
1. Detect the intent as `retrieve_messages`
2. Extract the phone number
3. Retrieve and summarize the conversation
4. Display the results

### 3. Using the API Directly

```javascript
const response = await fetch('http://localhost:4001/api/whatsapp/retrieve-messages?phoneNumber=+50766756081');
const data = await response.json();

if (data.success) {
  console.log(`Found ${data.data.count} messages`);
  console.log(data.data.summary);
}
```

## Message Summary Format

The conversation summary includes:

- **Basic Statistics**:
  - Total message count
  - Incoming vs outgoing messages
  - Conversation duration
  - Last message preview

- **Message Timeline**:
  - Chronological list of all messages
  - Timestamps for each message
  - Direction indicators (📥 incoming, 📤 outgoing)
  - Message content previews

## Error Handling

The system handles various error scenarios:

- **No phone number provided**: Returns error message asking for phone number
- **No messages found**: Returns empty result with appropriate message
- **Invalid phone number**: Validates format and provides feedback
- **API errors**: Graceful error handling with user-friendly messages

## Testing

Use the provided test script to verify functionality:

```bash
cd dashboard-ott-master/agent
node test-retrieve-messages.js
```

This will test:
1. Direct API endpoint
2. AI Agent integration with Spanish prompt
3. AI Agent integration with English prompt

## Configuration

Make sure your WhatsApp service is properly configured:

1. Set `WHATSAPP_PHONE_NUMBER_ID` in your environment
2. Set `WHATSAPP_VERIFY_TOKEN` for webhook verification
3. Ensure the WhatsApp Business API is connected

## Future Enhancements

Potential improvements:
- Message filtering by date range
- Search within conversations
- Export conversation data
- Real-time message updates
- Conversation analytics and insights 