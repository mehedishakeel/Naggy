import { compareVersions, isSafeHttpsUrl } from '../src/services/updates';

describe('compareVersions', () => {
  it('correctly compares equal versions', () => {
    expect(compareVersions('1.0.2', '1.0.2')).toBe(0);
    expect(compareVersions('v1.0.2', '1.0.2')).toBe(0);
    expect(compareVersions('1.0.0', 'v1.0.0')).toBe(0);
  });

  it('detects when versionA is newer than versionB', () => {
    expect(compareVersions('1.0.3', '1.0.2')).toBe(1);
    expect(compareVersions('v1.1.0', 'v1.0.9')).toBe(1);
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
  });

  it('detects when versionA is older than versionB', () => {
    expect(compareVersions('1.0.1', '1.0.2')).toBe(-1);
    expect(compareVersions('v1.0.0', 'v1.0.3')).toBe(-1);
    expect(compareVersions('0.9.9', '1.0.0')).toBe(-1);
  });

  it('handles versions with different segment counts', () => {
    expect(compareVersions('1.0.2.1', '1.0.2')).toBe(1);
    expect(compareVersions('1.0', '1.0.1')).toBe(-1);
  });
});

describe('isSafeHttpsUrl Security Guard', () => {
  it('permits valid GitHub URLs', () => {
    expect(isSafeHttpsUrl('https://github.com/mehedishakeel/Naggy/releases/latest')).toBe(true);
    expect(isSafeHttpsUrl('https://api.github.com/repos/mehedishakeel/Naggy/releases')).toBe(true);
    expect(isSafeHttpsUrl('https://objects.githubusercontent.com/github-production-release-asset/app.apk')).toBe(true);
  });

  it('rejects untrusted domains, http, and dangerous URL schemes', () => {
    expect(isSafeHttpsUrl('http://github.com/mehedishakeel/Naggy')).toBe(false);
    expect(isSafeHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpsUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeHttpsUrl('https://evil-attacker.com/download.apk')).toBe(false);
    expect(isSafeHttpsUrl('https://github.com.evil.com/app.apk')).toBe(false);
    expect(isSafeHttpsUrl('')).toBe(false);
  });
});
