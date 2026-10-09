import { describe, it, expect, vi } from 'vitest';
import { learningRequest, validateConfig, slotKey } from '../scripts/hermes-learning/client.mjs';

const config = { baseUrl: 'https://career-os-manoj.lovable.app', token: 'test-secret-only' };

describe('Hermes learning API boundary', () => {
  it('rejects insecure URLs and credentials in URLs', () => {
    for (const baseUrl of ['http://example.com', 'https://x:y@example.com', 'https://example.com/path', 'https://example.com?secret=x']) {
      expect(() => validateConfig({ ...config, baseUrl })).toThrow();
    }
    expect(() => validateConfig({ ...config, token: '' })).toThrow();
  });

  it('uses only the narrow allowlisted learning routes', async () => {
    const fetcher = vi.fn(async () => Response.json({ eligible: [] }));
    await learningRequest(config, 'context', undefined, undefined, fetcher);
    expect(fetcher.mock.calls[0][0]).toBe(`${config.baseUrl}/api/agent/learning/context`);
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${config.token}`);
    expect(fetcher.mock.calls[0][1].redirect).toBe('error');
    await expect(learningRequest(config, '../admin', undefined, undefined, fetcher)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('requires an explicit durable retry identity for mutations', async () => {
    const fetcher = vi.fn(async () => Response.json({ task_id: 'task' }));
    await expect(learningRequest(config, 'recommendation', { topic_id: 'topic' }, undefined, fetcher)).rejects.toThrow();
    await learningRequest(config, 'recommendation', { topic_id: 'topic' }, 'plan:2026-10-09', fetcher);
    expect(fetcher.mock.calls[0][1].headers['Idempotency-Key']).toBe('plan:2026-10-09');
    expect(fetcher.mock.calls[0][1].method).toBe('POST');
  });

  it('does not leak provider errors, tokens or redirects', async () => {
    await expect(learningRequest(config, 'context', undefined, undefined,
      async () => new Response(config.token, { status: 401 }))).rejects.toThrow('Learning API returned 401');
    await expect(learningRequest(config, 'context', undefined, undefined,
      async () => { throw new Error(config.token); })).rejects.toThrow('Learning API request failed');
  });

  it('bounds response size and rejects non-JSON login pages', async () => {
    await expect(learningRequest(config, 'context', undefined, undefined,
      async () => new Response('<html>login</html>'))).rejects.toThrow('valid JSON');
    await expect(learningRequest(config, 'context', undefined, undefined,
      async () => new Response('x'.repeat(1_048_577)))).rejects.toThrow('size limit');
  });

  it('preserves IST calendar dates and stable occurrence identities across restarts', () => {
    const first = slotKey('morning', new Date('2026-10-08T20:00:00Z'), 'Asia/Kolkata');
    expect(first).toBe('morning:2026-10-09');
    expect(slotKey('morning', new Date('2026-10-09T05:30:00Z'), 'Asia/Kolkata')).toBe(first);
    expect(slotKey('morning', new Date('2026-10-09T20:00:00Z'), 'Asia/Kolkata')).not.toBe(first);
  });
});
