import pako from 'pako';

export class CompressionEngine {
  compress(data: string): Uint8Array {
    return pako.gzip(data);
  }

  decompress(data: Uint8Array): string {
    return pako.ungzip(data, { to: 'string' });
  }
}
