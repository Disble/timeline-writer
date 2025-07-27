import { App, PluginSettingTab, Setting } from 'obsidian';
import TimelineWriterPlugin from '../../main';

export class TimelineWriterSettingTab extends PluginSettingTab {
  plugin: TimelineWriterPlugin;

  constructor(app: App, plugin: TimelineWriterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Timeline Writer Settings' });

    // Context Detection Settings
    containerEl.createEl('h3', { text: 'Context Detection' });

    new Setting(containerEl)
      .setName('Enable Auto Detection')
      .setDesc('Automatically detect context changes while writing')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableAutoDetection)
          .onChange(async value => {
            this.plugin.settings.enableAutoDetection = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Detection Sensitivity')
      .setDesc('How sensitive the context detection should be (0.1 = very sensitive, 1.0 = very conservative)')
      .addSlider(slider =>
        slider
          .setLimits(0.1, 1.0, 0.1)
          .setValue(this.plugin.settings.detectionSensitivity)
          .setDynamicTooltip()
          .onChange(async value => {
            this.plugin.settings.detectionSensitivity = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Minimum Content Length')
      .setDesc('Minimum number of characters needed to trigger context detection')
      .addText(text =>
        text
          .setPlaceholder('100')
          .setValue(String(this.plugin.settings.minimumContentLength))
          .onChange(async value => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.minimumContentLength = num;
              await this.plugin.saveSettings();
            }
          })
      );

    // Snapshot Settings
    containerEl.createEl('h3', { text: 'Version Management' });

    new Setting(containerEl)
      .setName('Enable Auto Snapshots')
      .setDesc('Automatically create snapshots when context changes are detected')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableAutoSnapshots)
          .onChange(async value => {
            this.plugin.settings.enableAutoSnapshots = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Snapshot Frequency')
      .setDesc('How often to create automatic snapshots')
      .addDropdown(dropdown =>
        dropdown
          .addOption('low', 'Low (less frequent)')
          .addOption('medium', 'Medium')
          .addOption('high', 'High (more frequent)')
          .setValue(this.plugin.settings.snapshotFrequency)
          .onChange(async value => {
            this.plugin.settings.snapshotFrequency = value as 'low' | 'medium' | 'high';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Max Versions Per File')
      .setDesc('Maximum number of versions to keep per file')
      .addText(text =>
        text
          .setPlaceholder('50')
          .setValue(String(this.plugin.settings.maxVersionsPerFile))
          .onChange(async value => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.maxVersionsPerFile = num;
              await this.plugin.saveSettings();
            }
          })
      );

    // Performance Settings
    containerEl.createEl('h3', { text: 'Performance' });

    new Setting(containerEl)
      .setName('Enable Background Processing')
      .setDesc('Process context detection and snapshots in the background')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableBackgroundProcessing)
          .onChange(async value => {
            this.plugin.settings.enableBackgroundProcessing = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Memory Limit (MB)')
      .setDesc('Maximum memory usage for the plugin')
      .addText(text =>
        text
          .setPlaceholder('100')
          .setValue(String(this.plugin.settings.maxMemoryUsage))
          .onChange(async value => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num > 10) {
              this.plugin.settings.maxMemoryUsage = num;
              await this.plugin.saveSettings();
            }
          })
      );

    // UI Settings
    containerEl.createEl('h3', { text: 'User Interface' });

    new Setting(containerEl)
      .setName('Show Timeline in Sidebar')
      .setDesc('Display timeline view in the sidebar')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.showTimelineInSidebar)
          .onChange(async value => {
            this.plugin.settings.showTimelineInSidebar = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Enable Notifications')
      .setDesc('Show notifications when snapshots are created')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableNotifications)
          .onChange(async value => {
            this.plugin.settings.enableNotifications = value;
            await this.plugin.saveSettings();
          })
      );

    // Storage Settings
    containerEl.createEl('h3', { text: 'Storage' });

    new Setting(containerEl)
      .setName('Compression Level')
      .setDesc('Higher compression saves space but uses more CPU (1-9)')
      .addSlider(slider =>
        slider
          .setLimits(1, 9, 1)
          .setValue(this.plugin.settings.compressionLevel)
          .setDynamicTooltip()
          .onChange(async value => {
            this.plugin.settings.compressionLevel = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Retention Period (Days)')
      .setDesc('How long to keep old versions (0 = forever)')
      .addText(text =>
        text
          .setPlaceholder('90')
          .setValue(String(this.plugin.settings.retentionDays))
          .onChange(async value => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num >= 0) {
              this.plugin.settings.retentionDays = num;
              await this.plugin.saveSettings();
            }
          })
      );

    // Debug Settings
    containerEl.createEl('h3', { text: 'Debug' });

    new Setting(containerEl)
      .setName('Enable Debug Mode')
      .setDesc('Enable detailed logging for troubleshooting')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableDebugMode)
          .onChange(async value => {
            this.plugin.settings.enableDebugMode = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Log Level')
      .setDesc('Minimum level of messages to log')
      .addDropdown(dropdown =>
        dropdown
          .addOption('error', 'Error')
          .addOption('warn', 'Warning')
          .addOption('info', 'Info')
          .addOption('debug', 'Debug')
          .setValue(this.plugin.settings.logLevel)
          .onChange(async value => {
            this.plugin.settings.logLevel = value as 'error' | 'warn' | 'info' | 'debug';
            await this.plugin.saveSettings();
          })
      );
  }
}