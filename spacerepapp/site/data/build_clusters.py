# -*- coding: utf-8 -*-
"""Собирает site/cluster-queries.xlsx и site/data/serp-google-us-2026-11-07.md.

    python site/data/build_clusters.py

Запросы, объёмы и KD — внизу этого файла (CLUSTERS). Данные первой страницы Google — serp_data.py.
Формат листа с кластерами повторяет образец howtorelax.now_final.xlsx (лист 3.Кластеры).
"""
import math
import os
import sys

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

sys.path.insert(0, os.path.dirname(__file__))
from serp_data import SERP  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
DATE = "07.11.2026"

# ------------------------------------------------------------------ данные
# (кластер, [(сабкластер, [(запрос, объём US, KD или None, откуда, гипотеза)])])
# откуда: "список" — из вашего списка (Semrush), "Semrush" — найден в Keyword Magic Tool 07.11.2026
# Для запросов из вашего списка, которые я нашёл и в Magic Tool, число взято из Magic Tool (свежее):
# vocabulary games, vocabulary word games, spaced repetition app, vocabulary building apps, language learning games.
CLUSTERS = [
    ("Vocabulary Games", [
        ("Vocabulary Games", [
            ("vocabulary games", 40500, 41, "список",
             "В топе браузерные игры и мини-игры (Merriam-Webster, Knoword, Flocabulary, Ba Ba Dum) и подборки для учителей; слова в играх заданы издателем, свои добавить нельзя.\nНаш сайт: Snake, Wordcraft и Quiz на словах самого человека, а забываемые слова возвращаются по лестнице интервалов - тренировка, а не разовая игра."),
            ("games and vocabulary", 3600, 13, "Semrush",
             "В топе те же игры Merriam-Webster, Flocabulary, Knoword и подборки для классов. Запрос — вариант основного, его лучше закрыть той же страницей.\nНаш сайт: одна страница со всеми играми приложения, запуск сразу, прогресс по словам запоминается."),
            ("vocabulary game", 880, 9, "Semrush",
             "В топе одиночные игры (Merriam-Webster, Knoword, Flocabulary, Freerice) и приложение Magoosh; чаще викторина с вариантами ответа.\nНаш сайт: Quiz с тем же механизмом, но варианты и сложность растут вместе со ступенью слова, а слова свои."),
            ("vocabulary games online free", 480, 26, "Semrush",
             "Почти вся выдача - бесплатные игры в браузере (Dictionary.com, Merriam-Webster, Wordgametime, Knoword, Vocab Ninja).\nНаш сайт: бесплатно, без регистрации, играть можно сразу со страницы; несколько разных игр, а не одна форма."),
        ]),
        ("Vocabulary Word Games", [
            ("vocabulary word games", 1300, 12, "список",
             "В топе игровые порталы Merriam-Webster, Dictionary.com, MindGames, Knoword, British Council; игры на английских списках, без повторения.\nНаш сайт: любой язык и свои слова, а Quiz, Snake и Wordcraft двигают слово по ступеням интервалов."),
            ("vocabulary word games online", 320, 42, "список",
             "Только игровые порталы (Merriam-Webster, MindGames, Dictionary.com, Wordwall, AARP, Freerice): играть можно сразу, но на чужих словах.\nНаш сайт: игра открывается на странице без регистрации, а слова можно заменить своими за минуту."),
            ("vocabulary word games for adults", 140, 57, "список",
             "В топе игровые порталы для взрослых (Merriam-Webster, AARP, Dictionary.com), форум Reddit и приложение-кроссворд; общая лексика, не из вашей области.\nНаш сайт: свои слова - термины работы, иностранный язык, подготовка к экзамену; без детского оформления."),
        ]),
    ]),
    ("Language Games", [
        ("Language Games (general)", [
            ("language games", 4400, 20, "список",
             "Выдача разнородная: философский термин (Wikipedia), игры для класса, Ba Ba Dum, Digital Dialects, IXL. Запрос расплывчатый.\nНаш сайт: страница-обзор «игры для изучения слов иностранного языка» с запуском игры на странице; в приложении интерфейс на десятках языков."),
            ("language learning games", 590, 31, "список",
             "В топе Ba Ba Dum, Digital Dialects, Noun Town, приложения Drops и Lingo Legend, Reddit; все привязаны к своим словам и языкам.\nНаш сайт: игры на тех словах, которые человек выбрал сам, на любом языке; в браузере и как расширение Chrome."),
            ("learn language game", 20, None, "список",
             "В топе приложения, которые надо ставить (Lingo Legend, Influent, Duolingo), и Ba Ba Dum с Noun Town в браузере. Запрос мелкий.\nНаш сайт: игра открывается в браузере сразу, ничего ставить не нужно; закрывается страницей предыдущего запроса."),
        ]),
        ("Games by Language", [
            ("spanish language learning games", 720, 22, "список",
             "В топе игровые сайты для школьников (Pandatree, Digital Dialects, Let's Speak Spanish, PBS Kids, Conjuguemos) с готовыми уровнями.\nНаш сайт: игры на испанских словах, которые выбрал сам человек (поездка, работа, экзамен), со звуком: слова озвучиваются голосом системы."),
            ("japanese language learning games", 590, 6, "список",
             "Слабая выдача (KD 6): Digital Dialects, Lingual Ninja, Tanoshii Japanese, Marumori и игры в Steam и App Store.\nНаш сайт: игры на японских словах, введённых самим человеком; нужна проверка, как приложение показывает иероглифы в играх, прежде чем писать страницу."),
            ("korean language learning games", 320, 19, "список",
             "В топе мини-игры (Delicious Korean, Digital Dialects, Fun4TheBrain, Ekvis) и приложения; игры на готовых списках.\nНаш сайт: игры на корейских словах человека; нужна такая же проверка с хангылем, как с японским."),
        ]),
    ]),
    ("Word Puzzles", [
        ("Word Scramble", [
            ("scramble words", 60500, 24, "Semrush",
             "В топе сплошь решатели: человек вводит буквы и получает слова (Wordunscrambler, Word.tips, Scrabble Word Finder); игр почти нет.\nНаш сайт: не решатель, а игра «собери слово из кусочков» (Wordcraft). Запрос про решение, а не про игру: ловить его можно только если сознательно отдать страницу под решатель, что приложению не по профилю."),
            ("word scramble game", 5400, 28, "Semrush",
             "В топе игры в браузере (USA Today, AARP, Arkadium, Cambridge, MindGames): общие английские слова, без учёбы.\nНаш сайт: Wordcraft собирает слово из частей, с ростом ступени частей больше и появляются лишние кусочки; игра идёт на словах, которые человек выучивает."),
        ]),
        ("Spelling Games", [
            ("spelling games", 8100, 40, "Semrush",
             "В топе Merriam-Webster «Spell It», Spelling Training, NYT Spelling Bee, школьные игры и приложения.\nНаш сайт: Wordcraft тренирует написание слов, в том числе иностранных, на своём списке; для школьников будет мало серьёзных отличий."),
            ("spelling bee games", 6600, 28, "Semrush",
             "В топе клоны NYT Spelling Bee (Spellbee, Spellsbee, Lessgames) и сам NYT: игра на буквах дня, не на выучиваемых словах.\nНаш сайт: другой жанр, закрывается только частично (Wordcraft). Низкий приоритет."),
        ]),
    ]),
    ("Flashcard Apps & Alternatives", [
        ("Quizlet Alternatives", [
            ("quizlet alternatives", 40500, 21, "Semrush",
             "В топе подборки (Teachfloor, QuestionPro, Flint, Scholarly, Riseguide, Mitti), Reddit r/languagelearning и продукт Knowt; прямой интерактив почти не встречается.\nНаш сайт: страница «альтернатива Quizlet для слов» с честной таблицей (что бесплатно, нет рекламы, интервальное повторение, игры, синхронизация по коду без аккаунта) и кнопкой «попробовать сразу»."),
            ("quizlet alternative", 1600, 18, "Semrush",
             "Те же подборки и Knowt, Reddit; запрос в единственном числе - человек выбирает одну замену.\nНаш сайт: закрывается страницей про «quizlet alternatives»; добавить блок «если вам нужны именно слова и их повторение»."),
            ("free quizlet alternative", 1600, 17, "Semrush",
             "В топе те же подборки и сравнение Jungle vs Quizlet; ответ у всех - «Knowt, Anki, Brainscape».\nНаш сайт: акцент «бесплатно и без подписки для слов», с пояснением, какие функции за деньгами у конкурентов (проверить на их страницах перед публикацией)."),
        ]),
        ("Flashcard Apps", [
            ("flashcard app", 2400, 61, "список",
             "В топе страницы приложений в магазинах (Quizlet, AnkiDroid, Anki, Brainscape, Flashcard maker) - сильные бренды, KD 61.\nНаш сайт: прямо конкурировать за запрос трудно; взять хвосты («with spaced repetition», «for vocabulary») и показать карточки на странице без регистрации."),
            ("flashcards app", 1900, 63, "список",
             "Выдача почти совпадает с «flashcard app»: те же магазины и Brainscape.\nНаш сайт: закрыть той же страницей, что и предыдущий запрос."),
        ]),
        ("Anki Alternatives", [
            ("anki alternatives", 110, 7, "Semrush",
             "В топе одни подборки (RemNote, Boterview, Voovo, Taalhammer, Scholarly, Kachika), Reddit и YouTube; объём мал, KD 7.\nНаш сайт: подборку легко взять страницей «Anki alternative для слов»: у нас интервальное повторение уже настроено (15 ступеней) и есть игры, не нужны надстройки."),
        ]),
    ]),
    ("Learning Methods", [
        ("Spaced Repetition Apps", [
            ("spaced repetition app", 880, 30, "список",
             "В топе страницы приложений (Spaced Repetition, SmartCards+, RemNote, Anki), Reddit и подборки.\nНаш сайт: страница «приложение для интервального повторения» с лестницей ступеней и демонстрацией, где игры тоже двигают слово по ступеням."),
            ("spaced repetition apps", 210, 41, "список",
             "Подборки и приложения: Taalhammer для языков, Mochi, RemNote, Reddit.\nНаш сайт: закрывается страницей предыдущего запроса и блоком сравнения."),
            ("flashcard app spaced repetition", 320, 42, "список",
             "В топе приложения (Spaced Repetition, SmartCards+, Mochi, Noji, Brainscape) и Reddit.\nНаш сайт: та же страница; в заголовке и на первом экране сказать «карточки с интервальным повторением»."),
            ("anki spaced repetition", 880, 9, "Semrush",
             "В топе сайт Anki, Reddit, научные статьи (PMC) и объяснения алгоритма. Человек хочет понять, как Anki повторяет.\nНаш сайт: статья «как работает интервальное повторение» с нашей лестницей ступеней и честным сравнением с Anki."),
        ]),
        ("Active Recall", [
            ("what is active recall", 3600, 10, "Semrush",
             "В топе университетские страницы, Reddit, YouTube (Cal Newport) и сайт activerecall.com; почти всё статьи.\nНаш сайт: объяснение на три минуты и интерактив: пример карточки, ответить, увидеть, как слово вернётся. Само приложение - пример active recall."),
            ("active recall app", 110, 0, "список",
             "В топе приложения активного вспоминания (Active Recall, Qsets, Gizmo, Ovido) и подборки (Kenznote, Leapahead); конкуренция слабая, KD 0.\nНаш сайт: страница «Active recall app» с игрой на странице вместо описания."),
        ]),
        ("Memorizing Vocabulary", [
            ("how to memorize vocabulary", 170, 12, "Semrush",
             "В топе только статьи и форумы (Reddit, EF, UNC, Pimsleur, Art of Memory).\nНаш сайт: статья с блоком «сделай сейчас»: мини-набор из десяти слов и один раунд Snake или Quiz."),
        ]),
    ]),
    ("Vocabulary Apps & Quizzes", [
        ("Vocabulary & Language Apps", [
            ("free language learning apps", 6600, 14, "Semrush",
             "В топе обзоры (PCMag, Polychat, Hellonabu), Reddit и приложения Duolingo и Mondly. Человек выбирает приложение, а не слово.\nНаш сайт: сравнение «чем мы отличаемся от Duolingo»: у нас нет курса, но есть тренировка слов, которые человек выбрал сам. Подборку как жанр не писать - она нужна, чтобы ловить трафик, но слабо совпадает с продуктом."),
            ("vocabulary building apps", 880, 26, "список",
             "В топе магазины и обзоры (Vocabulary Builder, WordUp, Vocabulary.com, Penguen, Polychat), Reddit.\nНаш сайт: страница для тех, кто расширяет словарный запас в своей области: свои слова, интервалы, игры."),
        ]),
        ("Vocabulary Quizzes", [
            ("vocabulary quiz generator", 590, 18, "Semrush",
             "В топе генераторы тестов (Wordsmyth, QuizCraft, Jotform, Canva, Typeform): преподаватель вводит слова и получает тест.\nНаш сайт: Quiz из слов набора без настройки; варианты ответов берутся из того же набора, а число вариантов растёт со ступенью слова."),
            ("vocabulary quiz maker", 590, 29, "Semrush",
             "Та же выдача: Wordsmyth, QuizCraft, Essaygrader, TeachQuill, Jotform, Canva.\nНаш сайт: закрывается страницей предыдущего запроса; в заголовке «quiz maker»."),
            ("spanish vocabulary quiz", 480, 31, "Semrush",
             "В топе готовые викторины (HowStuffWorks, Quiz-Tree, SpanishDict, Sporcle, JetPunk, Lenguia).\nНаш сайт: готовый набор частых испанских слов открывается как Quiz и дальше повторяется по ступеням."),
        ]),
    ]),
    ("Word Sets by Language & Exam", [
        ("Ready-Made Sets", [
            ("spanish vocabulary flashcards", 1300, 29, "Semrush",
             "В топе Quizlet, Rosetta Stone, Flashcardo, StudyStack и магазины - готовые наборы.\nНаш сайт: страница с готовым набором частых испанских слов, который открывается в приложении и повторяется по ступеням (кандидат на серию страниц по языкам)."),
            ("sat vocabulary flashcards", 480, 26, "Semrush",
             "В топе Quizlet, Manhattan Review, Magoosh, Crackd, Uworld, Amazon и Reddit.\nНаш сайт: готовый набор для SAT, который открывается в приложении (кандидат на серию страниц по экзаменам)."),
        ]),
    ]),
]

# На каждом уровне от большего объёма к меньшему (как в образце)
CLUSTERS = [(cl, [(sub, sorted(qs, key=lambda x: -x[1])) for sub, qs in subs]) for cl, subs in CLUSTERS]
CLUSTERS = [(cl, sorted(subs, key=lambda sq: -sum(x[1] for x in sq[1]))) for cl, subs in CLUSTERS]
CLUSTERS.sort(key=lambda cs: -sum(x[1] for _, qs in cs[1] for x in qs))

# ------------------------------------------------------------------ потребности (лист 1)
NEEDS = [
    # потребность, как ищут (кластер), что в приложении, страница (идея), анкор, приоритет, пояснение
    ("Хочу выучить слова, но обычные карточки надоели - нужна игра",
     "Vocabulary Games", "Snake, Wordcraft, Quiz; награды за результат", "/vocabulary-games",
     "vocabulary games", 1, "Самый большой объём (40 500) и естественное совпадение с продуктом. Основной запрос трудный (KD 41), поэтому страница строится на лёгких вариантах «games and vocabulary», «vocabulary game», «vocabulary word games» (KD 9-13)."),
    ("Ушёл с Quizlet (платный, много рекламы), ищу бесплатную замену для слов",
     "Flashcard Apps & Alternatives", "Карточки с интервальным повторением, Quiz, игры; без регистрации; синхронизация по коду", "/quizlet-alternative",
     "quizlet alternatives", 1, "Лучшая находка: 40 500 в месяц при KD 21, а в выдаче только подборки и ни одного интерактива. Нужна честная таблица сравнения и сразу рабочий набор на странице."),
    ("Хочу, чтобы слова не забывались: интервальное повторение и active recall",
     "Learning Methods", "Лестница из 15 ступеней, игры двигают слово по ступеням", "/spaced-repetition-app",
     "spaced repetition app", 2, "Объёмы малые, но KD низкий у информационных запросов («what is active recall» 3 600 / KD 10, «anki spaced repetition» 880 / KD 9). Хорошо работает как поддержка основного сайта и ссылки на приложение."),
    ("Хочу практиковать слова конкретного языка (испанский, японский, корейский) в игре",
     "Language Games", "Игры на словах человека, озвучка слов системным голосом", "/language-games",
     "language games", 2, "language games - 4 400 при KD 20; по языкам KD 6-22 (японский 6). Перед страницами про японский и корейский проверить, как приложение рисует иероглифы и хангыль в играх."),
    ("Хочу собрать слово из перемешанных кусочков или потренировать написание",
     "Word Puzzles", "Wordcraft (слово из частей, лишние кусочки с ростом ступени), Snake (слово по буквам)", "/word-scramble-game",
     "word scramble game", 2, "5 400 при KD 28, в топе одни браузерные игры. Остальные запросы кластера - решатели («scramble words» 60 500) и клоны NYT Spelling Bee: другой интент, брать осторожно."),
    ("Нужен тест на слова: свой список или готовый",
     "Vocabulary Apps & Quizzes", "Quiz: варианты ответов из того же набора, число вариантов растёт со ступенью", "/vocabulary-quiz",
     "vocabulary quiz maker", 3, "590 при KD 29 и 590 при KD 18 у генератора, в топе универсальные генераторы тестов для учителей. Подходит как страница-инструмент с готовым набором."),
    ("Выбираю приложение для слов или для языка",
     "Vocabulary Apps & Quizzes", "Свои слова, интервалы и игры - но без курса, как у Duolingo", "/vs-duolingo",
     "free language learning apps", 3, "6 600 при KD 14, но выдача - обзоры и Duolingo; нужен разговор «чем отличаемся», а не подборка. Совпадение с продуктом среднее."),
    ("Нужен готовый набор слов (испанский, SAT) без возни",
     "Word Sets by Language & Exam", "Готовые наборы, открываются в приложении", "/sets/spanish-basics",
     "spanish vocabulary flashcards", 3, "1 300 при KD 29 и 480 при KD 26. Выдача - Quizlet и магазины. Серия страниц по языкам и экзаменам, но нужны сами наборы."),
    ("Как вообще запомнить слова",
     "Learning Methods", "Мини-набор и раунд игры прямо на странице статьи", "/blog/how-to-memorize-vocabulary",
     "how to memorize vocabulary", 4, "Всего 170 запросов в месяц, но KD 12 и только статьи: для опорного текста с интерактивом и перелинковки."),
    ("Ищу приложение-карточки (flashcard app) в магазине",
     "Flashcard Apps & Alternatives", "Карточки с интервальным повторением", "/flashcard-app",
     "flashcard app", 4, "2 400 и 1 900, но KD 61-63 и в топе бренды Quizlet и Anki. Не цель, но стоит закрыть на главной и в сравнениях."),
]

PRIORITY_TEXT = {1: "1 (первая очередь)", 2: "2", 3: "3", 4: "4 (потом)"}

# ------------------------------------------------------------------ вспомогательное
NAVY, BLUE, LIGHT, GREY = "FF1F3864", "FF1F4E8C", "FFDCE8F7", "FF5B6B82"
F = lambda sz, b=False, c="FF1A1A1A": Font(name="Arial", size=sz, bold=b, color=c)
FILL = lambda c: PatternFill("solid", fgColor=c)
WHITE = "FFFFFFFF"
thin = Side(style="thin", color="FFBFC9D9")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)


def bar(n, total):
    share = n / total if total else 0
    blocks = round(share * 10)
    return "█" * blocks + "░" * (10 - blocks) + f" {round(share * 100)}%"


def lines_for(text, width_chars):
    return sum(max(1, math.ceil(len(part) / width_chars)) for part in str(text).split("\n"))


def put(ws, cell, value, font=None, fill=None, align=None, fmt=None, border=True):
    c = ws[cell]
    c.value = value
    if font: c.font = font
    if fill: c.fill = FILL(fill)
    if align: c.alignment = align
    if fmt: c.number_format = fmt
    if border: c.border = BOX
    return c


CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)
TOP_LEFT = Alignment(horizontal="left", vertical="top", wrap_text=True)

# ------------------------------------------------------------------ книга
wb = Workbook()

# ============================ лист 1: потребности
ws1 = wb.active
ws1.title = "1.Потребности"
ws1.sheet_view.showGridLines = False
widths1 = {"A": 2.6, "B": 40, "C": 28, "D": 40, "E": 26, "F": 26, "G": 12, "H": 10, "I": 14, "J": 70}
for k, v in widths1.items():
    ws1.column_dimensions[k].width = v

ws1["B1"].value = "Spaced Repetition - какие потребности закрывает приложение и под какие страницы сайта"
ws1["B1"].font = F(26, True, NAVY)
ws1.row_dimensions[1].height = 48
ws1["B2"].value = ("Суть: бесплатное приложение (сайт, PWA и расширение Chrome) для запоминания слов. Свои наборы слов на любом языке, "
                   "карточки с интервальным повторением (15 ступеней), Quiz, Snake и Wordcraft. Игры двигают слово по тем же ступеням. "
                   "Без регистрации, синхронизация между устройствами по коду из настроек.")
ws1["B2"].font = F(16, False, NAVY)
ws1["B2"].alignment = LEFT
ws1.merge_cells("B2:J2")
ws1.row_dimensions[2].height = 66
ws1["B3"].value = f"Поисковый спрос в США, Semrush, {DATE}. Объём - число поисков в месяц. Детали по запросам - лист 2.Кластеры."
ws1["B3"].font = F(13, False, GREY)

heads1 = ["Потребность человека", "Кластер запросов", "Что в приложении это закрывает", "Страница сайта (идея адреса)",
          "Анкорный запрос", "Объём в мес.", "KD", "Приоритет", "Почему такой приоритет"]
for i, h in enumerate(heads1):
    put(ws1, f"{get_column_letter(2 + i)}5", h, F(14, True, WHITE), NAVY, CENTER)
ws1.row_dimensions[5].height = 54

vol = {q: (v, kd) for _, subs in CLUSTERS for _, qs in subs for (q, v, kd, *_r) in qs}
for r, (need, cl, feat, page, anchor, prio, why) in enumerate(NEEDS, start=6):
    v, kd = vol[anchor]
    vals = [need, cl, feat, page, anchor, v, kd if kd is not None else "n/a", PRIORITY_TEXT[prio], why]
    for i, val in enumerate(vals):
        col = get_column_letter(2 + i)
        c = put(ws1, f"{col}{r}", val, F(13, i in (0, 4)), "FFFFFFFF", LEFT if i not in (5, 6, 7) else CENTER)
        if i == 5: c.number_format = "#,##0"
        if i == 6 and isinstance(val, int): c.number_format = '[<30]"🟢 "0;[<40]"🟡 "0;"🔴 "0'
        if i == 7:
            c.fill = FILL({1: "FFD8F0DD", 2: "FFFFF2CC", 3: "FFFCE4D6", 4: "FFEDEDED"}[prio])
            c.font = F(13, True)
    h = max(lines_for(why, 62), lines_for(need, 34), lines_for(feat, 34)) * 18.5 + 14
    ws1.row_dimensions[r].height = max(66, h)

last = 6 + len(NEEDS)
notes1 = [
    "Приоритет: 1 - большой объём и слабая выдача, совпадает с продуктом; 2 - хороший спрос, но надо проверить детали; 3 - вспомогательные страницы; 4 - низкий приоритет.",
    "Кластеры: что искать в запросах и чем отвечать - лист 2.Кластеры. Раздел «Не по профилю» в нём помечен прямо в гипотезах: решатели слов и клоны NYT Spelling Bee.",
    "KD (Keyword Difficulty, Semrush): 🟢 ниже 30, 🟡 30-39, 🔴 40 и выше.",
]
for i, t in enumerate(notes1):
    ws1[f"B{last + 1 + i}"].value = t
    ws1[f"B{last + 1 + i}"].font = F(13, False, GREY)
ws1.freeze_panes = "C6"

# ============================ лист 2: кластеры
ws = wb.create_sheet("2.Кластеры")
ws.sheet_view.showGridLines = False
widths = {"A": 2.63, "B": 29.9, "C": 33.9, "D": 44.1, "E": 18.1, "F": 13, "G": 28, "H": 28, "I": 28, "J": 75, "K": 16}
for k, v in widths.items():
    ws.column_dimensions[k].width = v

rows = []  # (cluster, sub, query, vol, kd, origin, hyp)
for cl, subs in CLUSTERS:
    for sub, qs in subs:
        for q, v, kd, origin, hyp in qs:
            rows.append((cl, sub, q, v, kd, origin, hyp))

FIRST = 20
LAST = FIRST + len(rows) - 1

ws["B1"].value = "Spaced Repetition - таблица кластерных запросов"
ws["B1"].font = F(29, True, NAVY)
ws.row_dimensions[1].height = 51.75
ws["B2"].value = ("Суть сервиса: бесплатное приложение для запоминания слов - свои наборы на любом языке, карточки с интервальным "
                  "повторением, Quiz, Snake и Wordcraft. Работает в браузере, как PWA и как расширение Chrome; без регистрации.")
ws["B2"].font = F(18, False, NAVY)
ws["B2"].alignment = LEFT
ws.merge_cells("B2:J2")
ws.row_dimensions[2].height = 60
ws["B3"].value = f"Поисковый спрос в США, Semrush, {DATE}. Объем - число поисков в месяц."
ws["B3"].font = F(14, False, GREY)

for rng, label in (("B4:C4", "Кластеров"), ("D4:E4", "Сабкластеров"), ("F4:H4", "Запросов"), ("I4:J4", "Поисков в месяц")):
    ws.merge_cells(rng)
    put(ws, rng.split(":")[0], label, F(13, True, GREY), LIGHT, CENTER)
for rng, f in (("B5:C5", f"=COUNTA($B${FIRST}:$B${LAST})"), ("D5:E5", f"=COUNTA($C${FIRST}:$C${LAST})"),
               ("F5:H5", f"=COUNTA($D${FIRST}:$D${LAST})"), ("I5:J5", f"=SUM($E${FIRST}:$E${LAST})")):
    ws.merge_cells(rng)
    put(ws, rng.split(":")[0], f, F(29, True, NAVY), WHITE, CENTER, "#,##0")
ws.row_dimensions[5].height = 51.75

# сводка по кластерам
put(ws, "B7", "Кластеры по объему", F(18, True, NAVY), None, LEFT, border=False)
ws["B7"].border = Border()
for col, h in (("B", "Кластер"), ("C", "Поисков в месяц"), ("D", "Доля"), ("E", "из них KD < 30")):
    put(ws, f"{col}8", h, F(14, True, WHITE), NAVY, CENTER)
ws.row_dimensions[8].height = 39

# диапазоны кластеров
r = FIRST
cluster_ranges, sub_ranges = [], []
for cl, subs in CLUSTERS:
    start = r
    for sub, qs in subs:
        s0 = r
        r += len(qs)
        sub_ranges.append((sub, s0, r - 1))
    cluster_ranges.append((cl, start, r - 1))

sum_row0 = 9
for i, (cl, a, b) in enumerate(cluster_ranges):
    rr = sum_row0 + i
    put(ws, f"B{rr}", cl, F(14, True, BLUE), LIGHT, LEFT)
    put(ws, f"C{rr}", f"=SUM(E{a}:E{b})", F(14), WHITE, CENTER, "#,##0")
    put(ws, f"D{rr}", f"=C{rr}/C{sum_row0 + len(cluster_ranges)}", F(14), WHITE, CENTER, "0%")
    put(ws, f"E{rr}", f'=SUMIFS(E{a}:E{b},F{a}:F{b},"<30")', F(14), WHITE, CENTER, "#,##0")
tot = sum_row0 + len(cluster_ranges)
put(ws, f"B{tot}", "Всего", F(14, True, WHITE), NAVY, LEFT)
put(ws, f"C{tot}", f"=SUM(C{sum_row0}:C{tot - 1})", F(14, True, WHITE), NAVY, CENTER, "#,##0")
put(ws, f"D{tot}", f"=SUM(D{sum_row0}:D{tot - 1})", F(14, True, WHITE), NAVY, CENTER, "0%")
put(ws, f"E{tot}", f"=SUM(E{sum_row0}:E{tot - 1})", F(14, True, WHITE), NAVY, CENTER, "#,##0")

chart = BarChart()
chart.type = "bar"
chart.title = "Поисков в месяц по кластерам"
chart.legend = None
chart.height, chart.width = 6.4, 17
chart.add_data(Reference(ws, min_col=3, min_row=sum_row0, max_row=tot - 1), titles_from_data=False)
chart.set_categories(Reference(ws, min_col=2, min_row=sum_row0, max_row=tot - 1))
chart.y_axis.numFmt = "#,##0"
chart.x_axis.scaling.orientation = "maxMin"
ws.add_chart(chart, "G7")

# шапка таблицы запросов
bandrow = FIRST - 2
put(ws, f"B{bandrow - 1}", "Все запросы: кластер → сабкластер → запрос, на каждом уровне от большего объема к меньшему",
    F(15, True, NAVY), None, LEFT, border=False)
ws.merge_cells(f"G{bandrow}:I{bandrow}")
put(ws, f"G{bandrow}", "Что дает первая страница Google США (топ-10)", F(14, True, WHITE), NAVY, CENTER)
heads = ["Кластер", "Сабкластер (рабочее название)", "Запрос", "Поисков в месяц", "KD",
         "Заниматься или играть сразу в браузере", "Поставить приложение или завести аккаунт", "Читать статью, подборку, форум",
         "Гипотеза: чем наш сайт лучше первой страницы выдачи", "Откуда запрос"]
for i, h in enumerate(heads):
    put(ws, f"{get_column_letter(2 + i)}{FIRST - 1}", h, F(14, True, WHITE), NAVY, CENTER)
ws.row_dimensions[FIRST - 1].height = 62.25

for off, (cl, sub, q, v, kd, origin, hyp) in enumerate(rows):
    rr = FIRST + off
    marks, links = SERP[q]
    n = len(marks)
    put(ws, f"D{rr}", q, F(14, True), WHITE, LEFT)
    put(ws, f"E{rr}", v, F(14), WHITE, CENTER, "#,##0")
    put(ws, f"F{rr}", kd if kd is not None else "n/a", F(14), WHITE, CENTER,
        '[<30]"🟢 "0;[<40]"🟡 "0;"🔴 "0' if kd is not None else "General")
    for col, key in (("G", "P"), ("H", "A"), ("I", "R")):
        put(ws, f"{col}{rr}", bar(marks.count(key), n), F(13, True, "FF6064C8"), WHITE, LEFT)
    put(ws, f"J{rr}", hyp, F(14), WHITE, LEFT)
    put(ws, f"K{rr}", "из вашего списка" if origin == "список" else "добавлен мной", F(12, False, GREY), WHITE, CENTER)
    ws.row_dimensions[rr].height = max(66, lines_for(hyp, 48) * 19 + 14)

# объединения кластеров и сабкластеров
for cl, a, b in cluster_ranges:
    if b > a:
        ws.merge_cells(f"B{a}:B{b}")
    put(ws, f"B{a}", cl, F(17, True, BLUE), LIGHT, CENTER)
    for rr in range(a, b + 1):
        ws[f"B{rr}"].fill = FILL(LIGHT)
        ws[f"B{rr}"].border = BOX
for sub, a, b in sub_ranges:
    if b > a:
        ws.merge_cells(f"C{a}:C{b}")
    put(ws, f"C{a}", sub, F(14, False, BLUE), WHITE, LEFT)

# сноски
foot = LAST + 2
foot_text = [
    "KD (Keyword Difficulty, Semrush) - сложность попасть в топ Google: 🟢 ниже 30, 🟡 30-39, 🔴 40 и выше.",
    f"Первая страница Google США (gl=us, hl=en) снята {DATE}: органические ссылки без блоков «Люди также спрашивают», видео и рекламы, их 7-9. "
    "Каждая ссылка размечена одним типом по домену и заголовку, страницы не открывались; доля = ссылок типа / всех ссылок. Разметка по ссылкам - файл serp-google-us-2026-11-07.md.",
    "Объём и KD: для запросов, найденных мной, - Semrush Keyword Magic Tool, США, 07.11.2026; для остальных - ваш список (колонка «Откуда запрос»). "
    "У пяти запросов из вашего списка свежие данные отличаются (vocabulary games KD 41 вместо 46, vocabulary word games KD 12 вместо 34) - в таблице стоят свежие.",
    "Суммы по кластерам - арифметическая сумма объёмов запросов: запросы одного сабкластера пересекаются (один человек ищет по-разному), так что реальный трафик ниже суммы.",
]
for i, t in enumerate(foot_text):
    ws[f"B{foot + i}"].value = t
    ws[f"B{foot + i}"].font = F(13, False, GREY)
ws.freeze_panes = f"E{FIRST}"

from extra_sheets import add_extra  # noqa: E402
add_extra(wb, SITE, {q for q in SERP})
wb.active = 0
for _ws in wb.worksheets:
    _ws.sheet_view.tabSelected = _ws is wb.worksheets[0]
out_xlsx = os.path.join(SITE, "cluster-queries.xlsx")
wb.save(out_xlsx)

# ------------------------------------------------------------------ SERP в markdown
LABEL = {"P": "играть/заниматься в браузере", "A": "приложение/аккаунт", "R": "читать"}
md = [f"# Первая страница Google США - разметка по ссылкам, {DATE}", "",
      "Снято из Chrome: google.com/search?q=...&gl=us&hl=en&pws=0. Только органические ссылки (7-9 на запрос): блоки «Люди также спрашивают», видео и реклама не вошли.",
      "Тип размечен по домену и заголовку, страницы не открывались. Типы: **P** - заниматься или играть сразу в браузере; **A** - поставить приложение или завести аккаунт; **R** - читать, смотреть, обсуждать.",
      ""]
for cl, subs in CLUSTERS:
    md.append(f"## {cl}")
    for sub, qs in subs:
        for q, v, kd, origin, hyp in qs:
            marks, links = SERP[q]
            md += ["", f"### {q}  ({v:,} в мес., KD {kd if kd is not None else 'n/a'})".replace(",", " "), "",
                   "| № | Тип | Домен | Заголовок |", "|---|---|---|---|"]
            for i, ((host, title), m) in enumerate(zip(links, marks), 1):
                md.append(f"| {i} | {m} | {host} | {title} |")
            md.append(f"\nP {marks.count('P')} / A {marks.count('A')} / R {marks.count('R')} из {len(marks)}")
    md.append("")
with open(os.path.join(HERE, "serp-google-us-2026-11-07.md"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(md))

print("ok:", out_xlsx, len(rows), "queries,", len(cluster_ranges), "clusters,", len(sub_ranges), "subclusters")
