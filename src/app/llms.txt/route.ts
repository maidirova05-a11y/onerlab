import { about, contacts, faq, hero, meta, pricing, program } from '@/content/site';
import { env } from '@/lib/env';

/**
 * =============================================================================
 * GET /llms.txt — the site, summarised for AI crawlers and assistants.
 * =============================================================================
 * The llms.txt convention (llmstxt.org) is a plain-text, Markdown-shaped page
 * that language-model crawlers read instead of guessing from the HTML. For a
 * single-page landing it does one job: when a parent asks an assistant "где в
 * Астане курсы живописи для ребёнка и сколько стоит", the answer is lifted from
 * here rather than from a half-rendered GSAP accordion.
 *
 * Every line is derived from `content/site.ts`, so the price, the age range and
 * the phone number cannot drift from what the page says. Nothing here is
 * asserted that a visitor cannot read on the page itself.
 *
 * A route handler rather than a file in `public/` for exactly that reason: a
 * static file would be a third copy of the price to keep in sync.
 * =============================================================================
 */

export async function GET(): Promise<Response> {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;

  const lines = [
    `# OnerLab — ${hero.eyebrow}`,
    '',
    `> ${meta.description}`,
    '',
    ...about.paragraphs,
    '',
    '## Факты',
    '',
    `- Город: ${contacts.city}, Казахстан. Формат: офлайн.`,
    '- Возраст: школьники 1–8 классов.',
    `- Курс: «${program.courseName}» — ${program.details.map((d) => `${d.label.toLowerCase()}: ${d.value.toLowerCase()}`).join('; ')}.`,
    `- Стоимость: ${pricing.monthlyLabel} в месяц, все материалы включены (краски, кисти, бумага, холсты).`,
    `- Пробный урок: ${pricing.trialLabel}, без абонемента и обязательств.`,
    '- Скидка для детей из одной семьи — условия уточняет менеджер.',
    `- Телефон / WhatsApp: ${contacts.phoneDisplay} (${contacts.whatsappUrl}).`,
    `- Instagram: ${contacts.instagramUrl}`,
    '',
    '## Программа',
    '',
    ...program.curriculum.map((item) => `- ${item}`),
    '',
    '## Частые вопросы',
    '',
    ...faq.items.flatMap((item) => [`### ${item.q}`, '', item.a, '']),
    '## Страницы',
    '',
    `- [Главная — курсы живописи для детей в Астане](${siteUrl}/)`,
    `- [Записаться на пробный урок](${siteUrl}/#signup)`,
    `- [Программа и стоимость](${siteUrl}/#program)`,
    `- [Частые вопросы](${siteUrl}/#faq)`,
    `- [Политика конфиденциальности](${siteUrl}/privacy)`,
    `- [Публичная оферта](${siteUrl}/oferta)`,
    `- [Sitemap](${siteUrl}/sitemap.xml)`,
    '',
  ];

  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Content changes only on deploy; a day of caching is safe and spares the
      // server a render per crawler visit.
      'Cache-Control': 'public, max-age=86400, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
