# -*- coding: utf-8 -*-
"""Appends Semrush Keyword Overview results to semrush-serp-2026-11-14.csv.

Input: a text file, one line per query: '<keyword> ## V <volume> KD <kd> | <types>' (the output of the browser snippet).
Volume is taken from queries.txt (Overview rounds it: 60.5K), KD and the SERP types come from the line.
Usage: python add_serp.py <file>
"""
import csv
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "semrush-serp-2026-11-14.csv")


def volumes():
    vol = {}
    for l in open(os.path.join(HERE, "..", "queries.txt"), encoding="utf-8").read().split("\n"):
        p = l.split(" | ")
        if len(p) >= 3 and p[0].isdigit():
            vol[p[2]] = p[0]
    return vol


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    vol = volumes()
    have = {r["keyword"] for r in csv.DictReader(open(OUT, encoding="utf-8"))}
    added = skipped = 0
    with open(OUT, "a", encoding="utf-8", newline="\n") as out:
        for line in open(sys.argv[1], encoding="utf-8").read().split("\n"):
            m = re.match(r"^(.*?) ## V ([\d.,]+[KM]?) KD (\d+|\?) \| (.*)$", line.strip())
            if not m:
                if line.strip():
                    print("skip:", line[:80])
                    skipped += 1
                continue
            kw, _, kd, types = m.groups()
            if kw in have or kw not in vol or "NOSERP" in types:
                print("skip:", kw, "(have/unknown/no serp)")
                skipped += 1
                continue
            out.write(f"{kw},{vol[kw]},{'' if kd == '?' else kd},{types}\n")
            added += 1
    print("added", added, "skipped", skipped)


if __name__ == "__main__":
    main()
