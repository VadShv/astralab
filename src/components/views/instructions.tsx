"use client";

import * as React from "react";
import {
  BookOpen,
  LayoutDashboard,
  Library,
  GitBranch,
  Code2,
  FlaskConical,
  Rocket,
  ScrollText,
  Orbit,
  Users,
  Search,
  Plus,
  ArrowRight,
  Terminal,
  Tag,
  GitCommitHorizontal,
  Zap,
  TrendingUp,
  ShieldAlert,
  RotateCcw,
  Trophy,
  Gavel,
  Radar,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNav } from "@/lib/nav-store";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "vvedenie", title: "Введение", icon: BookOpen },
  { id: "bystryj-start", title: "Быстрый старт", icon: Zap },
  { id: "komandnyj-centr", title: "CMD-01 · Командный центр", icon: LayoutDashboard },
  { id: "biblioteka", title: "LIB-02 · Библиотека промптов", icon: Library },
  { id: "graf-versij", title: "DAG-03 · Граф версий", icon: GitBranch },
  { id: "konstruktor", title: "EDT-04 · Конструктор промптов", icon: Code2 },
  { id: "testovyj-stend", title: "PLG-05 · Тестовый стенд", icon: FlaskConical },
  { id: "experimenty", title: "EXP-06 · A/B эксперименты", icon: FlaskConical },
  { id: "razvertyvanie", title: "DEP-07 · Карта развёртывания", icon: Rocket },
  { id: "audit", title: "AUD-08 · Журнал аудита", icon: ScrollText },
  { id: "bokovoe-menyu", title: "Боковое меню и Topbar", icon: Orbit },
  { id: "glossarij", title: "Глоссарий терминов", icon: Terminal },
  { id: "scenarii", title: "Типичные сценарии", icon: TrendingUp },
];

export function InstructionsView() {
  const { navigate } = useNav();
  const [active, setActive] = React.useState("vvedenie");
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Подсветка активного раздела при скролле
  React.useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-5">
      {/* Заголовок */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 glass-strong p-6">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-15" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary glow-cyan-sm">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="mono-label">DOC-09 · РУКОВОДСТВО ОПЕРАТОРА</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Инструкция по эксплуатации <span className="text-primary text-glow">Astra HR Lab</span>
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Подробнейшее руководство по всему функционалу космической лаборатории HR-промптов.
              Описаны каждая вкладка, каждая кнопка и каждая функция сервиса.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate("library")}><Library className="mr-1.5 h-4 w-4" /> Библиотека</Button>
              <Button size="sm" variant="outline" onClick={() => navigate("ide")}><Code2 className="mr-1.5 h-4 w-4" /> IDE</Button>
              <Button size="sm" variant="outline" onClick={() => navigate("experiments")}><FlaskConical className="mr-1.5 h-4 w-4" /> A/B</Button>
              <Button size="sm" variant="outline" onClick={() => navigate("deployment")}><Rocket className="mr-1.5 h-4 w-4" /> Развёртывание</Button>
              <Button size="sm" variant="outline" onClick={() => navigate("audit")}><ScrollText className="mr-1.5 h-4 w-4" /> Аудит</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Оглавление */}
        <aside className="hidden lg:block w-[260px] shrink-0">
          <div className="sticky top-20">
            <div className="mono-label mb-2 px-1">ОГЛАВЛЕНИЕ</div>
            <nav className="space-y-0.5">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const isActive = active === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Контент */}
        <div ref={contentRef} className="min-w-0 flex-1 space-y-6">
          <Section id="vvedenie" icon={BookOpen} code="INTRO" title="Введение">
            <p>
              <b>Astra HR Lab</b> — это космическая лаборатория для создания, версионирования,
              тестирования и развёртывания HR-промптов (запросов к большим языковым моделям).
              Сервис работает по принципу <b>«Git для промптов»</b>: каждое изменение промпта
              сохраняется как <b>иммутабельная версия</b> с уникальным content-addressed хэшем,
              поддерживаются ветки, теги и A/B-эксперименты со статистически корректным анализом.
            </p>
            <p>
              Платформа предназначена для HR-команд: рекрутеров, HR-бизнес-партнёров, talent
              acquisition специалистов, которые автоматизируют скрининг резюме, проведение
              интервью, онбординг, performance review и аналитику с помощью LLM.
            </p>
            <Callout type="info" title="Ключевые возможности">
              <ul className="list-disc pl-5 space-y-1">
                <li>Иммутабельные версии промптов с SHA-256 хэшами и semver</li>
                <li>Ветвление (main, dev, experiment/*) и слияние через DAG-визуализацию</li>
                <li>A/B-тесты с power analysis, z-тестом, 95% CI и sequential testing (mSPRT)</li>
                <li>LLM-as-judge — автоматическая оценка качества ответов</li>
                <li>Мгновенный откат (rollback) к любой версии в любом окружении</li>
                <li>Тестовый стенд с реальными вызовами LLM и сравнением версий</li>
              </ul>
            </Callout>
          </Section>

          <Section id="bystryj-start" icon={Zap} code="QUICK" title="Быстрый старт">
            <p>Если вы впервые в системе, выполните эти 5 шагов:</p>
            <Steps
              steps={[
                {
                  title: "Откройте Командный центр (CMD-01)",
                  body: "На главной странице вы увидите сводные KPI за 24 часа, список активных A/B-экспериментов и журнал телеметрии. Ознакомьтесь с состоянием «орбиты».",
                  action: "Нажмите «Командный центр» в боковом меню",
                },
                {
                  title: "Изучите Библиотеку промптов (LIB-02)",
                  body: "Там находятся все 143 HR-промпта. Используйте поиск и фильтры по тегам, чтобы найти нужный (например, «resume-screener-hr»).",
                  action: "Нажмите «Библиотека HR-промптов» в боковом меню",
                },
                {
                  title: "Откройте промпт и посмотрите его граф версий (DAG-03)",
                  body: "Кликните на карточку промпта — откроется направленный ациклический граф всех версий с ветками и тегами.",
                  action: "Кликните на карточку промпта в библиотеке",
                },
                {
                  title: "Протестируйте промпт в Тестовом стенде (PLG-05)",
                  body: "Нажмите «Заполнить примером», затем «Запустить все» — система вызовет реальную LLM и покажет результат. Можно сравнить несколько версий side-by-side.",
                  action: "Откройте «Тестовый стенд» и нажмите «Заполнить примером»",
                },
                {
                  title: "Посмотрите результаты A/B-эксперимента (EXP-06)",
                  body: "Откройте любой запущенный эксперимент — увидите графики, p-value, доверительные интервалы и рекомендацию победителя.",
                  action: "Откройте «A/B эксперименты» → выберите эксперимент",
                },
              ]}
            />
          </Section>

          <Section id="komandnyj-centr" icon={LayoutDashboard} code="CMD-01" title="Командный центр">
            <p>
              Главная сводная страница сервиса. Открывается по умолчанию при запуске. Код раздела:{" "}
              <Mono>CMD-01</Mono>. Открывается кнопкой «Командный центр» в боковом меню (группа «Навигация»).
            </p>

            <SubSection title="Hero-блок «Космическая лаборатория HR-промптов»">
              <p>Большой блок вверху страницы с орбитальной анимацией. Содержит:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Бейдж «ORBIT-7 · HR PROMPT MISSION CONTROL»</b> — индикатор активной миссии.</li>
                <li><b>Заголовок и описание</b> — краткое позиционирование лаборатории.</li>
                <li><b>Кнопка «Открыть библиотеку»</b> — переход в LIB-02.</li>
                <li><b>Кнопка «A/B эксперименты»</b> — переход в EXP-06.</li>
                <li><b>Кнопка «Тестовый стенд»</b> — переход в PLG-05.</li>
                <li><b>4 виджета справа</b>: Промптов на орбите (кол-во версий), A/B миссий (активные эксперименты), В прод-секторе (активных в production), HR-операций/24ч (запросов за сутки).</li>
              </ul>
            </SubSection>

            <SubSection title="Блок «HR-домены лаборатории»">
              <p>4 карточки с основными HR-направлениями. Клик по каждой открывает Библиотеку:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Скрининг резюме</b> — оценка кандидатов против требований вакансии.</li>
                <li><b>Интервью</b> — генерация вопросов, оценка ответов, structured interview.</li>
                <li><b>Онбординг</b> — планы 30/60/90, должностные инструкции, welcome-письма.</li>
                <li><b>Performance</b> — performance review по SBI, OKR, обратная связь.</li>
              </ul>
            </SubSection>

            <SubSection title="Блок «Телеметрия орбиты» — 4 KPI-карточки">
              <p>Техно-карточки с угловыми скобками (corner-brackets). Каждая показывает:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>HR-запросов / 24ч</b> — количество вызовов LLM за сутки через SDK. Дельта в процентах (зелёная ▲ = рост, красная ▼ = падение).</li>
                <li><b>Расход LLM / 24ч</b> — затраты в долларах на токены за сутки.</li>
                <li><b>Токенов / 24ч</b> — суммарно входящих + исходящих токенов.</li>
                <li><b>A/B миссий активно</b> — число запущенных экспериментов.</li>
              </ul>
            </SubSection>

            <SubSection title="Панель «Активные A/B миссии»">
              <p>Список запущенных экспериментов (большая левая панель). Для каждого:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Иконка колбы</b> с циан-свечением.</li>
                <li><b>Название эксперимента</b> и бейдж «running».</li>
                <li><b>Мета-строка</b>: имя промпта, число вариантов, primary-метрика.</li>
                <li><b>Время старта</b> в формате T+ (например, «T+4d ago»).</li>
                <li><b>Кнопка «Все»</b> справа сверху — переход в полный список экспериментов.</li>
              </ul>
              <p><b>Клик по строке</b> открывает детальный дашборд эксперимента (EXP-06).</p>
            </SubSection>

            <SubSection title="Панель «Журнал телеметрии»">
              <p>Правая панель — хронология последних 8 операций (audit timeline). Цветные точки:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Циан</b> — version.activated, version.created, experiment.started.</li>
                <li><b>Красный</b> — rollback.triggered.</li>
                <li><b>Жёлтый</b> — comment.created.</li>
                <li><b>Серый</b> — прочие действия.</li>
              </ul>
              <p>Для каждого события показано: действие (моноширинный шрифт), автор и время.</p>
            </SubSection>

            <SubSection title="Блок «Технологический стек миссии»">
              <p>4 карточки-чипса с ключевыми технологиями. Клик открывает соответствующий раздел:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Content-addressed</b> → Граф версий (DAG-03).</li>
                <li><b>Guardrail-откат</b> → Карта развёртывания (DEP-07).</li>
                <li><b>Sequential testing</b> → A/B эксперименты (EXP-06).</li>
                <li><b>LLM-as-judge</b> → Тестовый стенд (PLG-05).</li>
              </ul>
            </SubSection>
          </Section>

          <Section id="biblioteka" icon={Library} code="LIB-02" title="Библиотека HR-промптов">
            <p>
              Каталог всех промптов проекта. Код: <Mono>LIB-02</Mono>. Открывается кнопкой
              «Библиотека HR-промптов» в боковом меню. Сейчас содержит 143 промпта в 7 категориях
              (HR-лаборатория, Маркетинг, Разработка, Бизнес, Образование, Креатив, Профессиональные услуги).
            </p>

            <SubSection title="Заголовок и счётчик">
              <p>Вверху — заголовок «Библиотека промптов» и строка «N промптов · иммутабельные версии с content-addressed хэшами».</p>
            </SubSection>

            <SubSection title="Кнопка «Новый промпт»">
              <p>Справа сверху. Открывает диалоговое окно создания промпта:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Имя</b> — уникальное в рамках проекта, kebab-case (например, <Mono>resume-screener-hr</Mono>).</li>
                <li><b>Описание</b> — что делает промпт.</li>
                <li><b>Теги</b> — через запятую (например, <Mono>hr, recruiting, screening</Mono>).</li>
                <li><b>Модель по умолчанию</b> — выбирается из списка моделей, настроенных в разделе <b>«Настройки»</b> (SET-10).</li>
                <li>Кнопка <b>«Создать»</b> — сохраняет промпт, создаёт ветку <Mono>main</Mono>, показывает toast «Промпт создан».</li>
                <li>Кнопка <b>«Отмена»</b> — закрывает диалог без сохранения.</li>
              </ul>
            </SubSection>

            <SubSection title="Поиск по имени">
              <p>Поле ввода слева с иконкой лупы. Фильтрует промпты по подстроке в имени (например, «interview» покажет все промпты с этим словом).</p>
            </SubSection>

            <SubSection title="Фильтры по тегам">
              <p>Ряд кнопок-чипов под поиском. Кнопка «все» сбрасывает фильтр. Остальные — теги (например, <Mono>hr</Mono>, <Mono>recruiting</Mono>, <Mono>seo</Mono>, <Mono>code</Mono>). Клик фильтрует библиотеку по выбранному тегу. Повторный клик — сбрасывает.</p>
            </SubSection>

            <SubSection title="Карточки промптов">
              <p>Сетка карточек (1-3 колонки в зависимости от ширины). Каждая карточка:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Имя промпта</b> (моноширинный, циан) и <b>бейдж semver</b> активной prod-версии справа сверху.</li>
                <li><b>Описание</b> (2 строки, остальное обрезается).</li>
                <li><b>Теги</b> — до 3 штук маленькими бейджами.</li>
                <li><b>3 статистики</b>: версий (GitBranch), тестов (FlaskConical), окружений (Rocket).</li>
                <li><b>Модель</b> и <b>время обновления</b> (например, «обновлён 5d ago»).</li>
              </ul>
              <p><b>Клик по карточке</b> открывает Граф версий (DAG-03) этого промпта.</p>
            </SubSection>

            <SubSection title="Пустое состояние">
              <p>Если промптов нет (или фильтр ничего не нашёл) — показывается заглушка с иконкой, текстом и кнопкой «Новый промпт».</p>
            </SubSection>

            <Callout type="tip" title="Совет">
              Теги — мощный способ навигации. HR-промпты помечены тегом <Mono>hr</Mono>, промпты для интервью — <Mono>interview</Mono>, для онбординга — <Mono>onboarding</Mono>. Комбинируйте поиск и фильтры для быстрого поиска.
            </Callout>
          </Section>

          <Section id="graf-versij" icon={GitBranch} code="DAG-03" title="Граф версий">
            <p>
              Git-подобная визуализация истории версий промпта в виде направленного ациклического
              графа (DAG). Код: <Mono>DAG-03</Mono>. Открывается кликом по карточке промпта в библиотеке
              или кнопкой «Граф версий» в боковом меню (после выбора промпта).
            </p>

            <SubSection title="Шапка промпта">
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Кнопка «←»</b> — возврат в библиотеку.</li>
                <li><b>Имя промпта</b> (моноширинный, циан) и бейдж статуса.</li>
                <li><b>Описание</b> промпта.</li>
                <li><b>Кнопка «Песочница»</b> — переход в Тестовый стенд с этим промптом.</li>
                <li><b>Кнопка «Новая версия»</b> — переход в Конструктор (EDT-04) для создания новой версии.</li>
              </ul>
            </SubSection>

            <SubSection title="Легенда веток">
              <p>Строка с цветными точками и именами веток. Цвета соответствуют линиям в графе:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" /> <Mono>main</Mono> — основная ветка (продакшн).</li>
                <li><span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-1" /> <Mono>dev</Mono> — ветка разработки.</li>
                <li><span className="inline-block h-2 w-2 rounded-full bg-cyan-500 mr-1" /> <Mono>experiment/*</Mono> — экспериментальные ветки.</li>
              </ul>
              <p>Справа — счётчик: «N коммитов · M веток».</p>
            </SubSection>

            <SubSection title="SVG-граф DAG">
              <p>Главная визуализация. Состоит из двух частей:</p>
              <p><b>Слева — рельсы (rail):</b> вертикальные линии по одной на ветку, с цветовой кодировкой. Узлы (кружки) на пересечениях. Активная версия пульсирует кольцом. Кривые Безье соединяют родительские и дочерние версии на разных ветках.</p>
              <p><b>Справа — карточки коммитов:</b> для каждой версии:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Semver</b> (например, 1.1.0) и <b>короткий хэш</b> (7 символов SHA-256).</li>
                <li><b>Сообщение коммита</b> — описание изменения.</li>
                <li><b>Автор</b> (аватар с инициалами), <b>ветка</b>, <b>время</b> (например, «14d ago»).</li>
                <li><b>Теги</b> — жёлтые бейджи (например, <Mono>stable</Mono>, <Mono>v1.0.0</Mono>).</li>
                <li><b>Бейдж статуса</b>: draft / review / active / deprecated.</li>
              </ul>
              <p><b>Клик по узлу или карточке</b> открывает Конструктор (EDT-04) с этой версией.</p>
            </SubSection>

            <Callout type="info" title="Статусы версий (lifecycle)">
              <ul className="list-disc pl-5 space-y-1">
                <li><b>draft</b> — черновик, редактируется, недоступен в production.</li>
                <li><b>review</b> — заморожен, ожидает аппрува.</li>
                <li><b>active</b> — активная версия на ветке (единственная или несколько при A/B).</li>
                <li><b>deprecated</b> — снята с production, хранится в истории.</li>
                <li><b>rejected</b> — отклонена при ревью.</li>
              </ul>
            </Callout>
          </Section>

          <Section id="konstruktor" icon={Code2} code="EDT-04" title="Конструктор промптов">
            <p>
              Редактор версии промпта с split-view: слева — редакторы системного и пользовательского
              сообщений, справа — вкладки превью, переменных, конфига модели и diff. Код: <Mono>EDT-04</Mono>.
              Открывается кнопкой «Конструктор промптов» в боковом меню, «Новая версия» в графе, или
              кликом по версии в DAG.
            </p>

            <SubSection title="Шапка редактора">
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Кнопка «←»</b> — возврат к графу версий.</li>
                <li><b>Имя промпта</b> и бейдж статуса версии.</li>
                <li><b>Мета</b>: semver, короткий хэш, автор, время.</li>
                <li><b>Кнопка «Тест в песочнице»</b> (для существующей версии) — переход в PLG-05.</li>
                <li><b>Кнопка «Форкнуть и редактировать»</b> — создаёт новую версию на основе текущей.</li>
                <li><b>Кнопка «Закоммитить версию»</b> — сохраняет новую версию (активна когда заполнены system и commit message).</li>
              </ul>
            </SubSection>

            <SubSection title="Левая колонка — редакторы">
              <p><b>Карточка «Ветка» и «Версия (bump)»:</b></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Ветка</b> — выпадающий список существующих веток + «новая ветка…».</li>
                <li><b>Версия (bump)</b> — тип semver-инкремента: patch (0.0.x), minor (0.x.0), major (x.0.0).</li>
              </ul>
              <p><b>«Системное сообщение»</b> — большой textarea с моноширинным шрифтом. Содержит роль, инструкции, формат вывода. Счётчик символов справа.</p>
              <p><b>«Шаблон пользовательского сообщения»</b> — textarea с шаблоном, использующим переменные <Mono>{`{{variable}}`}</Mono> и loops <Mono>{`{{#items}}...{{/items}}`}</Mono>.</p>
              <p><b>«Сообщение коммита»</b> — input для описания изменения (обязательно для коммита).</p>
            </SubSection>

            <SubSection title="Правая колонка — вкладки">
              <p><b>Вкладка «Превью»</b> — рендер шаблонов с подсветкой переменных (циан-токены <span className="var-token">{`{{var}}`}</span>). Разделы «система» и «пользователь».</p>
              <p><b>Вкладка «Переменные»</b> — управление объявленными переменными:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Кнопка <b>«Добавить»</b> — добавляет новую переменную.</li>
                <li>Для каждой: <b>имя</b> (input), <b>тип</b> (string/number/boolean/object), чекбокс <b>«обяз.»</b> (required).</li>
                <li>Кнопка <b>«🗑»</b> — удалить переменную.</li>
              </ul>
              <p><b>Вкладка «Конфиг»</b> — слайдеры параметров модели:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>temperature</b> (0–2) — креативность/детерминированность.</li>
                <li><b>top_p</b> (0–1) — nucleus sampling.</li>
                <li><b>max_tokens</b> (64–4096) — лимит длины ответа.</li>
              </ul>
              <p><b>Вкладка «Diff»</b> — построчный diff (как <Mono>git diff</Mono>) между текущей версией и её родительской. Зелёные строки — добавлены, красные — удалены. Отдельно для system и user. Также показывает изменение modelConfig.</p>
            </SubSection>

            <SubSection title="Режимы работы">
              <p><b>Просмотр (read-only):</b> при открытии существующей версии. Поля заблокированы, активны кнопки «Тест в песочнице» и «Форкнуть и редактировать».</p>
              <p><b>Редактирование:</b> после нажатия «Форкнуть и редактировать» или при создании новой версии. Поля доступны, активна кнопка «Закоммитить версию».</p>
            </SubSection>

            <SubSection title="Коммит версии">
              <p>При нажатии «Закоммитить версию»:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Вычисляется SHA-256 хэш от нормализованного содержимого.</li>
                <li>Если хэш совпадает с существующей версией — возвращается она (toast «Идентичное содержимое — использована существующая версия»).</li>
                <li>Иначе создаётся новая версия с semver-инкрементом, обновляется head ветки.</li>
                <li>Записывается audit log «version.created».</li>
                <li>Toast «Закоммичено 1.1.0», переход в граф версий.</li>
              </ol>
            </SubSection>
          </Section>

          <Section id="testovyj-stend" icon={FlaskConical} code="PLG-05" title="Тестовый стенд (Playground)">
            <p>
              Интерактивный стенд для тестирования промптов с реальными вызовами LLM. Код:{" "}
              <Mono>PLG-05</Mono>. Открывается кнопкой «Тестовый стенд» в боковом меню.
              <b>Важно:</b> запросы из песочницы не учитываются в production-метриках.
            </p>

            <SubSection title="Шапка стенда">
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Заголовок «Песочница»</b> и описание.</li>
                <li><b>Выпадающий список промптов</b> — выбор промпта для тестирования.</li>
                <li><b>Кнопка «Запустить все»</b> — запускает LLM-вызов для всех выбранных версий одновременно.</li>
              </ul>
            </SubSection>

            <SubSection title="Блок «Переменные»">
              <p>Поля ввода для каждой объявленной переменной промпта. Типы полей:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>string</b> — textarea (1-4 строки в зависимости от переменной).</li>
                <li><b>object</b> — textarea с моноширинным шрифтом (ожидается JSON-массив).</li>
                <li><b>number</b> — input.</li>
                <li><b>boolean</b> — checkbox.</li>
              </ul>
              <p>Метка каждой переменной показывает <Mono>{`{{имя}}`}</Mono>, тип и звёздочку (*) если required.</p>
              <p><b>Кнопка «Заполнить примером»</b> — автоматически заполняет все поля релевантными данными (умная эвристика по имени переменной: resume → пример резюме, requirements → массив, и т.д.).</p>
            </SubSection>

            <SubSection title="Селектор версий для сравнения">
              <p>Строка «Сравнение:» с бейджами выбранных версий. Каждая версия — бейдж с semver и веткой, кнопка «×» для удаления.</p>
              <p><b>Выпадающий список «добавить версию»</b> — добавляет ещё одну версию для side-by-side сравнения (до 10 одновременно, но визуально удобно 2-4).</p>
            </SubSection>

            <SubSection title="Колонки вывода">
              <p>Каждая выбранная версия — отдельная карточка:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Шапка</b>: иконка сравнения, semver, ветка.</li>
                <li><b>Кнопка «Выполнить»</b> — запускает LLM-вызов только для этой версии.</li>
                <li><b>Область вывода</b>: pre-блок с ответом LLM (моноширинный, скролл). Пока ждём — «Вызов LLM…». Если пусто — «Запустите, чтобы увидеть вывод».</li>
                <li><b>Метрики</b>: время (мс), токены (входящие+исходящие), стоимость (~$).</li>
                <li><b>Кнопка «LLM-as-judge»</b> — запускает LLM-оценку качества ответа.</li>
              </ul>
            </SubSection>

            <SubSection title="LLM-as-judge">
              <p>При нажатии «LLM-as-judge» вызывается отдельная LLM, которая оценивает ответ по критериям релевантности, точности и тона. Возвращает:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>PASS</b> (зелёный) или <b>FAIL</b> (красный) бейдж.</li>
                <li><b>Причина</b> — одно предложение с обоснованием.</li>
              </ul>
              <p>Это та же механика, что используется в production-экспериментах для метрики <Mono>eval_pass_rate</Mono>.</p>
            </SubSection>

            <Callout type="tip" title="Совет по сравнению версий">
              Добавьте 2 версии (например, control с main и variant с experiment-ветки), заполните переменные, нажмите «Запустить все» — и сравните ответы side-by-side. Это лучший способ решить, стоит ли запускать A/B-тест.
            </Callout>
          </Section>

          <Section id="experimenty" icon={FlaskConical} code="EXP-06" title="A/B эксперименты">
            <p>
              Статистически корректное A/B-тестирование промптов на живом трафике. Код:{" "}
              <Mono>EXP-06</Mono>. Открывается кнопкой «A/B эксперименты» в боковом меню. Два режима:
              список экспериментов и детальный дашборд.
            </p>

            <SubSection title="Список экспериментов">
              <p><b>Заголовок</b> «Эксперименты» и описание.</p>
              <p><b>Кнопка «Новый эксперимент»</b> — открывает диалог создания:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Название</b> — имя эксперимента.</li>
                <li><b>Гипотеза</b> — что и почему проверяем.</li>
                <li><b>Контрольная версия</b> — выпадающий список версий промпта (control).</li>
                <li><b>Версия-претендент</b> — версия для сравнения (variant_a).</li>
                <li><b>Основная метрика</b> — eval_pass_rate / latency / cost_per_request / error_rate.</li>
                <li>Кнопки <b>«Отмена»</b> и <b>«Создать»</b>.</li>
              </ul>
              <p><b>Фильтр по промптам</b> — кнопки-чипы с именами промптов. Показывает эксперименты выбранного промпта.</p>
              <p><b>Карточки экспериментов</b>: название, бейдж статуса (running/paused/concluded/draft), гипотеза, метрика, split (50/50), число вариантов, время старта. <b>Клик</b> открывает дашборд.</p>
            </SubSection>

            <SubSection title="Детальный дашборд эксперимента">
              <p><b>Шапка</b>: кнопка «←», название, бейдж статуса, гипотеза, мета (primary-метрика, confidence, число событий, время старта).</p>
              <p><b>Кнопки управления</b>:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>«Пауза»</b> — приостановить эксперимент (status → paused).</li>
                <li><b>«Возобновить»</b> — продолжить паузенный.</li>
                <li><b>«Продвинуть победителя»</b> — завершить эксперимент и сделать variant_a активной версией в production (появляется когда есть winner).</li>
              </ul>
            </SubSection>

            <SubSection title="Баннер победителя">
              <p>Зелёная карточка с иконкой кубка. Появляется когда есть статистически значимый победитель без нарушений guardrail-метрик. Показывает имя варианта и причину (например, «variant_a показывает +12.7% uplift на eval_pass_rate (p&lt;0.001) со всеми guardrails в норме»).</p>
            </SubSection>

            <SubSection title="Баннер guardrail-нарушения">
              <p>Жёлтая карточка с иконкой щита. Появляется когда guardrail-метрика (например, latency_p95 &gt; 1200ms) нарушена. Показывает, какие варианты нарушили, и рекомендует паузу или откат.</p>
            </SubSection>

            <SubSection title="Панель «Размер выборки и мощность»">
              <p>Прогресс-бар и метрики power analysis:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>MDE 3% · мощность 80% · доверие 95%</b> — параметры расчёта.</li>
                <li><b>Счётчик</b>: «N / M на вариант» — собрано / нужно на каждый вариант.</li>
                <li><b>Прогресс</b>: «X% нужной выборки собрано».</li>
                <li>Когда 100% — «✓ достаточная мощность».</li>
              </ul>
            </SubSection>

            <SubSection title="График «Накопительный eval_pass_rate»">
              <p>Линейный график (recharts) — скользящее среднее primary-метрики по вариантам во времени. Цвета соответствуют вариантам. Пунктирная линия — baseline control. Ось X — время, ось Y — доля (0-100%). Легенда снизу.</p>
            </SubSection>

            <SubSection title="Таблица «Статистическое сравнение»">
              <p>Таблица с результатами z-теста / t-теста:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Вариант</b> — имя.</li>
                <li><b>Доля</b> — rate для control и variant.</li>
                <li><b>Прирост</b> — uplift в % (зелёный если положительный, красный если отрицательный).</li>
                <li><b>95% ДИ</b> — доверительный интервал разницы.</li>
                <li><b>p-value</b> — с звёздочками значимости (*** p&lt;0.001, ** p&lt;0.01, * p&lt;0.05). Жирным если significant.</li>
              </ul>
              <p>Заголовок таблицы показывает тип теста: «two-proportion z-test» (для бинарных метрик) или «Welch's t-test» (для непрерывных).</p>
            </SubSection>

            <SubSection title="Панель «Метрики вариантов»">
              <p>Для каждого варианта: цветная точка, имя, и набор метрик:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>n</b> — выборка.</li>
                <li><b>доля</b> — primary-метрика.</li>
                <li><b>p95</b> — 95-й перцентиль задержки.</li>
                <li><b>стоим.</b> — средняя стоимость запроса.</li>
                <li><b>tok</b> — суммарные токены.</li>
              </ul>
            </SubSection>

            <SubSection title="Панель «Guardrail-метрики»">
              <p>Список guardrail-правил с состояниями:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Имя метрики (например, <Mono>latency_p95</Mono>), операция (max), порог.</li>
                <li>Значения по вариантам.</li>
                <li>Бейдж «ок» (зелёный) или «нарушено» (красный).</li>
              </ul>
            </SubSection>

            <SubSection title="Панель «Sequential testing (mSPRT)»">
              <p>Always-valid p-value для ранней остановки эксперимента без раздувания α:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Always-valid p-value</b> — текущее значение (зелёным если &lt; 0.01).</li>
                <li>Зелёный блок <b>«✓ Можно останавливать — данные в пользу X»</b> — если достигнута значимость.</li>
                <li><b>Шкала LLR</b> (log-likelihood ratio) по вариантам — чем больше, тем сильнее доказательство.</li>
              </ul>
            </SubSection>

            <Callout type="info" title="Что такое sequential testing?">
              Классический A/B-тест требует фиксированного размера выборки. Если проверять p-value каждый день, вероятность ложного вывода растёт (multiple peeking). Sequential testing (mixture SPRT) — это always-valid-метод: можно проверять в любой момент без потери статистической корректности. Позволяет остановить эксперимент раньше, если уже ясно.
            </Callout>
          </Section>

          <Section id="razvertyvanie" icon={Rocket} code="DEP-07" title="Карта развёртывания">
            <p>
              Матрица «промпт × окружение» с активными версиями и операциями promote/rollback.
              Код: <Mono>DEP-07</Mono>. Открывается кнопкой «Карта развёртывания» в боковом меню.
            </p>

            <SubSection title="Заголовок">
              <p>«Карта развёртывания» и описание: «Активная версия на каждое окружение. Продвигайтесь dev → staging → prod или откатывайтесь мгновенно.»</p>
            </SubSection>

            <SubSection title="Таблица-матрица">
              <p>Колонки: Промпт | Разработка | Staging | Продакшн | Пайплайн. Строки — по одной на промпт.</p>
              <p><b>Заголовки колонок окружений</b> с цветными точками: Разработка (cyan), Staging (amber), Продакшн (emerald).</p>
            </SubSection>

            <SubSection title="Ячейки окружений">
              <p>Если версия активна в окружении:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Semver</b> (цветной, например, зелёный 1.0.0 для продакшна) с зелёной галочкой.</li>
                <li><b>Кто активировал</b> и <b>когда</b> (например, «кем: Елена · 5d ago»).</li>
                <li><b>Выпадающий список «продвинуть…»</b> — выбрать версию для промоута в это окружение.</li>
                <li><b>Кнопка «↻» (откат)</b> — открыть диалог отката.</li>
              </ul>
              <p>Если не активна — иконка сервера и выпадающий список «задеплоить…».</p>
            </SubSection>

            <SubSection title="Колонка «Пайплайн»">
              <p>Визуальный пайплайн: 3 точки (по окружению) со стрелками между ними. Заполненная точка = версия активна в окружении. Позволяет быстро оценить, насколько промпт «пробежал» конвейер dev → staging → prod.</p>
            </SubSection>

            <SubSection title="Диалог отката (rollback)">
              <p>При нажатии кнопки «↻» открывается alert-диалог:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Заголовок</b>: «Откатить {`{имя промпта}`} в {`{окружение}`}?»</li>
                <li><b>Описание</b>: «Мгновенно вернуться к предыдущей версии. Сработает webhook-событие.»</li>
                <li><b>Кнопка «Отмена»</b> — закрыть без действий.</li>
                <li><b>Кнопка «Откатить сейчас»</b> — выполняет rollback: активирует предыдущую версию, пишет audit log «rollback.triggered», показывает toast «Откат к 1.0.0».</li>
              </ul>
            </SubSection>

            <SubSection title="Промоут версии">
              <p>При выборе версии в выпадающем «продвинуть…»:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Версия становится активной в выбранном окружении.</li>
                <li>Записывается audit log «version.activated».</li>
                <li>Toast «Версия продвинута».</li>
              </ol>
            </SubSection>
          </Section>

          <Section id="audit" icon={ScrollText} code="AUD-08" title="Журнал аудита">
            <p>
              Хронологическая запись всех операций в проекте: кто, что и когда изменил. Код:{" "}
              <Mono>AUD-08</Mono>. Открывается кнопкой «Журнал аудита» в боковом меню.
            </p>

            <SubSection title="Заголовок">
              <p>«Журнал аудита» и описание: «Хронологическая запись: кто, что и когда изменил.»</p>
            </SubSection>

            <SubSection title="Фильтры по действиям">
              <p>Ряд кнопок-чипов с именами действий:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>all</b> — все события.</li>
                <li><b>version.created</b> — создание версии.</li>
                <li><b>version.activated</b> — активация версии в окружении.</li>
                <li><b>version.status_changed</b> — смена статуса версии.</li>
                <li><b>rollback.triggered</b> — откат.</li>
                <li><b>experiment</b> — эксперименты (started/paused/concluded).</li>
                <li><b>tag</b> — операции с тегами.</li>
                <li><b>comment</b> — комментарии.</li>
                <li><b>prompt.created</b> — создание промпта.</li>
              </ul>
              <p>Клик фильтрует журнал. «all» — сброс.</p>
            </SubSection>

            <SubSection title="Список событий">
              <p>Карточка с разделителями. Для каждого события:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Аватар автора</b> с инициалами (цвет = цвет пользователя).</li>
                <li><b>Имя автора</b> (или «система»).</li>
                <li><b>Бейдж действия</b> (моноширинный, например, <Mono>version.created</Mono>).</li>
                <li><b>Тип цели</b> (prompt_version, experiment, tag, и т.д.).</li>
                <li><b>Дата-время</b> и относительное время (например, «5d ago»).</li>
                <li><b>Детали</b> (моноширинный) — например, <Mono>semver=1.1.0 branch=main</Mono>.</li>
                <li><b>Цветная точка</b> справа (тон действия): циан/красный/жёлтый/серый.</li>
              </ul>
            </SubSection>
          </Section>

          <Section id="bokovoe-menyu" icon={Orbit} code="SHELL" title="Боковое меню и Topbar">
            <p>Глобальные элементы интерфейса, видны во всех разделах.</p>

            <SubSection title="Боковое меню (Sidebar)">
              <p><b>Бренд «ASTRA HR LAB»</b> — вверху, с орбитальным логотипом (вращающееся кольцо с спутником). Под названием — «v2.0 · orbit active».</p>
              <p><b>HR-сектор</b> — панель с радаром:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Иконка пользователя, имя организации (Astra HR) и проекта (HR-орбита).</li>
                <li>3 индикатора: ПРОМПТЫ, В ПРОДЕ, A/B.</li>
                <li>Статус-строка: «ORBIT STABLE · N оп/24ч» с пульсирующей точкой.</li>
              </ul>
              <p><b>Навигация</b> — сгруппирована по 4 группам:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Навигация</b>: Командный центр, Библиотека HR-промптов, Инструкция.</li>
                <li><b>Разработка</b>: Граф версий, Конструктор промптов, Тестовый стенд.</li>
                <li><b>Исследование</b>: A/B эксперименты.</li>
                <li><b>Релиз</b>: Карта развёртывания, Журнал аудита.</li>
              </ul>
              <p>Каждый пункт — кнопка с иконкой, именем и техно-кодом (CMD-01, LIB-02...). Активный пункт подсвечен циан-рамкой с левой полосой.</p>
              <p><b>Меню пользователя</b> — внизу. Аватар «ЕВ», имя «Елена Васкес», роль «HR-админ · L4». Клик открывает dropdown: Профиль оператора, API-ключи, Настройки сектора, Выйти.</p>
            </SubSection>

            <SubSection title="Верхняя панель (Topbar)">
              <p>Sticky-панель сверху:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Гамбургер-меню</b> (мобилка) — открывает сайдбар.</li>
                <li><b>Breadcrumb</b>: Astra HR Lab → код раздела → имя раздела.</li>
                <li><b>Поиск</b> «Поиск по орбите HR-промптов…» (на десктопе).</li>
                <li><b>LIVE-индикатор</b> — мигающий значок активности.</li>
                <li><b>Кнопка «Новый HR-промпт»</b> — переход в библиотеку для создания.</li>
              </ul>
            </SubSection>

            <SubSection title="Статус-бар (Footer)">
              <p>Sticky-полоса внизу:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>ORBIT NOMINAL</b> — пульсирующая точка, все системы работают.</li>
                <li><b>Serving P99 &lt; 200ms</b> — метрика латентности.</li>
                <li><b>N оп/24ч</b> — запросы за сутки.</li>
                <li><b>prod-активно: N</b> — промптов в продакшене.</li>
                <li><b>A/B запущено: N</b> — активных экспериментов.</li>
                <li><b>astra-hr-lab v2.0.0 · orbit-build 2026.07.11</b> — версия сборки.</li>
              </ul>
            </SubSection>
          </Section>

          <Section id="glossarij" icon={Terminal} code="GLOSS" title="Глоссарий терминов">
            <p>Ключевые понятия, которые встречаются в интерфейсе:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Term term="Content-addressed хэш" def="SHA-256 от нормализованного содержимого промпта. Одинаковое содержимое → одинаковый хэш → переиспользование версии." />
              <Term term="Semver" def="Семантическая версия MAJOR.MINOR.PATCH (например, 1.2.3). Patch — фиксы, Minor — обратно-совместимые изменения, Major — ломающие." />
              <Term term="Ветка (branch)" def="Параллельная линия разработки. main — продакшн, dev — разработка, experiment/* — эксперименты." />
              <Term term="Тег (tag)" def="Именованная ссылка на версию (например, stable, v1.0.0, hotfix-2026-07)." />
              <Term term="DAG" def="Directed Acyclic Graph — направленный ациклический граф истории версий. Версии — узлы, parent-child — рёбра." />
              <Term term="Окружение (environment)" def="development, staging, production. У каждого — своя активная версия промпта." />
              <Term term="Promote" def="Продвижение версии в окружение (dev → staging → prod)." />
              <Term term="Rollback" def="Мгновенный откат к предыдущей версии в окружении." />
              <Term term="A/B-эксперимент" def="Сравнение 2+ версий промпта на живом трафике со статистическим анализом." />
              <Term term="Control / Variant" def="Control — базовая версия. Variant (variant_a, variant_b) — претендент." />
              <Term term="Primary-метрика" def="Главная метрика эксперимента (eval_pass_rate, latency, cost_per_request, error_rate)." />
              <Term term="Guardrail-метрика" def="Метрика-ограничитель (например, latency_p95 ≤ 1200ms). Нарушение → авто-пауза или откат." />
              <Term term="eval_pass_rate" def="Доля ответов, прошедших LLM-as-judge оценку. Главная метрика качества." />
              <Term term="LLM-as-judge" def="Автоматическая оценка ответа LLM другой LLM по критериям (релевантность, точность, тон)." />
              <Term term="Power analysis" def="Расчёт минимального размера выборки для обнаружения эффекта (MDE) с заданной мощностью (1-β) и доверительным уровнем." />
              <Term term="MDE" def="Minimum Detectable Effect — минимальный эффект, который эксперимент способен обнаружить." />
              <Term term="p-value" def="Вероятность увидеть такой эффект при нулевой гипотезе. <0.05 — значимо." />
              <Term term="95% CI" def="95% доверительный интервал разницы. Если не включает 0 — значимо." />
              <Term term="Sequential testing (mSPRT)" def="Always-valid метод (mixture SPRT) для ранней остановки эксперимента без раздувания α." />
              <Term term="Uplift" def="Относительное улучшение variant над control, в %." />
              <Term term="Hot-reload" def="Применение новой активной версии без redeploy приложения (SDK кеширует с TTL)." />
              <Term term="Circuit breaker" def="В SDK: при недоступности API — fallback к последнему закешированному промпту." />
              <Term term="Sticky assignment" def="Один user_id всегда получает одну версию в A/B-эксперименте." />
              <Term term="152-ФЗ" def="Федеральный закон РФ о персональных данных. HR-промпты соблюдают — не раскрывают ПД без необходимости." />
            </div>
          </Section>

          <Section id="scenarii" icon={TrendingUp} code="USE" title="Типичные сценарии">
            <p>Пошаговые руководства для частых задач.</p>

            <SubSection title="Сценарий 1: Создать новый HR-промпт с нуля">
              <Steps
                steps={[
                  { title: "Откройте Библиотеку (LIB-02)", body: "Боковое меню → «Библиотека HR-промптов».", action: undefined },
                  { title: "Нажмите «Новый промпт»", body: "Заполните имя (kebab-case), описание, теги, модель. Нажмите «Создать».", action: undefined },
                  { title: "Откройте промпт", body: "Кликните на карточку — откроется граф версий (пока пустой).", action: undefined },
                  { title: "Нажмите «Новая версия»", body: "Откроется Конструктор (EDT-04).", action: undefined },
                  { title: "Заполните системное и пользовательское сообщения", body: "Опишите роль, инструкции, формат вывода. Используйте {{переменные}}.", action: undefined },
                  { title: "Объявите переменные", body: "Вкладка «Переменные» — добавьте все нужные переменные с типами.", action: undefined },
                  { title: "Настройте modelConfig", body: "Вкладка «Конфиг» — temperature, top_p, max_tokens.", action: undefined },
                  { title: "Напишите commit message и нажмите «Закоммитить версию»", body: "Создастся версия 1.0.0 на ветке main.", action: undefined },
                  { title: "Протестируйте в Тестовом стенде (PLG-05)", body: "Заполните переменные, запустите, проверьте ответ.", action: undefined },
                  { title: "Продвиньте в production", body: "Карта развёртывания (DEP-07) → выберите версию в «продвинуть…» для Продакшн.", action: undefined },
                ]}
              />
            </SubSection>

            <SubSection title="Сценарий 2: Запустить A/B-тест двух версий промпта">
              <Steps
                steps={[
                  { title: "Создайте variant-версию", body: "В Конструкторе форкните active-версию на ветку experiment/*, измените промпт, закоммитьте.", action: undefined },
                  { title: "Откройте A/B эксперименты (EXP-06)", body: "Боковое меню → «A/B эксперименты».", action: undefined },
                  { title: "Нажмите «Новый эксперимент»", body: "Укажите название, гипотезу, control-версию (main), variant (experiment), primary-метрику. Создайте.", action: undefined },
                  { title: "Запустите эксперимент", body: "В карточке эксперимента смените статус на running (через API или развитие интерфейса).", action: undefined },
                  { title: "Мониторьте дашборд", body: "Следите за графиком, p-value, мощностью, guardrails. Sequential testing подскажет, когда можно остановиться.", action: undefined },
                  { title: "Продвиньте победителя", body: "Когда есть значимый winner без guardrail-нарушений — нажмите «Продвинуть победителя». Variant станет active в production, эксперимент → concluded.", action: undefined },
                ]}
              />
            </SubSection>

            <SubSection title="Сценарий 3: Откатить проблемную версию в production">
              <Steps
                steps={[
                  { title: "Откройте Карту развёртывания (DEP-07)", body: "Боковое меню → «Карта развёртывания».", action: undefined },
                  { title: "Найдите проблемный промпт", body: "В строке промпта, колонка «Продакшн».", action: undefined },
                  { title: "Нажмите кнопку «↻» (откат)", body: "Откроется диалог подтверждения.", action: undefined },
                  { title: "Нажмите «Откатить сейчас»", body: "Активируется предыдущая версия, запишется audit log, придёт toast «Откат к X.Y.Z».", action: undefined },
                  { title: "Проверьте в Журнале аудита (AUD-08)", body: "Фильтр rollback.triggered — увидите запись с деталями (откуда → куда).", action: undefined },
                ]}
              />
            </SubSection>

            <SubSection title="Сценарий 4: Сравнить две версии промпта side-by-side">
              <Steps
                steps={[
                  { title: "Откройте Тестовый стенд (PLG-05)", body: "Боковое меню → «Тестовый стенд».", action: undefined },
                  { title: "Выберите промпт", body: "Выпадающий список вверху.", action: undefined },
                  { title: "Добавьте 2 версии для сравнения", body: "В строке «Сравнение:» нажмите «добавить версию» и выберите variant.", action: undefined },
                  { title: "Заполните переменные", body: "Нажмите «Заполнить примером» или введите вручную.", action: undefined },
                  { title: "Нажмите «Запустить все»", body: "LLM вызовется для обеих версий, ответы появятся в параллельных колонках.", action: undefined },
                  { title: "Сравните метрики и ответы", body: "Время, токены, стоимость — под каждым ответом. Нажмите «LLM-as-judge» для оценки качества.", action: undefined },
                ]}
              />
            </SubSection>

            <Callout type="tip" title="Финальный совет">
              Astra HR Lab — мощный инструмент, но статистика требует дисциплины. Не принимайте решений по эксперименту с &lt; 100 событий на вариант. Дождитесь 100% мощности или sequential-значимости. И всегда проверяйте guardrail-метрики — рост качества ценой 2x латентности часто не стоит того.
            </Callout>
          </Section>

          {/* Подвал инструкции */}
          <Card className="border-primary/20 glass p-6 text-center">
            <div className="mono-label mb-2">КОНЕЦ РУКОВОДСТВА</div>
            <p className="text-sm text-muted-foreground">
              Документ охватывает все вкладки, кнопки и функции Astra HR Lab v2.0.
              Для обновлений следите за журналом аудита и toast-уведомлениями.
            </p>
            <p className="mt-2 font-mono text-xs text-primary/60">
              astra-hr-lab · DOC-09 · orbit-build 2026.07.11
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============ Вспомогательные компоненты ============ */

function Section({
  id,
  icon: Icon,
  code,
  title,
  children,
}: {
  id: string;
  icon: React.ElementType;
  code: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <Card className="border-primary/15 glass p-6">
        <div className="mb-4 flex items-center gap-3 border-b border-primary/10 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="mono-label">{code}</div>
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          </div>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
          {children}
        </div>
      </Card>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <ChevronRight className="h-4 w-4 text-primary" />
        {title}
      </h3>
      <div className="space-y-2 pl-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[12px] text-primary border border-primary/20">
      {children}
    </code>
  );
}

function Callout({
  type,
  title,
  children,
}: {
  type: "info" | "tip";
  title: string;
  children: React.ReactNode;
}) {
  const styles =
    type === "info"
      ? "border-primary/25 bg-primary/5"
      : "border-emerald-500/25 bg-emerald-500/5";
  const Icon = type === "info" ? Orbit : Zap;
  return (
    <div className={cn("rounded-lg border p-4", styles)}>
      <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function Steps({
  steps,
}: {
  steps: { title: string; body: string; action?: string }[];
}) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-xs font-semibold text-primary">
            {i + 1}
          </div>
          <div className="flex-1 space-y-1">
            <div className="text-sm font-medium text-foreground">{s.title}</div>
            <div className="text-sm text-muted-foreground">{s.body}</div>
            {s.action && (
              <div className="flex items-center gap-1.5 text-xs text-primary">
                <ArrowRight className="h-3 w-3" />
                {s.action}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Term({ term, def }: { term: string; def: string }) {
  return (
    <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
      <div className="font-mono text-xs font-semibold text-primary">{term}</div>
      <div className="mt-1 text-xs text-muted-foreground">{def}</div>
    </div>
  );
}
