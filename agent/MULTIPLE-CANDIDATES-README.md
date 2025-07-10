# Multiple Candidates Analysis Feature

This feature allows you to retrieve, analyze, and compare WhatsApp conversations from multiple candidates simultaneously. It provides comprehensive insights and statistics across all candidates.

## 🚀 Features

### 1. Multiple Phone Number Detection
- Automatically detects multiple phone numbers in natural language queries
- Supports various phone number formats:
  - `+507 66756081` (with spaces)
  - `+50766756081` (without spaces)
  - `50766756081` (without country code)
- Handles comma-separated and space-separated lists

### 2. Natural Language Queries
You can ask questions like:
- "What did these 3 candidates say: +507 66756081, +507 12345678, +507 87654321"
- "¿Qué dijeron estos 3 candidatos: +507 66756081, +507 12345678, +507 87654321?"
- "Analyze these candidates +507 66756081 +507 12345678 +507 87654321"
- "Show me the conversation with these people: +507 66756081, +507 12345678, +507 87654321"

### 3. Comprehensive Analysis
The system provides:
- **General Statistics**: Total messages, incoming/outgoing counts, date ranges
- **Individual Summaries**: Per-candidate message counts and last messages
- **Activity Insights**: Most active candidate, last activity timestamps
- **Comparative Analysis**: Average messages per candidate, engagement metrics

## 📡 API Endpoints

### POST `/api/whatsapp/retrieve-multiple-messages`
Retrieves and analyzes messages from multiple phone numbers.

**Request Body:**
```json
{
  "phoneNumbers": ["+50766756081", "+50712345678", "+50787654321"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "phoneNumbers": ["+50766756081", "+50712345678", "+50787654321"],
    "results": [
      {
        "phoneNumber": "+50766756081",
        "messages": [...],
        "summary": "Conversation summary...",
        "count": 15,
        "lastMessage": {...},
        "firstMessage": {...}
      }
    ],
    "comprehensiveAnalysis": "📊 Comprehensive Analysis of 3 Candidates...",
    "totalMessages": 45,
    "totalCandidates": 3,
    "allMessages": [...],
    "summary": "📊 Comprehensive Analysis of 3 Candidates..."
  }
}
```

## 🎯 Intent Detection

The system automatically detects multiple candidate queries through:

### Intent Types:
- `retrieve_messages_for_multiple_phones`: When multiple phone numbers are detected
- `retrieve_messages_for_phone`: When a single phone number is detected

### Detection Patterns:
- Multiple phone number extraction using regex patterns
- Natural language patterns for candidate-related questions
- Bilingual support (Spanish and English)

## 🖥️ Frontend Integration

### Quick Actions
- **"Múltiples Candidatos"** button: Pre-fills input with example multiple candidates query
- **"Recuperar Mensajes"** button: Enhanced to handle both single and multiple phone numbers

### User Interface
- Prompts for multiple phone numbers (comma or space separated)
- Displays comprehensive analysis with statistics
- Shows individual candidate summaries
- Provides insights and comparisons

## 🧪 Testing

Run the test script to verify functionality:

```bash
cd dashboard-ott-master/agent
node test-multiple-candidates.js
```

### Test Coverage:
1. **Multiple phone numbers retrieval**
2. **Natural language queries**
3. **Spanish language support**
4. **Mixed format phone numbers**
5. **Intent detection accuracy**

## 📊 Analysis Output Example

```
📊 **Comprehensive Analysis of 3 Candidates**

📈 **General Statistics:**
• Total messages: 45
• Incoming messages: 28
• Outgoing messages: 17
• Date range: 1/15/2024 - 1/20/2024

🏆 **Most Active Candidate:** +50766756081 (15 messages)
🕒 **Last Activity:** +50787654321 (1/20/2024, 2:30:15 PM)

**Candidate Summaries:**

1. 📱 **+50766756081**: 15 messages
   📝 Last message: "Thank you for the opportunity, I'm very interested..."

2. 📱 **+50712345678**: 12 messages
   📝 Last message: "When can we schedule the interview?"

3. 📱 **+50787654321**: 18 messages
   📝 Last message: "I have 5 years of experience in..."

💡 **Insights:**
• Average messages per candidate: 15
• Candidates with messages: 3/3
```

## 🔧 Implementation Details

### Backend Components:
- **IntentDetector.js**: Enhanced to detect multiple phone numbers
- **TaskRouter.js**: Added `handleRetrieveMultipleMessages` method
- **routes-new.js**: New endpoint for multiple message retrieval
- **WhatsAppService.js**: Reused for individual message retrieval

### Frontend Components:
- **AI_Agent.jsx**: Enhanced retrieveMessages function
- **Quick Actions**: Added multiple candidates button
- **Error Handling**: Comprehensive error handling for multiple scenarios

## 🎨 Usage Examples

### Natural Language Queries:
```
User: "What did these 3 candidates say: +507 66756081, +507 12345678, +507 87654321"
AI: [Comprehensive analysis of all 3 candidates]

User: "¿Qué dijeron estos 3 candidatos: +507 66756081, +507 12345678, +507 87654321?"
AI: [Análisis completo de los 3 candidatos]

User: "Analyze these candidates +507 66756081 +507 12345678 +507 87654321"
AI: [Detailed analysis with insights]
```

### Quick Actions:
- Click "Múltiples Candidatos" button
- Enter phone numbers when prompted
- View comprehensive analysis

## 🔮 Future Enhancements

1. **Advanced Analytics**: Sentiment analysis across candidates
2. **Comparative Insights**: Direct candidate comparisons
3. **Trend Analysis**: Message patterns over time
4. **Export Features**: PDF/Excel reports for multiple candidates
5. **Batch Operations**: Bulk message sending to multiple candidates

## 🐛 Troubleshooting

### Common Issues:
1. **No phone numbers detected**: Ensure proper format (+507 66756081)
2. **Empty results**: Check if candidates have WhatsApp conversations
3. **API errors**: Verify server is running on port 4001

### Debug Commands:
```bash
# Test multiple candidates functionality
node test-multiple-candidates.js

# Check server logs
tail -f logs/server.log
```

## 📝 Notes

- Phone numbers are automatically normalized (spaces removed)
- Duplicate phone numbers are filtered out
- Empty conversations are handled gracefully
- All timestamps are in local timezone
- Analysis is bilingual (Spanish/English) 