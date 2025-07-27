import { Plugin } from 'obsidian';
import {
  TimelineWriterSettings,
  DEFAULT_SETTINGS,
} from './data/models/settings';
import { TimelineWriterSettingTab } from './ui/settings-panel/SettingsTab';
import { ObsidianIntegration } from './integration/ObsidianIntegration';
import { Logger } from './utils/logger';

export default class TimelineWriterPlugin extends Plugin {
  settings: TimelineWriterSettings = DEFAULT_SETTINGS;
  private logger = Logger.getInstance();
  private integration!: ObsidianIntegration;

  async onload() {
    this.logger.info('Loading Timeline Writer plugin');

    try {
      // Load styles
      this.loadStyles();

      // Load settings
      await this.loadSettings();

      // Initialize the main integration system
      this.integration = new ObsidianIntegration(this.app, this, {
        logLevel: this.settings.logLevel,
        enableAutoDetection: this.settings.enableAutoDetection,
        debounceDelay: this.settings.debounceDelay,
        enableBackgroundProcessing: this.settings.enableBackgroundProcessing,
      });

      // Initialize the integration
      await this.integration.initialize();

      // Add settings tab
      this.addSettingTab(new TimelineWriterSettingTab(this.app, this));

      // Add ribbon icon
      this.addRibbonIcon('clock', 'Timeline Writer', (_evt: MouseEvent) => {
        this.showTimelineForCurrentFile();
      });

      // Add commands
      this.addCommands();

      this.logger.info('Timeline Writer plugin loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load Timeline Writer plugin', error);
      throw error;
    }
  }

  async onunload() {
    this.logger.info('Unloading Timeline Writer plugin');

    if (this.integration) {
      await this.integration.cleanup();
    }
  }

  private addCommands(): void {
    // Create manual checkpoint
    this.addCommand({
      id: 'create-checkpoint',
      name: 'Create Manual Checkpoint',
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          const label = `Manual checkpoint - ${new Date().toLocaleString()}`;
          const nodeId = await this.integration.createManualCheckpoint(
            activeFile.path,
            label
          );
          if (nodeId) {
            this.logger.info('Manual checkpoint created via command', {
              filePath: activeFile.path,
              nodeId,
            });
          }
        }
      },
    });

    // Show timeline for current file
    this.addCommand({
      id: 'show-timeline',
      name: 'Show Timeline for Current File',
      callback: () => {
        this.showTimelineForCurrentFile();
      },
    });

    // Navigate back in timeline
    this.addCommand({
      id: 'navigate-back',
      name: 'Navigate Back in Timeline',
      hotkeys: [{ modifiers: ['Ctrl', 'Alt'], key: 'ArrowLeft' }],
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          // TODO: Implement relative navigation back
          this.logger.info('Navigate back command triggered', {
            filePath: activeFile.path,
          });
        }
      },
    });

    // Navigate forward in timeline
    this.addCommand({
      id: 'navigate-forward',
      name: 'Navigate Forward in Timeline',
      hotkeys: [{ modifiers: ['Ctrl', 'Alt'], key: 'ArrowRight' }],
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          // TODO: Implement relative navigation forward
          this.logger.info('Navigate forward command triggered', {
            filePath: activeFile.path,
          });
        }
      },
    });

    // Show statistics
    this.addCommand({
      id: 'show-statistics',
      name: 'Show Timeline Writer Statistics',
      callback: async () => {
        const stats = await this.integration.getStatistics();
        this.logger.info('Timeline Writer Statistics', stats);
        // TODO: Show in a modal or notification
      },
    });
  }

  private async showTimelineForCurrentFile(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      const timeline = await this.integration.getTimelineForFile(
        activeFile.path
      );
      this.logger.info('Timeline retrieved for current file', {
        filePath: activeFile.path,
        hasTimeline: !!timeline,
      });
      // TODO: Open timeline view with this data
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);

    // Update integration config when settings change
    if (this.integration) {
      this.integration.updateConfig({
        logLevel: this.settings.logLevel,
        enableAutoDetection: this.settings.enableAutoDetection,
        debounceDelay: this.settings.debounceDelay,
        enableBackgroundProcessing: this.settings.enableBackgroundProcessing,
      });
    }
  }

  // Public API for other plugins or external use
  getIntegration(): ObsidianIntegration {
    return this.integration;
  }

  async createCheckpoint(
    filePath: string,
    label: string
  ): Promise<string | null> {
    return await this.integration.createManualCheckpoint(filePath, label);
  }

  async navigateToVersion(filePath: string, nodeId: string): Promise<boolean> {
    return await this.integration.navigateToVersion(filePath, nodeId);
  }

  async getTimeline(filePath: string): Promise<{
    timeline: unknown;
    statistics: unknown;
    currentPosition: string | undefined;
  } | null> {
    return await this.integration.getTimelineForFile(filePath);
  }

  private loadStyles() {
    // Load CSS styles
    const styleEl = document.createElement('style');
    styleEl.id = 'timeline-writer-styles';
    styleEl.textContent = `
      .timeline-writer-icon {
        color: var(--text-accent);
      }
      
      .timeline-writer-icon:hover {
        color: var(--text-accent-hover);
      }
      
      .timeline-writer-modal {
        padding: 20px;
      }
      
      .timeline-writer-modal h3 {
        margin-top: 0;
        color: var(--text-accent);
      }
      
      .timeline-writer-settings {
        margin: 10px 0;
      }
      
      .timeline-writer-settings label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
      }
      
      .timeline-writer-settings input[type="text"],
      .timeline-writer-settings input[type="number"],
      .timeline-writer-settings select {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-primary);
        color: var(--text-normal);
      }
      
      .timeline-writer-settings input[type="checkbox"] {
        margin-right: 8px;
      }
      
      .timeline-writer-button {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin: 5px;
      }
      
      .timeline-writer-button:hover {
        background: var(--interactive-accent-hover);
      }
      
      .timeline-writer-button.secondary {
        background: var(--background-secondary);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
      }
      
      .timeline-writer-button.secondary:hover {
        background: var(--background-modifier-hover);
      }
    `;
    document.head.appendChild(styleEl);
  }
}
