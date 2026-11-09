import { useCallback, useEffect, useState } from 'react';

const RESET_AFTER_MS = 2000;

/**
 * Clipboard copy with transient feedback: 'idle' → 'copied' | 'failed' → 'idle'.
 * @returns {[status: 'idle'|'copied'|'failed', copy: (text: string) => Promise<void>]}
 */
export function useCopyToClipboard() {
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (status === 'idle') return undefined;
    const timer = setTimeout(() => setStatus('idle'), RESET_AFTER_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }, []);

  return [status, copy];
}
