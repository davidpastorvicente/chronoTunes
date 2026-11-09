import { randomId } from './random';

/**
 * Minimal JSONP loader for APIs that don't send CORS headers but support a
 * `callback` parameter (e.g. Deezer's `output=jsonp`).
 *
 * @param {string} url endpoint URL; `callback=<name>` is appended
 * @param {{ timeout?: number }} [options]
 * @returns {Promise<any>} the payload passed to the callback
 */
export function jsonp(url, { timeout = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `__jsonp_${randomId().replaceAll('-', '')}`;
    const script = document.createElement('script');
    let timer;

    const cleanup = () => {
      clearTimeout(timer);
      delete globalThis[callbackName];
      script.remove();
    };

    globalThis[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error(`JSONP request failed: ${url}`));
    };
    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`JSONP request timed out: ${url}`));
    }, timeout);

    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}`;
    script.async = true;
    document.head.appendChild(script);
  });
}
