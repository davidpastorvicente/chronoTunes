import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { LANGUAGES, MESSAGES, translate } from './index';
import { CATEGORIES, CONTENT_SETS, MEDIA_TYPES } from '../game/rules';

const flatKeys = (node, prefix = '') =>
  Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'object' ? flatKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );

const sourceFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(jsx?|mjs)$/.test(name) && !name.includes('.test.') ? [path] : [];
  });

describe('translations', () => {
  const english = flatKeys(MESSAGES.en).sort();

  it.each(LANGUAGES)('%s has exactly the same keys as English', (language) => {
    expect(flatKeys(MESSAGES[language]).sort()).toEqual(english);
  });

  it('every static t("…") key used in the source exists', () => {
    const src = resolve(process.cwd(), 'src');
    const used = sourceFiles(src).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([\w.]+)'/g)].map((m) => m[1]),
    );
    expect(used.length).toBeGreaterThan(50);
    expect(used.filter((key) => !english.includes(key))).toEqual([]);
  });

  it('covers dynamic keys built from enums and machine errors', () => {
    const dynamic = [
      ...CATEGORIES.map((c) => `category.${c}`),
      ...CONTENT_SETS.map((c) => `contentSet.${c}`),
      ...MEDIA_TYPES.flatMap((m) => [`media.${m}`, `media.mystery.${m}`]),
      ...['idle', 'loading', 'playing', 'paused', 'ended', 'error'].map((s) => `player.status.${s}`),
      ...['nameRequired', 'invalidCode', 'gameNotFound', 'gameStarted', 'network', 'sessionClosed', 'notEnoughPlayers', 'wrongPassword', 'authNotConfigured'].map((e) => `errors.${e}`),
    ];
    expect(dynamic.filter((key) => !english.includes(key))).toEqual([]);
  });
});

describe('translate', () => {
  it('interpolates parameters and keeps unknown placeholders', () => {
    expect(translate('en', 'game.turnOf', { name: 'Ana' })).toBe("Ana's turn");
    expect(translate('es', 'placement.between', { from: 1990 })).toBe('1990 – {to}');
  });

  it('falls back to English, then to the key', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(translate('fr', 'setup.start')).toBe('Start game');
    expect(translate('en', 'does.not.exist')).toBe('does.not.exist');
  });
});
