import * as pako from 'pako';

export type CompressionAlgorithm = 'gzip' | 'none' | 'lz4';

export class CompressionEngine {
  compress(data: string, algorithm: CompressionAlgorithm = 'gzip'): Uint8Array {
    if (algorithm === 'none') {
      return new TextEncoder().encode(data);
    }

    if (algorithm === 'gzip') {
      return pako.gzip(data);
    }

    throw new Error(`Unsupported compression algorithm: ${algorithm}`);
  }

  decompress(
    data: Uint8Array,
    algorithm: CompressionAlgorithm = 'gzip'
  ): string {
    if (algorithm === 'none') {
      return new TextDecoder().decode(data);
    }

    if (algorithm === 'gzip') {
      return pako.ungzip(data, { to: 'string' });
    }

    throw new Error(`Unsupported decompression algorithm: ${algorithm}`);
  }
}
