import { ObsidianIntegration } from '../integration/ObsidianIntegration';
import TimelineWriter from '../main';

jest.mock('../integration/ObsidianIntegration');

describe('TimelineWriter Plugin', () => {
  let plugin: TimelineWriter;
  const mockIntegration = {
    initialize: jest.fn(),
    cleanup: jest.fn(),
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    (ObsidianIntegration as jest.Mock).mockImplementation(() => {
      return mockIntegration;
    });

    plugin = new TimelineWriter({} as any, {} as any);
    (plugin.app.workspace as any) = {
      on: jest.fn(),
    };
  });

  it('should load the plugin and initialize ObsidianIntegration', async () => {
    await plugin.onload();
    expect(ObsidianIntegration).toHaveBeenCalledTimes(1);
    expect(mockIntegration.initialize).toHaveBeenCalledTimes(1);
  });

  it('should unload the plugin and cleanup ObsidianIntegration', async () => {
    await plugin.onload(); // onload creates the instance
    await plugin.onunload();
    expect(mockIntegration.cleanup).toHaveBeenCalledTimes(1);
  });
});
