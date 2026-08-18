import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "en" | "ru" | "uz";

const translations = {
  // ── Navigation ──
  "nav.home": { en: "Home", ru: "Главная", uz: "Bosh sahifa" },
  "nav.generate": { en: "Generate", ru: "Создать", uz: "Yaratish" },
  "nav.myRoadmaps": { en: "My Courses", ru: "Мои курсы", uz: "Kurslarim" },
  "nav.marketplace": { en: "Marketplace", ru: "Маркетплейс", uz: "Marketplace" },
  "nav.flashcards": { en: "Flashcards", ru: "Карточки", uz: "Kartochkalar" },
  "nav.pricing": { en: "Pricing", ru: "Тарифы", uz: "Narxlar" },
  "nav.settings": { en: "Settings", ru: "Настройки", uz: "Sozlamalar" },
  "nav.navigation": { en: "Navigation", ru: "Навигация", uz: "Navigatsiya" },
  "nav.lessons": { en: "Lessons", ru: "Уроки", uz: "Darslar" },
  "nav.progress": { en: "Progress", ru: "Прогресс", uz: "Progress" },
  "nav.credits": { en: "Credits", ru: "Кредиты", uz: "Kreditlar" },
  "nav.logout": { en: "Log out", ru: "Выйти", uz: "Chiqish" },
  "nav.learningCopilot": { en: "Learning Co-pilot", ru: "Помощник в обучении", uz: "O'quv yordamchisi" },
  "nav.purchasedCourses": { en: "Purchased Courses", ru: "Купленные курсы", uz: "Xarid qilingan kurslar" },
  "nav.purchaseHistory": { en: "Purchase History", ru: "История покупок", uz: "Xaridlar tarixi" },

  // ── Marketplace ──
  "marketplace.title": { en: "Iqro Marketplace", ru: "Маркетплейс Iqro", uz: "Iqro Marketplace" },
  "marketplace.subtitle": { en: "Knowledge Marketplace: Share and Purchase Ready Courses", ru: "База знаний: делитесь и покупайте готовые курсы", uz: "Bilimlar bozori: Tayyor darsliklarni ulashing va xarid qiling" },
  "marketplace.desc": {
    en: "Buy high-quality textbooks and roadmaps created by AI and augmented by teachers, or sell your own lessons.",
    ru: "Покупайте высококачественные учебники и дорожные карты, созданные ИИ и дополненные преподавателями, или продавайте свои собственные уроки.",
    uz: "AI orqali yaratilgan va o'qituvchilar tomonidan to'ldirilgan yuqori sifatli darsliklar va roadmaplarni sotib oling yoki o'zingiz yaratgan darslarni soting."
  },
  "marketplace.searchPlaceholder": { en: "Search topics or course titles...", ru: "Ищите темы или названия курсов...", uz: "Mavzular yoki darslik nomini qidiring..." },
  "marketplace.tabs.browse": { en: "Browse Courses", ru: "Просмотр курсов", uz: "Kurslarni ko'rish" },
  "marketplace.tabs.creator": { en: "Creator Cabinet (Publish)", ru: "Кабинет создателя", uz: "Creator kabineti" },
  "marketplace.tabs.purchased": { en: "My Purchases", ru: "Мои покупки", uz: "Mening xaridlarim" },
  "marketplace.tabs.history": { en: "Purchase History", ru: "История покупок", uz: "Xaridlar tarixi" },
  "marketplace.creator.earnings": { en: "Creator Earnings", ru: "Доход создателя", uz: "Creator daromadi" },
  "marketplace.creator.earningsDesc": {
    en: "Your net earnings from courses sold on the marketplace after 20% commission deduction.",
    ru: "Ваша чистая прибыль от продажи курсов на маркете за вычетом 20% комиссии.",
    uz: "Marketplace orqali sotilgan darsliklar uchun 20% komissiya yechib olingan holdagi jami daromadingiz."
  },
  "marketplace.creator.listedCourses": { en: "Courses for Sale", ru: "Курсы в продаже", uz: "Sotuvdagi kurslar" },
  "marketplace.creator.salesCount": { en: "Number of Sales", ru: "Количество продаж", uz: "Sotuvlar soni" },
  "marketplace.creator.availableToPublish": { en: "Courses Available to Publish", ru: "Доступные для продажи курсы", uz: "Sotuvga qo'yish mumkin bo'lgan darslar" },
  "marketplace.creator.noAvailableRoadmaps": {
    en: "No suitable (ready) new roadmaps found in the system for sale.",
    ru: "В системе не найдено подходящих (готовых) новых дорожных карт для продажи.",
    uz: "Tizimda sotuvga qo'yish uchun mos (ready holatdagi) yangi roadmap topilmadi."
  },
  "marketplace.creator.publishBtn": { en: "Put up for Sale", ru: "Выставить на продажу", uz: "Sotuvga qo'yish" },
  "marketplace.card.myCourse": { fill: "white", en: "My Course", ru: "Мой курс", uz: "Mening darsligim" },
  "marketplace.card.purchased": { en: "Purchased", ru: "Куплено", uz: "Sotib olingan" },
  "marketplace.card.active": { en: "Active", ru: "Активен", uz: "Aktiv" },
  "marketplace.card.forSale": { en: "For Sale", ru: "В продаже", uz: "Sotuvda" },
  "marketplace.card.lessons": { en: "lessons", ru: "уроков", uz: "darslar" },
  "marketplace.card.viewBtn": { en: "View Course", ru: "Посмотреть курс", uz: "Kursni ko'rish" },
  "marketplace.purchased.emptyTitle": { en: "No purchased courses", ru: "Нет купленных курсов", uz: "Xarid qilingan kurslar yo'q" },
  "marketplace.purchased.empty": {
    en: "You have not purchased any courses yet. Find a suitable course in the 'Browse Courses' section.",
    ru: "Вы еще не приобрели ни одного курса. Найдите подходящий курс в разделе «Просмотр курсов».",
    uz: "Siz hali birorta ham kursni xarid qilmagansiz. \"Kurslarni ko'rish\" bo'limidan o'zingizga mos darslikni xarid qiling."
  },
  "marketplace.purchased.browseBtn": { en: "Explore Marketplace", ru: "Перейти в магазин", uz: "Bozorni kezish" },
  "marketplace.history.title": { en: "My Purchase History", ru: "История моих покупок", uz: "Mening xaridlarim tarixi" },
  "marketplace.history.desc": {
    en: "Receipts and payment logs of all textbooks purchased by you.",
    ru: "Чеки и платежные журналы всех купленных вами учебников.",
    uz: "Siz tomoningizdan sotib olingan barcha darsliklarning kvitansiyalari va to'lov jurnallari."
  },
  "marketplace.history.empty": { en: "Purchase history is empty for now.", ru: "История покупок пока пуста.", uz: "Hozircha xaridlar tarixi bo'sh." },
  "marketplace.history.colTitle": { en: "Course Title", ru: "Название курса", uz: "Kurs nomi" },
  "marketplace.history.colDate": { en: "Date", ru: "Дата", uz: "Sana" },
  "marketplace.history.colCoupon": { en: "Coupon", ru: "Купон", uz: "Kupon" },
  "marketplace.history.colPrice": { en: "Price Paid", ru: "Оплаченная цена", uz: "To'langan narx" },
  "marketplace.history.colAction": { en: "Action", ru: "Действие", uz: "Harakat" },
  "marketplace.history.detailBtn": { en: "Details", ru: "Подробнее", uz: "Batafsil" },
  "marketplace.modal.originalPrice": { en: "Original Price", ru: "Исходная цена", uz: "Boshlang'ich narx" },
  "marketplace.modal.courseDiscount": { en: "Course Discount", ru: "Скидка курса", uz: "Kurs chegirmasi" },
  "marketplace.modal.couponDiscount": { en: "Coupon Discount", ru: "Скидка по купону", uz: "Kupon chegirmasi" },
  "marketplace.modal.total": { en: "Total", ru: "Итого", uz: "Jami" },
  "marketplace.modal.promoPlaceholder": { en: "Enter code...", ru: "Введите код...", uz: "Kodni kiriting..." },
  "marketplace.modal.promoLabel": { en: "Promo Code (Coupon)", ru: "Промокод (Купон)", uz: "Promo-kod (Kupon)" },
  "marketplace.modal.applyBtn": { en: "Apply", ru: "Применить", uz: "Qo'llash" },
  "marketplace.modal.alreadyOwned": { en: "You already purchased this course", ru: "Вы уже купили этот курс", uz: "Ushbu kursni xarid qilgansiz" },
  "marketplace.modal.purchaseBtn": { en: "Purchase", ru: "Купить", uz: "Xarid qilish" },
  "marketplace.modal.loginRequired": { en: "Log in to Purchase", ru: "Войдите для покупки", uz: "Xarid qilish uchun kiring" },
  "marketplace.modal.purchaseSuccessDesc": {
    en: "After purchase, this textbook will be copied to your profile, and chat progress will be saved separately.",
    ru: "После покупки этот курс будет полностью скопирован в ваш профиль, а прогресс чатов будет сохранен отдельно.",
    uz: "Xariddan so'ng ushbu darslik sizning profilingizga to'liq nusxalanadi va chat progresslar alohida saqlanadi."
  },
  "marketplace.modal.redactWarning": { en: "No detailed description provided for this textbook.", ru: "Подробное описание для этого учебника не предоставлено.", uz: "Ushbu darslik uchun batafsil tavsif berilmagan." },
  "marketplace.modal.lessonsTitle": { en: "Course Curriculum & Lessons", ru: "План курса и уроки", uz: "Kurs rejasi & darslar" },
  "marketplace.modal.descriptionTitle": { en: "Course Description", ru: "Описание курса", uz: "Dars tavsifi" },
  "marketplace.modal.closeBtn": { en: "Close", ru: "Закрыть", uz: "Yopish" },
  "marketplace.modal.priceHeader": { en: "Course Price", ru: "Цена курса", uz: "Kurs narxi" },
  "marketplace.modal.orderSummary": { en: "Order Details", ru: "Детали заказа", uz: "Buyurtma tafsiloti" },
  "marketplace.modal.purchasingBtn": { en: "Purchasing...", ru: "Покупка...", uz: "Xarid qilinmoqda..." },
  "marketplace.modal.lessonLabel": { en: "Lesson", ru: "Урок", uz: "Dars" },
  "marketplace.modal.previewLabel": { en: "Preview", ru: "Превью", uz: "Preview" },
  "marketplace.modal.previewBtn": { en: "Read preview", ru: "Читать превью", uz: "O'qib ko'rish" },
  "marketplace.modal.lockedLabel": { en: "Locked", ru: "Закрыто", uz: "Yopiq" },
  "marketplace.modal.noContent": { en: "Lesson content is not available.", ru: "Контент урока недоступен.", uz: "Dars kontenti mavjud emas." },
  "marketplace.validation.minPrice": { en: "Course price must be at least $4.99.", ru: "Цена курса должна быть не менее $4.99.", uz: "Kurs narxi kamida 4.99$ bo'lishi kerak." },
  "marketplace.validation.priceError": { en: "Price Error", ru: "Ошибка цены", uz: "Narx xatosi" },
  "marketplace.creator.minPriceFootnote": { en: "Minimum price is $4.99. Platform takes a 20% commission on sales.", ru: "Минимальная цена $4.99. Комиссия платформы составляет 20%.", uz: "Minimal sotuv narxi 4.99$. Platforma sotuvdan 20% komissiya oladi." },
  "marketplace.creator.withdrawBtn": { en: "Withdraw", ru: "Вывести", uz: "Yechib olish" },
  "marketplace.creator.withdrawTitle": { en: "Withdraw Earnings", ru: "Вывод заработка", uz: "Daromadni yechib olish" },
  "marketplace.creator.withdrawDesc": { en: "Withdraw your earnings to your card/wallet (Simulated transaction).", ru: "Выводите свои доходы на карту/кошелек (симуляция транзакции).", uz: "Mablag'ingizni karta yoki hamyoningizga yechib oling (Simulyatsiya qilingan to'lov)." },
  "marketplace.creator.withdrawAmountLabel": { en: "Amount to Withdraw (USD)", ru: "Сумма для вывода (USD)", uz: "Yechib olinadigan pul miqdori (USD)" },
  "marketplace.creator.withdrawSuccess": { en: "Withdrawal completed successfully!", ru: "Вывод успешно завершен!", uz: "Mablag' muvaffaqiyatli yechib olindi!" },
  "marketplace.creator.insufficient_funds": { en: "Insufficient creator balance.", ru: "Недостаточно средств на балансе.", uz: "Balansda yetarli mablag' vaqtida mavjud emas." },
  "flashcards.modeText": { en: "Text Mode", ru: "Режим текста", uz: "Matn rejimi" },
  "flashcards.modeImage": { en: "Image Mode", ru: "Режим картинок", uz: "Rasm rejimi" },
  "flashcards.generateAll": { en: "Generate Images for All Cards", ru: "Создать картинки для всех", uz: "Barcha kartalarga rasm yaratish" },
  "flashcards.generateSingle": { en: "Generate Image", ru: "Rasm yaratish", uz: "Rasm yaratish" },
  "flashcards.generating": { en: "Generating...", ru: "Создание...", uz: "Yaratilmoqda..." },
  "flashcards.noImageYet": { en: "No image generated yet. Click below to generate one!", ru: "Картинка еще не создана. Нажмите ниже, чтобы создать ее!", uz: "Rasm hali yaratilmagan. Rasm yaratish uchun pastdagi tugmani bosing!" },

  // ── Landing Page ──
  "landing.aiPowered": { en: "AI-Powered Learning Platform", ru: "Образовательная платформа с ИИ", uz: "Sun'iy intellektli ta'lim platformasi" },
  "landing.heroTitle1": { en: "Learn Anything", ru: "Изучайте всё", uz: "Hamma narsani" },
  "landing.heroTitle2": { en: "with", ru: "с", uz: "" },
  "landing.heroTitle3": { en: "AI Precision", ru: "Точностью ИИ", uz: "Sun'iy Intellekt aniqligi bilan o'rganing" },
  "landing.heroDesc": {
    en: "Generate personalized learning roadmaps, study with interactive lessons, and track your progress — all powered by AI.",
    ru: "Создавайте персонализированные дорожные карты обучения, занимайтесь с интерактивными уроками и отслеживайте прогресс — на базе ИИ.",
    uz: "Shaxsiy o'quv yo'l xaritalarini yarating, interaktiv darslar bilan o'qing va progressingizni kuzating — barchasi sun'iy intellekt bilan.",
  },
  "landing.startFree": { en: "Start Learning Free", ru: "Начать бесплатно", uz: "Bepul boshlash" },
  "landing.signIn": { en: "Sign In", ru: "Войти", uz: "Kirish" },
  "landing.logIn": { en: "Log in", ru: "Войти", uz: "Kirish" },
  "landing.getStarted": { en: "Get Started", ru: "Начать", uz: "Boshlash" },
  "landing.featuresTitle1": { en: "Everything You Need to", ru: "Всё что нужно чтобы", uz: "Har qanday mavzuni" },
  "landing.featuresTitle2": { en: "Master", ru: "Освоить", uz: "O'zlashtirish" },
  "landing.featuresTitle3": { en: "Any Topic", ru: "Любую Тему", uz: "uchun kerak bo'lgan hamma narsa" },
  "landing.featuresDesc": {
    en: "A complete learning ecosystem that adapts to how you learn best.",
    ru: "Полноценная образовательная экосистема, адаптированная под ваш стиль обучения.",
    uz: "Sizning o'rganish uslubingizga moslashuvchi to'liq ta'lim ekotizimi.",
  },
  "landing.ctaTitle": { en: "Ready to Start Learning?", ru: "Готовы начать обучение?", uz: "O'rganishni boshlashga tayyormisiz?" },
  "landing.ctaDesc": {
    en: "Join thousands of learners using AI to accelerate their education.",
    ru: "Присоединяйтесь к тысячам учеников, использующих ИИ для ускорения обучения.",
    uz: "Ta'limni tezlashtirish uchun sun'iy intellektdan foydalanayotgan minglab o'quvchilarga qo'shiling.",
  },
  "landing.createFree": { en: "Create Free Account", ru: "Создать бесплатный аккаунт", uz: "Bepul akkaunt yaratish" },
  "landing.poweredByAI": { en: "Powered by AI", ru: "На базе ИИ", uz: "Sun'iy intellekt asosida" },

  // ── Landing - How It Works ──
  "landing.howItWorks": { en: "How It Works", ru: "Как это работает", uz: "Qanday ishlaydi" },
  "landing.howItWorksDesc": { en: "Your learning journey in five steps", ru: "Ваш путь обучения в пяти шагах", uz: "Besh qadamda o'rganish sayohatingiz" },
  "landing.step1Title": { en: "Generate Roadmap", ru: "Создайте карту", uz: "Yo'l xarita yarating" },
  "landing.step1Desc": {
    en: "Enter any topic, upload a PDF, paste a web link or text source — AI generates a personalized curriculum in seconds",
    ru: "Введите тему, загрузите PDF, вставьте ссылку или текст — ИИ создаст персональный план за секунды",
    uz: "Mavzu kiriting, PDF yuklang, veb-link yoki matn manbasini biriktiring — SI soniyalarda shaxsiy reja yaratadi",
  },
  "landing.step2Title": { en: "Study Lessons", ru: "Изучайте уроки", uz: "Darslarni o'rganing" },
  "landing.step2Desc": { en: "Interactive lessons with code playgrounds and explanations", ru: "Интерактивные уроки с песочницами кода и объяснениями", uz: "Kod sinov maydonlari va tushuntirishlar bilan interaktiv darslar" },
  "landing.step3Title": { en: "Pass the Test", ru: "Пройдите тест", uz: "Testdan o'ting" },
  "landing.step3Desc": { en: "Prove your knowledge with adaptive quizzes after each lesson", ru: "Подтвердите знания адаптивными тестами после каждого урока", uz: "Har bir darsdan keyin adaptiv testlar bilan bilimingizni tasdiqlang" },
  "landing.step4Title": { en: "Ask AI", ru: "Спросите ИИ", uz: "SI'dan so'rang" },
  "landing.step4Desc": { en: "Get instant help from AI chat on any concept you're stuck on", ru: "Получите мгновенную помощь от ИИ-чата по любому непонятному вопросу", uz: "Tushunmagan savolingiz bo'yicha SI chatdan tezkor yordam oling" },
  "landing.step5Title": { en: "Track Progress", ru: "Отслеживайте прогресс", uz: "Progressni kuzating" },
  // ── Landing - Marketplace Showcase & Mockups ──
  "landing.marketplace.title": { en: "Ready Courses & Textbooks", ru: "Готовые курсы и учебники", uz: "Tayyor Kurslar va Darsliklar" },
  "landing.marketplace.desc": {
    en: "Enhance your knowledge immediately with ready-made textbooks created by AI and expert teachers.",
    ru: "Повышайте свои знания с помощью готовых учебников, созданных ИИ и опытными преподавателями.",
    uz: "Sun'iy intellekt hamda tajribali ustozlar yaratgan tayyor darsliklar bilan bilimingizni darhol oshiring va o'rganishni boshlang.",
  },
  "landing.marketplace.searchPlaceholder": { en: "Search topics or course titles...", ru: "Поиск по темам или названиям курсов...", uz: "Mavzular yoki darslik nomini qidiring..." },
  "landing.marketplace.noCoursesFound": { en: "No courses found for this search query.", ru: "По данному запросу курсы не найдены.", uz: "Qidiruv bo'yicha hech qanday kurs topilmadi." },
  "landing.marketplace.noCoursesYet": { en: "No published courses available yet.", ru: "В маркетплейсе пока нет опубликованных курсов.", uz: "Hali marketplace'da sotuvdagi kurslar mavjud emas." },
  "landing.marketplace.goToMarketplace": { en: "Go to Marketplace", ru: "Перейти в маркетплейс", uz: "Marketplace'ga o'tish" },
  "landing.marketplace.viewAllBtn": { en: "View All Courses (Marketplace)", ru: "Смотреть все курсы (Маркетплейс)", uz: "Barcha kurslarni ko'rish (Marketplace)" },
  "landing.marketplace.lessonsCount": { en: "lessons", ru: "уроков", uz: "dars" },

  "mockup.sourceTopic": { en: "Topic", ru: "Тема", uz: "Mavzu" },
  "mockup.sourcePdf": { en: "PDF Document", ru: "PDF Документ", uz: "PDF Hujjat" },
  "mockup.sourceLink": { en: "Web Link", ru: "Веб-ссылка", uz: "Veb-link" },
  "mockup.sourceText": { en: "Text Source", ru: "Текст", uz: "Matn" },
  "mockup.generateBtn": { en: "Generate Roadmap →", ru: "Создать карту →", uz: "Yo'riqnoma yaratish →" },
  "mockup.whatToLearn": { en: "What do you want to learn?", ru: "Что вы хотите изучить?", uz: "Nimani o'rganmoqchisiz?" },

  // ── Landing - Stats ──
  "landing.stat1Label": { en: "Learners", ru: "Учеников", uz: "O'quvchilar" },
  "landing.stat2Label": { en: "Topics Available", ru: "Доступных тем", uz: "Mavjud mavzular" },
  "landing.stat3Label": { en: "Lessons Generated", ru: "Уроков создано", uz: "Yaratilgan darslar" },
  "landing.stat4Label": { en: "Satisfaction", ru: "Удовлетворённость", uz: "Qoniqish" },

  // ── Features ──
  "feature.smartRoadmaps": { en: "Smart Roadmaps", ru: "Умные дорожные карты", uz: "Aqlli yo'l xaritalari" },
  "feature.smartRoadmapsDesc": {
    en: "AI-structured weekly plans tailored to your pace and goals",
    ru: "ИИ-структурированные еженедельные планы под ваш темп и цели",
    uz: "Sizning sur'atingiz va maqsadlaringizga moslashtirilgan haftalik rejalar",
  },
  "feature.interactiveLessons": { en: "Interactive Lessons", ru: "Интерактивные уроки", uz: "Interaktiv darslar" },
  "feature.interactiveLessonsDesc": {
    en: "Split-screen learning with live code previews and playgrounds",
    ru: "Обучение в режиме разделённого экрана с превью кода и песочницами",
    uz: "Jonli kod ko'rish va sinov maydonlari bilan bo'lingan ekranda o'qish",
  },
  "feature.adaptiveTesting": { en: "Adaptive Testing", ru: "Адаптивное тестирование", uz: "Adaptiv testlash" },
  "feature.adaptiveTestingDesc": {
    en: "Quizzes that adapt to your understanding level",
    ru: "Тесты, адаптирующиеся под ваш уровень понимания",
    uz: "Tushunish darajangizga moslashuvchi testlar",
  },
  "feature.trackProgress": { en: "Track Progress", ru: "Отслеживание прогресса", uz: "Progressni kuzatish" },
  "feature.trackProgressDesc": {
    en: "Visual progress tracking across all your learning paths",
    ru: "Визуальное отслеживание прогресса по всем вашим учебным путям",
    uz: "Barcha o'quv yo'llaringiz bo'yicha vizual progress kuzatish",
  },
  "feature.analytics": { en: "Analytics", ru: "Аналитика", uz: "Analitika" },
  "feature.analyticsDesc": {
    en: "Insights into your learning habits and performance",
    ru: "Анализ ваших учебных привычек и успеваемости",
    uz: "O'rganish odatlari va samaradorligingiz haqida ma'lumotlar",
  },
  "feature.aiPowered": { en: "AI-Powered", ru: "На базе ИИ", uz: "Sun'iy intellekt asosida" },
  "feature.aiPoweredDesc": {
    en: "Personalized content generated by advanced AI models",
    ru: "Персонализированный контент от продвинутых моделей ИИ",
    uz: "Ilg'or sun'iy intellekt modellari tomonidan yaratilgan shaxsiy kontent",
  },

  // ── Auth ──
  "auth.welcomeBack": { en: "Welcome back", ru: "С возвращением", uz: "Qayta xush kelibsiz" },
  "auth.createAccount": { en: "Create account", ru: "Создать аккаунт", uz: "Akkaunt yaratish" },
  "auth.verifyEmail": { en: "Verify Email", ru: "Подтвердить Email", uz: "Emailni tasdiqlash" },
  "auth.signInContinue": { en: "Sign in to continue learning", ru: "Войдите, чтобы продолжить обучение", uz: "O'qishni davom ettirish uchun kiring" },
  "auth.startJourney": { en: "Start your AI-powered learning journey", ru: "Начните ваше обучение с ИИ", uz: "Sun'iy intellektli ta'lim sayohatingizni boshlang" },
  "auth.enterCode": { en: "Enter the 6-digit code sent to your email", ru: "Введите 6-значный код, отправленный на вашу почту", uz: "Emailingizga yuborilgan 6 raqamli kodni kiriting" },
  "auth.backToHome": { en: "Back to home", ru: "На главную", uz: "Bosh sahifaga" },
  "auth.verificationCode": { en: "Verification Code", ru: "Код подтверждения", uz: "Tasdiqlash kodi" },
  "auth.verify": { en: "Verify", ru: "Подтвердить", uz: "Tasdiqlash" },
  "auth.backToLogin": { en: "Back to login", ru: "Вернуться к входу", uz: "Kirishga qaytish" },
  "auth.orContinueWith": { en: "or continue with email", ru: "или продолжить с email", uz: "yoki email bilan davom eting" },
  "auth.fullName": { en: "Full Name", ru: "Полное имя", uz: "To'liq ism" },
  "auth.email": { en: "Email", ru: "Email", uz: "Email" },
  "auth.password": { en: "Password", ru: "Пароль", uz: "Parol" },
  "auth.confirmPassword": { en: "Confirm Password", ru: "Подтвердите пароль", uz: "Parolni tasdiqlang" },
  "auth.signInBtn": { en: "Sign In", ru: "Войти", uz: "Kirish" },
  "auth.createAccountBtn": { en: "Create Account", ru: "Создать аккаунт", uz: "Akkaunt yaratish" },
  "auth.noAccount": { en: "Don't have an account?", ru: "Нет аккаунта?", uz: "Akkauntingiz yo'qmi?" },
  "auth.haveAccount": { en: "Already have an account?", ru: "Уже есть аккаунт?", uz: "Akkauntingiz bormi?" },
  "auth.signUp": { en: "Sign up", ru: "Зарегистрироваться", uz: "Ro'yxatdan o'tish" },
  "auth.signInLink": { en: "Sign in", ru: "Войти", uz: "Kirish" },
  "auth.comingSoon": { en: "Coming Soon", ru: "Скоро", uz: "Tez kunda" },
  "auth.loginFailed": { en: "Login Failed", ru: "Ошибка входа", uz: "Kirishda xatolik" },
  "auth.networkError": { en: "Network error", ru: "Ошибка сети", uz: "Tarmoq xatosi" },
  "auth.success": { en: "Success", ru: "Успешно", uz: "Muvaffaqiyatli" },
  "auth.verificationSent": { en: "Verification email sent! Enter the code below.", ru: "Письмо с кодом отправлено! Введите код ниже.", uz: "Tasdiqlash emaili yuborildi! Quyida kodni kiriting." },
  "auth.registrationFailed": { en: "Registration Failed", ru: "Ошибка регистрации", uz: "Ro'yxatdan o'tishda xatolik" },
  "auth.verified": { en: "Verified!", ru: "Подтверждено!", uz: "Tasdiqlandi!" },
  "auth.emailVerified": { en: "Email verified. Please log in.", ru: "Email подтверждён. Пожалуйста, войдите.", uz: "Email tasdiqlandi. Iltimos, kiring." },
  "auth.verificationFailed": { en: "Verification Failed", ru: "Ошибка подтверждения", uz: "Tasdiqlashda xatolik" },
  "auth.passwordsDontMatch": { en: "Passwords don't match", ru: "Пароли не совпадают", uz: "Parollar mos kelmaydi" },
  "auth.error": { en: "Error", ru: "Ошибка", uz: "Xatolik" },

  // ── Dashboard ──
  "dashboard.learnWith": { en: "Learn Anything with", ru: "Изучайте всё с", uz: "Hamma narsani" },
  "dashboard.aiPrecision": { en: "AI Precision", ru: "Точностью ИИ", uz: "Sun'iy Intellekt aniqligi bilan o'rganing" },
  "dashboard.desc": {
    en: "Enter any topic and get a personalized, structured learning roadmap powered by AI. From fundamentals to mastery.",
    ru: "Введите любую тему и получите персонализированную, структурированную дорожную карту обучения на базе ИИ.",
    uz: "Istalgan mavzuni kiriting va sun'iy intellekt asosida shaxsiy, tuzilgan o'quv yo'l xaritasini oling.",
  },
  "dashboard.whatToLearn": { en: "What do you want to learn?", ru: "Что вы хотите изучить?", uz: "Nimani o'rganmoqchisiz?" },
  "dashboard.generate": { en: "Generate", ru: "Создать", uz: "Yaratish" },

  // ── Generate Roadmap ──
  "genRoadmap.title": { en: "Generate", ru: "Создать", uz: "Yaratish" },
  "genRoadmap.yourRoadmap": { en: "Your Roadmap", ru: "вашу дорожную карту", uz: "Yo'l xaritangizni" },
  "genRoadmap.desc": {
    en: "Enter any topic and let AI create a personalized learning plan.",
    ru: "Введите любую тему и позвольте ИИ создать персонализированный учебный план.",
    uz: "Istalgan mavzuni kiriting va sun'iy intellekt shaxsiy o'quv rejasini yaratsin.",
  },
  "genRoadmap.placeholder": { en: "e.g., Linear Algebra for AI", ru: "напр., Линейная алгебра для ИИ", uz: "masalan, Sun'iy intellekt uchun chiziqli algebra" },
  "genRoadmap.analyzing": { en: "AI is analyzing your topic and requirements…", ru: "ИИ анализирует вашу тему и требования…", uz: "Sun'iy intellekt mavzuingizni tahlil qilmoqda…" },
  "genRoadmap.planning": { en: "Structuring your curriculum and lessons…", ru: "Структурирование учебной программы и уроков…", uz: "O'quv dasturi va darslarni tuzmoqda…" },
  "genRoadmap.saving": { en: "Finalizing your roadmap and saving…", ru: "Финализация и сохранение дорожной карты…", uz: "Yo'l xaritangizni yakunlash va saqlash…" },
  "genRoadmap.creating": { en: "Creating your roadmap…", ru: "Создание вашей дорожной карты…", uz: "Yo'l xaritangiz yaratilmoqda…" },
  "genRoadmap.analyzingHint": { en: "This usually takes a few seconds", ru: "Это обычно занимает несколько секунд", uz: "Bu odatda bir necha soniya oladi" },
  "genRoadmap.planningHint": { en: "Building your personalized learning path", ru: "Создание вашего персонального учебного пути", uz: "Shaxsiy o'quv yo'lingiz yaratilmoqda" },
  "genRoadmap.savingHint": { en: "Almost there!", ru: "Почти готово!", uz: "Deyarli tayyor!" },
  "genRoadmap.creatingHint": { en: "Your first lessons will appear shortly", ru: "Ваши первые уроки скоро появятся", uz: "Birinchi darslaringiz tez orada paydo bo'ladi" },
  "genRoadmap.lessons": { en: "lessons", ru: "уроков", uz: "darslar" },

  // ── My Roadmaps / Courses ──
  "myRoadmaps.title": { en: "My", ru: "Мои", uz: "Mening" },
  "myRoadmaps.titleHighlight": { en: "Courses", ru: "курсы", uz: "kurslarim" },
  "myRoadmaps.pathsAvailable": { en: "course(s) available", ru: "курса(ов) доступно", uz: "ta kurs mavjud" },
  "myRoadmaps.newRoadmap": { en: "New Course", ru: "Новый курс", uz: "Yangi kurs" },
  "myRoadmaps.noRoadmaps": { en: "No courses yet", ru: "Курсов пока нет", uz: "Hali kurslar yo'q" },
  "myRoadmaps.noRoadmapsDesc": {
    en: "Generate your first AI-powered course and start mastering any topic.",
    ru: "Создайте свой первый курс с помощью ИИ и начните осваивать любую тему.",
    uz: "Birinchi sun'iy intellektli kursingizni yarating va istalgan mavzuni o'zlashtiring.",
  },
  "myRoadmaps.generateFirst": { en: "Generate Your First Course", ru: "Создать ваш первый курс", uz: "Birinchi kursingizni yarating" },
  "myRoadmaps.courseProgress": { en: "Course Progress", ru: "Прогресс курса", uz: "Kurs progressi" },
  "myRoadmaps.failedLoad": { en: "Failed to load courses", ru: "Ошибка загрузки курсов", uz: "Kurslarni yuklashda xatolik" },
  "myRoadmaps.tryAgainLater": { en: "Please try again later.", ru: "Пожалуйста, попробуйте позже.", uz: "Iltimos, keyinroq urinib ko'ring." },
  "myRoadmaps.total": { en: "total", ru: "всего", uz: "jami" },

  // ── Settings ──
  "settings.title": { en: "Settings", ru: "Настройки", uz: "Sozlamalar" },
  "settings.customize": { en: "Customize your learning experience", ru: "Настройте ваш опыт обучения", uz: "O'rganish tajribangizni sozlang" },
  "settings.profile": { en: "Profile", ru: "Профиль", uz: "Profil" },
  "settings.email": { en: "Email", ru: "Email", uz: "Email" },
  "settings.name": { en: "Name", ru: "Имя", uz: "Ism" },
  "settings.plan": { en: "Plan", ru: "Тариф", uz: "Tarif" },
  "settings.credits": { en: "Credits", ru: "Кредиты", uz: "Kreditlar" },
  "settings.planFeatures": { en: "Plan Features", ru: "Функции тарифа", uz: "Tarif imkoniyatlari" },
  "settings.profileAfterLogin": { en: "Profile settings will be available after logging in.", ru: "Настройки профиля будут доступны после входа.", uz: "Profil sozlamalari kirgandan keyin mavjud bo'ladi." },
  "settings.appearance": { en: "Appearance", ru: "Внешний вид", uz: "Tashqi ko'rinish" },
  "settings.chooseTheme": { en: "Choose your preferred theme", ru: "Выберите предпочитаемую тему", uz: "O'zingizga yoqadigan mavzuni tanlang" },
  "settings.light": { en: "Light", ru: "Светлая", uz: "Yorug'" },
  "settings.dark": { en: "Dark", ru: "Тёмная", uz: "Qorong'u" },
  "settings.lightDesc": { en: "Clean light interface", ru: "Чистый светлый интерфейс", uz: "Toza yorug' interfeys" },
  "settings.darkDesc": { en: "Easy on the eyes", ru: "Комфортно для глаз", uz: "Ko'zga qulay" },
  "settings.language": { en: "Language", ru: "Язык", uz: "Til" },
  "settings.chooseLang": { en: "Choose your preferred language", ru: "Выберите предпочитаемый язык", uz: "O'zingizga qulay tilni tanlang" },

  // ── Pricing ──
  "pricing.title": { en: "Credits & Plans", ru: "Кредиты и тарифы", uz: "Kreditlar va tariflar" },
  "pricing.youHave": { en: "You have", ru: "У вас", uz: "Sizda" },
  "pricing.creditsRemaining": { en: "credits remaining", ru: "кредитов осталось", uz: "kredit qoldi" },
  "pricing.buyCredits": { en: "Buy Credits", ru: "Купить кредиты", uz: "Kreditlar sotib olish" },
  "pricing.howMany": { en: "How many credits do you want?", ru: "Сколько кредитов вы хотите?", uz: "Qancha kredit olmoqchisiz?" },
  "pricing.enterAmount": { en: "Enter credit amount", ru: "Введите количество", uz: "Kredit miqdorini kiriting" },
  "pricing.credits": { en: "Credits", ru: "Кредиты", uz: "Kreditlar" },
  "pricing.bonus": { en: "Bonus", ru: "Бонус", uz: "Bonus" },
  "pricing.free": { en: "free", ru: "бесплатно", uz: "bepul" },
  "pricing.planDiscount": { en: "Plan discount", ru: "Скидка тарифа", uz: "Tarif chegirmasi" },
  "pricing.total": { en: "Total", ru: "Итого", uz: "Jami" },
  "pricing.buy": { en: "Buy", ru: "Купить", uz: "Sotib olish" },
  "pricing.creditPacks": { en: "Credit Packs", ru: "Пакеты кредитов", uz: "Kredit paketlari" },
  "pricing.buyPack": { en: "Buy Pack", ru: "Купить пакет", uz: "Paketni sotib olish" },
  "pricing.subscriptionPlans": { en: "Subscription Plans", ru: "Планы подписки", uz: "Obuna rejalari" },
  "pricing.current": { en: "Current", ru: "Текущий", uz: "Joriy" },
  "pricing.active": { en: "Active", ru: "Активный", uz: "Faol" },
  "pricing.subscribe": { en: "Subscribe", ru: "Подписаться", uz: "Obuna bo'lish" },
  "pricing.offCredits": { en: "off credit purchases", ru: "скидка на кредиты", uz: "kredit xaridlariga chegirma" },
  "pricing.recentPurchases": { en: "Recent Purchases", ru: "Недавние покупки", uz: "Oxirgi xaridlar" },
  "pricing.subscription": { en: "Subscription", ru: "Подписка", uz: "Obuna" },
  "pricing.creditPurchase": { en: "Credit Purchase", ru: "Покупка кредитов", uz: "Kredit xaridi" },
  "pricing.failedLoad": { en: "Failed to load pricing", ru: "Ошибка загрузки тарифов", uz: "Narxlarni yuklashda xatolik" },
  "pricing.paymentFailed": { en: "Payment failed", ru: "Ошибка оплаты", uz: "To'lov xatosi" },
  "pricing.tryAgain": { en: "Please try again.", ru: "Попробуйте ещё раз.", uz: "Qayta urinib ko'ring." },

  // ── Flashcards ──
  "flashcards.title": { en: "Flashcard Review", ru: "Повторение карточек", uz: "Kartochkalarni takrorlash" },
  "flashcards.desc": { en: "Practice your collected vocabulary", ru: "Практикуйте собранную лексику", uz: "To'plangan lug'atingizni mashq qiling" },
  "flashcards.emptyState": { 
    en: "You don't have any flashcards yet. Create a language roadmap and start learning lessons to collect cards!", 
    ru: "У вас пока нет карточек. Создайте языковую дорожную карту и проходите уроки, чтобы собирать карточки!", 
    uz: "Hali hech qanday til o'rganish yo'l xaritasini boshlamadingiz. Yangi til o'rganish yo'l xaritasini yarating va so'zlarni to'plashni boshlang!" 
  },
  "flashcards.selectRoadmap": { en: "Select a Roadmap", ru: "Выберите дорожную карту", uz: "Yo'l xaritasini tanlang" },
  "flashcards.selectLesson": { en: "Select a Lesson", ru: "Выберите урок", uz: "Darsni tanlang" },
  "flashcards.reviewAll": { en: "Review All Cards", ru: "Повторить все карточки", uz: "Barcha kartochkalarni takrorlash" },
  "flashcards.cardsCount": { en: "cards", ru: "карточек", uz: "ta kartochka" },
  "flashcards.tapToFlip": { en: "Tap to flip", ru: "Нажмите, чтобы перевернуть", uz: "Aylantirish uchun bosing" },
  "flashcards.previous": { en: "Previous", ru: "Назад", uz: "Oldingi" },
  "flashcards.next": { en: "Next", ru: "Далее", uz: "Keyingi" },
  "flashcards.comingSoon": { en: "Coming Soon", ru: "Скоро", uz: "Tez kunda" },

  // ── Learn Mode ──
  "learn.back": { en: "Back", ru: "Назад", uz: "Orqaga" },
  "learn.loading": { en: "Loading...", ru: "Загрузка...", uz: "Yuklanmoqda..." },
  "learn.aiThinking": { en: "AI is thinking...", ru: "ИИ думает...", uz: "Sun'iy intellekt o'ylamoqda..." },
  "learn.generatingContent": { en: "Generating content...", ru: "Генерация контента...", uz: "Kontent yaratilmoqda..." },
  "learn.lesson": { en: "Lesson", ru: "Урок", uz: "Dars" },
  "learn.chat": { en: "Chat", ru: "Чат", uz: "Chat" },
  "learn.aiChat": { en: "AI Chat", ru: "ИИ Чат", uz: "SI Chat" },
  "learn.quiz": { en: "Quiz", ru: "Тест", uz: "Test" },
  "learn.playground": { en: "Playground", ru: "Песочница", uz: "Sinov maydoni" },
  "learn.mathLab": { en: "Math Lab", ru: "Мат. лаборатория", uz: "Matematik laboratoriya" },
  "learn.languageLab": { en: "Language Lab", ru: "Языковая лаб.", uz: "Til laboratoriyasi" },
  "learn.modeSwitched": { en: "Mode switched", ru: "Режим изменён", uz: "Rejim o'zgartirildi" },
  "learn.switchedTo": { en: "Switched to", ru: "Переключено на", uz: "ga o'tkazildi" },
  "learn.mode": { en: "mode", ru: "режим", uz: "rejim" },
  "learn.connectionError": { en: "Connection Error", ru: "Ошибка соединения", uz: "Ulanish xatosi" },
  "learn.streamFailed": { en: "Failed to stream lesson content. Check your credits or internet.", ru: "Не удалось загрузить содержание. Проверьте кредиты или интернет.", uz: "Dars mazmunini yuklab bo'lmadi. Kreditlar yoki internetni tekshiring." },

  // ── Playground ──
  "playground.interactiveLab": { en: "Interactive Lab", ru: "Интерактивная лаборатория", uz: "Interaktiv laboratoriya" },
  "playground.submit": { en: "Submit", ru: "Отправить", uz: "Yuborish" },
  "playground.loading": { en: "Loading playground…", ru: "Загрузка песочницы…", uz: "Sinov maydoni yuklanmoqda…" },
  "playground.regenerate": { en: "Regenerate playground", ru: "Пересоздать песочницу", uz: "Sinov maydonini qayta yaratish" },
  "playground.fullScreen": { en: "Full screen", ru: "Полный экран", uz: "To'liq ekran" },
  "playground.exitFullScreen": { en: "Exit full screen", ru: "Выйти из полного экрана", uz: "To'liq ekrandan chiqish" },
  "playground.notReady": { en: "Playground not ready yet", ru: "Песочница ещё не готова", uz: "Sinov maydoni hali tayyor emas" },
  "playground.noValidation": { en: "No validation function found in playground", ru: "Функция проверки не найдена", uz: "Tekshirish funksiyasi topilmadi" },
  "playground.couldNotValidate": { en: "Could not validate answer", ru: "Не удалось проверить ответ", uz: "Javobni tekshirib bo'lmadi" },
  "playground.submissionFailed": { en: "Submission failed", ru: "Ошибка отправки", uz: "Yuborishda xatolik" },
  "playground.couldNotSave": { en: "Could not save your answer. Try again.", ru: "Не удалось сохранить ответ. Попробуйте снова.", uz: "Javobingizni saqlash imkonsiz. Qayta urinib ko'ring." },
  "playground.correct": { en: "Correct!", ru: "Правильно!", uz: "To'g'ri!" },
  "playground.notQuite": { en: "Not quite", ru: "Не совсем", uz: "To'g'ri emas" },
  "playground.incorrect": { en: "Incorrect", ru: "Неправильно", uz: "Noto'g'ri" },
  "playground.score": { en: "Score", ru: "Балл", uz: "Ball" },
  "playground.buildingSimulation": { en: "AI is building your simulation…", ru: "ИИ создаёт вашу симуляцию…", uz: "Sun'iy intellekt simulyatsiyangizni yaratmoqda…" },
  "playground.mayTake": { en: "This may take 30–60 seconds", ru: "Это может занять 30–60 секунд", uz: "Bu 30–60 soniya davom etishi mumkin" },
  "playground.failed": { en: "Oops! Simulation failed to load", ru: "Ой! Симуляция не загрузилась", uz: "Afsuski! Simulyatsiyani yuklab bo'lmadi" },
  "playground.failedDesc": { en: "Something went wrong while generating the simulation", ru: "Произошла ошибка при создании симуляции", uz: "Simulyatsiya yaratishda xatolik yuz berdi" },
  "playground.retry": { en: "Retry", ru: "Повторить", uz: "Qayta urinish" },
  "playground.noPlayground": { en: "No playground yet", ru: "Песочницы пока нет", uz: "Hali sinov maydoni yo'q" },
  "playground.noPlaygroundDesc": { en: "Generate an interactive exercise tailored to this lesson's content", ru: "Создайте интерактивное упражнение по содержанию урока", uz: "Dars mazmuniga moslashtirilgan interaktiv mashq yarating" },
  "playground.generateBtn": { en: "Generate Playground", ru: "Создать песочницу", uz: "Sinov maydonini yaratish" },
  "playground.generating": { en: "Generating…", ru: "Создаётся…", uz: "Yaratilmoqda…" },
  "playground.beingBuilt": { en: "Your playground is being built. It will appear automatically.", ru: "Ваша песочница создаётся. Она появится автоматически.", uz: "Sinov maydoningiz yaratilmoqda. U avtomatik paydo bo'ladi." },
  "playground.readyTitle": { en: "🧪 Interactive Simulation is ready!", ru: "🧪 Интерактивная симуляция готова!", uz: "🧪 Interaktiv simulyatsiya tayyor!" },
  "playground.readyDesc": { en: "Your playground has been generated.", ru: "Ваша песочница создана.", uz: "Sinov maydoningiz yaratildi." },
  "playground.failedTitle": { en: "Playground failed", ru: "Ошибка песочницы", uz: "Sinov maydoni xatosi" },
  "playground.failedRetryDesc": { en: "Could not generate the simulation. Try again.", ru: "Не удалось создать симуляцию. Попробуйте снова.", uz: "Simulyatsiyani yaratib bo'lmadi. Qayta urinib ko'ring." },
  "playground.taskSubmitted": { en: "Task submitted!", ru: "Задание отправлено!", uz: "Topshiriq yuborildi!" },
  "playground.answerRecorded": { en: "Your answer has been recorded.", ru: "Ваш ответ записан.", uz: "Javobingiz qayd etildi." },

  // ── Quiz ──
  "quiz.lessonAssessment": { en: "Lesson Assessment", ru: "Оценка урока", uz: "Darsni baholash" },
  "quiz.generateDesc": { en: "Generate a quiz to test your understanding of this lesson.", ru: "Создайте тест для проверки знаний по уроку.", uz: "Bu dars bo'yicha bilimingizni tekshirish uchun test yarating." },
  "quiz.lastAttempt": { en: "Last attempt", ru: "Последняя попытка", uz: "Oxirgi urinish" },
  "quiz.retakeQuiz": { en: "Retake Quiz", ru: "Пересдать тест", uz: "Testni qayta topshirish" },
  "quiz.generateQuiz": { en: "Generate Quiz", ru: "Создать тест", uz: "Test yaratish" },
  "quiz.quizLabel": { en: "Quiz", ru: "Тест", uz: "Test" },
  "quiz.generating": { en: "Generating...", ru: "Создаётся...", uz: "Yaratilmoqda..." },

  "quiz.nextLesson": { en: "Next Lesson", ru: "Следующий урок", uz: "Keyingi dars" },
  "quiz.question": { en: "Question", ru: "Вопрос", uz: "Savol" },
  "quiz.of": { en: "of", ru: "из", uz: "dan" },
  "quiz.confirmAnswer": { en: "Confirm Answer", ru: "Подтвердить ответ", uz: "Javobni tasdiqlash" },
  "quiz.nextQuestion": { en: "Next Question", ru: "Следующий вопрос", uz: "Keyingi savol" },
  "quiz.viewResults": { en: "View Results", ru: "Результаты", uz: "Natijalar" },
  "quiz.correct": { en: "correct", ru: "правильно", uz: "to'g'ri" },
  "quiz.passed": { en: "Great job! Assessment passed.", ru: "Отлично! Тест пройден.", uz: "Ajoyib! Test topshirildi." },
  "quiz.failed": { en: "Review the material and try again.", ru: "Повторите материал и попробуйте снова.", uz: "Materialni qayta ko'rib chiqing va qayta urinib ko'ring." },
  "quiz.generated": { en: "Quiz generated", ru: "Тест создан", uz: "Test yaratildi" },
  "quiz.creditsUsed": { en: "2 credits used", ru: "Использовано 2 кредита", uz: "2 kredit ishlatildi" },
  "quiz.failedGenerate": { en: "Failed to generate quiz", ru: "Ошибка создания теста", uz: "Testni yaratishda xatolik" },
  "quiz.tryAgainLater": { en: "Please try again later", ru: "Попробуйте позже", uz: "Keyinroq urinib ko'ring" },

  // ── Chat Panel ──
  "chat.aiAssistant": { en: "AI Assistant", ru: "ИИ Помощник", uz: "SI Yordamchi" },
  "chat.general": { en: "General", ru: "Общий", uz: "Umumiy" },
  "chat.math": { en: "Math", ru: "Математика", uz: "Matematika" },
  "chat.coding": { en: "Coding", ru: "Код", uz: "Kodlash" },
  "chat.language": { en: "Language", ru: "Язык", uz: "Til" },
  "chat.askAnything": { en: "Ask anything about this lesson", ru: "Спросите что угодно об этом уроке", uz: "Bu dars haqida istalgan narsani so'rang" },
  "chat.selectText": {
    en: "Select text in the lesson or chat and click \"Ask AI\" to get contextual explanations",
    ru: "Выделите текст в уроке или чате и нажмите «Спросить ИИ» для контекстных объяснений",
    uz: "Dars yoki chatdagi matnni tanlang va \"SI'dan so'rash\" tugmasini bosing",
  },
  "chat.askAboutLesson": { en: "Ask about this lesson...", ru: "Спросите об этом уроке...", uz: "Bu dars haqida so'rang..." },
  "chat.thinking": { en: "Thinking...", ru: "Думаю...", uz: "O'ylamoqda..." },
  "chat.explainThis": { en: "Explain this", ru: "Объясните это", uz: "Buni tushuntiring" },
  "chat.chatError": { en: "Chat Error", ru: "Ошибка чата", uz: "Chat xatosi" },

  // ── Roadmap View ──
  "roadmap.aiGenerated": { en: "AI Generated", ru: "Создано ИИ", uz: "SI tomonidan yaratilgan" },
  "roadmap.hoursTotal": { en: "hours total", ru: "часов всего", uz: "soat jami" },
  "roadmap.weeks": { en: "weeks", ru: "недель", uz: "hafta" },
  "roadmap.replan": { en: "Replan", ru: "Перепланировать", uz: "Qayta rejalashtirish" },
  "roadmap.overallProgress": { en: "Overall Progress", ru: "Общий прогресс", uz: "Umumiy progress" },
  "roadmap.lessonsCompleted": { en: "lessons completed", ru: "уроков завершено", uz: "dars yakunlandi" },
  "roadmap.review": { en: "Review", ru: "Повторить", uz: "Ko'rib chiqish" },
  "roadmap.continue": { en: "Continue", ru: "Продолжить", uz: "Davom ettirish" },
  "roadmap.start": { en: "Start", ru: "Начать", uz: "Boshlash" },
  "roadmap.ofLessonsGenerated": { en: "of", ru: "из", uz: "dan" },
  "roadmap.lessonsGenerated": { en: "lessons generated", ru: "уроков создано", uz: "dars yaratildi" },
  "roadmap.generateNext": { en: "Generate Next Lessons", ru: "Создать следующие уроки", uz: "Keyingi darslarni yaratish" },
  "roadmap.analyzingTopic": { en: "AI is analyzing your topic…", ru: "ИИ анализирует вашу тему…", uz: "Sun'iy intellekt mavzuingizni tahlil qilmoqda…" },
  "roadmap.structuringNext": { en: "Structuring next lessons…", ru: "Структурирование следующих уроков…", uz: "Keyingi darslar tuzilmoqda…" },
  "roadmap.savingLessons": { en: "Saving lessons…", ru: "Сохранение уроков…", uz: "Darslar saqlanmoqda…" },
  "roadmap.generatingBatch": { en: "Generating next batch of lessons…", ru: "Генерация следующей партии уроков…", uz: "Keyingi darslar yaratilmoqda…" },
  "roadmap.fullyPlanned": { en: "Roadmap fully planned", ru: "Дорожная карта полностью спланирована", uz: "Yo'l xaritasi to'liq rejalashtirildi" },

  // ── Credit Alert ──
  "creditAlert.outOfCredits": { en: "Out of credits", ru: "Кредиты закончились", uz: "Kreditlar tugadi" },
  "creditAlert.defaultMsg": {
    en: "You've run out of credits. Top up your balance to continue learning.",
    ru: "Ваши кредиты закончились. Пополните баланс, чтобы продолжить обучение.",
    uz: "Kreditlaringiz tugadi. O'qishni davom ettirish uchun balansni to'ldiring.",
  },
  "creditAlert.topUp": { en: "Top up balance", ru: "Пополнить баланс", uz: "Balansni to'ldirish" },

  // ── Mode Selector ──
  "mode.auto": { en: "Auto", ru: "Авто", uz: "Avto" },
  "mode.math": { en: "Math", ru: "Математика", uz: "Matematika" },
  "mode.language": { en: "Language", ru: "Язык", uz: "Til" },
  "mode.code": { en: "Code", ru: "Код", uz: "Kod" },

  // ── Not Found ──
  "notFound.title": { en: "Oops! Page not found", ru: "Ой! Страница не найдена", uz: "Afsuski! Sahifa topilmadi" },
  "notFound.link": { en: "Return to Home", ru: "Вернуться на главную", uz: "Bosh sahifaga qaytish" },

  // ── Common ──
  "common.error": { en: "Error", ru: "Ошибка", uz: "Xatolik" },
  "common.loading": { en: "Loading...", ru: "Загрузка...", uz: "Yuklanmoqda..." },
  "common.connectionLost": { en: "Connection lost", ru: "Соединение потеряно", uz: "Aloqa uzildi" },
  "common.reconnecting": { en: "Reconnecting to progress updates…", ru: "Переподключение к обновлениям…", uz: "Yangilanishlarga qayta ulanmoqda…" },
  "common.lowCredits": { en: "Low on credits!", ru: "Мало кредитов!", uz: "Kreditlar kamaymoqda!" },
  "common.lowCreditsDesc": { en: "You're running low. Top up soon to continue learning.", ru: "Кредиты заканчиваются. Пополните баланс скорее.", uz: "Kreditlaringiz tugamoqda. Tez orada to'ldiring." },
  "common.generationFailed": { en: "Generation Failed", ru: "Ошибка генерации", uz: "Yaratishda xatolik" },
  "common.generationFailedDesc": { en: "An error occurred during roadmap generation.", ru: "Произошла ошибка при создании дорожной карты.", uz: "Yo'l xaritasini yaratishda xatolik yuz berdi." },

  // ── Roadmap Info ──
  "roadmap.infoTitle": { en: "How it works", ru: "Как это работает", uz: "Bu qanday ishlaydi" },
  "roadmap.infoDesc": {
    en: "To unlock the next lesson, you need to pass the quiz with at least 80% score. This ensures you truly understand each topic before moving forward, building a solid foundation for advanced concepts.",
    ru: "Чтобы открыть следующий урок, необходимо пройти тест с результатом не менее 80%. Это гарантирует, что вы действительно понимаете каждую тему перед продвижением вперёд.",
    uz: "Keyingi darsni ochish uchun testdan kamida 80% natija bilan o'tishingiz kerak. Bu har bir mavzuni to'liq tushunganingizni ta'minlaydi va mustahkam poydevor yaratadi.",
  },

  // ── My Roadmaps ──
  "myRoadmaps.deleteConfirm": { en: "Delete this roadmap?", ru: "Удалить эту дорожную карту?", uz: "Bu yo'l xaritasini o'chirishni xohlaysizmi?" },
  "myRoadmaps.deleteDesc": { en: "This roadmap will be hidden from your list.", ru: "Эта дорожная карта будет скрыта из вашего списка.", uz: "Bu yo'l xaritasi ro'yxatingizdan yashiriladi." },
  "myRoadmaps.delete": { en: "Delete", ru: "Удалить", uz: "O'chirish" },
  "myRoadmaps.cancel": { en: "Cancel", ru: "Отмена", uz: "Bekor qilish" },
  "myRoadmaps.deleted": { en: "Roadmap deleted", ru: "Дорожная карта удалена", uz: "Yo'l xaritasi o'chirildi" },
  "myRoadmaps.deleteFailed": { en: "Failed to delete roadmap", ru: "Ошибка удаления дорожной карты", uz: "Yo'l xaritasini o'chirishda xatolik" },
  "myRoadmaps.enterCode": { en: "Enter the code to confirm", ru: "Введите код для подтверждения", uz: "Tasdiqlash uchun kodni kiriting" },
  "myRoadmaps.areYouSure": { en: "Are you sure you want to delete", ru: "Вы уверены, что хотите удалить", uz: "Haqiqatan ham o'chirmoqchimisiz" },

  // ── Sign out confirmation ──
  "signOut.title": { en: "Sign out?", ru: "Выйти?", uz: "Chiqishni xohlaysizmi?" },
  "signOut.desc": { en: "Are you sure you want to sign out?", ru: "Вы уверены, что хотите выйти?", uz: "Haqiqatan ham chiqmoqchimisiz?" },
  "signOut.confirm": { en: "Sign out", ru: "Выйти", uz: "Chiqish" },
  "signOut.cancel": { en: "Cancel", ru: "Отмена", uz: "Bekor qilish" },

  // ── Language dropdown ──
  "lang.select": { en: "Language", ru: "Язык", uz: "Til" },

  // ── Landing Nav ──
  "landing.navHowItWorks": { en: "How It Works", ru: "Как это работает", uz: "Qanday ishlaydi" },
  "landing.navFeatures": { en: "Features", ru: "Возможности", uz: "Imkoniyatlar" },
  "landing.navPricing": { en: "Pricing", ru: "Тарифы", uz: "Narxlar" },

  // ── Landing Topic Tags ──
  "landing.topicTagsTitle": { en: "Learn Any Topic", ru: "Изучайте любую тему", uz: "Istalgan mavzuni o'rganing" },
  "landing.topicTagsDesc": { en: "From programming to languages, math to science — our AI covers it all.", ru: "От программирования до языков, от математики до науки — наш ИИ покрывает всё.", uz: "Dasturlashdan tillargacha, matematikadan fangacha — bizning SI hammasini qamrab oladi." },

  // ── Landing Comparison ──
  "landing.comparisonTitle": { en: "Why Iqro AI?", ru: "Почему Iqro AI?", uz: "Nima uchun Iqro AI?" },
  "landing.compTraditional": { en: "Traditional Learning", ru: "Традиционное обучение", uz: "An'anaviy ta'lim" },
  "landing.compEdtrack": { en: "Iqro AI", ru: "Iqro AI", uz: "Iqro AI" },
  "landing.comp1Old": { en: "One-size-fits-all curriculum", ru: "Единая программа для всех", uz: "Hammaga bir xil dastur" },
  "landing.comp1New": { en: "Personalized AI roadmaps", ru: "Персонализированные ИИ-карты", uz: "Shaxsiy SI yo'l xaritalari" },
  "landing.comp2Old": { en: "Static textbooks", ru: "Статичные учебники", uz: "Statik darsliklar" },
  "landing.comp2New": { en: "Interactive lessons & playgrounds", ru: "Интерактивные уроки и песочницы", uz: "Interaktiv darslar va sinov maydonlari" },
  "landing.comp3Old": { en: "Fixed-difficulty tests", ru: "Тесты фиксированной сложности", uz: "Bir xil qiyinlikdagi testlar" },
  "landing.comp3New": { en: "Adaptive quizzes that match your level", ru: "Адаптивные тесты под ваш уровень", uz: "Darajangizga mos adaptiv testlar" },
  "landing.comp4Old": { en: "No instant help available", ru: "Нет мгновенной помощи", uz: "Tezkor yordam yo'q" },
  "landing.comp4New": { en: "24/7 AI tutor chat", ru: "ИИ-репетитор 24/7", uz: "24/7 SI repetitor chati" },
  "landing.comp5Old": { en: "Manual progress tracking", ru: "Ручное отслеживание прогресса", uz: "Qo'lda progress kuzatish" },
  "landing.comp5New": { en: "Automatic analytics & insights", ru: "Автоматическая аналитика", uz: "Avtomatik analitika" },

  // ── Landing Pricing Preview ──
  "landing.pricingTitle": { en: "Simple, Transparent Pricing", ru: "Простые и прозрачные тарифы", uz: "Sodda va shaffof narxlar" },
  "landing.pricingDesc": { en: "Start free, upgrade when you need more.", ru: "Начните бесплатно, обновите когда нужно больше.", uz: "Bepul boshlang, kerak bo'lganda yangilang." },
  "landing.pricingFree": { en: "Free", ru: "Бесплатно", uz: "Bepul" },
  "landing.pricingPro": { en: "Pro", ru: "Про", uz: "Pro" },
  "landing.pricingTeam": { en: "Team", ru: "Команда", uz: "Jamoa" },
  "landing.pricingPopular": { en: "Popular", ru: "Популярный", uz: "Ommabop" },
  "landing.pricingFreePrice": { en: "$0/mo", ru: "$0/мес", uz: "$0/oy" },
  "landing.pricingProPrice": { en: "$9/mo", ru: "$9/мес", uz: "$9/oy" },
  "landing.pricingTeamPrice": { en: "$29/mo", ru: "$29/мес", uz: "$29/oy" },
  "landing.pricingFreeF1": { en: "5 roadmaps per month", ru: "5 дорожных карт в месяц", uz: "Oyiga 5 ta yo'l xaritasi" },
  "landing.pricingFreeF2": { en: "Basic AI lessons", ru: "Базовые ИИ-уроки", uz: "Asosiy SI darslari" },
  "landing.pricingFreeF3": { en: "Community access", ru: "Доступ к сообществу", uz: "Hamjamiyatga kirish" },
  "landing.pricingProF1": { en: "Unlimited roadmaps", ru: "Безлимитные дорожные карты", uz: "Cheksiz yo'l xaritalari" },
  "landing.pricingProF2": { en: "Advanced AI tutor", ru: "Продвинутый ИИ-репетитор", uz: "Ilg'or SI repetitor" },
  "landing.pricingProF3": { en: "Priority generation", ru: "Приоритетная генерация", uz: "Ustuvor yaratish" },
  "landing.pricingProF4": { en: "Export & certificates", ru: "Экспорт и сертификаты", uz: "Eksport va sertifikatlar" },
  "landing.pricingTeamF1": { en: "Everything in Pro", ru: "Всё из тарифа Про", uz: "Pro'dagi hamma narsa" },
  "landing.pricingTeamF2": { en: "Team management", ru: "Управление командой", uz: "Jamoa boshqaruvi" },
  "landing.pricingTeamF3": { en: "Shared roadmaps", ru: "Общие дорожные карты", uz: "Umumiy yo'l xaritalari" },
  "landing.pricingTeamF4": { en: "Analytics dashboard", ru: "Панель аналитики", uz: "Analitika paneli" },
  "landing.pricingCta": { en: "Get Started", ru: "Начать", uz: "Boshlash" },

  // ── Landing FAQ ──
  "landing.faqTitle": { en: "Frequently Asked Questions", ru: "Часто задаваемые вопросы", uz: "Ko'p beriladigan savollar" },
  "landing.faqQ1": { en: "Is it really free to start?", ru: "Действительно ли можно начать бесплатно?", uz: "Haqiqatan ham bepul boshlab bo'ladimi?" },
  "landing.faqA1": { en: "Yes! You get 5 free roadmaps per month with basic AI lessons. No credit card required.", ru: "Да! Вы получаете 5 бесплатных дорожных карт в месяц с базовыми ИИ-уроками. Кредитная карта не нужна.", uz: "Ha! Oyiga 5 ta bepul yo'l xaritasi va asosiy SI darslarini olasiz. Kredit karta talab qilinmaydi." },
  "landing.faqQ2": { en: "How does the AI generate lessons?", ru: "Как ИИ создаёт уроки?", uz: "SI darslarni qanday yaratadi?" },
  "landing.faqA2": { en: "Our AI analyzes your topic, breaks it into structured modules, and generates interactive lessons with explanations, code examples, and quizzes — all tailored to your level.", ru: "Наш ИИ анализирует вашу тему, разбивает на структурированные модули и создаёт интерактивные уроки с объяснениями, примерами кода и тестами — всё адаптировано под ваш уровень.", uz: "Bizning SI mavzuingizni tahlil qiladi, tuzilgan modullarga bo'ladi va tushuntirishlar, kod misollari va testlar bilan interaktiv darslar yaratadi — hammasi darajangizga moslashtirilgan." },
  "landing.faqQ3": { en: "What topics can I learn?", ru: "Какие темы можно изучать?", uz: "Qanday mavzularni o'rganish mumkin?" },
  "landing.faqA3": { en: "Anything! Programming, mathematics, languages, science, history, music theory — if it can be taught, our AI can create a roadmap for it.", ru: "Что угодно! Программирование, математика, языки, наука, история, теория музыки — если этому можно научить, наш ИИ создаст дорожную карту.", uz: "Hamma narsani! Dasturlash, matematika, tillar, fan, tarix, musiqa nazariyasi — agar o'rgatish mumkin bo'lsa, bizning SI buning uchun yo'l xaritasi yaratadi." },
  "landing.faqQ4": { en: "Can I use it on mobile?", ru: "Можно ли использовать на мобильном?", uz: "Mobil telefonda ishlatish mumkinmi?" },
  "landing.faqA4": { en: "Absolutely! Iqro AI is fully responsive and works great on phones, tablets, and desktops.", ru: "Конечно! Iqro AI полностью адаптивен и отлично работает на телефонах, планшетах и компьютерах.", uz: "Albatta! Iqro AI to'liq moslashuvchan va telefonlar, planshetlar va kompyuterlarda ajoyib ishlaydi." },
  "landing.faqQ5": { en: "Is my data private and secure?", ru: "Мои данные в безопасности?", uz: "Ma'lumotlarim xavfsizmi?" },
  "landing.faqA5": { en: "Yes. We use encryption for all data in transit and at rest. Your learning progress and personal information are never shared with third parties.", ru: "Да. Мы используем шифрование для всех данных при передаче и хранении. Ваш прогресс и личная информация никогда не передаются третьим лицам.", uz: "Ha. Biz barcha ma'lumotlarni uzatish va saqlashda shifrlashdan foydalanamiz. Sizning progressingiz va shaxsiy ma'lumotlaringiz hech qachon uchinchi tomonlarga berilmaydi." },
} as const;

export type TranslationKey = keyof typeof translations;

function detectSystemLanguage(): Lang {
  const lang = navigator.language?.slice(0, 2)?.toLowerCase();
  if (lang === "ru") return "ru";
  if (lang === "uz") return "uz";
  return "en";
}

interface I18nState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      lang: detectSystemLanguage(),
      setLang: (lang) => {
        set({ lang });
        // Force reload to ensure all components and state refresh with new language
        window.location.reload();
      },
      t: (key) => {
        const entry = translations[key];
        if (!entry) return key;
        const val = entry[get().lang];
        // Only fallback to English if the specific language entry is undefined (allows empty strings)
        return val !== undefined ? val : (entry.en || key);
      },
    }),
    {
      name: "edtrack-lang",
      partialize: (state) => ({ lang: state.lang }),
      onRehydrateStorage: () => (state) => {
        // Re-bind `t` after rehydration since `get()` needs updated lang
        if (state) {
          state.t = (key: TranslationKey) => {
            const entry = translations[key];
            if (!entry) return key;
            const val = entry[state.lang];
            return val !== undefined ? val : (entry.en || key);
          };
        }
      },
    }
  )
);
