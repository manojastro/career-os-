import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const METHODS = Object.freeze({
  pulse: 'GET', context: 'GET', curriculum: 'GET', progress: 'GET',
  sync: 'POST', 'run-claim': 'POST', 'run-finish': 'POST', 'delivery-begin': 'POST', 'delivery-finish': 'POST', 'command-ack': 'POST',
  recommendation: 'POST', 'check-in': 'POST', completion: 'POST', 'delivery-status': 'POST',
});
const MAX_BYTES = 1_048_576;

export function validateConfig(config) {
  const url = new URL(config.baseUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('CAREER_OS_BASE_URL must be an HTTPS origin without credentials or a path');
  }
  if (typeof config.token !== 'string' || !config.token.trim() || /[\r\n]/.test(config.token)) {
    throw new Error('CAREER_OS_AGENT_TOKEN must be configured in the protected runtime environment');
  }
  return { baseUrl: url.origin, token: config.token };
}

// A slot belongs to the user's calendar date, not the gateway host's timezone.
export function slotKey(action, now = new Date(), timezone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${action}:${part('year')}-${part('month')}-${part('day')}`;
}

export async function learningRequest(rawConfig, action, payload, idempotencyKey, fetcher = fetch) {
  const config = validateConfig(rawConfig);
  if (!Object.hasOwn(METHODS, action)) throw new Error('Unsupported learning action');
  const method = METHODS[action];
  if (method === 'POST' && (!idempotencyKey || !/^[A-Za-z0-9:._-]{8,160}$/.test(idempotencyKey))) {
    throw new Error('Mutations require an explicit durable Idempotency-Key (8–160 safe characters)');
  }
  if (method === 'GET' && payload !== undefined) throw new Error('Read actions do not accept payloads');
  const body = method === 'POST' ? JSON.stringify(payload) : undefined;
  if (method === 'POST' && (!payload || typeof payload !== 'object' || Array.isArray(payload))) {
    throw new Error('Mutation payload must be a JSON object');
  }
  if (body && Buffer.byteLength(body) > MAX_BYTES) throw new Error('Request exceeds size limit');
  let response;
  try {
    response = await fetcher(`${config.baseUrl}/api/agent/learning/${action}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${config.token}`, Accept: 'application/json',
        ...(method === 'POST' ? { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey } : {}),
      },
      body,
    });
  } catch {
    // Fetch errors may include authenticated URLs or provider response bodies.
    throw new Error('Learning API request failed; check the runtime connection');
  }
  if (!response.ok) throw new Error(`Learning API returned ${response.status}; inspect authenticated app diagnostics`);
  const reader = response.body?.getReader();
  const chunks = [];
  let total = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel();
          throw new Error('Response exceeds size limit');
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Learning API did not return valid JSON');
  }
}

async function main() {
  const [action, payloadPath, identity] = process.argv.slice(2);
  const config = {
    baseUrl: process.env.CAREER_OS_BASE_URL ?? 'https://career-os-manoj.lovable.app',
    token: process.env.CAREER_OS_AGENT_TOKEN,
  };
  if (!action || !Object.hasOwn(METHODS, action)) {
    throw new Error('Usage: node client.mjs <context|curriculum|progress> OR <recommendation|check-in|completion|delivery-status> <payload.json> <idempotency-key>');
  }
  let payload;
  if (METHODS[action] === 'POST') {
    if (!payloadPath) throw new Error('Provide a JSON payload file and stable retry identity');
    const bytes = await readFile(payloadPath);
    if (bytes.length > MAX_BYTES) throw new Error('Payload file exceeds size limit');
    payload = JSON.parse(bytes.toString('utf8'));
  }
  const result = await learningRequest(config, action, payload, identity);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    // Never echo arbitrary JSON or provider error text from a failed command.
    process.stderr.write('Career OS learning command failed. Check configuration, action, JSON schema and authenticated app diagnostics.\n');
    process.exitCode = 1;
  });
}
