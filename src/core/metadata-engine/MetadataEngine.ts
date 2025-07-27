import { NodeMetadata } from '../../data/models/core';
import { IStorageEngine } from '../../data/storage/IStorageEngine';

export interface IMetadataEngine {
  getMetadata(nodeId: string): Promise<NodeMetadata | null>;
  updateMetadata(
    nodeId: string,
    metadata: Partial<NodeMetadata>
  ): Promise<boolean>;
}

export class MetadataEngine implements IMetadataEngine {
  constructor(private storage: IStorageEngine) {}

  async getMetadata(nodeId: string): Promise<NodeMetadata | null> {
    const node = await this.storage.getNode(nodeId);
    return node?.metadata || null;
  }

  async updateMetadata(
    nodeId: string,
    metadataUpdate: Partial<NodeMetadata>
  ): Promise<boolean> {
    const node = await this.storage.getNode(nodeId);
    if (!node) {
      return false;
    }

    node.metadata = { ...node.metadata, ...metadataUpdate };
    await this.storage.saveNode(node);
    return true;
  }
}
