import { IStorageEngine } from '../storage/IStorageEngine';

export interface IMigration {
  version: number;
  migrate(storage: IStorageEngine): Promise<void>;
}

export class MigrationManager {
  private migrations: IMigration[] = [];

  constructor(private storage: IStorageEngine) {}

  public registerMigration(migration: IMigration): void {
    this.migrations.push(migration);
  }

  public async runMigrations(): Promise<void> {
    const currentVersion = await this.getCurrentDbVersion();
    const sortedMigrations = this.migrations.sort(
      (a, b) => a.version - b.version
    );

    for (const migration of sortedMigrations) {
      if (migration.version > currentVersion) {
        await migration.migrate(this.storage);
        await this.setCurrentDbVersion(migration.version);
      }
    }
  }

  private async getCurrentDbVersion(): Promise<number> {
    // This is a placeholder. In a real implementation, this would read from a dedicated
    // version table or a key-value store within the storage engine.
    const version = await this.storage.get('db_version');
    return version ? parseInt(version, 10) : 0;
  }

  private async setCurrentDbVersion(version: number): Promise<void> {
    // This is a placeholder.
    await this.storage.set('db_version', version.toString());
  }
}
