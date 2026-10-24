import dns from 'node:dns/promises';
import { redis } from '../config/redis.js';

export interface MtaStsPolicy {
  version: string;
  mode: 'enforce' | 'testing' | 'none';
  mx: string[];
  max_age: number;
}

export class MtaStsService {
  private static CACHE_PREFIX = 'emitmail:mta-sts:';
  private static DEFAULT_MAX_CACHE = 604800; // 7 days max cache
  private static NEGATIVE_CACHE_TTL = 300; // 5 minutes negative cache

  /**
   * Matches an MX hostname against an MTA-STS pattern (supports wildcard '*.domain.com')
   */
  static matchMxHost(mxHost: string, pattern: string): boolean {
    const host = mxHost.toLowerCase().replace(/\.$/, '');
    const pat = pattern.toLowerCase().replace(/\.$/, '');

    if (host === pat) return true;

    if (pat.startsWith('*.')) {
      const suffix = pat.slice(1); // e.g. '.google.com'
      if (host.endsWith(suffix)) {
        const prefix = host.slice(0, host.length - suffix.length);
        return !prefix.includes('.');
      }
    }

    return false;
  }

  /**
   * Parses the raw RFC 8461 mta-sts.txt key-value format.
   */
  static parsePolicy(text: string): MtaStsPolicy | null {
    const lines = text.split(/\r?\n/);
    const data: { version?: string; mode?: string; mx: string[]; max_age?: number } = {
      mx: [],
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;

      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      const value = trimmed.slice(colonIdx + 1).trim();

      if (key === 'version') {
        data.version = value;
      } else if (key === 'mode') {
        const mode = value.toLowerCase();
        if (mode === 'enforce' || mode === 'testing' || mode === 'none') {
          data.mode = mode;
        }
      } else if (key === 'mx') {
        data.mx.push(value.toLowerCase());
      } else if (key === 'max_age') {
        const parsedAge = parseInt(value, 10);
        if (!isNaN(parsedAge)) {
          data.max_age = parsedAge;
        }
      }
    }

    if (data.version !== 'STSv1' || !data.mode || typeof data.max_age !== 'number') {
      return null;
    }

    return {
      version: data.version,
      mode: data.mode as 'enforce' | 'testing' | 'none',
      mx: data.mx,
      max_age: data.max_age,
    };
  }

  /**
   * Resolves MTA-STS policy for a destination recipient domain:
   * 1. Checks Redis cache
   * 2. Queries DNS TXT for _mta-sts.<domain>
   * 3. Fetches https://mta-sts.<domain>/.well-known/mta-sts.txt
   * 4. Caches in Redis
   */
  static async resolvePolicy(domain: string): Promise<MtaStsPolicy | null> {
    const cleanDomain = domain.toLowerCase().trim();
    if (!cleanDomain) return null;

    const cacheKey = `${this.CACHE_PREFIX}${cleanDomain}`;

    // 1. Check Redis Cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as MtaStsPolicy;
      }
    } catch (err) {
      console.warn(`[MTA-STS] Redis cache lookup failed for ${cleanDomain}:`, err);
    }

    // 2. Query DNS TXT for _mta-sts.<domain>
    let hasStsTxt = false;
    try {
      const txtRecords = await dns.resolveTxt(`_mta-sts.${cleanDomain}`);
      for (const recordChunks of txtRecords) {
        const fullRecord = recordChunks.join('');
        if (/v\s*=\s*STSv1\b/i.test(fullRecord)) {
          hasStsTxt = true;
          break;
        }
      }
    } catch {
      // Domain does not have MTA-STS TXT record
    }

    if (!hasStsTxt) {
      // Cache negative result
      const nonePolicy: MtaStsPolicy = {
        version: 'STSv1',
        mode: 'none',
        mx: [],
        max_age: this.NEGATIVE_CACHE_TTL,
      };
      await redis
        .set(cacheKey, JSON.stringify(nonePolicy), 'EX', this.NEGATIVE_CACHE_TTL)
        .catch(() => {});
      return nonePolicy;
    }

    // 3. Fetch HTTPS policy file from https://mta-sts.<domain>/.well-known/mta-sts.txt
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const policyUrl = `https://mta-sts.${cleanDomain}/.well-known/mta-sts.txt`;
      const response = await fetch(policyUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'EmitMail-MTA-STS-Resolver/1.0',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const bodyText = await response.text();
      const parsed = this.parsePolicy(bodyText);

      if (parsed) {
        const ttl = Math.min(parsed.max_age, this.DEFAULT_MAX_CACHE);
        await redis.set(cacheKey, JSON.stringify(parsed), 'EX', ttl).catch(() => {});
        return parsed;
      }
    } catch (err) {
      console.warn(
        `[MTA-STS] Failed fetching policy from https://mta-sts.${cleanDomain}/:`,
        err
      );
    }

    const fallbackPolicy: MtaStsPolicy = {
      version: 'STSv1',
      mode: 'none',
      mx: [],
      max_age: this.NEGATIVE_CACHE_TTL,
    };
    await redis
      .set(cacheKey, JSON.stringify(fallbackPolicy), 'EX', this.NEGATIVE_CACHE_TTL)
      .catch(() => {});
    return fallbackPolicy;
  }
}
