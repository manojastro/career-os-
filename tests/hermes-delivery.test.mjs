import { describe, expect, it, vi } from 'vitest';
import { sendLearningMessage } from '../scripts/hermes-learning/telegram-send.mjs';

const config = { baseUrl: 'https://example.com', token: 'fixture', botToken: '123:fixture', chatId: '456', chatRef: 'opaque' };
const message = { text: 'Your real learning task', kind: 'morning_plan', assignment_id: 'assignment', idempotency_key: 'delivery:fixture' };
describe('Hermes reserved Telegram delivery', () => {
  it('does not send when another attempt already reserved the message', async () => {
    const fetcher = vi.fn(); const api = vi.fn(async () => ({ send_allowed: false, status: 'unknown' }));
    expect((await sendLearningMessage(config, message, api, fetcher)).sent).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('reserves before sending and records the real receipt', async () => {
    const order = []; const api = vi.fn(async (_config, action, payload) => { order.push(action); return action === 'delivery-begin' ? { send_allowed: true, delivery_id: 'delivery', reservation_token: 'reservation' } : payload; });
    const fetcher = vi.fn(async (_url, request) => { order.push('send'); expect(JSON.parse(request.body).chat_id).toBe('456'); return Response.json({ ok: true, result: { message_id: 77, chat: { id: 456 } } }); });
    const result = await sendLearningMessage(config, message, api, fetcher);
    expect(order).toEqual(['delivery-begin', 'send', 'delivery-finish']);
    expect(result).toMatchObject({ sent: true, message_id: '77' });
    expect(api.mock.calls[1][2]).toMatchObject({ status: 'sent', message_id: '77', chat_ref: 'opaque' });
  });
  it('records an unknown outcome on transport interruption instead of retrying the send', async () => {
    const api = vi.fn(async () => ({ send_allowed: true, delivery_id: 'delivery', reservation_token: 'reservation' }));
    const fetcher = vi.fn(async () => { throw new Error(config.botToken); });
    expect((await sendLearningMessage(config, message, api, fetcher)).status).toBe('unknown');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(api.mock.calls[1][2].error).not.toContain(config.botToken);
  });
  it('cannot target an arbitrary recipient from agent-provided JSON', async () => {
    const api = vi.fn(); const fetcher = vi.fn();
    await expect(sendLearningMessage({ ...config, chatId: '' }, message, api, fetcher)).rejects.toThrow('configuration');
    expect(api).not.toHaveBeenCalled();
  });
});
