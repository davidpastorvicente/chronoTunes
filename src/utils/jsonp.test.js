import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonp } from './jsonp';

const pendingScript = () => document.head.querySelector('script[src*="callback="]');
const callbackOf = (script) => new URL(script.src).searchParams.get('callback');

afterEach(() => vi.useRealTimers());

describe('jsonp', () => {
  it('resolves with the callback payload and cleans up', async () => {
    const promise = jsonp('https://api.example.com/track/1?output=jsonp');
    const script = pendingScript();
    expect(script.src).toMatch(/^https:\/\/api\.example\.com\/track\/1\?output=jsonp&callback=__jsonp_\w+$/);

    const name = callbackOf(script);
    globalThis[name]({ ok: true });

    await expect(promise).resolves.toEqual({ ok: true });
    expect(globalThis[name]).toBeUndefined();
    expect(pendingScript()).toBeNull();
  });

  it('uses "?" when the URL has no query string', () => {
    void jsonp('https://api.example.com/x').catch(() => {});
    expect(pendingScript().src).toContain('/x?callback=');
    pendingScript().dispatchEvent(new Event('error'));
  });

  it('rejects when the script fails to load', async () => {
    const promise = jsonp('https://api.example.com/broken');
    pendingScript().dispatchEvent(new Event('error'));
    await expect(promise).rejects.toThrow(/failed/);
    expect(pendingScript()).toBeNull();
  });

  it('rejects on timeout', async () => {
    vi.useFakeTimers();
    const promise = jsonp('https://api.example.com/slow', { timeout: 100 });
    const name = callbackOf(pendingScript());
    vi.advanceTimersByTime(100);
    await expect(promise).rejects.toThrow(/timed out/);
    expect(globalThis[name]).toBeUndefined();
  });
});
