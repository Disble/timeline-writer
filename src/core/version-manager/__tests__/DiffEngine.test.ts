import { DiffEngine } from '../DiffEngine';

describe('DiffEngine', () => {
  let diffEngine: DiffEngine;

  beforeEach(() => {
    diffEngine = new DiffEngine();
  });

  describe('createPatch', () => {
    it('should create a patch for text additions', () => {
      const originalText = 'Hello world';
      const newText = 'Hello beautiful world';
      
      const patch = diffEngine.createPatch(originalText, newText);
      
      expect(patch).toBeDefined();
      expect(typeof patch).toBe('string');
      expect(patch.length).toBeGreaterThan(0);
    });

    it('should create a patch for text deletions', () => {
      const originalText = 'Hello beautiful world';
      const newText = 'Hello world';
      
      const patch = diffEngine.createPatch(originalText, newText);
      
      expect(patch).toBeDefined();
      expect(typeof patch).toBe('string');
      expect(patch.length).toBeGreaterThan(0);
    });

    it('should create a patch for text modifications', () => {
      const originalText = 'Hello world';
      const newText = 'Hello universe';
      
      const patch = diffEngine.createPatch(originalText, newText);
      
      expect(patch).toBeDefined();
      expect(typeof patch).toBe('string');
      expect(patch.length).toBeGreaterThan(0);
    });

    it('should return empty patch for identical text', () => {
      const text = 'Hello world';
      
      const patch = diffEngine.createPatch(text, text);
      
      expect(patch).toBeDefined();
      expect(patch).toBe('');
    });
  });

  describe('applyPatch', () => {
    it('should apply a patch to restore original changes', () => {
      const originalText = 'Hello world';
      const newText = 'Hello beautiful world';
      
      const patch = diffEngine.createPatch(originalText, newText);
      const appliedText = diffEngine.applyPatch(originalText, patch);
      
      expect(appliedText).toBe(newText);
    });

    it('should apply a patch for deletions', () => {
      const originalText = 'Hello beautiful world';
      const newText = 'Hello world';
      
      const patch = diffEngine.createPatch(originalText, newText);
      const appliedText = diffEngine.applyPatch(originalText, patch);
      
      expect(appliedText).toBe(newText);
    });

    it('should apply a patch for modifications', () => {
      const originalText = 'Hello world';
      const newText = 'Hello universe';
      
      const patch = diffEngine.createPatch(originalText, newText);
      const appliedText = diffEngine.applyPatch(originalText, patch);
      
      expect(appliedText).toBe(newText);
    });

    it('should handle empty patch', () => {
      const text = 'Hello world';
      const patch = '';
      
      const appliedText = diffEngine.applyPatch(text, patch);
      
      expect(appliedText).toBe(text);
    });
  });

  describe('diff', () => {
    it('should return diff array for text differences', () => {
      const text1 = 'Hello world';
      const text2 = 'Hello beautiful world';
      
      const diffs = diffEngine.diff(text1, text2);
      
      expect(Array.isArray(diffs)).toBe(true);
      expect(diffs.length).toBeGreaterThan(0);
      expect(diffs[0]).toHaveProperty('0'); // operation
      expect(diffs[0]).toHaveProperty('1'); // text
    });

    it('should return empty diff for identical text', () => {
      const text = 'Hello world';
      
      const diffs = diffEngine.diff(text, text);
      
      expect(Array.isArray(diffs)).toBe(true);
      expect(diffs.length).toBe(1);
      expect(diffs[0][0]).toBe(0); // EQUAL operation
      expect(diffs[0][1]).toBe(text);
    });

    it('should handle completely different text', () => {
      const text1 = 'Hello world';
      const text2 = 'Goodbye universe';
      
      const diffs = diffEngine.diff(text1, text2);
      
      expect(Array.isArray(diffs)).toBe(true);
      expect(diffs.length).toBeGreaterThan(0);
    });
  });

  describe('integration', () => {
    it('should create and apply patch correctly for complex changes', () => {
      const originalText = 'The quick brown fox jumps over the lazy dog.';
      const newText = 'The quick red fox leaps over the sleepy cat.';
      
      const patch = diffEngine.createPatch(originalText, newText);
      const appliedText = diffEngine.applyPatch(originalText, patch);
      
      expect(appliedText).toBe(newText);
    });

    it('should handle multiline text', () => {
      const originalText = 'Line 1\nLine 2\nLine 3';
      const newText = 'Line 1\nModified Line 2\nLine 3\nLine 4';
      
      const patch = diffEngine.createPatch(originalText, newText);
      const appliedText = diffEngine.applyPatch(originalText, patch);
      
      expect(appliedText).toBe(newText);
    });
  });
}); 
