import { useCallback, useEffect, useRef, useState } from 'react';
import { wsClient } from '@/services/websocket';
import { useAppStore } from '@/store/useAppStore';

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      length: number;
    };
  };
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export function useSpeechRecognition(enabled: boolean) {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const { captionLanguage, role, aiSettings } = useAppStore();

  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (!SpeechRecognitionAPI || role !== 'hearing') return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = captionLanguage === 'en' ? 'en-US' : captionLanguage;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < Object.keys(event.results).length; i++) {
        const result = event.results[i][0];
        if (event.results[i].length > 0) {
          const text = result.transcript;
          if (i === Object.keys(event.results).length - 1 && !result.confidence) {
            interim = text;
          } else {
            final += text;
          }
        }
      }
      if (interim) setInterimTranscript(interim);
      if (final) {
        setTranscript(final);
        setInterimTranscript('');
        wsClient.sendSpeech(final.trim(), 'en', captionLanguage);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      if (enabled && isListening) {
        try {
          recognition.start();
        } catch {
          /* ignore restart errors */
        }
      }
    };

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [captionLanguage, role, enabled, isListening]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      /* already started */
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (enabled && role === 'hearing' && isSupported) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, role, isSupported, startListening, stopListening]);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    sentencePrediction: aiSettings.sentencePrediction,
  };
}

export function useTextToSpeech() {
  const { aiSettings } = useAppStore();

  const speak = useCallback(
    (text: string, lang = 'en-US') => {
      if (!aiSettings.ttsEnabled || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    },
    [aiSettings.ttsEnabled],
  );

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return { speak, stop };
}
