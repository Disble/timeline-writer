import { CompressionEngine } from '../CompressionEngine';

describe('CompressionEngine', () => {
  let compressionEngine: CompressionEngine;

  beforeEach(() => {
    compressionEngine = new CompressionEngine();
  });

  describe('compress', () => {
    it('should compress text data', () => {
      const originalText = 'This is a test string that will be compressed';
      
      const compressed = compressionEngine.compress(originalText);
      
      expect(compressed).toBeInstanceOf(Uint8Array);
      expect(compressed.length).toBeGreaterThan(0);
      // Note: Short strings might not compress well due to gzip overhead
    });

    it('should compress empty string', () => {
      const originalText = '';
      
      const compressed = compressionEngine.compress(originalText);
      
      expect(compressed).toBeInstanceOf(Uint8Array);
      expect(compressed.length).toBeGreaterThan(0);
    });

    it('should compress large text', () => {
      const originalText = 'A'.repeat(1000);
      
      const compressed = compressionEngine.compress(originalText);
      
      expect(compressed).toBeInstanceOf(Uint8Array);
      expect(compressed.length).toBeGreaterThan(0);
      expect(compressed.length).toBeLessThan(originalText.length); // Large text should compress well
    });

    it('should compress text with special characters', () => {
      const originalText = 'Hello 世界! 🌍 Test with emojis and unicode: ñáéíóú';
      
      const compressed = compressionEngine.compress(originalText);
      
      expect(compressed).toBeInstanceOf(Uint8Array);
      expect(compressed.length).toBeGreaterThan(0);
    });
  });

  describe('decompress', () => {
    it('should decompress compressed data back to original', () => {
      const originalText = 'This is a test string that will be compressed and decompressed';
      
      const compressed = compressionEngine.compress(originalText);
      const decompressed = compressionEngine.decompress(compressed);
      
      expect(decompressed).toBe(originalText);
    });

    it('should handle empty string compression and decompression', () => {
      const originalText = '';
      
      const compressed = compressionEngine.compress(originalText);
      const decompressed = compressionEngine.decompress(compressed);
      
      expect(decompressed).toBe(originalText);
    });

    it('should handle large text compression and decompression', () => {
      const originalText = 'A'.repeat(1000);
      
      const compressed = compressionEngine.compress(originalText);
      const decompressed = compressionEngine.decompress(compressed);
      
      expect(decompressed).toBe(originalText);
    });

    it('should handle unicode text compression and decompression', () => {
      const originalText = 'Hello 世界! 🌍 Test with emojis and unicode: ñáéíóú';
      
      const compressed = compressionEngine.compress(originalText);
      const decompressed = compressionEngine.decompress(compressed);
      
      expect(decompressed).toBe(originalText);
    });
  });

  describe('integration', () => {
    it('should maintain data integrity through compress-decompress cycle', () => {
      const testCases = [
        'Simple text',
        'Text with numbers: 12345',
        'Text with symbols: !@#$%^&*()',
        'Multiline text\nwith\nline breaks',
        'Text with spaces    and    tabs\t\t',
        'Empty string',
        `Very long text ${'A'.repeat(500)}`,
        'Unicode text: 世界🌍ñáéíóú',
      ];

      testCases.forEach(testCase => {
        const compressed = compressionEngine.compress(testCase);
        const decompressed = compressionEngine.decompress(compressed);
        
        expect(decompressed).toBe(testCase);
      });
    });

    it('should provide compression ratio for typical text', () => {
      const originalText = 'This is a typical piece of text that would be found in a document. ' +
        'It contains multiple sentences and should compress reasonably well. ' +
        'The compression ratio should be noticeable but not extreme.';
      
      const compressed = compressionEngine.compress(originalText);
      const compressionRatio = compressed.length / originalText.length;
      
      expect(compressionRatio).toBeLessThan(1); // Should be compressed
      expect(compressionRatio).toBeGreaterThan(0.1); // But not too much
    });
  });
}); 
