# -*- coding: utf-8 -*-
"""Builds site/queries.txt: a plain list of Semrush queries grouped by topic, 'volume | KD | query'.

Replaces cluster-queries.xlsx as the thing to read (the workbook grew too complex, owner's call, 14.11.2026);
the workbook builder stays as it was and is no longer extended. Sources: the two CSV files next to this script.
"""
import csv
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "queries.txt")

# seed of the old CSV -> group (seeds not listed fall into "Прочее", so a new one is visible, not lost)
OLD = {
    "Игры со словами": ["vocabulary games", "english vocabulary games", "spelling games", "word scramble", "word search maker",
                        "vocabulary word search", "crossword puzzle maker", "fun ways to learn vocabulary"],
    "Как запомнить слова, тренажёры и тесты": ["how to memorize vocabulary", "vocabulary builder", "vocabulary quiz",
                                              "vocabulary list maker", "kindle vocabulary builder"],
    "Интервальное повторение и память": ["spaced repetition", "spaced repetition schedule", "spaced repetition calculator",
                                         "leitner system", "forgetting curve", "active recall"],
    "Карточки и альтернативы сервисам": ["online flashcards", "quizlet alternative", "anki alternative", "brainscape alternative",
                                         "memrise alternative", "kahoot alternatives", "duolingo alternatives",
                                         "free language learning apps", "ai flashcard generator", "chatgpt flashcards",
                                         "offline flashcard app"],
    "Экзамены": ["sat vocabulary", "gre vocabulary", "toefl vocabulary", "ielts vocabulary", "jlpt n5 vocabulary"],
    "Отдельные языки": ["japanese vocabulary", "korean vocabulary", "spanish vocabulary", "most common spanish words",
                        "hiragana flashcards", "hangul flashcards"],
}
IMPROVE_OLD = "how to improve vocabulary"  # seed of the first pass (07-11.11.2026): joins the improve family

# topic of the "improve / increase / expand / build vocabulary" family, first match wins
IMPROVE = [
    ("Приложения, чтобы улучшить словарь", r"\bapps?\b"),
    ("Игры, упражнения, активности", r"games?|activit|exercise"),
    ("Списки слов", r"\bwords\b|\bword\b"),
    ("Как улучшить, расширить, увеличить словарь (вопросы и способы)", r"."),
]
# owner dropped everything about books (14.11.2026): the app is not about reading lists
SKIP = re.compile(r"books?|novels?")
LANG_APPS = "Языки: карточки и приложения"
ENGLISH_COMMON = "Частые английские слова"
COMMON_OTHER = "Частые слова других языков"
ENGLISH_VOCAB = "Английский словарь: тесты и приложения"
OTHER_SEEDS = {"learn new words": "Учить новые слова", "vocabulary exercises": "Упражнения на словарь"}


def num(v):
    return int(v) if v and v.strip().isdigit() else None


def load(path):
    with open(os.path.join(HERE, path), encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    groups, best = {}, {}  # best: (group, keyword) -> (volume, kd)

    def add(group, kw, vol, kd):
        if SKIP.search(kw):
            return
        key = (group, kw)
        if key not in best or (vol or 0) > (best[key][0] or 0):
            best[key] = (vol, kd)
        groups.setdefault(group, set()).add(kw)

    # the newest measurement of a phrase wins over the 07-11.11 pull: KD drifts as the SERP changes (checked 14.11.2026:
    # "how to expand your vocabulary" 38 -> 54, "how to gain vocabulary" 44 -> 33); volumes stayed the same
    fresh, serp = {}, {}
    for f in ("semrush-improve-vocabulary-2026-11-14.csv", "semrush-languages-english-2026-11-14.csv"):
        for r in load(f):
            fresh[r["keyword"]] = (num(r["volume_us"]), num(r["kd"]))
    if os.path.exists(os.path.join(HERE, "semrush-serp-2026-11-14.csv")):
        for r in load("semrush-serp-2026-11-14.csv"):
            fresh[r["keyword"]] = (num(r["volume_us"]), num(r["kd"]))
            serp[r["keyword"]] = r["serp"]
    old = load("semrush-keyword-magic-us-2026-11-07.csv")
    new = load("semrush-improve-vocabulary-2026-11-14.csv")
    seed_group = {s: g for g, seeds in OLD.items() for s in seeds}
    for r in old:
        seed, kw, vol, kd = r["seed"], r["keyword"], num(r["volume_us"]), num(r["kd"])
        if seed in seed_group:
            add(seed_group[seed], kw, vol, kd)
        elif seed == IMPROVE_OLD:
            new.append({"seed": seed, "keyword": kw, "volume_us": r["volume_us"], "kd": r["kd"]})
        elif seed != "vocabulary games":
            add("Прочее (новое зерно, разнести по группам)", kw, vol, kd)
        else:
            add(seed_group["vocabulary games"], kw, vol, kd)
    # the improve family keeps one row per keyword: the same phrase comes from several seeds
    fam = {}
    for r in new:
        if r["seed"] in OTHER_SEEDS:
            add(OTHER_SEEDS[r["seed"]], r["keyword"], num(r["volume_us"]), num(r["kd"]))
            continue
        vol, kd = num(r["volume_us"]), num(r["kd"])
        if r["keyword"] not in fam or (vol or 0) > (fam[r["keyword"]][0] or 0):
            fam[r["keyword"]] = (vol, kd)
    for kw, (vol, kd) in fam.items():
        group = next(g for g, rx in IMPROVE if re.search(rx, kw))
        add(group, kw, vol, kd)
    for r in load("semrush-languages-english-2026-11-14.csv"):
        add(r["group"], r["keyword"], num(r["volume_us"]), num(r["kd"]))

    order = [g for g, _ in IMPROVE] + list(OTHER_SEEDS.values()) + [LANG_APPS, ENGLISH_COMMON, ENGLISH_VOCAB, COMMON_OTHER] + list(OLD) + [g for g in groups if g.startswith("Прочее")]
    out = ["Запросы Semrush, база US. Формат: объём в месяц | KD | запрос | типы результатов в выдаче (Semrush, топ-10, если есть). Внутри группы по убыванию объёма.",
           "KD обновлён 14.11.2026 для групп про улучшение словаря, языки и английские слова и для запросов с выдачей; у остальных KD от 07-11.11.2026 и мог измениться.",
           "Объём одной группы не складывается: фразы-варианты считаются отдельно, и один человек ищет их по-разному.", ""]
    seen = set()
    for g in order:
        if g not in groups:
            continue
        rows = sorted((k for k in groups[g] if k not in seen), key=lambda k: (-(best[(g, k)][0] or 0), k))
        seen.update(rows)
        if not rows:
            continue
        out.append(f"== {g} ({len(rows)})")
        for k in rows:
            vol, kd = fresh.get(k, best[(g, k)])
            line = f"{vol if vol is not None else '-'} | {kd if kd is not None else '-'} | {k}"
            out.append(line + (f" | {serp[k]}" if k in serp else ""))
        out.append("")
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out))
    print("ok:", os.path.abspath(OUT), sum(len(v) for v in groups.values()), "queries,", len(groups), "groups")


if __name__ == "__main__":
    main()
