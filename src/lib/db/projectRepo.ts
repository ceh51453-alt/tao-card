/**
 * Project repository — CRUD operations for projects in Dexie
 */

import { v4 as uuidv4 } from 'uuid';
import { db, type ProjectRecord, type SnapshotRecord } from './db';
import type { CharacterCardV3 } from '../../types';
import { createEmptyCard } from '../converters/cardDefaults';

const MAX_AUTO_SNAPSHOTS = 20;

// ========== PROJECTS ==========

export async function getAllProjects(): Promise<ProjectRecord[]> {
  return db.projects.orderBy('updatedAt').reverse().toArray();
}

export async function getProject(id: string): Promise<ProjectRecord | undefined> {
  return db.projects.get(id);
}

export async function createProject(name?: string): Promise<ProjectRecord> {
  const card = createEmptyCard();
  const now = Date.now();
  const project: ProjectRecord = {
    id: uuidv4(),
    name: name ?? card.data.name,
    card,
    createdAt: now,
    updatedAt: now,
  };
  await db.projects.put(project);
  return project;
}

export async function saveProject(id: string, card: CharacterCardV3): Promise<void> {
  await db.projects.update(id, { card, updatedAt: Date.now() });
}

export async function renameProject(id: string, name: string): Promise<void> {
  await db.projects.update(id, { name, updatedAt: Date.now() });
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', db.projects, db.snapshots, async () => {
    await db.snapshots.where('projectId').equals(id).delete();
    await db.projects.delete(id);
  });
}

export async function duplicateProject(id: string): Promise<ProjectRecord | undefined> {
  const original = await db.projects.get(id);
  if (!original) return undefined;
  const now = Date.now();
  const copy: ProjectRecord = {
    id: uuidv4(),
    name: `${original.name} (Copy)`,
    card: structuredClone(original.card),
    createdAt: now,
    updatedAt: now,
  };
  await db.projects.put(copy);
  return copy;
}

// ========== SNAPSHOTS ==========

export async function createSnapshot(
  projectId: string,
  card: CharacterCardV3,
  label: string
): Promise<SnapshotRecord> {
  const snapshot: SnapshotRecord = {
    id: uuidv4(),
    projectId,
    card: structuredClone(card),
    label,
    createdAt: Date.now(),
  };
  await db.snapshots.put(snapshot);

  // Prune old auto-snapshots
  if (label.startsWith('Auto:')) {
    const autoSnapshots = await db.snapshots
      .where('projectId').equals(projectId)
      .filter(s => s.label.startsWith('Auto:'))
      .sortBy('createdAt');
    if (autoSnapshots.length > MAX_AUTO_SNAPSHOTS) {
      const toDelete = autoSnapshots.slice(0, autoSnapshots.length - MAX_AUTO_SNAPSHOTS);
      await db.snapshots.bulkDelete(toDelete.map(s => s.id));
    }
  }

  return snapshot;
}

export async function getSnapshots(projectId: string): Promise<SnapshotRecord[]> {
  return db.snapshots
    .where('projectId').equals(projectId)
    .reverse()
    .sortBy('createdAt');
}

export async function getLatestSnapshot(projectId: string): Promise<SnapshotRecord | undefined> {
  const snapshots = await db.snapshots
    .where('projectId').equals(projectId)
    .reverse()
    .sortBy('createdAt');
  return snapshots[0];
}

export async function deleteSnapshot(id: string): Promise<void> {
  await db.snapshots.delete(id);
}
