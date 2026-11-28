# Кластеры, которые может закрыть приложение

08.11.2026. Три слоя: (1) кластеры, подтверждённые данными Semrush, (2) данные Semrush, которые я собрал, но ещё не внёс в xlsx,
(3) новые идеи без данных, из них часть от Gemini и ChatGPT. Объёмы — США, Semrush, 07.11.2026 (подробно — `cluster-queries.xlsx`).

Что рассказал о приложении Gemini и ChatGPT (один и тот же текст): работает в браузере (PWA) и как расширение Chrome, без регистрации и
рекламы; свои наборы слов на любом языке; карточки с интервальным повторением (15 ступеней), Quiz, Snake, Wordcraft, скоро поиск слов;
игры и карточки двигают слово по одной лестнице, награды; синхронизация по коду; интерфейс на ~50 языках; и список кластеров, которые у нас уже есть.
Просил 20 новых идей, по каждой кластер, 3-5 запросов, потребность, функцию, тип страницы, и чтобы они сами назвали слабые. Чаты остались в их истории:
«SEO Keyword Ideas for Vocabulary App» (Gemini) и «SEO Ideas for Vocabulary App» (ChatGPT).

## 1. Уже в xlsx, подтверждено Semrush

| Кластер | Сумма запросов в мес. | Главные запросы (объём / KD) | Заметка |
|---|---|---|---|
| Word Puzzles | 80 600 | word scramble game 5 400 / 28; spelling games 8 100 / 40 | 60 500 из них — `scramble words`, это решатели, не игра |
| Flashcard Apps & Alternatives | 48 110 | **quizlet alternatives 40 500 / 21**; quizlet alternative 1 600 / 18 | лучшая находка: выдача — одни подборки |
| Vocabulary Games | 47 220 | vocabulary games 40 500 / 41; games and vocabulary 3 600 / 13; vocabulary game 880 / 9 | основной запрос трудный, лёгкие варианты рядом |
| Vocabulary Apps & Quizzes | 9 140 | free language learning apps 6 600 / 14; vocabulary quiz generator 590 / 18 | в топе обзоры и генераторы тестов |
| Language Games | 6 640 | language games 4 400 / 20; spanish language learning games 720 / 22; japanese ... 590 / 6 | |
| Learning Methods | 6 170 | what is active recall 3 600 / 10; anki spaced repetition 880 / 9; spaced repetition app 880 / 30 | информационные, низкий KD |
| Word Sets by Language & Exam | 1 780 | spanish vocabulary flashcards 1 300 / 29; sat vocabulary flashcards 480 / 26 | см. слой 2: объём гораздо больше |

## 2. Данные есть, в xlsx ещё нет

| Кластер | Запросы (объём / KD) | Заметка |
|---|---|---|
| **Word Lists by Language** (готовые списки слов) | spanish vocabulary 6 600 / 27; spanish vocabulary words 2 900 / 30; vocabulary in spanish 1 600 / 29; spanish vocabulary without translation 1 300 / 15; japanese vocabulary 1 000 / 30; korean vocabulary 880 / 35 | сумма около 14 000; страницы-наборы по языкам, открываются в приложении |
| **Word Lists for Exams** | sat vocabulary 4 400 / 37; sat vocabulary words 4 400 / 30; sat vocabulary list 3 600 / 31; vocabulary for sat 720 / 33; sat vocabulary practice 720 / 21 | сумма около 13 800; нужен готовый набор SAT |
| Vocabulary Games for Students | vocabulary games for students 390 / 20; vocabulary games for adults 390 / 45 | вариации первого кластера |
| How to Build Vocabulary | how to build vocabulary 720 / 32; how to memorize vocabulary 170 / 12 | статьи с интерактивом; входит в кластер «How to Improve Vocabulary» ниже |
| **How to Improve Vocabulary** | how to improve vocabulary 49 500 / 44; how to improve your vocabulary 6 600 / 43; how to expand vocabulary 1 300 / 41; how can i improve vocabulary 1 300 / 41; how to increase vocabulary 1 000 / 46; how to expand your vocabulary 1 000 / 38; how to gain vocabulary 1 000 / 44; how to develop my vocabulary 1 000 / 43; how to improve your vocab 1 000 / 42; how can i expand my english vocabulary 1 000 / 39; how to increase your vocabulary 880 / 44; how to build vocabulary 720 / 47; how to improve my vocabulary 720 / 37 | сумма около 69 700 (16 вариаций одного вопроса, снято 11.11.2026 во вкладке Questions). Это не про игры: человек хочет способ расширить словарь. Один большой хаб-статья с игровым блоком и ссылками на игры; KD 37-47 |

Эти строки лежат в `site/data/semrush-keyword-magic-us-2026-11-07.csv`; в `cluster-queries.xlsx` я оставил только запросы с разметкой выдачи.

## 3. Новые идеи, объёмов пока нет

Источник: **G** — Gemini, **C** — ChatGPT, **я** — моя идея. Если идею дали оба, пишу `G+C`. Подходит ли продукту — моя оценка по коду и описанию магазина.

| № | Кластер | Примеры запросов | Потребность | Что в приложении | Страница | Источник | Подходит |
|---|---|---|---|---|---|---|---|
| N1 | **Vocabulary list maker** | vocabulary list maker; create a vocabulary list online; convert word list to flashcards; make flashcards from word list | Есть список слов, нужно быстро начать учить | Вставка списка в поле набора (строка «слово -- перевод» или табуляция из таблицы) | инструмент: вставь, начни | G+C | высоко |
| N2 | **Custom word games** | make a word game with my own words; create a vocabulary game online; play games with your own word list | Свои слова вместо чужих списков | Свой набор плюс Quiz, Snake, Wordcraft | инструмент + игры | C | высоко |
| N3 | **No-signup, ad-free flashcards** | flashcard maker no signup; free flashcards no account; ad free flashcard app; flashcards without login | Уйти от регистрации и рекламы | Нет регистрации, нет рекламы (по описанию магазина), синхронизация по коду | лендинг + инструмент | G | высоко |
| N4 | **AI-made word lists** | ai flashcard generator; make flashcards with chatgpt; vocabulary list from text with ai; generate vocabulary list ai | Сделать набор из текста или темы нейросетью | В приложении три пути добавить слова, один из них готовая подсказка для ИИ: «выпиши слова с переводами» | инструмент + инструкция | я | высоко, но KD, скорее всего, высокий (проверить) |
| N5 | **Gamified spaced repetition** | spaced repetition games; gamified active recall; anki but gamified; flashcards game | Эффективность интервального повторения без скучных карточек | Одна лестница на карточки и три игры | лендинг | G | высоко |
| N6 | **Word builder from fragments** | word building game online; assemble words from pieces; syllable word game; build words from letter pieces | Нравится собирать слова из частей | Wordcraft | страница-игра | G+C | высоко (Wordcraft режет слово на куски, не обязательно по слогам) |
| N7 | **Snake word game** | snake word game; educational snake game; letter collecting snake game | Аркада плюс учёба | Snake | страница-игра | G+C | средне: «snake word game» может значить игру-цепочку слов, проверить выдачу |
| N8 | **Comparisons with other apps** | duolingo alternatives for vocabulary; memrise alternative; brainscape alternative; anki vs quizlet | Выбрать между приложениями | Свои слова, интервалы, игры, без курса | сравнение | я | средне-высоко |
| N9 | **Memory science** | forgetting curve; leitner system flashcards online; spaced repetition schedule; sm2 algorithm; anki intervals | Понять, как устроено запоминание | 15 ступеней, пример лестницы | статья с интерактивом | я | средне (информационный трафик, KD вероятно низкий) |
| N10 | **Cross-device sync without account** | sync flashcards between devices; flashcards no login phone and laptop; study app without account | Учить на ноутбуке и телефоне | Синхронизация по коду | статья о функции | G | средне |
| N11 | **Specialized vocabulary** | medical terminology flashcards; legal vocabulary flashcards; business english vocabulary; coding terms flashcards | Выучить термины работы или учёбы | Свой набор плюс готовые наборы | библиотека наборов | G | средне, нужны наборы |
| N12 | **More exam word lists** | toefl vocabulary; ielts vocabulary; gre vocabulary; act vocabulary | Подготовка к экзамену | Готовый набор, Quiz | библиотека | G | средне-высоко, нужны наборы |
| N13 | **Non-Latin scripts** | hiragana flashcards; katakana game; hangul flashcards; cyrillic alphabet practice | Выучить письменность | Свои наборы, Snake, Wordcraft | страницы по письменностям | G | средне, проверить показ иероглифов, хангыля, кириллицы |
| N14 | **Bilingual, polyglot** | practice vocabulary in two languages; study two languages at once; multilingual vocabulary app | Учит несколько языков | Любой язык в наборах, интерфейс на ~50 языках | лендинг | G+C | средне |
| N15 | **Learn words from reading** | vocabulary list from a book; learn words from articles; save new words while reading | Слова из книг и статей | Вставка списка из любого источника; захвата слов со страницы в расширении я в коде не видел | статья + инструмент | G+C | средне; идея Gemini про «сохранение слова одним кликом» к текущему приложению не подходит |
| N16 | **Topic and travel words** | travel vocabulary practice; spanish words for travel; food vocabulary spanish; hobby vocabulary | Слова под ситуацию | Готовые наборы (их нужно сделать) | библиотека наборов | C | средне |
| N17 | **Words by frequency** | most common spanish words; top 1000 french words; german frequency list | Начать с самых нужных слов | Готовые наборы | библиотека | я | средне-высоко, объёмы надо смотреть |
| N18 | **Audio flashcards** | audio flashcards; listen and spell game; pronunciation flashcards | Слышать слово | Слова озвучиваются голосами системы | страница функции | G | средне: Gemini считает слабым при отсутствии озвучки, но озвучка есть, проверить качество на языках |
| N19 | **Google Translate saved words** | google translate saved words flashcards; export google translate to flashcards | Перенести слова из переводчика | Путь добавления слов из экспорта Google Translate | инструкция | я | средне, объёмы малы |
| N20 | **Word search** | vocabulary word search; word search maker; word search puzzle online | Поиск слов | Игра «Word search» пока не готова | страница-игра | я | после выхода игры |
| N21 | **Micro-learning** | 5 minute vocabulary practice; quick vocabulary app web; daily word practice | Короткие занятия | Раунд из десяти слов | статья | G | низко-средне |
| N22 | **Achievements and streaks** | flashcard app with achievements; vocabulary game with levels; flashcards with streaks | Мотивация наградами | Награды пока только у змейки | лендинг | G+C | низко: слабый самостоятельный спрос |
| N23 | **Tutors and teachers** | make vocabulary games for students; vocabulary game with teacher word list | Игры по своему списку слов | Набор, который можно вставить | лендинг | C | низко: нет классов и заданий |

## 4. Не по профилю (оба ИИ тоже пометили это слабым)

- **Printable flashcards, worksheets, word search PDF** — приложение интерактивное, печати нет.
- **Школьные списки по классам** (3rd grade spelling и подобное) — нужны огромные готовые библиотеки и разговор про детскую аудиторию.
- **Публичные базы наборов и сообщество** — приложение без аккаунтов, публичной базы нет, обещать её нельзя.
- **Решатели слов** (`scramble words`, `word unscrambler`, `scrabble word finder`) — это не игра и не учёба.
- **Клоны NYT Spelling Bee** — другой жанр.

## 5. Что стоит проверить в Semrush первым делом

1. `vocabulary list maker`, `flashcard maker no signup`, `ad free flashcard app`, `convert word list to flashcards`.
2. `spaced repetition games`, `gamified spaced repetition`, `ai flashcard generator`, `make flashcards with chatgpt`.
3. `duolingo alternatives`, `memrise alternative`, `brainscape alternative`, `anki vs quizlet`.
4. `forgetting curve`, `leitner system`, `spaced repetition schedule`.
5. `most common spanish words`, `toefl vocabulary`, `ielts vocabulary`, `gre vocabulary`, `hiragana flashcards`, `hangul flashcards`.

## Осторожности

- Новые идеи (слой 3) без объёмов и KD. Gemini и ChatGPT честно сказали то же: их запросы это гипотезы, не данные Semrush.
- Подходит ли идея продукту, я оценивал по коду и описанию магазина, но не пробовал каждое действие в приложении.
- ChatGPT привёл примеры сайтов из выдачи (QuizFlex, My Spelling Game, Wordie, Parolina). Я их не проверял.

## 6. Подсказки Google (autocomplete), 08.11.2026

Метод: 18 тематических зёрен × 27 вариантов (зерно и зерно + буква a-z) в Google США, 486 запросов, 5 119 уникальных подсказок.
Всё лежит в `data/google-autocomplete-us-2026-11-08.md` (хвосты после каждого зерна). У подсказок нет объёма: то, что запрос предлагается, значит,
что его набирают, но не сколько. Ниже то, чего не было в слоях 1-3, и что из подсказок я считаю подходящим продукту.

Источник у всех — **AC** (подсказки Google). Номера продолжают слой 3.

| № | Кластер | Подсказки Google | Потребность | Что в приложении | Страница | Подходит |
|---|---|---|---|---|---|---|
| N24 | **Бесплатное приложение без подписки** | vocabulary app: «is it free», «not free», «subscription price», «that is free», «cost»; quizlet alternative: «that is free», «payment plans», «plus alternative» | Человек уже платил или упёрся в платёж и ищет без подписки | Бесплатно, подписки нет | лендинг, сравнение цен | высоко |
| N25 | **Без рекламы и без ИИ** | flashcard app: «no ads», «no ai»; quizlet alternative: «no ai», «no ads»; word games: «no ads», «without ads» | Убрать рекламу и навязанный ИИ | Нет рекламы (по описанию магазина), ИИ только как внешний способ собрать список | лендинг + запросы на каждый вариант | высоко |
| N26 | **Карточки офлайн** | flashcard app: «offline»; quizlet alternative: «offline alternative»; vocabulary app: «offline» | Учить без интернета | PWA с офлайн-кэшем (по README) | страница функции | средне-высоко |
| N27 | **Импорт из Excel и таблиц** | flashcard app: «excel import»; spaced repetition: «excel»; flashcards: «cvs» (не про это) | Перенести свою таблицу | Вставка из таблицы (табуляция) в поле набора | инструмент | высоко; вариант N1 |
| N28 | **Платформы** | flashcard app: «for ipad», «for iphone», «ios», «mac», «pc», «computer», «android», «google» | Нужно приложение под свою систему | PWA и расширение Chrome: везде, где есть браузер | страницы под платформы | средне |
| N29 | **Альтернативы других сервисов** | quizlet alternative: «kahoot alternative», «learn mode», «write mode», «test alternative»; vocabulary builder: «app by magoosh», «merriam webster», «kindle»; vocabulary games: «wordwall», «quizizz», «bamboozle», «kahoot» | Уходят из Kahoot, Wordwall, Quizizz, Magoosh | Свои слова, игры, интервалы | сравнения | средне |
| N30 | **Kindle Vocabulary Builder** | vocabulary builder: «kindle», «kindle app», «in kindle», «in kindle app» | Слова, которые читатель отметил в Kindle, хочет превратить в карточки | Вставка списка в набор | статья-инструкция + инструмент | средне-высоко, новый угол (вариант N15, но с названием сервиса) |
| N31 | **Инструменты интервального повторения** | spaced repetition: «calculator», «calendar», «schedule», «intervals», «graph», «how many days», «tracker», «vs cramming» | Понять и посчитать, когда повторять | Лестница из 15 ступеней | интерактивный калькулятор | высоко: это наш движок |
| N32 | **Интервальное повторение для экзаменов** | spaced repetition: «bar exam», «university»; anki: «mcat», «uworld add on»; active recall: «nursing», «psychology», «biology», «upsc» | Студенты-экзаменуемые | Свой набор терминов | лендинги по аудиториям | низко-средне: приложение про слова и термины |
| N33 | **Active recall: частные запросы** | active recall: «blurting», «vs passive recall», «how does it work», «japanese technique», «for studying», «games» | Понять метод | Карточки и игры как active recall | статьи + интерактив | средне-высоко (рядом с N9) |
| N34 | **Слова по темам, с картинками, в историях** | learn vocabulary: «by topic», «by pictures», «with pictures», «through stories», «with story», «in context»; learn new words: «with pictures» | Запоминать с образами и контекстом | Картинок и историй в карточках я в коде не нашёл | статья | низко, пока нет картинок |
| N35 | **Слова каждый день** | learn new words: «everyday», «daily», «daily app»; vocabulary app: «word of the day», «widget», «lock screen», «notification» | Ежедневная порция | Нет слова дня и виджета | лендинг | низко-средне |
| N36 | **Языки сериями** | learn vocabulary: «dutch», «hebrew», «hindi», «latin», «polish», «russian», «urdu», «vietnamese»; memorize words: «chinese», «german», «japanese», «korean» | Слова для каждого языка | Работает с любым языком | страницы по языкам | средне: нужен объём по каждому языку |
| N37 | **JLPT и тесты уровня** | vocabulary quiz: «n5», «vocabulary test n5», «b1», «c1», «level», «test»; learn vocabulary: «c1», «for ielts» | Проверить уровень, готовиться к JLPT и IELTS | Quiz, готовые наборы | библиотека + тест | средне: нужны наборы |
| N38 | **Игры вроде Wordle** | word games: «like wordle», «similar to wordle», «quordle», «connections», «for seniors», «multiplayer» | Развлечение | Нет такой игры | — | не по профилю, большой объём |
| N39 | **Обучающие видеоигры** | language learning games: «on steam», «steam», «nintendo switch», «ps5», «like chants of sennaar», «video games» | Игры для консолей и Steam | Нет | — | не по профилю |
| N40 | **Версии на других языках** | quizlet alternative: «gratuite», «kostenlos», «alternative zu quizlet»; spaced repetition: «kya hai», «que es»; active recall: «y repetición espaciada», «kya hota hai» | Те же вопросы на французском, немецком, испанском, хинди | Интерфейс на ~50 языках | локализованные страницы | высоко как идея: объёмы смотреть в базах Semrush других стран (de, fr, es, in) |
| N41 | **Конструктор кроссвордов** | crossword puzzle maker: «make a crossword puzzle maker» (объём из Semrush); рядом N20 word search maker | Учителя и родители делают кроссворды из своих слов | Игры «Crossword» пока нет | страница-игра или генератор из набора слов | я | на будущее: 18 100 / KD 23 (Semrush 12.11.2026), как N20 |

### Что из этого главное

1. **N24, N25, N26 — это позиционирование.** Подсказки показывают, что вокруг Quizlet люди спрашивают про цену, рекламу и офлайн: «quizlet alternative that is free», «no ads», «offline alternative». У приложения это три готовых ответа; страницу «альтернатива Quizlet» (кластер 4a) стоит строить под них, а не просто сравнивать функции.
2. **N31 — готовый инструмент.** Калькулятор и расписание интервального повторения живут на нашем же движке: ступени 0, 0, 5 мин, 15 мин, 45 мин, 2 ч, 6 ч, 1 д и так до 240 дней (из `core/srs.js`).
3. **N40 — отдельный пласт.** У приложения интерфейс на десятках языков, а запросы на других языках в подсказках встречаются сразу (`kostenlos`, `gratuite`, `kya hai`). Проверка объёмов в других странах может показать, что там конкуренция слабее, чем в США.
4. **Картинки (N34), слово дня и виджет (N35) — не про наше приложение.** Подсказки их предлагают часто, но реализация сейчас другая.

## 7. Проверка в Semrush, 08.11.2026

Объём — Volume US. Все числа лежат в `data/semrush-keyword-magic-us-2026-11-07.csv` (в нём и данные 08.11.2026) и на листе 4 xlsx.

| Идея | Что нашёл | Вывод |
|---|---|---|
| N1 vocabulary list maker | vocabulary list maker 20; how to make a vocabulary list 40 / KD 4; весь кластер около 140 | объём почти нулевой, хотя оба ИИ ставили идею первой |
| N4 ai flashcard generator | 1 300 / KD 66; ai flashcard generator free 260 / KD 53; кластер около 3 190 | объём есть, KD высокий |
| N8 Duolingo | duolingo alternatives 1 900 / KD 21; alternatives to duolingo 590 / KD 21; кластер около 5 850 | хорошая находка |
| N8 Memrise | memrise alternative 20 | мало |
| N9 forgetting curve | forgetting curve 4 400 / KD 57; **ebbinghaus forgetting curve 2 900 / KD 7**; forget curve 1 600 / KD 50; кластер около 18 770 | статья, лёгкий вариант с Ebbinghaus |
| N29 Kahoot | kahoot alternatives 1 600 / KD 28; free kahoot alternatives 1 000 / KD 27; кластер около 6 660 | хорошо, аудитория — учителя |
| N30 kindle vocabulary builder | 140 / KD 23; vocabulary builder kindle 40 / KD 16; кластер около 560 | мало |
| N31 spaced repetition calculator | 20 | мало |

### Что осталось проверить (после обновления лимитов)

`toefl / ielts / gre vocabulary` (N12), `jlpt n5 vocabulary` (N37), `hiragana flashcards`, `hangul flashcards` (N13), `most common spanish words` (N17),
`offline flashcard app` (N26), `flashcard app no ads`, `flashcard maker no signup` (N25, N3), `word search maker`, `vocabulary word search` (N20),
`brainscape alternative`, `quizizz alternative`, `wordwall alternative` (N8, N29), `leitner system`, `spaced repetition schedule` (N9),
`quizlet alternative` и `karteikarten app` в базе de, `alternative à quizlet` в базе fr (N40), `make flashcards with chatgpt` (N4).
Подробная таблица — лист «0.Статус и что дальше» в `cluster-queries.xlsx`.

## 8. Проверка в Semrush 09.11.2026 (база US)

Проверено семь зёрен, потом лимит снова кончился (на `quizizz alternative`, `wordwall alternative`, `leitner system`, `hangul flashcards` таблица пришла пустой, это не «объёма нет», а нет проверки).

| Идея | Запрос | Объём US / KD | Кластер (сумма) | Вывод |
|---|---|---|---|---|
| N17 | most common spanish words | 1 300 / 29; spanish words most common 1 000 / 37; 100 most common spanish words 590 / 40 | около 9 640 | хороший объём, KD средний |
| N20 | word search maker | 27 100 / 73; make your own word search 4 400 / 8; words search puzzle maker 2 900 / 11 | около 93 240 | огромный объём; вход через запросы с KD 8-11 |
| N13 | hiragana flashcards | 480 / 15; japanese flashcards hiragana 210 / 14 | около 1 450 | малый объём, KD низкий |
| N12 | toefl vocabulary | 210 / 24; toefl vocabulary pdf 110 / 5 | около 3 540 | малый объём |
| N37 | jlpt n5 vocabulary | 170 / 23; jlpt n5 vocabulary list 170 / 20 | около 1 260 | малый объём |
| N26 | offline flashcard app | 20 / n/a | около 80 | почти нет спроса |
| N8 | brainscape alternative | 20 / n/a | около 20 | почти нет спроса |

Осталось проверить: `ielts vocabulary`, `gre vocabulary`, `hangul flashcards`, `flashcard app no ads`, `flashcard maker no signup`, `vocabulary word search`, `quizizz alternative`, `wordwall alternative`, `leitner system`, `spaced repetition schedule`, `make flashcards with chatgpt`, базы de и fr (`quizlet alternative`, `karteikarten app`, `alternative à quizlet`, `application flashcards`).

## 9. Проверка в Semrush на триале, 09.11.2026 (продолжение)

| Идея | Запрос | Объём / KD | Вывод |
|---|---|---|---|
| N12 | gre vocabulary | 1 300 / 35; gre vocab 1 000 / 32; gre vocab list 880 / 41; gre vocab words 880 / 40; flashcards for gre vocabulary 320 / 27 | сильнее TOEFL и IELTS, подходит под страницу «GRE» |
| N12 | ielts vocabulary | 210 / 28; vocabulary for ielts 320 / 27 | малый объём |
| N9 | leitner system | 880 / 31; leitner method 720 / 39; spaced repetition schedule 210 / 37 | около 1 800 вместе, хороший вход |
| N13 | hangul flashcards | 210 / 20 | малый объём |
| N20 | vocabulary word search | 110 / 15; vocab word search 70 / 19 | малый, но лёгкий |
| N4 | chatgpt flashcards | 90 / 27; can chatgpt make flashcards 110 / 26; chatgpt anki addon 260 / 13 | малый |
| N40 | quizlet alternative (DE) | 260 / 17 | небольшой, KD низкий |
| N40 | application flashcards (FR) | 320 / 29; flashcards app 260 / 36 | небольшой |

Ничего не найдено: `quizizz alternative`, `wordwall alternative`, `make flashcards with chatgpt`, `flashcard app no ads`, `flashcards no ads`, `alternative quizlet` (fr). Это значит, что запросов с таким спросом в базе нет. Осталось: `flashcard maker no signup`, `karteikarten app` (de, пустая выдача).

## 10. Запросы на будущее, 12.11.2026 (Semrush, база US)

Добавлено по просьбе владельца из Keyword Magic Tool (скриншоты, колонка Updated: 1 месяц). Два запроса уже были в таблице N20.

| Идея | Запрос | Объём / KD | Вывод |
|---|---|---|---|
| N41 | make a crossword puzzle maker | 18 100 / 23 (намерение I) | новый: объём больше, чем у `word search maker free`, KD низкий; игра «Crossword» из набора слов |
| N20 | make your own word search | 4 400 / 8 | уже учтён (09.11.2026) |
| N20 | words search puzzle maker | 2 900 / 11 | уже учтён (09.11.2026) |
