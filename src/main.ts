import { Plugin, TFile } from 'obsidian';
import {
  TimelineWriterSettings,
  DEFAULT_SETTINGS,
} from './data/models/settings';
import { TimelineWriterSettingTab } from './ui/settings-panel/SettingsTab';
import { Logger } from './utils/logger';

export default class TimelineWriterPlugin extends Plugin {
  settings: TimelineWriterSettings = DEFAULT_SETTINGS;
  private logger = Logger.getInstance();

  async onload() {
    this.logger.info('Loading Timeline Writer plugin');

    // Load styles
    this.loadStyles();

    // Load settings
    await this.loadSettings();

    // Add settings tab
    this.addSettingTab(new TimelineWriterSettingTab(this.app, this));

    // Add ribbon icon
    this.addRibbonIcon('clock', 'Timeline Writer', (_evt: MouseEvent) => {
      // TODO: Open timeline view
      this.logger.info('Timeline Writer clicked');
    });

    // Add commands
    this.addCommand({
      id: 'open-timeline',
      name: 'Open Timeline View',
      callback: () => {
        // TODO: Implement timeline view
        this.logger.info('Open timeline view command');
      },
    });

    this.addCommand({
      id: 'create-checkpoint',
      name: 'Create Manual Checkpoint',
      callback: () => {
        // TODO: Implement checkpoint creation
        this.logger.info('Create checkpoint command');
      },
    });

    // Register events
    // TODO: Register proper vault events when implementing version tracking
    // this.registerEvent(
    //   this.app.vault.on('modify', (file: TFile) => this.handleFileModify(file))
    // );

    // this.registerEvent(
    //   this.app.vault.on('create', (file: TFile) => this.handleFileCreate(file))
    // );

    this.logger.info('Timeline Writer plugin loaded successfully');
  }

  async onunload() {
    this.logger.info('Unloading Timeline Writer plugin');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
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

  private async handleFileModify(file: TFile) {
    // TODO: Implement context detection and versioning
    this.logger.info('File modified:', file.path);
  }

  private async handleFileCreate(file: TFile) {
    // TODO: Initialize versioning for new file
    this.logger.info('File created:', file.path);
  }
}
