# -*- coding: utf-8 -*-
"""Листы 0 и 3-5 для cluster-queries.xlsx: статус работы, новые кластеры, данные Semrush, подсказки Google.

Вызывается из build_clusters.py. Источники: site/cluster-ideas.md (таблицы идей), semrush-keyword-magic-us-2026-11-07.csv,
google-autocomplete-us-2026-11-08.md. Статус и список «что проверить вечером» — внизу этого файла (STATUS, PENDING, CHECKS):
правьте их здесь, и xlsx пересоберётся.
"""
import csv
import math
import os
import re

from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

NAVY, BLUE, LIGHT, GREY, WHITE = "FF1F3864", "FF1F4E8C", "FFDCE8F7", "FF5B6B82", "FFFFFFFF"
thin = Side(style="thin", color="FFBFC9D9")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
F = lambda sz, b=False, c="FF1A1A1A": Font(name="Arial", size=sz, bold=b, color=c)
FILL = lambda c: PatternFill("solid", fgColor=c)
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)
TOPL = Alignment(horizontal="left", vertical="top", wrap_text=True)
KD_FMT = '[<30]"🟢 "0;[<40]"🟡 "0;"🔴 "0'

NEW_0811 = {"vocabulary list maker", "spaced repetition calculator", "kindle vocabulary builder", "duolingo alternatives",
            "ai flashcard generator", "kahoot alternatives", "memrise alternative", "forgetting curve"}
NEW_0911 = {"toefl vocabulary", "jlpt n5 vocabulary", "hiragana flashcards", "most common spanish words",
            "offline flashcard app", "word search maker", "brainscape alternative", "leitner system",
            "spaced repetition schedule", "hangul flashcards", "ielts vocabulary", "gre vocabulary", "vocabulary word search",
            "chatgpt flashcards"}
NEW_1111 = {"how to improve vocabulary"}
NEW_1211 = {"crossword puzzle maker"}


def lines(text, width):
    return sum(max(1, math.ceil(len(p) / width)) for p in str(text).split("\n"))


def put(ws, ref, val, font=None, fill=None, align=None, fmt=None, border=True):
    c = ws[ref]
    c.value = val
    if font: c.font = font
    if fill: c.fill = FILL(fill)
    if align: c.alignment = align
    if fmt: c.number_format = fmt
    if border: c.border = BOX
    return c


def header(ws, row, heads, start_col=2):
    for i, h in enumerate(heads):
        ref = ws.cell(row=row, column=start_col + i).coordinate
        put(ws, ref, h, F(14, True, WHITE), NAVY, CENTER)
    ws.row_dimensions[row].height = 48


def clean(s):
    return re.sub(r"\*\*", "", s).strip()


# ------------------------------------------------------------------ данные о проверке (08.11.2026)
CHECKS = {
    "N1": ("vocabulary list maker 20 / KD n/a; how to make a vocabulary list 40 / KD 4; make your own vocabulary list 20; кластер всего около 140", "проверено: объём почти нулевой"),
    "N4": ("chatgpt flashcards 90 / KD 27; can chatgpt make flashcards 110 / KD 26; chatgpt anki addon 260 / KD 13; make flashcards with chatgpt: ничего не найдено; ai flashcard generator 1 300 / KD 66; ai flashcard generator free 260 / KD 53; what is the best ai flashcard generator 210 / KD 31; кластер около 3 190", "проверено: объём есть, KD высокий"),
    "N8": ("duolingo alternatives 1 900 / KD 21; alternatives to duolingo 590 / KD 21; duolingo alternative 590 / KD 22; кластер около 5 850; memrise alternative 20; brainscape alternatives 20. Anki vs quizlet не проверен; quizizz alternative и wordwall alternative: в Semrush ничего не найдено", "проверено частично: Duolingo хорошо, Memrise мало"),
    "N9": ("forgetting curve 4 400 / KD 57; ebbinghaus forgetting curve 2 900 / KD 7; кластер около 18 770; leitner system 880 / KD 31, leitner method 720 / KD 39, leitner study method 110 / KD 30; spaced repetition schedule 210 / KD 37, spaced repetition timetable 110 / KD 24", "проверено: объём хороший (Лейтнер около 1 800)"),
    "N29": ("kahoot alternatives 1 600 / KD 28; free kahoot alternatives 1 000 / KD 27; кластер около 6 660. Wordwall, Quizizz, Magoosh не проверены (лимит)", "проверено частично: Kahoot хорошо"),
    "N30": ("kindle vocabulary builder 140 / KD 23; vocabulary builder kindle 40 / KD 16; кластер около 560", "проверено: объём малый"),
    "N31": ("spaced repetition calculator 20", "проверено: объём почти нулевой"),
    "N12": ('toefl vocabulary 210 / KD 24 (кластер около 3 540); gre vocabulary 1 300 / KD 35, gre vocab 1 000 / KD 32, gre vocab list 880 / KD 41 (кластер около 2 370 000 в сыром счёте Semrush, реально нужная часть около 5 000); ielts vocabulary 210 / KD 28, vocabulary for ielts 320 / KD 27; sat vocabulary - см. лист 4', 'проверено: GRE самый сильный (около 5 000, KD 27-41), IELTS и TOEFL малы'),
    "N13": ('hiragana flashcards 480 / KD 15; japanese flashcards hiragana 210 / KD 14 (кластер около 1 450); hangul flashcards 210 / KD 20', 'проверено: объём малый, KD низкий'),
    "N37": ("jlpt n5 vocabulary 170 / KD 23; jlpt n5 vocabulary list 170 / KD 20 (кластер около 1 260)", "проверено: объём малый"),
    "N17": ("most common spanish words 1 300 / KD 29; spanish words most common 1 000 / KD 37; 100 most common spanish words 590 / KD 40 (кластер около 9 640)", "проверено: объём хороший, KD средний"),
    "N26": ("offline flashcard app 20 / KD n/a; best offline flashcard app 20 (кластер около 80)", "проверено: объём почти нулевой"),
    "N20": ('word search maker 27 100 / KD 73; word search maker free 5 400 / KD 70; make your own word search 4 400 / KD 8; words search puzzle maker 2 900 / KD 11 (кластер около 93 240); vocabulary word search 110 / KD 15; vocab word search 70 / KD 19', 'проверено: объём огромный, KD высокий; вход через запросы с KD 8-19'),
}
CHECKS["N41"] = ("make a crossword puzzle maker 18 100 / KD 23 (Semrush 12.11.2026)", "проверено: объём большой, KD низкий; на будущее")
DEFAULT_CHECK = ("", "не проверено")

# ------------------------------------------------------------------ что проверить вечером
PENDING = [
    ("flashcard maker no signup (длинные фразы Semrush не находит; flashcard app no ads, flashcards no ads - пусто)", "N25, N3", "us"),
    ("karteikarten app (база de; пустая выдача, перепроверить)", "N40", "de"),
    ("alternative à quizlet (база fr; пусто, для fr искать «quizlet» + слова)", "N40", "fr"),
]

STATUS = [
    ("Что это", [
        "Рабочий файл по SEO-кластерам для сайта приложения Spaced Repetition (spacerepeat.app). Здесь собрано всё, что найдено 07-08.11.2026, "
        "чтобы после потери контекста ничего не пропало. Папка: site/ в репозитории (README.md в ней описывает файлы).",
    ]),
    ("Что сделано", [
        "Лист 2: 37 запросов в 7 кластерах и 15 сабкластерах. Объём и KD (Semrush, США), разбор первой страницы Google США, гипотеза «чем наш сайт лучше».",
        "Лист 1: 10 потребностей, которые закрывает приложение, и страница сайта под каждую.",
        "Лист 3: 4 группы с данными Semrush, но не в листе 2, и 41 новая идея кластеров (N1-N41) из Gemini, ChatGPT, подсказок Google и моих.",
        "Лист 4: все данные Semrush, которые я снял (около 150 строк).",
        "Лист 5: подсказки Google (autocomplete) по 18 тематическим запросам.",
        "Gemini и ChatGPT спрашивал 08.11.2026: им рассказано о приложении и о том, какие кластеры уже есть. Чаты остались в их истории.",
    ]),
    ("Главные выводы на 08.11.2026", [
        "quizlet alternatives: 40 500 в мес., KD 21; в выдаче одни подборки. Лучшая находка.",
        "Сравнения: duolingo alternatives 1 900 / KD 21 (кластер около 5 850), kahoot alternatives 1 600 / KD 28 (около 6 660).",
        "Статья про кривую забывания: ebbinghaus forgetting curve 2 900 / KD 7, forgetting curve 4 400 / KD 57 (кластер около 18 770).",
        "Vocabulary Games: vocabulary games 40 500 / KD 41, лёгкие варианты games and vocabulary 3 600 / KD 13, vocabulary game 880 / KD 9.",
        "Слова по языкам и экзаменам: spanish vocabulary 6 600 / KD 27, sat vocabulary words 4 400 / KD 30 - готовые наборы по странице.",
        "Идеи инструментов оказались слабее, чем говорили ИИ: vocabulary list maker 20 в мес., spaced repetition calculator 20, kindle vocabulary builder 140.",
        "Не по профилю: решатели слов (scramble words 60 500), клоны NYT Spelling Bee, печатные карточки, школьные списки, публичные базы наборов, видеоигры.",
    ]),
    ("Что осталось (вечером, когда обновятся лимиты)", [
        "Три бесплатных аккаунта Semrush израсходованы 08.11.2026. Лимит: 10 запросов в день на аккаунт, по 10 строк на поиск. Окно «You're out of requests» "
        "вместо ошибки показывает «0 результатов», так что 0 при счётчике 10/10 это лимит, а не отсутствие запросов.",
        "Список проверок - таблица ниже (PENDING). Адрес: https://www.semrush.com/analytics/keywordmagic/?q=<запрос с плюсами>&db=us (de, fr для других баз).",
        "Внести найденное в лист 3 (колонки «Проверка Semrush» и «Статус»), в site/data/semrush-keyword-magic-us-2026-11-07.csv (дописать строки) и пересобрать xlsx.",
    ]),
    ("Как снималось (повторить или проверить)", [
        "Объём и KD: Semrush Keyword Magic Tool, база US (Volume US, не глобальный). Из вашего списка (17 запросов) числа взяты как есть; где я нашёл тот же запрос в Magic Tool, взяты свежие.",
        "Первая страница Google США: из Chrome на google.com, запрос /search?q=<запрос>&gl=us&hl=en&num=10&pws=0, парсинг ссылок a>h3; 7-9 ссылок на запрос; тип ссылки размечен вручную по домену и заголовку, страницы не открывались.",
        "Подсказки Google: /complete/search?client=chrome&hl=en&gl=us&q=<зерно> и <зерно> + буква a-z, пауза 350 мс; 18 зёрен, 486 запросов, 5 119 уникальных подсказок. Объёма нет.",
        "Gemini: gemini.google.com/app, ChatGPT: chatgpt.com. Один и тот же английский текст с описанием приложения, списком уже закрытых кластеров и просьбой дать 20 новых с примерами запросов и пометкой слабых.",
    ]),
    ("Оговорки", [
        "Идеи листа 3 без объёмов, кроме строк со статусом «проверено». ИИ сами писали, что их запросы - гипотезы.",
        "Что умеет приложение, взято из README, описания магазина и кода: вставка списка в набор (слово -- перевод, табуляция из таблицы), 15 ступеней, Quiz, Snake, Wordcraft, "
        "нет регистрации и рекламы, офлайн-кэш PWA, синхронизация по коду, озвучка слов голосами системы, интерфейс на десятках языков.",
        "Нет в приложении (по коду): картинок в карточках, слова дня и виджета, захвата слов со страницы в расширении, печати, публичной базы наборов, классов и заданий для учителей.",
        "Не проверено: как приложение рисует иероглифы и хангыль в Snake и Wordcraft; условия и цены конкурентов в сравнениях.",
    ]),
    ("Вопросы владельцу", [
        "Брать ли scramble words (60 500) в план: это решатели, не игра, а объём кластера Word Puzzles раздут именно им.",
        "Строить ли локализованные страницы (немецкий, французский, испанский, хинди): в подсказках Google такие запросы есть (kostenlos, gratuite, que es, kya hai); нужно смотреть объёмы в базах других стран.",
        "Триал Semrush на 7 дней вместо бесплатных аккаунтов: один раз проверить все оставшиеся запросы и взять метрики сразу пачкой по 100 запросов.",
    ]),
    ("Файлы в site/", [
        "cluster-queries.xlsx - этот файл. cluster-ideas.md - то же текстом. README.md - описание папки.",
        "data/semrush-keyword-magic-us-2026-11-07.csv - все выгрузки Semrush (в нём и данные 08.11.2026; дата в листе 4).",
        "data/serp-google-us-2026-11-07.md - первая страница Google по 37 запросам с типами ссылок; data/serp_data.py - те же данные для генератора.",
        "data/google-autocomplete-us-2026-11-08.md - хвосты подсказок. data/build_clusters.py и data/extra_sheets.py - генератор xlsx: python site/data/build_clusters.py.",
    ]),
]


# ------------------------------------------------------------------ разбор md и csv
def parse_ideas(path):
    text = open(path, encoding="utf-8").read()
    rows = []
    sec = None
    for line in text.splitlines():
        m = re.match(r"^## (\d)\.", line)
        if m:
            sec = int(m.group(1))
            continue
        if not line.startswith("|") or line.startswith("|---"):
            continue
        cells = [clean(c) for c in line.strip().strip("|").split("|")]
        if sec == 2 and cells[0] not in ("Кластер",):
            rows.append(("W%d" % (sum(1 for r in rows if r[0].startswith("W")) + 1), cells[0], cells[1], "", "", "", "Semrush (лист 4)", cells[2]))
        elif sec in (3, 6) and re.match(r"N\d+$", cells[0]):
            if sec == 3:
                rows.append(tuple(cells[:8]))
            else:
                rows.append((cells[0], cells[1], cells[2], cells[3], cells[4], cells[5], "AC (подсказки Google)", cells[6]))
    return rows


def parse_ac(path):
    out, seed = [], None
    for line in open(path, encoding="utf-8").read().splitlines():
        if line.startswith("## "):
            seed = line[3:].strip()
        elif seed and " | " in line and not line.startswith("#"):
            for t in line.split(" | "):
                t = t.strip()
                if not t:
                    continue
                full = t[1:-1] if t.startswith("[") and t.endswith("]") else (seed + " " + t)
                out.append((seed, t, full))
    return out


def add_extra(wb, site, serp_queries):
    # --------------- лист 3: новые кластеры
    ws3 = wb.create_sheet("3.Новые кластеры")
    ws3.sheet_view.showGridLines = False
    for col, w in {"A": 2.6, "B": 7, "C": 30, "D": 52, "E": 34, "F": 34, "G": 26, "H": 18, "I": 26, "J": 56, "K": 24}.items():
        ws3.column_dimensions[col].width = w
    ws3["B1"].value = "Новые кластеры: найденные данными и идеи (Gemini, ChatGPT, подсказки Google, мои)"
    ws3["B1"].font = F(24, True, NAVY)
    ws3.row_dimensions[1].height = 44
    ws3["B2"].value = ("W - данные Semrush есть, но запросы не в листе 2 (нет разбора выдачи). N1-N23 - идеи без объёмов, N24-N41 - из подсказок Google. "
                       "Колонка «Проверка Semrush» заполнена только там, где я успел проверить (08.11.2026); остальное ждёт обновления лимитов - см. лист 0.")
    ws3["B2"].font = F(13, False, GREY)
    ws3["B2"].alignment = LEFT
    ws3.merge_cells("B2:K2")
    ws3.row_dimensions[2].height = 52
    header(ws3, 4, ["№", "Кластер", "Примеры запросов / подсказки", "Потребность", "Что в приложении", "Страница", "Источник", "Подходит продукту", "Проверка Semrush", "Статус проверки"])
    rows = parse_ideas(os.path.join(site, "cluster-ideas.md"))
    colors = {"проверено": "FFD8F0DD", "проверено частично": "FFFFF2CC", "не проверено": "FFEDEDED", "данные": "FFD8F0DD"}
    for i, (nid, cl, ex, need, feat, page, src, fit) in enumerate(rows):
        r = 5 + i
        if nid.startswith("W"):
            chk, status = ("данные Semrush: см. лист 4", "данные Semrush есть (лист 4)")
        else:
            chk, status = CHECKS.get(nid, DEFAULT_CHECK)
        vals = [nid, cl, ex, need, feat, page, src, fit, chk, status]
        for j, v in enumerate(vals):
            c = put(ws3, ws3.cell(row=r, column=2 + j).coordinate, v, F(12, j in (0, 1)), WHITE, LEFT if j else CENTER)
        key = "данные" if status.startswith("данные") else ("проверено частично" if "частично" in status else ("не проверено" if status == "не проверено" else "проверено"))
        ws3.cell(row=r, column=11).fill = FILL(colors[key])
        h = max(lines(ex, 50), lines(chk, 24), lines(need, 32), lines(feat, 32), lines(fit, 24)) * 16 + 12
        ws3.row_dimensions[r].height = max(48, h)
    ws3.freeze_panes = "D5"

    # --------------- лист 4: данные Semrush
    ws4 = wb.create_sheet("4.Данные Semrush")
    ws4.sheet_view.showGridLines = False
    for col, w in {"A": 2.6, "B": 32, "C": 52, "D": 16, "E": 12, "F": 12, "G": 16, "H": 22}.items():
        ws4.column_dimensions[col].width = w
    ws4["B1"].value = "Все данные Semrush Keyword Magic Tool (США), что я снял"
    ws4["B1"].font = F(24, True, NAVY)
    ws4.row_dimensions[1].height = 44
    ws4["B2"].value = ("По 10 строк на каждое зерно (ограничение бесплатного аккаунта). Объём - Volume US, поисков в месяц. KD: 🟢 ниже 30, 🟡 30-39, 🔴 40 и выше. "
                       "Интент: I информационный, C коммерческий, N навигационный, T транзакционный, n/a не определён.")
    ws4["B2"].font = F(13, False, GREY)
    ws4["B2"].alignment = LEFT
    ws4.merge_cells("B2:H2")
    ws4.row_dimensions[2].height = 40
    header(ws4, 4, ["Зерно (запрос в Magic Tool)", "Запрос", "Объём в мес.", "KD", "Интент", "Дата снятия", "В листе 2 (разбор выдачи)"])
    csv_path = os.path.join(site, "data", "semrush-keyword-magic-us-2026-11-07.csv")
    with open(csv_path, encoding="utf-8") as fh:
        data = list(csv.DictReader(fh))
    for i, row in enumerate(data):
        r = 5 + i
        kd = int(row["kd"]) if row["kd"].isdigit() else "n/a"
        date = "12.11.2026" if row["seed"] in NEW_1211 else "11.11.2026" if row["seed"] in NEW_1111 else "09.11.2026" if row["seed"] in NEW_0911 else ("08.11.2026" if row["seed"] in NEW_0811 else "07.11.2026")
        vals = [row["seed"], row["keyword"], int(row["volume_us"]), kd, row["intent"], date, "да" if row["keyword"] in serp_queries else ""]
        for j, v in enumerate(vals):
            c = put(ws4, ws4.cell(row=r, column=2 + j).coordinate, v, F(12, j == 1), WHITE, LEFT if j in (0, 1) else CENTER)
            if j == 2: c.number_format = "#,##0"
            if j == 3 and isinstance(v, int): c.number_format = KD_FMT
    ws4.auto_filter.ref = f"B4:H{4 + len(data)}"
    ws4.freeze_panes = "B5"

    # --------------- лист 5: подсказки Google
    ws5 = wb.create_sheet("5.Подсказки Google")
    ws5.sheet_view.showGridLines = False
    for col, w in {"A": 2.6, "B": 28, "C": 40, "D": 60}.items():
        ws5.column_dimensions[col].width = w
    ws5["B1"].value = "Подсказки Google (autocomplete), США, 08.11.2026"
    ws5["B1"].font = F(24, True, NAVY)
    ws5.row_dimensions[1].height = 44
    ws5["B2"].value = ("18 зёрен × 27 вариантов (зерно и зерно + буква a-z), 5 119 уникальных подсказок; здесь по две первые подсказки на вариант, без хвостов про pdf, worksheet, классы. "
                       "Объёма нет: подсказка говорит только о том, что запрос набирают. Хвост в квадратных скобках - подсказка, не начинающаяся с зерна.")
    ws5["B2"].font = F(13, False, GREY)
    ws5["B2"].alignment = LEFT
    ws5.merge_cells("B2:D2")
    ws5.row_dimensions[2].height = 66
    header(ws5, 4, ["Зерно", "Хвост после зерна", "Подсказка целиком"])
    ac = parse_ac(os.path.join(site, "data", "google-autocomplete-us-2026-11-08.md"))
    for i, (seed, tail, full) in enumerate(ac):
        r = 5 + i
        for j, v in enumerate([seed, tail, full]):
            put(ws5, ws5.cell(row=r, column=2 + j).coordinate, v, F(12), WHITE, LEFT)
    ws5.auto_filter.ref = f"B4:D{4 + len(ac)}"
    ws5.freeze_panes = "B5"

    # --------------- лист 0: статус
    ws0 = wb.create_sheet("0.Статус и что дальше", 0)
    ws0.sheet_view.showGridLines = False
    for col, w in {"A": 2.6, "B": 34, "C": 120, "D": 12, "E": 10}.items():
        ws0.column_dimensions[col].width = w
    ws0["B1"].value = "Статус работы и что делать дальше (обновлено 08.11.2026)"
    ws0["B1"].font = F(26, True, NAVY)
    ws0.row_dimensions[1].height = 48
    r = 3
    for title, items in STATUS:
        put(ws0, f"B{r}", title, F(14, True, WHITE), NAVY, LEFT)
        ws0.merge_cells(f"B{r}:C{r}")
        ws0.row_dimensions[r].height = 30
        r += 1
        for it in items:
            put(ws0, f"B{r}", "•", F(13, True, BLUE), WHITE, CENTER)
            put(ws0, f"C{r}", it, F(13), WHITE, LEFT)
            ws0.row_dimensions[r].height = max(24, lines(it, 120) * 17 + 8)
            r += 1
        r += 1
    put(ws0, f"B{r}", "Проверить в Semrush вечером (PENDING)", F(14, True, WHITE), NAVY, LEFT)
    ws0.merge_cells(f"B{r}:E{r}")
    ws0.row_dimensions[r].height = 30
    r += 1
    for h, col in (("Запросы (отдельные поиски в Magic Tool)", "B"), ("Идеи из листа 3", "C"), ("База", "D")):
        put(ws0, f"{col}{r}", h, F(13, True, WHITE), BLUE, CENTER)
    r += 1
    for q, ids, db in PENDING:
        put(ws0, f"B{r}", q, F(13, True), WHITE, LEFT)
        put(ws0, f"C{r}", ids, F(13), WHITE, LEFT)
        put(ws0, f"D{r}", db, F(13), WHITE, CENTER)
        ws0.row_dimensions[r].height = max(24, lines(q, 34) * 17 + 8)
        r += 1
    ws0.freeze_panes = "A2"
