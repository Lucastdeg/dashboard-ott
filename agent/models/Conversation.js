const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'New Conversation'
  },
  messages: [messageSchema],
  context: {
    currentTask: String,
    jobDescription: String,
    candidates: [{
      id: String,
      name: String,
      email: String,
      phone: String,
      resume: String,
      analysis: mongoose.Schema.Types.Mixed
    }],
    interviews: [{
      candidateId: String,
      candidateName: String,
      date: Date,
      status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled'],
        default: 'scheduled'
      },
      calendarEventId: String,
      followUpQuestions: [String],
      responses: [String]
    }],
    metadata: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
conversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema); 