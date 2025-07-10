const messageHistory = [
  {
    id: "msg_001",
    phoneNumber: "+34612345678",
    type: "incoming",
    message: "Hola, estoy interesado en la posición de Frontend Developer",
    timestamp: "2024-01-15T10:30:00Z",
    candidateId: "candidate_001",
    conversationId: "conv_001"
  },
  {
    id: "msg_002",
    phoneNumber: "+34612345678",
    type: "outgoing",
    message: "¡Hola! Gracias por tu interés. ¿Podrías enviarme tu CV?",
    timestamp: "2024-01-15T10:32:00Z",
    candidateId: "candidate_001",
    conversationId: "conv_001"
  },
  {
    id: "msg_003",
    phoneNumber: "+34612345678",
    type: "incoming",
    message: "Por supuesto, te lo envío ahora mismo",
    timestamp: "2024-01-15T10:35:00Z",
    candidateId: "candidate_001",
    conversationId: "conv_001"
  },
  {
    id: "msg_004",
    phoneNumber: "+34687654321",
    type: "incoming",
    message: "Buenos días, vi su oferta de trabajo para Backend Developer",
    timestamp: "2024-01-15T11:00:00Z",
    candidateId: "candidate_002",
    conversationId: "conv_002"
  },
  {
    id: "msg_005",
    phoneNumber: "+34687654321",
    type: "outgoing",
    message: "¡Buenos días! Me alegra saber de su interés. ¿Tiene experiencia con Node.js?",
    timestamp: "2024-01-15T11:05:00Z",
    candidateId: "candidate_002",
    conversationId: "conv_002"
  },
  {
    id: "msg_006",
    phoneNumber: "+34687654321",
    type: "incoming",
    message: "Sí, tengo 3 años de experiencia con Node.js y MongoDB",
    timestamp: "2024-01-15T11:10:00Z",
    candidateId: "candidate_002",
    conversationId: "conv_002"
  },
  {
    id: "msg_007",
    phoneNumber: "+34987654321",
    type: "incoming",
    message: "Hola, soy María y me interesa la posición de UX Designer",
    timestamp: "2024-01-15T14:20:00Z",
    candidateId: "candidate_003",
    conversationId: "conv_003"
  },
  {
    id: "msg_008",
    phoneNumber: "+34987654321",
    type: "outgoing",
    message: "¡Hola María! Gracias por contactarnos. ¿Podrías contarme sobre tu experiencia en diseño de interfaces?",
    timestamp: "2024-01-15T14:25:00Z",
    candidateId: "candidate_003",
    conversationId: "conv_003"
  },
  {
    id: "msg_009",
    phoneNumber: "+34987654321",
    type: "incoming",
    message: "Tengo 5 años diseñando apps móviles y web. Uso Figma, Sketch y Adobe XD",
    timestamp: "2024-01-15T14:30:00Z",
    candidateId: "candidate_003",
    conversationId: "conv_003"
  },
  {
    id: "msg_010",
    phoneNumber: "+34612345678",
    type: "outgoing",
    message: "Perfecto, ¿te parece bien una entrevista mañana a las 10:00?",
    timestamp: "2024-01-15T16:00:00Z",
    candidateId: "candidate_001",
    conversationId: "conv_001"
  },
  {
    id: "msg_011",
    phoneNumber: "+34612345678",
    type: "incoming",
    message: "¡Perfecto! Me parece bien. ¿Será online o presencial?",
    timestamp: "2024-01-15T16:05:00Z",
    candidateId: "candidate_001",
    conversationId: "conv_001"
  },
  {
    id: "msg_012",
    phoneNumber: "+34612345678",
    type: "outgoing",
    message: "Será online por Google Meet. Te envío el enlace mañana",
    timestamp: "2024-01-15T16:10:00Z",
    candidateId: "candidate_001",
    conversationId: "conv_001"
  }
];

module.exports = messageHistory; 