// Gemini-powered helpers. Both are off until GEMINI_API_KEY is set in Vercel.
//  - chat(): a sales consultant that answers from the studio's own price list
//  - designFromPhoto(): looks at a room photo and picks finishes from the studio's catalog
import { GoogleGenAI } from '@google/genai';
import type { FinishChoices, SiteContent } from '../src/types.ts';
import { WORK_STAGES, WORK_UNIT_LABELS } from '../src/data/workCatalog.ts';
import { getSecret } from './storage.ts';

const MODEL = (process.env.GEMINI_MODEL || 'gemini-flash-latest').trim();

// Key from the Vercel env var, or the one the studio pasted in the admin panel (stored server-side).
let cachedKey: { value: string; at: number } | null = null;

export function resetAiKeyCache(): void {
  cachedKey = null;
}

async function apiKey(): Promise<string> {
  const env = (process.env.GEMINI_API_KEY || '').trim();
  if (env) return env;
  if (cachedKey && Date.now() - cachedKey.at < 60_000) return cachedKey.value;
  const value = (await getSecret('gemini_api_key')).trim();
  cachedKey = { value, at: Date.now() };
  return value;
}

export async function aiEnabled(): Promise<boolean> {
  return Boolean(await apiKey());
}

async function client(): Promise<GoogleGenAI> {
  return new GoogleGenAI({ apiKey: await apiKey() });
}

// Tiny request to check that a key works before saving it.
export async function testKey(key: string): Promise<string | null> {
  try {
    const call = new GoogleGenAI({ apiKey: key }).models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: 'Ответь одним словом: ок' }] }],
      config: { maxOutputTokens: 20 },
    });
    // Never leave the admin waiting forever: give up after 20 s with a clear message.
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 20_000));
    const res = await Promise.race([call, timeout]);
    return res.text !== undefined ? null : 'Пустой ответ от Gemini';
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    if (text === 'TIMEOUT') return 'Google не ответил за 20 секунд. Проверьте, что это ключ Gemini API (обычно начинается с AIza…), и попробуйте ещё раз.';
    if (/API key not valid|API_KEY_INVALID/i.test(text)) return 'ключ недействителен — скопируйте его заново целиком.';
    if (/PERMISSION_DENIED|SERVICE_DISABLED/i.test(text)) return 'для ключа не включён Gemini API в Google Cloud.';
    if (/not found|NOT_FOUND/i.test(text)) return `модель ${MODEL} недоступна для этого ключа.`;
    if (/quota|RESOURCE_EXHAUSTED/i.test(text)) return 'исчерпан лимит запросов Google — попробуйте позже.';
    return text.slice(0, 200);
  }
}

function priceSheet(content: SiteContent): string {
  return WORK_STAGES.map((st) => {
    const items = content.priceList.filter((i) => i.stage === st.id);
    if (!items.length) return '';
    return `${st.name.ru}:\n${items
      .map(
        (i) =>
          `- ${i.name.ru}: работа ${i.workPrice} сом/${WORK_UNIT_LABELS[i.unit].ru}, материалы ${i.materialPrice.standard}/${i.materialPrice.comfort}/${i.materialPrice.premium} сом (Стандарт/Комфорт/Премиум)`,
      )
      .join('\n')}`;
  })
    .filter(Boolean)
    .join('\n');
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function chat(content: SiteContent, history: ChatMessage[]): Promise<string> {
  const c = content.contacts;
  const system = `Ты — вежливый консультант студии ремонта READY HOME в Бишкеке. Отвечай коротко (до 6 предложений), на языке клиента (русский, кыргызский или английский).
Правила:
- Цены называй только из прайса ниже. Для расчёта квартиры предлагай онлайн-смету на сайте (раздел «Смета по работам») и бесплатный замер.
- Не обещай скидки, сроки и гарантии, которых нет в данных. Если не знаешь — скажи, что уточнит менеджер.
- Отвечай только на вопросы о ремонте, материалах и услугах студии.
- В конце, когда уместно, предложи оставить номер («Запись» на сайте) или написать в WhatsApp.
Контакты: телефон ${c.phone}, WhatsApp +${c.whatsapp}, Telegram @${c.telegram}, адрес: ${c.address.ru}, часы: ${c.workHours.ru}.
Прайс (цена за единицу):
${priceSheet(content)}`;
  const res = await (await client()).models.generateContent({
    model: MODEL,
    contents: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    config: { systemInstruction: system, maxOutputTokens: 600, temperature: 0.4 },
  });
  return (res.text || '').trim() || 'Извините, не получилось ответить. Напишите нам в WhatsApp — менеджер поможет.';
}

export interface DesignOption {
  name: string;
  description: string;
  finishes: FinishChoices;
}

export async function designFromPhoto(content: SiteContent, mimeType: string, base64: string): Promise<DesignOption[]> {
  const catalog = content.finishCatalog
    .map((g) => `${g.id} (${g.label.ru}): ${g.options.map((o) => `${o.id}=${o.name.ru}`).join(', ')}`)
    .join('\n');
  const prompt = `На фото — помещение клиента (может быть бетон до ремонта). Предложи 3 разных варианта отделки, которые подойдут по свету, размеру и стилю комнаты.
Выбирай ТОЛЬКО id вариантов из каталога ниже (группа: варианты). Для каждой группы — один id.
Каталог:
${catalog}
Ответ — JSON: {"options":[{"name":"Короткое название стиля","description":"1–2 предложения, почему подходит","finishes":{"<group id>":"<option id>"}}]}`;
  const res = await (await client()).models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: base64 } }, { text: prompt }] }],
    config: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 1500 },
  });
  const parsed = JSON.parse(res.text || '{}') as { options?: Array<{ name?: unknown; description?: unknown; finishes?: unknown }> };
  const valid = new Map(content.finishCatalog.map((g) => [g.id, new Set(g.options.map((o) => o.id))]));
  return (parsed.options || []).slice(0, 3).map((o) => {
    const finishes: FinishChoices = {};
    if (o.finishes && typeof o.finishes === 'object') {
      for (const [g, v] of Object.entries(o.finishes as Record<string, unknown>)) {
        if (typeof v === 'string' && valid.get(g as never)?.has(v)) finishes[g as keyof FinishChoices] = v;
      }
    }
    return {
      name: String(o.name || 'Вариант').slice(0, 60),
      description: String(o.description || '').slice(0, 300),
      finishes,
    };
  });
}
