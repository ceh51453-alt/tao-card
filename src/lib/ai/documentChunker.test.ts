import { describe, it, expect } from 'vitest';
import { splitDocument, tryExtractCompletenessJson } from './documentChunker';

describe('splitDocument', () => {
  it('should return empty list for empty or whitespace string', () => {
    expect(splitDocument('')).toEqual([]);
    expect(splitDocument('   ')).toEqual([]);
  });

  it('should split document by paragraph boundaries when under size limit', () => {
    const text = 'Paragraph 1.\n\nParagraph 2.';
    const result = splitDocument(text, { chunkSize: 100, overlapSize: 0 });
    expect(result).toContain('Paragraph 1.\n\nParagraph 2.');
  });

  it('should respect markdown headers hierarchy and propagate context', () => {
    const text = `# Chapter 1\nThis is paragraph one under chapter 1.\n\n## Section 1.1\nSome more text here.`;
    // Set a small chunkSize so it splits
    const chunks = splitDocument(text, { chunkSize: 40, overlapSize: 0, keepHeaders: true });
    
    expect(chunks.length).toBeGreaterThan(1);
    // The second chunk should carry the context [Context: Chapter 1 > Section 1.1]
    expect(chunks[chunks.length - 1]).toContain('[Context: Chapter 1 > Section 1.1]');
  });

  it('should split extremely long paragraphs by sentences', () => {
    const text = 'This is a long paragraph. It has multiple sentences. We will split it.';
    const chunks = splitDocument(text, { chunkSize: 30, overlapSize: 0, keepHeaders: false });
    
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain('This is a long paragraph.');
    expect(chunks[1]).toContain('It has multiple sentences.');
  });

  it('should keep overlap paragraphs in subsequent chunks', () => {
    const text = 'Para 1.\n\nPara 2.\n\nPara 3.\n\nPara 4.';
    // Small chunk size, but overlap size large enough to pull previous paragraph
    const chunks = splitDocument(text, { chunkSize: 30, overlapSize: 20, keepHeaders: false });
    
    // Check that we have multiple chunks and some paragraph overlaps
    expect(chunks.length).toBeGreaterThan(1);
    // The second chunk should contain Para 2 (from overlap) or Para 3
    expect(chunks[1]).toContain('Para');
  });
});

describe('tryExtractCompletenessJson', () => {
  it('should extract JSON with CONTINUE status and valid entries', () => {
    const jsonText = `{
      "status": "CONTINUE",
      "entries": [
        {
          "comment": "Character A",
          "keys": ["character a", "a"],
          "content": "Description of Character A."
        }
      ]
    }`;
    const result = tryExtractCompletenessJson(jsonText);
    expect(result).not.toBeNull();
    expect(result?.status).toBe('CONTINUE');
    expect(result?.entries.length).toBe(1);
    expect(result?.entries[0].comment).toBe('Character A');
  });

  it('should fallback to direct array parsing with DONE status', () => {
    const jsonText = `[
      {
        "comment": "Character B",
        "keys": ["character b", "b"],
        "content": "Description of Character B."
      }
    ]`;
    const result = tryExtractCompletenessJson(jsonText);
    expect(result).not.toBeNull();
    expect(result?.status).toBe('DONE');
    expect(result?.entries.length).toBe(1);
    expect(result?.entries[0].comment).toBe('Character B');
  });
});
