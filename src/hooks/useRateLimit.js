'use client';
import { useRef, useCallback } from 'react';

export function useRateLimit(cooldownMs = 300) {
  const lastRef = useRef(0);

  const check = useCallback(() => {
    const now = Date.now();
    if (now - lastRef.current < cooldownMs) return false;
    lastRef.current = now;
    return true;
  }, [cooldownMs]);

  return check;
}
