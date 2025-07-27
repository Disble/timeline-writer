export interface TimelineWriterSettings {
  // Context Detection Settings
  enableAutoDetection: boolean;
  detectionSensitivity: number; // 0-1 scale
  minimumContentLength: number; // Minimum characters to trigger detection
  
  // Snapshot Settings
  enableAutoSnapshots: boolean;
  snapshotFrequency: 'low' | 'medium' | 'high';
  maxVersionsPerFile: number;
  
  // Performance Settings
  maxMemoryUsage: number; // MB
  enableBackgroundProcessing: boolean;
  cacheSize: number; // Number of cached analyses
  
  // UI Settings
  showTimelineInSidebar: boolean;
  defaultTimelineView: 'linear' | 'branched';
  enableNotifications: boolean;
  
  // Storage Settings
  compressionLevel: number; // 1-9
  retentionDays: number; // Days to keep old versions
  enableAutomaticCleanup: boolean;
  
  // Debug Settings
  enableDebugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export const DEFAULT_SETTINGS: TimelineWriterSettings = {
  // Context Detection
  enableAutoDetection: true,
  detectionSensitivity: 0.7,
  minimumContentLength: 100,
  
  // Snapshots
  enableAutoSnapshots: true,
  snapshotFrequency: 'medium',
  maxVersionsPerFile: 50,
  
  // Performance
  maxMemoryUsage: 100,
  enableBackgroundProcessing: true,
  cacheSize: 100,
  
  // UI
  showTimelineInSidebar: true,
  defaultTimelineView: 'linear',
  enableNotifications: true,
  
  // Storage
  compressionLevel: 6,
  retentionDays: 90,
  enableAutomaticCleanup: true,
  
  // Debug
  enableDebugMode: false,
  logLevel: 'warn',
};