// Gemini-powered helpers. Both are off until GEMINI_API_KEY is set in Vercel.
//  - chat(): a sales consultant that answers from the studio's own price list
//  - designFromPhoto(): looks at a room photo and picks finishes from the studio's catalog
import { GoogleGenAI } from '@google/genai';
import type { FinishChoices, SiteContent } from '../src/types.ts';
import { WORK_STAGES, WORK_UNIT_LABELS } from '../src/data/workCatalog.ts';

const MODEL = (process.env.GEMINI_MODEL || 'gemini-flash-latest').trim();

export function aiEnabled(): boolean {
  return Boolean((process.env.GEMINI_API_KEY || '').trim());
}

function client(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY || '').trim() });
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
  const res = await client().models.generateContent({
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
  const res = await client().models.generateContent({
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
