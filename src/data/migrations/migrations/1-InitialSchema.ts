import { IStorageEngine } from '../../storage/IStorageEngine';
import { IMigration } from '../MigrationManager';

export class InitialSchema implements IMigration {
  public readonly version = 1;

  public async migrate(_storage: IStorageEngine): Promise<void> {
    // In a real scenario, this is where you would create the initial tables,
    // indexes, and other database structures.
    // For this project, we assume the DatabaseManager handles the initial setup,
    // so this migration is a starting point for future changes.
    // Example: await storage.query('CREATE TABLE ...');
  }
}
