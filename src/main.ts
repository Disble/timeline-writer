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

  private async handleFileModify(file: TFile) {
    // TODO: Implement context detection and versioning
    this.logger.info('File modified:', file.path);
  }

  private async handleFileCreate(file: TFile) {
    // TODO: Initialize versioning for new file
    this.logger.info('File created:', file.path);
  }
}
