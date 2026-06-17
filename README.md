# CRM Сенеж

Внутренняя CRM для управления образовательными мероприятиями: заявки, согласование,
бюджеты, задачи, назначения, логистика, платежи и аналитика.

## Стек

- Next.js 16 и React 19
- TypeScript и Tailwind CSS
- Prisma и SQLite
- Cookie-based сессии, хранящиеся в базе данных

## Запуск

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:push
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

## Проверки

```bash
npm test
npm run lint
npm run build
```

Локальная база, `.env`, загруженные файлы и QA-артефакты намеренно исключены из Git.
