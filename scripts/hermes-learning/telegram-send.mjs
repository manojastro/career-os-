import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { learningRequest } from './client.mjs';

// Only the private, verified destination configured on this host can receive learning messages.
export async function sendLearningMessage(config, input, api = learningRequest, fetcher = fetch) {
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(config.botToken ?? '') || !/^\d+$/.test(config.chatId ?? '') || !config.chatRef) {
    throw new Error('Private Telegram configuration is incomplete');
  }
  if (!['morning_plan', 'evening_check', 'test', 'help'].includes(input.kind) || typeof input.text !== 'string' || !input.text.trim() || input.text.length > 4096) {
    throw new Error('Invalid learning message');
  }
  const reservation = await api(config, 'delivery-begin', {
    kind: input.kind, ...(input.assignment_id ? { assignment_id: input.assignment_id } : {}), chat_ref: config.chatRef,
  }, input.idempotency_key);
  if (!reservation.send_allowed) return { sent: false, status: reservation.status };
  let status = 'unknown'; let messageId = '';
  try {
    const response = await fetcher(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: config.chatId, text: input.text }),
    });
    const result = await response.json();
    if (!response.ok || result.ok === false) status = 'failed';
    else if (result.ok && Number.isSafeInteger(result.result?.message_id) && String(result.result.chat?.id) === config.chatId) {
      status = 'sent'; messageId = String(result.result.message_id);
    }
  } catch {
    // A timeout may happen AFTER Telegram accepted the message. Never blindly resend.
    status = 'unknown';
  }
  await api(config, 'delivery-finish', {
    delivery_id: reservation.delivery_id, reservation_token: reservation.reservation_token,
    status, chat_ref: config.chatRef, message_id: messageId,
    error: status === 'sent' ? '' : status === 'failed' ? 'Telegram rejected the send' : 'Send outcome needs operator reconciliation',
  }, input.idempotency_key);
  return { sent: status === 'sent', status, delivery_id: reservation.delivery_id, message_id: messageId || null };
}

async function main() {
  const bytes = await readFile(process.argv[2]);
  if (bytes.length > 20_000) throw new Error('Message file too large');
  const result = await sendLearningMessage({
    baseUrl: process.env.CAREER_OS_BASE_URL, token: process.env.CAREER_OS_AGENT_TOKEN,
    botToken: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_HOME_CHANNEL,
    chatRef: process.env.CAREER_OS_TELEGRAM_CHAT_REF,
  }, JSON.parse(bytes.toString('utf8')));
  process.stdout.write(JSON.stringify(result) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { process.stderr.write('Learning delivery failed. Inspect authenticated app diagnostics; do not resend pending or unknown messages.\n'); process.exitCode = 1; });
}
