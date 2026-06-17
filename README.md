# CRM Сенеж

Внутренняя CRM для управления образовательными мероприятиями: заявки, согласование, бюджеты, задачи, назначения, логистика, платежи и аналитика.

## Стек

- Next.js 16 и React 19
- TypeScript и Tailwind CSS
- Prisma и SQLite
- Cookie-based сессии, хранящиеся в базе данных

## Быстрый запуск

Требования:

- Node.js 20 или новее
- npm

Создайте локальный файл окружения и установите зависимости:

```bash
cp .env.example .env
npm install
```

Подготовьте Prisma Client и локальную SQLite-базу:

```bash
npm run db:generate
npm run db:push
```

Запустите приложение в режиме разработки:

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

Для Windows PowerShell, если `npm run dev` не запускается из-за POSIX-синтаксиса переменной `NODE_OPTIONS`, используйте:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=512"
npx next dev -p 3000
```

## Тестовые данные

После запуска локального сервера можно заполнить базу демонстрационными пользователями и мероприятиями:

```bash
curl -X POST http://localhost:3000/api/seed
```

Основной тестовый администратор:

- Email: `admin@senez.ru`
- Пароль: `admin123`

В режиме разработки на странице входа также отображается список тестовых аккаунтов по ролям.

## Проверки

```bash
npm test
npm run lint
npm run build
```

## Продакшен-сборка

```bash
npm run build
npm start
```

Локальная база, `.env`, загруженные файлы, логи и QA-артефакты намеренно исключены из Git.
