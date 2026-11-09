#!/usr/bin/env node
// Regenerates docs/state-machines.md from the machine definitions in src/machines.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMachineDocs } from '../src/machines/docs.js';

const target = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/state-machines.md');
await mkdir(dirname(target), { recursive: true });
await writeFile(target, renderMachineDocs());
console.log(`Wrote ${target}`);
