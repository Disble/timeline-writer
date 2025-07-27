import { Plugin } from 'obsidian';
import { TimelineWriterSettings, DEFAULT_SETTINGS } from './data/models/settings';
import { TimelineWriterSettingTab } from './ui/settings-panel/SettingsTab';

export default class TimelineWriterPlugin extends Plugin {
  settings: TimelineWriterSettings = DEFAULT_SETTINGS;

  async onload() {
    console.log('Loading Timeline Writer plugin');

    // Load settings
    await this.loadSettings();

    // Add settings tab
    this.addSettingTab(new TimelineWriterSettingTab(this.app, this));

    // Add ribbon icon
    this.addRibbonIcon('clock', 'Timeline Writer', (evt: MouseEvent) => {
      // TODO: Open timeline view
      console.log('Timeline Writer clicked');
    });

    // Add commands
    this.addCommand({
      id: 'open-timeline',
      name: 'Open Timeline View',
      callback: () => {
        // TODO: Implement timeline view
        console.log('Open timeline view command');
      },
    });

    this.addCommand({
      id: 'create-checkpoint',
      name: 'Create Manual Checkpoint',
      callback: () => {
        // TODO: Implement checkpoint creation
        console.log('Create checkpoint command');
      },
    });

    // Register events
    this.registerEvent(
      this.app.vault.on('modify', this.handleFileModify.bind(this))
    );

    this.registerEvent(
      this.app.vault.on('create', this.handleFileCreate.bind(this))
    );

    console.log('Timeline Writer plugin loaded successfully');
  }

  async onunload() {
    console.log('Unloading Timeline Writer plugin');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private async handleFileModify(file: any) {
    // TODO: Implement context detection and versioning
    console.log('File modified:', file.path);
  }

  private async handleFileCreate(file: any) {
    // TODO: Initialize versioning for new file
    console.log('File created:', file.path);
  }
}