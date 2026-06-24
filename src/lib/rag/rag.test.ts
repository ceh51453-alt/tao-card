import { describe, it, expect } from 'vitest';
import { TFIDFIndex } from './tfidfIndexer';
import { buildRAGContext } from './ragContextBuilder';
import { DEFAULT_ENTRY_EXT, type LorebookEntry } from '../../types';

describe('RAG TF-IDF Engine & Context Builder', () => {
  const mockEntries: LorebookEntry[] = [
    {
      id: 1,
      comment: 'Alice Description',
      keys: ['alice', 'girl', 'mage'],
      secondary_keys: [],
      content: 'Alice is a powerful mage specializing in fire magic. She wears a red coat.',
      constant: false,
      selective: false,
      enabled: true,
      position: 'before_char',
      use_regex: false,
      insertion_order: 100,
      extensions: { ...DEFAULT_ENTRY_EXT }
    },
    {
      id: 2,
      comment: 'Bob Description',
      keys: ['bob', 'warrior', 'knight'],
      secondary_keys: [],
      content: 'Bob is a brave knight with a silver shield. He fights to protect the kingdom.',
      constant: false,
      selective: false,
      enabled: true,
      position: 'before_char',
      use_regex: false,
      insertion_order: 101,
      extensions: { ...DEFAULT_ENTRY_EXT }
    },
    {
      id: 3,
      comment: 'Fire Magic Spell',
      keys: ['fire', 'spell', 'magic'],
      secondary_keys: [],
      content: 'Fireball is a basic fire magic spell. It deals splash damage to enemies.',
      constant: false,
      selective: false,
      enabled: true,
      position: 'before_char',
      use_regex: false,
      insertion_order: 102,
      extensions: { ...DEFAULT_ENTRY_EXT }
    }
  ];

  it('should index entries and perform cosine similarity search', () => {
    const index = new TFIDFIndex();
    expect(index.isIndexed).toBe(false);
    expect(index.size).toBe(0);

    index.indexWithSource(mockEntries);
    expect(index.isIndexed).toBe(true);
    expect(index.size).toBe(3);

    // Search for fire magic
    const results = index.search('fire magic', { topK: 2 });
    expect(results.length).toBeGreaterThan(0);
    // Alice and Fireball should be top results since they contain fire and magic
    expect(results[0].entry.keys).toContain('fire');
    
    // Search for something irrelevant
    const emptyResults = index.search('spaceship alien');
    expect(emptyResults.length).toBe(0);
  });

  it('should build proper injection text for RAG', () => {
    const index = new TFIDFIndex();
    index.indexWithSource(mockEntries);

    const context = buildRAGContext('knight with shield', index, {
      topK: 2,
      includeNegatives: true
    });

    expect(context.relevantEntries.length).toBeGreaterThan(0);
    expect(context.relevantEntries[0].entry.id).toBe(2); // Bob the knight
    
    expect(context.injectionText).toContain('ENTRIES CÓ THỂ TRÙNG');
    expect(context.injectionText).toContain('Bob Description');
    expect(context.injectionText).toContain('ENTRIES LIÊN QUAN');
  });

  it('should respect maxTokensForContext and truncate output', () => {
    const index = new TFIDFIndex();
    index.indexWithSource(mockEntries);

    const context = buildRAGContext('fire magic mage', index, {
      topK: 2,
      maxTokensForContext: 10 // extremely small limit
    });

    expect(context.tokenEstimate).toBeLessThanOrEqual(10);
    expect(context.injectionText).toContain('đã cắt bớt');
  });
});
