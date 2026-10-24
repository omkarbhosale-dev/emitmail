import semver from 'semver';
import { env } from '../../config/env.js';
import { redis, REDIS_KEYS, SYSTEM_CACHE_TTL } from '../../config/redis.js';

export interface CachedReleaseData {
  tagName: string;
  cleanVersion: string;
  name: string;
  publishedAt: string;
  htmlUrl: string;
  releaseNotes: string;
  prerelease: boolean;
}

export interface SystemVersionResponse {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  isMajor: boolean;
  releaseName: string | null;
  publishedAt: string | null;
  releaseUrl: string;
  releaseNotes: string | null;
  updateCommand: string;
}

export class SystemService {
  private static readonly UPDATE_COMMAND = 'docker compose pull && docker compose up -d';

  /**
   * Checks current running version against the latest GitHub release.
   * Utilizes Redis cache with a 6-hour TTL unless force=true is provided.
   * Gracefully degrades in offline/firewalled/rate-limited environments.
   */
  static async checkSystemUpdate(force = false): Promise<SystemVersionResponse> {
    const rawCurrent = (env.CURRENT_VERSION || '1.0.0').trim();
    const cleanCurrent = semver.clean(rawCurrent) || semver.valid(semver.coerce(rawCurrent));
    const currentVersionDisplay = cleanCurrent || rawCurrent.replace(/^v/i, '');

    // Edge case: Development builds or unparseable versions
    const isDevBuild =
      rawCurrent.toLowerCase().includes('dev') ||
      rawCurrent === '0.0.0' ||
      cleanCurrent === null;

    let releaseData: CachedReleaseData | null = null;

    // 1. Fetch from Redis Cache if not forced
    if (!force) {
      try {
        const cachedRaw = await redis.get(REDIS_KEYS.LATEST_RELEASE);
        if (cachedRaw) {
          releaseData = JSON.parse(cachedRaw) as CachedReleaseData;
        }
      } catch (err) {
        console.warn(
          '⚠️ [SystemService] Redis cache read failed:',
          err instanceof Error ? err.message : err
        );
      }
    }

    // 2. Fetch from GitHub if cache miss or force refresh
    if (!releaseData) {
      releaseData = await this.fetchLatestGitHubRelease();

      if (releaseData) {
        // Cache in Redis with 6-hour TTL
        try {
          await redis.set(
            REDIS_KEYS.LATEST_RELEASE,
            JSON.stringify(releaseData),
            'EX',
            SYSTEM_CACHE_TTL.LATEST_RELEASE_SECONDS
          );
        } catch (err) {
          console.warn(
            '⚠️ [SystemService] Redis cache write failed:',
            err instanceof Error ? err.message : err
          );
        }
      } else if (force) {
        // If force requested but GitHub failed (e.g. rate limit), try falling back to existing cache
        try {
          const cachedRaw = await redis.get(REDIS_KEYS.LATEST_RELEASE);
          if (cachedRaw) {
            releaseData = JSON.parse(cachedRaw) as CachedReleaseData;
          }
        } catch {
          // ignore fallback read error
        }
      }
    }

    // 3. Fallback when GitHub is unavailable and no cache exists
    if (!releaseData) {
      return {
        currentVersion: currentVersionDisplay,
        latestVersion: currentVersionDisplay,
        hasUpdate: false,
        isMajor: false,
        releaseName: null,
        publishedAt: null,
        releaseUrl: `https://github.com/${env.GITHUB_REPO}/releases`,
        releaseNotes: null,
        updateCommand: this.UPDATE_COMMAND,
      };
    }

    // 4. Semantic Version Comparison
    const cleanLatest =
      semver.clean(releaseData.cleanVersion || releaseData.tagName) ||
      semver.valid(semver.coerce(releaseData.tagName));

    let hasUpdate = false;
    let isMajor = false;

    if (!isDevBuild && cleanCurrent && cleanLatest) {
      hasUpdate = semver.gt(cleanLatest, cleanCurrent);
      if (hasUpdate) {
        isMajor = semver.major(cleanLatest) > semver.major(cleanCurrent);
      }
    }

    return {
      currentVersion: currentVersionDisplay,
      latestVersion: cleanLatest || releaseData.cleanVersion || releaseData.tagName,
      hasUpdate,
      isMajor,
      releaseName: releaseData.name || `EmitMail ${releaseData.tagName}`,
      publishedAt: releaseData.publishedAt,
      releaseUrl: releaseData.htmlUrl,
      releaseNotes: releaseData.releaseNotes,
      updateCommand: this.UPDATE_COMMAND,
    };
  }

  /**
   * Queries GitHub Releases API with timeout, rate limit handling, and custom User-Agent.
   */
  private static async fetchLatestGitHubRelease(): Promise<CachedReleaseData | null> {
    const repo = env.GITHUB_REPO.trim();
    const url = `https://api.github.com/repos/${repo}/releases/latest`;
    const headers: Record<string, string> = {
      'User-Agent': 'EmitMail-SelfHosted-Server',
      Accept: 'application/vnd.github+json',
    };

    if (env.GITHUB_TOKEN && env.GITHUB_TOKEN.trim().length > 0) {
      headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN.trim()}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(8000), // 8-second timeout for offline safety
      });

      if (!response.ok) {
        console.warn(
          `⚠️ [SystemService] GitHub release check returned HTTP ${response.status} (${response.statusText}) for ${repo}`
        );
        return null;
      }

      const data = (await response.json()) as {
        tag_name: string;
        name: string | null;
        published_at: string;
        html_url: string;
        body: string | null;
        prerelease?: boolean;
      };

      const cleanVersion =
        semver.clean(data.tag_name) ||
        semver.valid(semver.coerce(data.tag_name)) ||
        data.tag_name.replace(/^v/i, '').trim();

      return {
        tagName: data.tag_name,
        cleanVersion,
        name: data.name || data.tag_name,
        publishedAt: data.published_at,
        htmlUrl: data.html_url,
        releaseNotes: data.body || '',
        prerelease: Boolean(data.prerelease),
      };
    } catch (err) {
      console.warn(
        `⚠️ [SystemService] Failed to query GitHub releases for ${repo}:`,
        err instanceof Error ? err.message : err
      );
      return null;
    }
  }
}
