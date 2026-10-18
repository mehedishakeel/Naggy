import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';

export const GITHUB_REPO = 'mehedishakeel/Naggy';
export const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  releaseUrl: string;
  downloadUrl: string;
  publishedAt?: string;
}

/**
 * Compare two semver strings like "1.0.2" and "1.0.3"
 * Returns > 0 if vA > vB, < 0 if vA < vB, 0 if equal
 */
export function compareVersions(versionA: string, versionB: string): number {
  const cleanA = (versionA || '').replace(/^v/, '').trim();
  const cleanB = (versionB || '').replace(/^v/, '').trim();

  const partsA = cleanA.split('.').map((p) => parseInt(p, 10) || 0);
  const partsB = cleanB.split('.').map((p) => parseInt(p, 10) || 0);

  const length = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < length; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

/**
 * Get current installed app version from Expo Config
 */
export function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.0';
}

/**
 * Check GitHub Releases API for a newer version of Naggy
 */
export async function checkAppUpdates(): Promise<UpdateInfo> {
  const currentVersion = getCurrentAppVersion();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(RELEASES_API, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Naggy-App',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const data = await response.json();
    const latestTag = (data.tag_name || '').trim();
    const latestVersion = latestTag.replace(/^v/, '');

    // Locate the .apk asset in release assets, fallback to generic release URL
    const assets: { name: string; browser_download_url: string }[] = data.assets || [];
    const apkAsset =
      assets.find((a) => a.name.endsWith('.apk') && a.name.includes(latestVersion)) ||
      assets.find((a) => a.name.endsWith('.apk')) ||
      null;

    const downloadUrl =
      apkAsset?.browser_download_url ||
      `https://github.com/${GITHUB_REPO}/releases/latest/download/Naggy.apk`;

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      currentVersion,
      latestVersion: latestTag || latestVersion,
      releaseName: data.name || `Naggy ${latestTag}`,
      releaseNotes: data.body || '',
      releaseUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      downloadUrl,
      publishedAt: data.published_at,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Validate that an external URL uses HTTPS and belongs to trusted GitHub infrastructure
 */
export function isSafeHttpsUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    const trustedHosts = ['github.com', 'api.github.com', 'objects.githubusercontent.com'];
    return (
      parsed.protocol === 'https:' &&
      trustedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}

/**
 * Trigger update flow: checks GitHub, prompts user if new version is found,
 * or shows "up to date" notification when manually checked.
 */
export async function promptForUpdates(options?: { silentIfCurrent?: boolean }): Promise<void> {
  const { silentIfCurrent = false } = options || {};

  try {
    const info = await checkAppUpdates();

    if (info.hasUpdate) {
      Alert.alert(
        `Update Available: ${info.latestVersion}`,
        `A new version of Naggy is available.\n\nInstalled: v${info.currentVersion}\nLatest: ${info.latestVersion}\n\nWould you like to download the updated APK from GitHub?`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'View Notes',
            onPress: () => {
              if (info.releaseUrl && isSafeHttpsUrl(info.releaseUrl)) {
                Linking.openURL(info.releaseUrl);
              }
            },
          },
          {
            text: 'Download APK',
            style: 'default',
            onPress: () => {
              if (info.downloadUrl && isSafeHttpsUrl(info.downloadUrl)) {
                Linking.openURL(info.downloadUrl);
              }
            },
          },
        ]
      );
    } else if (!silentIfCurrent) {
      Alert.alert(
        'Up to Date',
        `Naggy v${info.currentVersion} is the latest version available.`
      );
    }
  } catch (err: unknown) {
    if (!silentIfCurrent) {
      const message = err instanceof Error ? err.message : 'Unable to check for updates';
      Alert.alert(
        'Update Check Failed',
        `Could not connect to GitHub to check for updates. Please check your internet connection.\n\n${message}`
      );
    }
  }
}
