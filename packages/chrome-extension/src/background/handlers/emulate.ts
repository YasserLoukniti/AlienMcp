import { resolveTabId } from './group-utils';
import * as dbg from './debugger-manager';

export async function handleEmulate(args: Record<string, unknown>): Promise<{
  success: boolean;
  active: string[];
}> {
  const tabId = await resolveTabId(args);
  const active: string[] = [];

  await dbg.acquire(tabId);

  try {
    // Device emulation
    if (args.device) {
      const device = args.device as string;
      const presets: Record<string, { width: number; height: number; deviceScaleFactor: number; mobile: boolean; userAgent?: string }> = {
        'iphone-14': { width: 390, height: 844, deviceScaleFactor: 3, mobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
        'iphone-15-pro': { width: 393, height: 852, deviceScaleFactor: 3, mobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
        'ipad': { width: 810, height: 1080, deviceScaleFactor: 2, mobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
        'pixel-7': { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
        'galaxy-s24': { width: 360, height: 780, deviceScaleFactor: 3, mobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
        'desktop-hd': { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false },
        'desktop-4k': { width: 3840, height: 2160, deviceScaleFactor: 1, mobile: false },
        'laptop': { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false },
      };

      const preset = presets[device];
      if (!preset) throw new Error(`Unknown device: ${device}. Available: ${Object.keys(presets).join(', ')}`);

      await dbg.sendCommand(tabId, 'Emulation.setDeviceMetricsOverride', {
        width: preset.width,
        height: preset.height,
        deviceScaleFactor: preset.deviceScaleFactor,
        mobile: preset.mobile,
      });

      if (preset.userAgent) {
        await dbg.sendCommand(tabId, 'Emulation.setUserAgentOverride', {
          userAgent: preset.userAgent,
        });
      }

      active.push(`device: ${device} (${preset.width}x${preset.height})`);
    }

    // Custom viewport
    if (args.width && args.height) {
      await dbg.sendCommand(tabId, 'Emulation.setDeviceMetricsOverride', {
        width: args.width as number,
        height: args.height as number,
        deviceScaleFactor: (args.deviceScaleFactor as number) || 1,
        mobile: (args.mobile as boolean) || false,
      });
      active.push(`viewport: ${args.width}x${args.height}`);
    }

    // Geolocation
    if (args.latitude !== undefined && args.longitude !== undefined) {
      await dbg.sendCommand(tabId, 'Emulation.setGeolocationOverride', {
        latitude: args.latitude as number,
        longitude: args.longitude as number,
        accuracy: (args.accuracy as number) || 100,
      });
      active.push(`geo: ${args.latitude},${args.longitude}`);
    }

    // Network throttling
    if (args.network) {
      const network = args.network as string;
      const profiles: Record<string, { offline: boolean; latency: number; downloadThroughput: number; uploadThroughput: number }> = {
        'offline': { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
        'slow-3g': { offline: false, latency: 2000, downloadThroughput: 50000, uploadThroughput: 50000 },
        'fast-3g': { offline: false, latency: 563, downloadThroughput: 180000, uploadThroughput: 84375 },
        '4g': { offline: false, latency: 100, downloadThroughput: 4000000, uploadThroughput: 3000000 },
        'wifi': { offline: false, latency: 28, downloadThroughput: 5000000, uploadThroughput: 5000000 },
      };

      const profile = profiles[network];
      if (!profile) throw new Error(`Unknown network: ${network}. Available: ${Object.keys(profiles).join(', ')}`);

      await dbg.sendCommand(tabId, 'Network.enable');
      await dbg.sendCommand(tabId, 'Network.emulateNetworkConditions', profile);
      active.push(`network: ${network}`);
    }

    // CPU throttling
    if (args.cpuSlowdown) {
      await dbg.sendCommand(tabId, 'Emulation.setCPUThrottlingRate', {
        rate: args.cpuSlowdown as number,
      });
      active.push(`cpu: ${args.cpuSlowdown}x slowdown`);
    }

    // User agent override
    if (args.userAgent) {
      await dbg.sendCommand(tabId, 'Emulation.setUserAgentOverride', {
        userAgent: args.userAgent as string,
      });
      active.push(`userAgent: ${(args.userAgent as string).slice(0, 50)}...`);
    }

    // Dark mode / prefers-color-scheme
    if (args.colorScheme) {
      await dbg.sendCommand(tabId, 'Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: args.colorScheme as string }],
      });
      active.push(`colorScheme: ${args.colorScheme}`);
    }

    // Disable cache
    if (args.disableCache) {
      await dbg.sendCommand(tabId, 'Network.enable');
      await dbg.sendCommand(tabId, 'Network.setCacheDisabled', { cacheDisabled: true });
      active.push('cache: disabled');
    }

    // Reset all emulations
    if (args.reset) {
      await dbg.sendCommand(tabId, 'Emulation.clearDeviceMetricsOverride');
      await dbg.sendCommand(tabId, 'Emulation.clearGeolocationOverride');
      await dbg.sendCommand(tabId, 'Emulation.setCPUThrottlingRate', { rate: 1 });
      try {
        await dbg.sendCommand(tabId, 'Network.emulateNetworkConditions', {
          offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
        });
        await dbg.sendCommand(tabId, 'Network.setCacheDisabled', { cacheDisabled: false });
      } catch { /* Network might not be enabled */ }
      active.push('reset: all emulations cleared');
    }

  } finally {
    // Keep session alive for ongoing emulation (don't release unless reset)
    if (args.reset) {
      await dbg.release(tabId);
    }
  }

  return { success: true, active };
}
