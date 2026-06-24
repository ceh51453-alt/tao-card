/**
 * Dexie (IndexedDB) database — spec Phần 11.1
 */

import Dexie, { type Table } from 'dexie';
import type { CharacterCardV3 } from '../../types';

export interface ProjectRecord {
  id: string;
  name: string;
  card: CharacterCardV3;
  createdAt: number;
  updatedAt: number;
}

export interface SnapshotRecord {
  id: string;
  projectId: string;
  card: CharacterCardV3;
  label: string;    // vd "Auto: trước Copilot — 10:42:03"
  createdAt: number;
}

class TavernCardDB extends Dexie {
  projects!: Table<ProjectRecord, string>;
  snapshots!: Table<SnapshotRecord, string>;

  constructor() {
    super('TavernCardStudioDB');
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      snapshots: 'id, projectId, createdAt',
    });
  }
}

export const db = new TavernCardDB();
