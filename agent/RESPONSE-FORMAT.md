# AI Agent Response Format Specification

## 🎯 Overview

The AI Agent now returns responses in a specific format that includes:
- **intentData** for ALL responses
- **WhatsApp JSON** ONLY for message actions
- **Explanations** ONLY for actions that DO something
- **Summaries** for ALL actions

## 📋 Response Structure

### All Responses Include:
```javascript
{
  "success": true,
  "data": {
    "intentData": {
      "action": "action_name",
      "intent": "detailed_intent_description", 
      "reasoning": "why_this_action_was_chosen",
      "parameters": {
        "candidate_name": "name_if_mentioned",
        "candidate_id": "id_if_known", 
        "message_type": "question|followup|general",
        "language": "en|es"
      }
    },
    "result": {
      "success": true,
      "data": { /* action-specific data */ },
      "intentData": { /* same as above */ },
      "explanation": "explanation_if_action_did_something" // OPTIONAL
    },
    "whatsappJson": { /* ONLY for message actions */ }, // OPTIONAL
    "explanation": "explanation_if_action_did_something", // OPTIONAL
    "summary": "summary_for_all_actions",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 📤 Message Actions (send_message, generate_questions)

### WhatsApp JSON Format:
```javascript
{
  "candidate": "Carlos Rodríguez",
  "number": "+34612345678", 
  "message": "Hello Carlos, here are some follow-up questions..."
}
```

### Explanation:
```javascript
"I sent a message to Carlos Rodríguez. Here is what I sent them:

Hello Carlos, here are some follow-up questions:

1. Can you explain your most complex project using React?
2. How do you handle state management in large applications?
3. What testing frameworks are you familiar with?"
```

## 📊 Analysis Actions (analyze_messages, show_candidates, compare_candidates, analyze_resume, general_chat)

### No WhatsApp JSON
### No Explanation (just summary)

### Example Summary:
```javascript
"Analyzed 12 messages from candidates"
"Showing 5 candidate(s)" 
"Compared 2 candidates"
"Analyzed resume (1500 characters)"
"Provided information about recruitment status"
```

## 🎯 Action-Specific Rules

### Actions That DO Something (Have Explanations):
1. **send_message** - Sends actual message to candidate
2. **generate_questions** - Generates and sends questions to candidate  
3. **schedule_interview** - Schedules an interview

### Actions That Just Analyze/Summarize (No Explanations):
1. **analyze_messages** - Analyzes existing messages
2. **show_candidates** - Shows candidate information
3. **compare_candidates** - Compares candidates
4. **analyze_resume** - Analyzes resume
5. **general_chat** - Provides information

## 🔧 API Usage Examples

### Send Message:
```javascript
POST /process-prompt
{
  "prompt": "Send a follow-up message to Carlos"
}

// Response includes:
// - intentData
// - whatsappJson: {candidate, number, message}
// - explanation: "I sent a message to Carlos..."
// - summary: same as explanation
```

### Show Candidates:
```javascript
POST /process-prompt
{
  "prompt": "Show all candidates"
}

// Response includes:
// - intentData
// - NO whatsappJson
// - NO explanation
// - summary: "Showing 5 candidate(s)"
```

### Generate Questions:
```javascript
POST /process-prompt
{
  "prompt": "Generate questions for Ana"
}

// Response includes:
// - intentData
// - whatsappJson: {candidate, number, message}
// - explanation: "I sent questions to Ana..."
// - summary: same as explanation
```

## 🧪 Testing

Run the test suite to see all response formats:

```bash
node test-new-agent.js
```

The tests validate:
- ✅ intentData present in ALL responses
- ✅ WhatsApp JSON ONLY for message actions
- ✅ Explanations ONLY for actions that DO something
- ✅ Correct JSON format: {candidate, number, message}
- ✅ Proper summaries for all actions

## 📝 Key Points

1. **intentData is ALWAYS included** - Provides context about what the AI decided to do
2. **WhatsApp JSON is ONLY for message actions** - send_message and generate_questions
3. **Explanations are ONLY for actions that DO something** - Not for analysis/summary actions
4. **Summaries are provided for ALL actions** - Simple description of what happened
5. **Specific format for messages** - {candidate, number, message} structure

This ensures clear, consistent responses that distinguish between actions that actually do something versus those that just provide information. 