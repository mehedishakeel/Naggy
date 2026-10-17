import { compareVersions } from '../src/services/updates';

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
