import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getAdminUser } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    // Disable in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    // Проверяем, есть ли уже данные
    const existingUsers = await db.user.count();
    const existingEvents = await db.event.count();

    // If data exists, require admin auth to re-seed
    if (existingUsers > 0 || existingEvents > 0) {
      const adminUser = await getAdminUser(request);
      if (!adminUser) {
        return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 403 });
      }
      if (existingUsers > 0 && existingEvents > 0) {
        return NextResponse.json({
          message: 'Данные уже существуют',
          users: existingUsers,
          events: existingEvents,
        });
      }
    }

    // ============================
    // 1. СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ
    // ============================

    const users: { id: string; email: string; name: string; role: string; department: string | null }[] = [];

    if (existingUsers === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);

      // Администратор
      const admin = await db.user.create({
        data: {
          email: 'admin@senez.ru',
          name: 'Администратор Сенеж',
          passwordHash,
          role: 'admin',
          isApproved: true,
          department: null,
        },
      });
      users.push({ id: admin.id, email: admin.email, name: admin.name, role: admin.role, department: admin.department });

      // Менеджеры по отделам
      const methodologyHash = await bcrypt.hash('method123', 10);

      const methodologyManager = await db.user.create({
        data: {
          email: 'methodology@senez.ru',
          name: 'Козлова Елена Викторовна',
          passwordHash: methodologyHash,
          role: 'manager',
          isApproved: true,
          department: 'methodology',
        },
      });
      users.push({ id: methodologyManager.id, email: methodologyManager.email, name: methodologyManager.name, role: methodologyManager.role, department: methodologyManager.department });

      const coordinationHash = await bcrypt.hash('coordination123', 10);

      const coordinationManager = await db.user.create({
        data: {
          email: 'coordination@senez.ru',
          name: 'Петрова Мария Ивановна',
          passwordHash: coordinationHash,
          role: 'manager',
          isApproved: true,
          department: 'coordination',
        },
      });
      users.push({ id: coordinationManager.id, email: coordinationManager.email, name: coordinationManager.name, role: coordinationManager.role, department: coordinationManager.department });

      const agdHash = await bcrypt.hash('agd123', 10);

      const agdManager = await db.user.create({
        data: {
          email: 'agd@senez.ru',
          name: 'Сидоров Андрей Петрович',
          passwordHash: agdHash,
          role: 'manager',
          isApproved: true,
          department: 'agd',
        },
      });
      users.push({ id: agdManager.id, email: agdManager.email, name: agdManager.name, role: agdManager.role, department: agdManager.department });

      const organizationHash = await bcrypt.hash('org123', 10);

      const organizationManager = await db.user.create({
        data: {
          email: 'organization@senez.ru',
          name: 'Морозов Игорь Владимирович',
          passwordHash: organizationHash,
          role: 'manager',
          isApproved: true,
          department: 'organization',
        },
      });
      users.push({ id: organizationManager.id, email: organizationManager.email, name: organizationManager.name, role: organizationManager.role, department: organizationManager.department });

      const analyticsHash = await bcrypt.hash('analytics123', 10);

      const analyticsManager = await db.user.create({
        data: {
          email: 'analytics@senez.ru',
          name: 'Новикова Ольга Сергеевна',
          passwordHash: analyticsHash,
          role: 'manager',
          isApproved: true,
          department: 'analytics',
        },
      });
      users.push({ id: analyticsManager.id, email: analyticsManager.email, name: analyticsManager.name, role: analyticsManager.role, department: analyticsManager.department });

      // Сотрудники по отделам
      const employeeHash = await bcrypt.hash('emp123', 10);

      // Методология — сотрудники
      const methEmployees = [
        { email: 'ivanov@senez.ru', name: 'Иванов Алексей Петрович', department: 'methodology' },
        { email: 'sokolov@senez.ru', name: 'Соколов Максим Юрьевич', department: 'methodology' },
        { email: 'vasiliev@senez.ru', name: 'Васильев Роман Андреевич', department: 'methodology' },
      ];

      // Координация — сотрудники
      const coordEmployees = [
        { email: 'fedorova@senez.ru', name: 'Федорова Екатерина Николаевна', department: 'coordination' },
        { email: 'mikhailova@senez.ru', name: 'Михайлова Ольга Дмитриевна', department: 'coordination' },
      ];

      // АГД — сотрудники
      const agdEmployees = [
        { email: 'belov@senez.ru', name: 'Белов Сергей Иванович', department: 'agd' },
        { email: 'kozlov_a@senez.ru', name: 'Козлов Андрей Александрович', department: 'agd' },
      ];

      // Организация — сотрудники
      const orgEmployees = [
        { email: 'tikhonova@senez.ru', name: 'Тихонова Ирина Ильясовна', department: 'organization' },
        { email: 'dmitriev@senez.ru', name: 'Дмитриев Павел Олегович', department: 'organization' },
        { email: 'balakina@senez.ru', name: 'Балакина Арина Андреевна', department: 'organization' },
        { email: 'iodo@senez.ru', name: 'Иодо Дарья Сергеевна', department: 'organization' },
      ];

      // Аналитика — сотрудники
      const analyticsEmployees = [
        { email: 'novikova_o@senez.ru', name: 'Орлова Наталья Петровна', department: 'analytics' },
      ];

      const allEmployees = [
        ...methEmployees,
        ...coordEmployees,
        ...agdEmployees,
        ...orgEmployees,
        ...analyticsEmployees,
      ];

      for (const emp of allEmployees) {
        const user = await db.user.create({
          data: {
            email: emp.email,
            name: emp.name,
            passwordHash: employeeHash,
            role: 'employee',
              isApproved: true,
            department: emp.department,
          },
        });
        users.push({ id: user.id, email: user.email, name: user.name, role: user.role, department: user.department });
      }
    } else {
      // Загружаем существующих пользователей
      const existingUsersList = await db.user.findMany({
        select: { id: true, email: true, name: true, role: true, department: true },
      });
      users.push(...existingUsersList);
    }

    // ============================
    // 2. СОЗДАНИЕ МЕРОПРИЯТИЙ
    // ============================

    if (existingEvents > 0) {
      return NextResponse.json({
        message: 'Пользователи созданы, мероприятия уже существуют',
        users: users.length,
        events: existingEvents,
      });
    }

    // Вспомогательные функции для поиска пользователей
    const findUser = (email: string) => users.find(u => u.email === email);
    const findUsersByDept = (dept: string) => users.filter(u => u.department === dept && u.role === 'employee');

    const events = [
      {
        title: 'Образовательная программа «Время героев – 2026»',
        status: 'in_progress',
        programDirector: 'Иванов Алексей Петрович',
        coOrganizers: 'Петрова Мария (PR), Сидоров Иван (Логистика)',
        startDate: new Date('2026-06-14'),
        endDate: new Date('2026-06-28'),
        participantCount: 82,
        totalParticipants: 95,
        venue: 'ТехноСенеж',
        campus: 'Южный',
        budget: 4500000,
        fundingSource: 'Субсидия',
        program: 'Образовательная программа направлена на развитие лидерских качеств и командной работы среди молодежи. Программа включает лекции, мастер-классы, деловые игры и командные испытания.',
        eventPlan: 'День 1: Заезд и регистрация. День 2-3: Лекции и мастер-классы. День 4-5: Деловые игры. День 6-10: Командные испытания. День 11-12: Финал и отъезд.',
        hasProgram: true,
        hasPlan: true,
        targetAudience: 'Молодые лидеры 18-35 лет, участники программы «Россия — страна возможностей»',
        customerName: 'Россия — страна возможностей',
        contractorName: 'ООО «Образование Плюс»',
        needProgramHelp: false,
        needTeamBuilding: true,
        needEntertainment: true,
        teamBuildingDesc: 'Командообразующие активности на открытом воздухе',
        entertainmentDesc: 'Вечерняя культурная программа',
        setupStartDate: new Date('2026-06-14'),
        setupEndDate: new Date('2026-06-14'),
        teardownStartDate: new Date('2026-06-28'),
        teardownEndDate: new Date('2026-06-29'),
        setupDescription: 'Урал — застройка амфитеатра, роллапы, стойка регистрации',
        vipGuests: 'Полина Гагарина, Олег Газманов',
        calendarAdded: true,
        npsScore: 78,
        actualCost: 4200000,
        analyticalReport: JSON.stringify({
          summary: 'Программа прошла успешно, высокий уровень удовлетворённости участников.',
          recommendations: ['Увеличить количество интерактивных форматов', 'Расширить культурную программу'],
          participantFeedback: 'Положительный, средний балл 4.6 из 5',
        }),
        budgetApproved: true,
        budgetApprovedBy: 'Козлова Елена',
        budgetApprovedAt: new Date('2026-05-01'),
        uin: 'УИН-2026-001',
        number: 1,
        client: 'Россия — страна возможностей',
        programClass: 'A',
        quarter: 'Q2',
        plannedDates: '15.06 – 28.06.2026',
        programType: 'Модульная',
        coOrganizer: 'Фонд «Развитие»',
        finance: 'Субсидия РСВ',
        comments: 'Флагманская программа сезона',
        tags: 'лидерство,молодежь,флагман',
        isFavorite: true,
        speakers: {
          create: [
            { fullName: 'Гагарина Полина', topic: 'Мотивация и лидерство', cost: 500000, description: 'Певица, амбассадор программы' },
            { fullName: 'Газманов Олег', topic: 'Патриотическое воспитание', cost: 400000, description: 'Певец, общественный деятель' },
            { fullName: 'Смирнов Дмитрий', topic: 'Технологии будущего', cost: 150000, description: 'Директор ИТ-компании' },
            { fullName: 'Кузнецова Анна', topic: 'Проектное управление', cost: 100000, description: 'PMI сертифицированный тренер' },
          ],
        },
        budgetItems: {
          create: [
            { category: 'Техническое оснащение', description: 'Звуковое и световое оборудование', plannedAmount: 800000, actualAmount: 750000, status: 'spent' },
            { category: 'Питание', description: '3-х разовое питание для участников', plannedAmount: 1200000, actualAmount: 1100000, status: 'spent' },
            { category: 'Проживание', description: 'Проживание в кампусе Сенеж', plannedAmount: 600000, actualAmount: 580000, status: 'spent' },
            { category: 'Спикеры', description: 'Гонорары спикеров', plannedAmount: 1150000, actualAmount: 1150000, status: 'spent' },
            { category: 'Трансфер', description: 'Трансфер участников', plannedAmount: 300000, actualAmount: 250000, status: 'spent' },
            { category: 'Застройка', description: 'Застройка площадки', plannedAmount: 250000, actualAmount: 220000, status: 'spent' },
            { category: 'PR и реклама', description: 'Информационное сопровождение', plannedAmount: 100000, actualAmount: 80000, status: 'spent' },
            { category: 'Сувенирная продукция', description: 'Подарки и мерч', plannedAmount: 100000, actualAmount: 70000, status: 'spent' },
          ],
        },
        tasks: {
          create: [
            { category: 'technical', title: 'Подготовка звукового оборудования', description: 'Настроить звук в амфитеатре Урал', assignee: 'Белов Сергей', completed: true, priority: 'high' },
            { category: 'technical', title: 'Установка Wi-Fi сети', description: '45 планшетов + общая сеть', assignee: 'Козлов Андрей', completed: true, priority: 'high' },
            { category: 'catering', title: 'Согласование меню', description: '3-х разовое питание, спецдиеты', assignee: 'Тихонова Ирина', completed: true, priority: 'high' },
            { category: 'transfer', title: 'Организация трансфера', description: 'Встреча участников на вокзале', assignee: 'Дмитриев Павел', completed: true, priority: 'medium' },
            { category: 'accommodation', title: 'Заселение участников', description: 'Распределение по номерам', assignee: 'Балакина Арина', completed: false, priority: 'high' },
            { category: 'setup', title: 'Монтаж застройки', description: 'Урал — застройка амфитеатра', assignee: 'Морозов Игорь', completed: true, priority: 'high' },
            { category: 'creative', title: 'Подготовка культурной программы', description: 'Вечерние мероприятия', assignee: 'Иодо Дарья', completed: false, priority: 'medium' },
            { category: 'souvenirs', title: 'Заказ сувенирной продукции', description: 'Рюкзаки, блокноты, ручки', assignee: 'Новикова Ольга', completed: true, priority: 'low' },
          ],
        },
        contacts: {
          create: [
            { role: 'Руководитель проектов', fullName: 'Конин Евгений Андреевич', phone: '+7 (999) 123-45-67', type: 'customer' },
            { role: 'Контроль проживания', fullName: 'Балакина Арина Андреевна', phone: '+7 (999) 234-56-78', type: 'customer' },
            { role: 'Внеобразовательная часть', fullName: 'Дарья Иодо', phone: '+7 (999) 345-67-89', type: 'customer' },
            { role: 'Вопросы питания', fullName: 'Тихонова Ирина Ильясовна', phone: '+7 (999) 456-78-90', type: 'customer' },
          ],
        },
        rooms: {
          create: [
            { roomName: 'Урал', dateFrom: '14.06', dateTo: '28.06' },
            { roomName: 'ВИП 202', dateFrom: '14.06', dateTo: '28.06' },
            { roomName: 'Ресторан', dateFrom: '14.06', dateTo: '28.06' },
            { roomName: 'Амфитеатр', dateFrom: '26.06', dateTo: '26.06' },
            { roomName: 'Бильярд', dateFrom: '14.06', dateTo: '28.06' },
            { roomName: 'ФОК', dateFrom: '14.06', dateTo: '28.06' },
          ],
        },
        meals: {
          create: [
            { date: '15.06', time: '08:00-09:00', location: 'Ресторан', mealType: 'Шведская линия', headcount: 95 },
            { date: '15.06', time: '13:00-14:00', location: 'Ресторан', mealType: 'Шведская линия', headcount: 95 },
            { date: '15.06', time: '19:00-20:30', location: 'Ресторан', mealType: 'Шведская линия', headcount: 95 },
            { date: '16.06', time: '10:30-11:00', location: 'Урал', mealType: 'Кофе-брейк', headcount: 95 },
          ],
        },
        transfers: {
          create: [
            { date: '15.06', time: '09:00', from: 'Москва, Казанский вокзал', to: 'Сенеж', vehicleType: 'Автобус', headcount: 82 },
            { date: '28.06', time: '12:00', from: 'Сенеж', to: 'Москва, Казанский вокзал', vehicleType: 'Автобус', headcount: 82 },
          ],
        },
        accommodations: {
          create: [
            { roomType: 'Одноместные', count: 15, checkIn: '14.06 после 14:00', checkOut: '28.06 до 12:00' },
            { roomType: 'Двухместные', count: 35, checkIn: '14.06 после 14:00', checkOut: '28.06 до 12:00' },
            { roomType: 'Люкс', count: 5, checkIn: '14.06 после 14:00', checkOut: '28.06 до 12:00' },
          ],
        },
        payments: {
          create: [
            { contractor: "ООО «ЗвукТех»", description: "Звуковое и световое оборудование", amount: 800000, status: "paid", dueDate: new Date("2026-06-01"), paidDate: new Date("2026-05-28"), paidAmount: 750000, invoiceNumber: "СЧ-2026-0142" },
            { contractor: "ООО «КейтерингПро»", description: "3-х разовое питание для участников", amount: 1200000, status: "paid", dueDate: new Date("2026-06-10"), paidDate: new Date("2026-06-15"), paidAmount: 1100000, invoiceNumber: "СЧ-2026-0198" },
            { contractor: "ООО «Образование Плюс»", description: "Гонорары спикеров", amount: 1150000, status: "paid", dueDate: new Date("2026-06-20"), paidDate: new Date("2026-06-25"), paidAmount: 1150000, invoiceNumber: "СЧ-2026-0255" },
            { contractor: "ООО «ТрансАвто»", description: "Трансфер участников", amount: 300000, status: "partial", dueDate: new Date("2026-06-15"), paidDate: new Date("2026-06-16"), paidAmount: 150000, invoiceNumber: "СЧ-2026-0301" },
            { contractor: "ИП Морозов", description: "Застройка площадки", amount: 250000, status: "overdue", dueDate: new Date("2026-05-30"), notes: "Задержка из-за изменения дизайна" },
          ],
        },
      },
      {
        title: 'Форум «Молодежь России»',
        status: 'pending_approval',
        programDirector: 'Федорова Екатерина',
        startDate: new Date('2026-07-10'),
        endDate: new Date('2026-07-15'),
        participantCount: 150,
        totalParticipants: 180,
        venue: 'ТехноСенеж',
        campus: 'Северный',
        budget: 6200000,
        fundingSource: 'Субсидия',
        targetAudience: 'Молодые лидеры и активисты 18-30 лет',
        customerName: 'Росмолодежь',
        uin: 'УИН-2026-002',
        hasProgram: true,
        hasPlan: false,
        number: 2,
        client: 'Росмолодежь',
        programClass: 'A',
        quarter: 'Q3',
        plannedDates: '10.07 – 15.07.2026',
        programType: 'Форум',
        finance: 'Федеральный бюджет',
        comments: 'Форум федерального уровня',
        tags: 'форум,молодежь,федеральный',
        isFavorite: true,
        speakers: { create: [
          { fullName: 'Докторов Андрей', topic: 'Государственная молодежная политика', cost: 200000 },
          { fullName: 'Волкова Марина', topic: 'Социальное предпринимательство', cost: 150000 },
        ]},
        budgetItems: { create: [
          { category: 'Техническое оснащение', description: 'Оборудование для пленарных заседаний', plannedAmount: 1200000 },
          { category: 'Питание', description: 'Питание 5 дней', plannedAmount: 1800000 },
          { category: 'Проживание', description: 'Проживание в Северном кампусе', plannedAmount: 900000 },
          { category: 'Спикеры', description: 'Гонорары', plannedAmount: 350000 },
          { category: 'Трансфер', description: 'Трансфер', plannedAmount: 500000 },
          { category: 'Застройка', description: 'Застройка', plannedAmount: 400000 },
          { category: 'PR и реклама', description: 'Инфосопровождение', plannedAmount: 300000 },
          { category: 'Сувенирная продукция', description: 'Мерч', plannedAmount: 250000 },
          { category: 'Прочее', description: 'Непредвиденные расходы', plannedAmount: 500000 },
        ]},
        tasks: { create: [
          { category: 'technical', title: 'Аудио-видео обеспечение пленарных', assignee: 'Белов Сергей', priority: 'high' },
          { category: 'catering', title: 'Организация питания', assignee: 'Тихонова Ирина', priority: 'high' },
          { category: 'pr', title: 'Пресс-релиз и медиа-план', assignee: 'Новикова Ольга', priority: 'medium' },
        ]},
        contacts: { create: [
          { role: 'Куратор от Росмолодежи', fullName: 'Алексеев Дмитрий', phone: '+7 (999) 567-89-01', type: 'customer' },
        ]},
        rooms: { create: [
          { roomName: 'Амфитеатр Северный', dateFrom: '10.07', dateTo: '15.07' },
          { roomName: 'Конференц-зал А', dateFrom: '10.07', dateTo: '15.07' },
        ]},
        meals: { create: [] },
        transfers: { create: [] },
        accommodations: { create: [
          { roomType: 'Одноместные', count: 20 },
          { roomType: 'Двухместные', count: 65 },
        ]},
        payments: { create: [
          { contractor: "ООО «ТехноАренда»", description: "Оборудование для пленарных заседаний", amount: 1200000, status: "pending", dueDate: new Date("2026-07-01") },
          { contractor: "ООО «БанкетХолл»", description: "Питание 5 дней", amount: 1800000, status: "pending", dueDate: new Date("2026-07-05") },
          { contractor: "ООО «Проживание-Плюс»", description: "Проживание в Северном кампусе", amount: 900000, status: "pending", dueDate: new Date("2026-07-01") },
          { contractor: "Физ. лица (спикеры)", description: "Гонорары спикеров", amount: 350000, status: "pending", dueDate: new Date("2026-07-10") },
        ]},
      },
      {
        title: 'Летняя школа «Лидер перемен»',
        status: 'approved',
        programDirector: 'Соколов Максим',
        startDate: new Date('2026-08-05'),
        endDate: new Date('2026-08-12'),
        participantCount: 60,
        totalParticipants: 72,
        venue: 'ТехноСенеж',
        campus: 'Южный',
        budget: 3100000,
        fundingSource: 'Внебюджет',
        targetAudience: 'Студенты 3-4 курсов, молодые специалисты',
        customerName: 'Фонд «Лидерство»',
        uin: 'УИН-2026-003',
        budgetApproved: true,
        calendarAdded: true,
        hasProgram: true,
        hasPlan: true,
        program: 'Летняя школа для развития лидерских компетенций с фокусом на стратегическое мышление и инновации.',
        eventPlan: 'День 1: Заезд. День 2-3: Стратегическое мышление. День 4-5: Инновационный менеджмент. День 6-7: Практикумы. День 8: Отъезд.',
        number: 3,
        client: 'Фонд «Лидерство»',
        programClass: 'B',
        quarter: 'Q3',
        plannedDates: '05.08 – 12.08.2026',
        programType: 'Семинар',
        coOrganizer: 'МГУ им. М.В. Ломоносова',
        finance: 'Внебюджетные средства',
        tags: 'школа,лидерство,стратегия',
        speakers: { create: [
          { fullName: 'Орлов Николай', topic: 'Стратегическое мышление', cost: 120000 },
          { fullName: 'Лебедева Татьяна', topic: 'Эмоциональный интеллект', cost: 100000 },
          { fullName: 'Григорьев Павел', topic: 'Инновационный менеджмент', cost: 80000 },
        ]},
        budgetItems: { create: [
          { category: 'Техническое оснащение', description: 'Оборудование', plannedAmount: 600000 },
          { category: 'Питание', description: 'Питание 7 дней', plannedAmount: 800000 },
          { category: 'Проживание', description: 'Проживание', plannedAmount: 500000 },
          { category: 'Спикеры', description: 'Гонорары', plannedAmount: 300000 },
          { category: 'Трансфер', description: 'Трансфер', plannedAmount: 200000 },
          { category: 'Застройка', description: 'Застройка', plannedAmount: 200000 },
          { category: 'Творческая составляющая', description: 'Культурная программа', plannedAmount: 300000 },
          { category: 'Прочее', description: 'Резерв', plannedAmount: 200000 },
        ]},
        tasks: { create: [
          { category: 'technical', title: 'Заказ проектора и экранов', assignee: 'Козлов Андрей', priority: 'medium' },
          { category: 'catering', title: 'Согласование меню со спецдиетами', assignee: 'Тихонова Ирина', priority: 'high' },
          { category: 'creative', title: 'Разработка сценария квеста', assignee: 'Иодо Дарья', priority: 'medium' },
        ]},
        contacts: { create: [
          { role: 'Директор фонда', fullName: 'Орлов Виктор Степанович', phone: '+7 (999) 678-90-12', email: 'orlov@leaderfond.ru', type: 'customer' },
          { role: 'Координатор программы', fullName: 'Козлова Мария', phone: '+7 (999) 789-01-23', type: 'customer' },
        ]},
        rooms: { create: [
          { roomName: 'Урал', dateFrom: '05.08', dateTo: '12.08' },
          { roomName: 'Амфитеатр', dateFrom: '05.08', dateTo: '12.08' },
          { roomName: 'Конференц-зал Б', dateFrom: '06.08', dateTo: '11.08' },
        ]},
        meals: { create: [
          { date: '05.08', time: '08:00-09:00', location: 'Ресторан', mealType: 'Шведская линия', headcount: 72 },
          { date: '05.08', time: '13:00-14:00', location: 'Ресторан', mealType: 'Шведская линия', headcount: 72 },
          { date: '06.08', time: '10:30-11:00', location: 'Урал', mealType: 'Кофе-брейк', headcount: 72 },
        ]},
        transfers: { create: [
          { date: '05.08', time: '10:00', from: 'Москва, Белорусский вокзал', to: 'Сенеж', vehicleType: 'Автобус', headcount: 60 },
          { date: '12.08', time: '14:00', from: 'Сенеж', to: 'Москва, Белорусский вокзал', vehicleType: 'Автобус', headcount: 60 },
        ]},
        accommodations: { create: [
          { roomType: 'Одноместные', count: 10, checkIn: '04.08 после 14:00', checkOut: '12.08 до 12:00' },
          { roomType: 'Двухместные', count: 26, checkIn: '04.08 после 14:00', checkOut: '12.08 до 12:00' },
        ]},
        payments: { create: [
          { contractor: "ООО «МедиаТех»", description: "Оборудование и техническое оснащение", amount: 600000, status: "paid", dueDate: new Date("2026-08-01"), paidDate: new Date("2026-07-30"), paidAmount: 600000, invoiceNumber: "СЧ-2026-0412" },
          { contractor: "ООО «ФудСервис»", description: "Питание 7 дней", amount: 800000, status: "partial", dueDate: new Date("2026-08-05"), paidDate: new Date("2026-08-06"), paidAmount: 400000, invoiceNumber: "СЧ-2026-0456" },
          { contractor: "ООО «Проживание-Плюс»", description: "Проживание", amount: 500000, status: "pending", dueDate: new Date("2026-08-10") },
          { contractor: "Физ. лица (спикеры)", description: "Гонорары спикеров", amount: 300000, status: "pending", dueDate: new Date("2026-08-12") },
        ]},
      },
      {
        title: 'Образовательный интенсив «Технологии будущего»',
        status: 'draft',
        programDirector: 'Васильев Роман',
        startDate: new Date('2026-09-20'),
        endDate: new Date('2026-09-25'),
        participantCount: 40,
        totalParticipants: 50,
        venue: 'ТехноСенеж',
        campus: 'Южный',
        budget: 2800000,
        fundingSource: 'Субсидия',
        targetAudience: 'IT-специалисты, разработчики 20-35 лет',
        customerName: 'Минцифры РФ',
        hasProgram: false,
        hasPlan: false,
        number: 4,
        client: 'Минцифры РФ',
        programClass: 'B',
        quarter: 'Q3',
        plannedDates: '20.09 – 25.09.2026',
        programType: 'Мероприятие',
        coOrganizer: 'Сбер',
        finance: 'Субсидия Минцифры',
        comments: 'Новый формат ИТ-интенсива',
        tags: 'IT,технологии,хакатон',
        speakers: { create: [
          { fullName: 'Чернов Дмитрий', topic: 'Искусственный интеллект', cost: 200000 },
          { fullName: 'Сидорова Елена', topic: 'Блокчейн и Web3', cost: 150000 },
        ]},
        budgetItems: { create: [
          { category: 'Техническое оснащение', description: 'Вычислительная техника', plannedAmount: 800000 },
          { category: 'Питание', description: 'Питание', plannedAmount: 600000 },
          { category: 'Проживание', description: 'Проживание', plannedAmount: 400000 },
          { category: 'Спикеры', description: 'Гонорары', plannedAmount: 350000 },
          { category: 'Прочее', description: 'Прочее', plannedAmount: 650000 },
        ]},
        tasks: { create: [
          { category: 'technical', title: 'Заказ рабочих станций', assignee: 'Козлов Андрей', priority: 'high' },
          { category: 'technical', title: 'Настройка сети для хакатона', assignee: 'Белов Сергей', priority: 'high' },
          { category: 'catering', title: 'Организация питания', assignee: 'Тихонова Ирина', priority: 'medium' },
        ]},
        contacts: { create: [
          { role: 'Представитель Минцифры', fullName: 'Захаров Артём', phone: '+7 (999) 890-12-34', email: 'zakharov@mincifry.ru', type: 'customer' },
        ]},
        rooms: { create: [
          { roomName: 'Урал', dateFrom: '20.09', dateTo: '25.09' },
          { roomName: 'Компьютерный класс', dateFrom: '20.09', dateTo: '25.09' },
        ]},
        meals: { create: [
          { date: '20.09', time: '08:00-09:00', location: 'Ресторан', mealType: 'Шведская линия', headcount: 50 },
          { date: '20.09', time: '13:00-14:00', location: 'Ресторан', mealType: 'Шведская линия', headcount: 50 },
        ]},
        transfers: { create: [
          { date: '20.09', time: '08:00', from: 'Москва, Ленинградский вокзал', to: 'Сенеж', vehicleType: 'Автобус', headcount: 40 },
        ]},
        accommodations: { create: [
          { roomType: 'Одноместные', count: 8, checkIn: '19.09 после 14:00', checkOut: '25.09 до 12:00' },
          { roomType: 'Двухместные', count: 17, checkIn: '19.09 после 14:00', checkOut: '25.09 до 12:00' },
        ]},
        payments: { create: [
          { contractor: "ООО «ИТ-Аренда»", description: "Вычислительная техника и рабочие станции", amount: 800000, status: "pending", dueDate: new Date("2026-09-15") },
          { contractor: "ООО «КейтерингПро»", description: "Питание участников", amount: 600000, status: "pending", dueDate: new Date("2026-09-18") },
        ]},
      },
      {
        title: 'Программа «Наставничество»',
        status: 'completed',
        programDirector: 'Михайлова Ольга',
        startDate: new Date('2026-06-13'),
        endDate: new Date('2026-06-15'),
        participantCount: 35,
        totalParticipants: 42,
        venue: 'ТехноСенеж',
        campus: 'Северный',
        budget: 2100000,
        fundingSource: 'Внебюджет',
        targetAudience: 'Наставники и подопечные 25-40 лет',
        customerName: 'Фонд «Развитие»',
        npsScore: 85,
        actualCost: 1950000,
        budgetApproved: true,
        calendarAdded: true,
        uin: 'УИН-2026-005',
        hasProgram: true,
        hasPlan: true,
        program: 'Программа наставничества для обмена опытом между опытными специалистами и начинающими профессионалами.',
        eventPlan: 'День 1: Знакомство. День 2-3: Тренинги. День 4-5: Практика. День 6: Итоги.',
        number: 5,
        client: 'Фонд «Развитие»',
        programClass: 'C',
        quarter: 'Q1',
        plannedDates: '15.03 – 20.03.2026',
        programType: 'Постсопровождение',
        finance: 'Внебюджетные средства',
        analyticalReport: JSON.stringify({
          summary: 'Высокая оценка участников, NPS 85.',
          recommendations: ['Расширить программу на 2 дня', 'Добавить онлайн-сопровождение'],
          participantFeedback: 'Отличный баланс теории и практики',
        }),
        tags: 'наставничество,коучинг',
        isFavorite: false,
        speakers: { create: [
          { fullName: 'Белова Наталья', topic: 'Коучинг и наставничество', cost: 100000 },
          { fullName: 'Краснов Игорь', topic: 'Обратная связь', cost: 80000 },
        ]},
        budgetItems: { create: [
          { category: 'Техническое оснащение', description: 'Оборудование', plannedAmount: 400000, actualAmount: 380000, status: 'spent' },
          { category: 'Питание', description: 'Питание', plannedAmount: 500000, actualAmount: 470000, status: 'spent' },
          { category: 'Проживание', description: 'Проживание', plannedAmount: 350000, actualAmount: 340000, status: 'spent' },
          { category: 'Спикеры', description: 'Гонорары', plannedAmount: 180000, actualAmount: 180000, status: 'spent' },
          { category: 'Прочее', description: 'Прочее', plannedAmount: 670000, actualAmount: 580000, status: 'spent' },
        ]},
        tasks: { create: [
          { category: 'technical', title: 'Настройка видеосвязи', assignee: 'Козлов Андрей', completed: true },
          { category: 'catering', title: 'Организация питания', assignee: 'Тихонова Ирина', completed: true },
          { category: 'accommodation', title: 'Заселение участников', assignee: 'Балакина Арина', completed: true },
        ]},
        contacts: { create: [
          { role: 'Директор фонда', fullName: 'Романова Ирина', phone: '+7 (999) 901-23-45', email: 'romanova@razvitie.ru', type: 'customer' },
          { role: 'Координатор', fullName: 'Зайцев Павел', phone: '+7 (999) 012-34-56', type: 'customer' },
        ]},
        rooms: { create: [
          { roomName: 'Конференц-зал А', dateFrom: '15.03', dateTo: '20.03' },
          { roomName: 'Амфитеатр Северный', dateFrom: '16.03', dateTo: '18.03' },
        ]},
        meals: { create: [
          { date: '15.03', time: '08:00-09:00', location: 'Ресторан', mealType: 'Шведская линия', headcount: 42 },
          { date: '15.03', time: '13:00-14:00', location: 'Ресторан', mealType: 'Шведская линия', headcount: 42 },
        ]},
        transfers: { create: [
          { date: '15.03', time: '09:00', from: 'Москва, Казанский вокзал', to: 'Сенеж', vehicleType: 'Автобус', headcount: 35 },
          { date: '20.03', time: '12:00', from: 'Сенеж', to: 'Москва, Казанский вокзал', vehicleType: 'Автобус', headcount: 35 },
        ]},
        accommodations: { create: [
          { roomType: 'Одноместные', count: 8, checkIn: '14.03 после 14:00', checkOut: '20.03 до 12:00' },
          { roomType: 'Двухместные', count: 14, checkIn: '14.03 после 14:00', checkOut: '20.03 до 12:00' },
        ]},
        payments: { create: [
          { contractor: "ООО «ТехноАренда»", description: "Оборудование", amount: 400000, status: "paid", dueDate: new Date("2026-03-10"), paidDate: new Date("2026-03-12"), paidAmount: 380000, invoiceNumber: "СЧ-2026-0089" },
          { contractor: "ООО «ФудСервис»", description: "Питание", amount: 500000, status: "paid", dueDate: new Date("2026-03-15"), paidDate: new Date("2026-03-16"), paidAmount: 470000, invoiceNumber: "СЧ-2026-0098" },
          { contractor: "ООО «Проживание-Плюс»", description: "Проживание", amount: 350000, status: "paid", dueDate: new Date("2026-03-15"), paidDate: new Date("2026-03-17"), paidAmount: 340000, invoiceNumber: "СЧ-2026-0102" },
          { contractor: "Физ. лица (спикеры)", description: "Гонорары спикеров", amount: 180000, status: "paid", dueDate: new Date("2026-03-20"), paidDate: new Date("2026-03-21"), paidAmount: 180000, invoiceNumber: "СЧ-2026-0115" },
        ]},
      },
    ];

    // Создаём мероприятия
    const createdEvents: { id: string; title: string }[] = [];
    for (const eventData of events) {
      const event = await db.event.create({ data: eventData as any });
      createdEvents.push({ id: event.id, title: event.title });
    }

    // ============================
    // 3. СОЗДАНИЕ НАЗНАЧЕНИЙ
    // ============================

    if (createdEvents.length >= 3) {
      // Мероприятие 1: «Время героев» — LEAD: Иванов (Методология), SUPPORT: сотрудники Организации
      const ivanov = findUser('ivanov@senez.ru');
      const tikhonova = findUser('tikhonova@senez.ru');
      const balakina = findUser('balakina@senez.ru');
      const iodo = findUser('iodo@senez.ru');

      if (ivanov) {
        await db.eventAssignment.create({
          data: { eventId: createdEvents[0].id, userId: ivanov.id, role: 'LEAD', responsibilityZone: 'Методология и программа' },
        });
      }
      if (tikhonova) {
        await db.eventAssignment.create({
          data: { eventId: createdEvents[0].id, userId: tikhonova.id, role: 'SUPPORT', responsibilityZone: 'Питание' },
        });
      }
      if (balakina) {
        await db.eventAssignment.create({
          data: { eventId: createdEvents[0].id, userId: balakina.id, role: 'SUPPORT', responsibilityZone: 'Проживание' },
        });
      }
      if (iodo) {
        await db.eventAssignment.create({
          data: { eventId: createdEvents[0].id, userId: iodo.id, role: 'SUPPORT', responsibilityZone: 'Культурная программа' },
        });
      }

      // Мероприятие 2: «Молодежь России» — LEAD: Федорова (Координация), SUPPORT: сотрудники
      const fedorova = findUser('fedorova@senez.ru');
      const mikhailova = findUser('mikhailova@senez.ru');

      if (fedorova) {
        await db.eventAssignment.create({
          data: { eventId: createdEvents[1].id, userId: fedorova.id, role: 'LEAD', responsibilityZone: 'Координация форума' },
        });
      }
      if (mikhailova) {
        await db.eventAssignment.create({
          data: { eventId: createdEvents[1].id, userId: mikhailova.id, role: 'SUPPORT', responsibilityZone: 'Документация' },
        });
      }

      // Мероприятие 3: «Лидер перемен» — LEAD: Соколов (Методология), SUPPORT: сотрудники
      const sokolov = findUser('sokolov@senez.ru');
      const dmitriev = findUser('dmitriev@senez.ru');

      if (sokolov) {
        await db.eventAssignment.create({
          data: { eventId: createdEvents[2].id, userId: sokolov.id, role: 'LEAD', responsibilityZone: 'Методология' },
        });
      }
      if (dmitriev) {
        await db.eventAssignment.create({
          data: { eventId: createdEvents[2].id, userId: dmitriev.id, role: 'SUPPORT', responsibilityZone: 'Трансфер' },
        });
      }
    }

    return NextResponse.json({
      message: 'Тестовые данные созданы',
      users: users.length,
      events: createdEvents.length,
      assignments: 'created',
    });
  } catch (error: any) {
    console.error('Error seeding:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
