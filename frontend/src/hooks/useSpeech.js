import { useState, useCallback, useEffect, useRef } from 'react';

export function useSpeech(language = 'en') {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const langMap = {
    'en': 'en-IN',
    'hi': 'hi-IN',
    'gu': 'gu-IN',
    'mr': 'mr-IN',
    'gom': 'mr-IN',
    'kn': 'kn-IN',
    'ml': 'ml-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'or': 'or-IN',
    'bn': 'bn-IN'
  };

  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const result = event.results[current][0].transcript;
      if (result) {
        setTranscript(result);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [isSupported]);

  const [voices, setVoices] = useState([]);

  // Pre-load browser voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Update language dynamically
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = langMap[language] || 'en-IN';
    }
  }, [language]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      alert("Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    setError(null);
    setTranscript('');
    try {
      recognitionRef.current.lang = langMap[language] || 'en-IN';
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.warn("Recognition already active or blocked:", e);
      setIsListening(false);
    }
  }, [isSupported, language]);

  const stopListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // Ignore
    }
    setIsListening(false);
  }, [isSupported]);

  const speak = useCallback((text, targetLang = language) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop ongoing speech
      const cleanText = text.replace(/[*_#•\n]/g, ' ').replace(/\s+/g, ' ').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const targetLocale = (langMap[targetLang] || 'en-IN').toLowerCase();

      // Pick best natural voice from available browser voices
      const naturalVoice = voices.find(v => 
        v.lang.toLowerCase().replace('_', '-') === targetLocale && 
        (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online') || v.name.includes('Google'))
      ) || voices.find(v => v.lang.toLowerCase().startsWith(targetLocale.split('-')[0])) || null;

      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      utterance.lang = langMap[targetLang] || 'en-IN';
      utterance.rate = 0.92; // Realistic human pacing
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Text to speech error:", err);
    }
  }, [language, voices]);

  return {
    transcript,
    setTranscript,
    isListening,
    startListening,
    stopListening,
    speak,
    isSupported,
    error
  };
}
