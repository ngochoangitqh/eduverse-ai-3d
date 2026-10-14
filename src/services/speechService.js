export const speakText = (text, lang = 'en-US', rate = 0.95) => {
  if (!('speechSynthesis' in window)) return alert('Trình duyệt không hỗ trợ phát âm!');
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
};

export const createSpeechRecognizer = (lang = 'en-US', continuous = false) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.continuous = continuous;
  recognition.interimResults = true;
  return recognition;
};