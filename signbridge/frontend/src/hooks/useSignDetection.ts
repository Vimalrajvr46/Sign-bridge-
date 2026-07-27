import { useCallback, useEffect, useRef, useState } from 'react';
import { wsClient } from '@/services/websocket';
import { useAppStore } from '@/store/useAppStore';
import type { SignResult } from '@/types';

/**
 * Client-side sign detection using MediaPipe Hands via CDN.
 * Captures video frames and sends to backend for classification.
 */
export function useSignDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [lastResult, setLastResult] = useState<SignResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { captionLanguage, role, aiSettings } = useAppStore();

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    return dataUrl.split(',')[1] || null;
  }, [videoRef]);

  const processFrame = useCallback(async () => {
    if (!enabled || role !== 'deaf' || !aiSettings.signDetectionEnabled) return;

    const frameBase64 = captureFrame();
    if (!frameBase64) return;

    setIsProcessing(true);
    try {
      wsClient.sendSignFrame(frameBase64, captionLanguage);

      // Also run local heuristic for immediate feedback
      const response = await fetch('/api/v1/sign/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: Uint8Array.from(atob(frameBase64), (c) => c.charCodeAt(0)),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.text) {
          setLastResult({
            gesture: result.gesture,
            confidence: result.confidence,
            text: result.text,
          });
        }
      }
    } catch {
      /* backend may be unavailable in offline mode */
    } finally {
      setIsProcessing(false);
    }
  }, [enabled, role, aiSettings.signDetectionEnabled, captureFrame, captionLanguage]);

  useEffect(() => {
    if (enabled && role === 'deaf') {
      intervalRef.current = setInterval(processFrame, 500);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, role, processFrame]);

  return { lastResult, isProcessing };
}
