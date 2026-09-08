import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Container } from '@/components/ui/Container';
import { contacts } from '@/content/site';

export const metadata: Metadata = {
  alternates: { canonical: '/privacy' },
  title: 'Политика конфиденциальности',
  description:
    'Как OnerLab собирает, использует и защищает персональные данные, которые вы оставляете в форме записи на пробный урок.',
  robots: { index: true, follow: true },
};

/**
 * Privacy policy.
 *
 * Written to match what the application ACTUALLY does — the three form fields,
 * the salted IP hash, the retention window, the CAPTCHA provider. A policy that
 * describes a different system than the one running is worse than none.
 */
export default function PrivacyPage() {
  const sections: { title: string; body: string[] }[] = [
    {
      title: '1. Общие положения',
      body: [
        `Настоящая Политика конфиденциальности описывает, какие персональные данные собирает академия живописи ${contacts.legalName} (далее — «мы») через сайт, с какой целью они обрабатываются и как защищаются.`,
        'Оставляя заявку на сайте, вы подтверждаете согласие на обработку персональных данных на условиях, изложенных ниже.',
      ],
    },
    {
      title: '2. Какие данные мы собираем',
      body: [
        'Через форму записи на пробный урок мы собираем только те данные, которые необходимы, чтобы с вами связаться:',
        '• имя родителя;\n• имя и возраст ребенка;\n• номер телефона или WhatsApp.',
        'Дополнительно при отправке формы сервер сохраняет техническую информацию: обезличенный (хешированный) IP-адрес и строку браузера. Мы не храним ваш IP-адрес в открытом виде — только его необратимый криптографический отпечаток, который используется исключительно для защиты от спама.',
        'Мы не собираем платежные данные, паспортные данные, адрес проживания и не используем рекламные трекеры.',
      ],
    },
    {
      title: '3. Зачем мы используем эти данные',
      body: [
        'Данные используются только для того, чтобы:',
        '• перезвонить вам и согласовать удобное время пробного урока;\n• ответить на ваши вопросы о программе и расписании;\n• вести внутренний учет заявок.',
        'Мы не используем ваши данные для автоматической рассылки рекламы без вашего отдельного согласия.',
      ],
    },
    {
      title: '4. Передача данных третьим лицам',
      body: [
        'Мы не продаем и не передаем ваши персональные данные третьим лицам в рекламных целях.',
        'Данные могут обрабатываться нашими техническими подрядчиками (хостинг, база данных, сервис защиты от ботов) исключительно в объеме, необходимом для работы сайта, и на условиях конфиденциальности.',
      ],
    },
    {
      title: '5. Сроки хранения',
      body: [
        'Заявки хранятся не дольше, чем это необходимо для связи с вами и ведения учета обращений. По вашему запросу мы удалим ваши данные раньше этого срока.',
      ],
    },
    {
      title: '6. Как мы защищаем данные',
      body: [
        'Сайт работает по защищенному протоколу HTTPS. Все поля формы проверяются и очищаются как в браузере, так и на сервере. Доступ к базе заявок ограничен сотрудниками академии.',
        'Мы применяем ограничение частоты запросов и защиту от ботов, чтобы форма не использовалась для рассылки спама.',
      ],
    },
    {
      title: '7. Ваши права',
      body: [
        'Вы вправе в любой момент запросить, какие ваши данные у нас хранятся, потребовать их исправления или удаления, а также отозвать согласие на обработку.',
        `Для этого напишите или позвоните нам по номеру ${contacts.phoneDisplay} либо в Instagram ${contacts.instagramHandle}.`,
      ],
    },
    {
      title: '8. Файлы cookie',
      body: [
        'Сайт не использует рекламные или аналитические cookie-файлы. Технические cookie могут устанавливаться сервисом защиты от ботов — они необходимы для работы формы и не используются для отслеживания.',
      ],
    },
    {
      title: '9. Изменения политики',
      body: [
        'Мы можем обновлять эту политику. Актуальная версия всегда доступна на этой странице.',
      ],
    },
  ];

  return (
    <>
      <Header />

      <main id="main" className="relative pt-28 pb-16 sm:pt-32 sm:pb-20">
        <Container size="narrow">
          <nav aria-label="Хлебные крошки" className="text-sm text-ink-muted">
            <Link href="/" className="font-semibold text-ink-soft transition-colors hover:text-ink">
              Главная
            </Link>
            <span aria-hidden className="mx-2">
              /
            </span>
            <span>Политика конфиденциальности</span>
          </nav>

          <h1 className="mt-6 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            Политика конфиденциальности
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            Коротко и по делу: какие данные мы получаем через форму на сайте, зачем они нужны и что
            мы с ними делаем.
          </p>

          <div className="mt-10 space-y-9">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-bold text-ink">{section.title}</h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 32)}
                      className="whitespace-pre-line text-base leading-relaxed text-ink-soft"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-card border border-line bg-canvas-alt p-6">
            <h2 className="text-lg font-bold text-ink">Остались вопросы?</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Позвоните нам по номеру{' '}
              <a href={`tel:${contacts.phoneE164}`} className="font-bold text-ink underline underline-offset-2">
                {contacts.phoneDisplay}
              </a>{' '}
              — ответим на любой вопрос об обработке данных.
            </p>
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}
