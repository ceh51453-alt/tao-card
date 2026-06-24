/**
 * src/lib/mvuzod/tavernScriptBuilder.ts — Build TavernHelper Scripts for MVUZOD
 * Spec 9C Bước 5: MVU Import script + Schema registration script
 */

import type { MVUZODSchema } from '../../types/mvuzod.types';
import { schemaToZodCode } from './schemaInferencer';

// ═══════════════════════════════════════════════════════════════════════════
// SCRIPT 1 — MVU IMPORT
// ═══════════════════════════════════════════════════════════════════════════

export interface TavernHelperScript {
  name: string;
  content: string;
  enabled: boolean;
}

/**
 * Build the MVU import script (required for MVUZOD to work).
 */
export function buildMVUImportScript(): TavernHelperScript {
  return {
    name: 'MVU',
    content: `import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js';`,
    enabled: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCRIPT 2 — SCHEMA REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the schema registration script with Zod code.
 */
export function buildSchemaScript(schema: MVUZODSchema, cardName: string): TavernHelperScript {
  return {
    name: `Cấu trúc biến ${cardName}`,
    content: schemaToZodCode(schema, cardName),
    enabled: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build both TavernHelper scripts needed for MVUZOD.
 */
export function buildMVUZODScripts(
  schema: MVUZODSchema,
  cardName: string,
): TavernHelperScript[] {
  return [
    buildMVUImportScript(),
    buildSchemaScript(schema, cardName),
  ];
}

/**
 * Check if card already has MVU scripts (by name).
 */
export function findExistingMVUScripts(
  scripts: Array<{ name: string; id?: string }>,
): { mvu: boolean; schema: boolean } {
  return {
    mvu: scripts.some(s => s.name === 'MVU'),
    schema: scripts.some(s => s.name.startsWith('Cấu trúc biến')),
  };
}
