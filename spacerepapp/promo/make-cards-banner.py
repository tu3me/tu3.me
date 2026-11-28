# Builds the "three cards" banner.
#
# The arrows are computed rather than drawn by eye: the head is built on the
# tangent at the end of its own arc, and the arc stops short of the tip so the
# stroke does not show through the point. A head that does not point along its
# own tangent reads as a bent arrow, which is exactly what it looks like when
# the numbers are guessed.
#
#     python promo/make-cards-banner.py           the name under the cards
#     python promo/make-cards-banner.py --flip    the name above them
#     python promo/make-cards-banner.py --tilt    all three cards at one angle
#     python promo/make-cards-banner.py --blank   the middle card without eyes
#     python promo/make-cards-banner.py --wide    the name as wide as the cards
#
# --flip turns the tile over: the name on top, the cards along the bottom, and no
# slogan under either. On a tile this small the name has to be the first thing
# read, and under the picture it is the second.
#
# --blank takes the two eyes off the middle card, leaving a bare one. At 78 wide
# a face in the middle of the row pulls the eye off the arrows, which are what
# the tile is about. Combines with either of the others.
#
# --wide tracks both lines of the name out until their paint reaches the outer
# edges of the row of cards, so the block of type and the row of cards are one
# column rather than two things of different widths stacked on each other.
import io
import math
import sys

FLIP = '--flip' in sys.argv
TILT = '--tilt' in sys.argv
BLANK = '--blank' in sys.argv
WIDE = '--wide' in sys.argv

# The logo is drawn seven degrees off square, and in the plain tile it is the
# only thing that is: a tilted card between two upright ones. --tilt turns the
# other two by the same seven, so the row is one object at one angle.
TILT_DEG = -7 if TILT else 0

CARD_W, CARD_H, CARD_R = 78, 64, 14

# Centre line of the row of cards. Flipped it is set from the bottom: the cards
# end 26 above the lower edge, and the arcs — which peak 21 above the cards and
# carry a 4.5 stroke — clear the second line of the name by 34.
#
# Tilted, the whole composition drops 24. The slogan is gone there, and what it
# leaves behind is 64 of empty under the name against 15 above the arcs; moving
# everything down puts the same 40 at both ends.
DROP = 24 if TILT else 0
CARD_Y = 222 if FLIP else 70 + DROP
CENTRES = (78, 220, 362)

# The colours the three games wear on their buttons in the catalog, from
# registry.js. Coral is the middle card, because coral is the logo.
LEFT_FILL = '#d9a520'
RIGHT_FILL = '#56c4a6'

LIFT = 34          # how far the arc rises above the cards it joins


def row_span():
    """The outer edges of the row of cards -- the silhouette, not the box.

    A rounded rect is its inner rect inflated by the corner radius, so the
    extreme point of a tilted card is that inner corner pushed out by CARD_R:
    41.01 from the centre at seven degrees, where the corner of the full box
    would say 42.61. Lining the name up with the second number hangs 1.6 of it
    past the card at each end, and at this size that shows.

    Scanned off the rendered tile to be sure: the gold card's paint starts in
    the column at x=37 and the mint card's ends in the one at 402, which is
    where 36.99 and 403.01 land once the edge pixels are counted.
    """
    a = math.radians(TILT_DEG)
    half = ((CARD_W - 2 * CARD_R) * abs(math.cos(a))
            + (CARD_H - 2 * CARD_R) * abs(math.sin(a))) / 2 + CARD_R
    return CENTRES[0] - half, CENTRES[2] + half

# How far the ends of an arrow stand off the card they leave and the one they
# land on. The two tiles that shipped before keep the 4 they were drawn with;
# only the tilted one opens it up, where the cards lean into the arrows and the
# old clearance read as the arrow touching the corner it passes.
CLEAR = 12 if TILT else 4
STROKE = 4.5
# How big the point is. The tilted tile gets a bigger one: its cards lean into
# the arrows and carry more weight than the upright pair did, and a head sized
# for them left the arrow looking like a line with a nick on the end.
HEAD_LEN = 26 if TILT else 18    # how far the point reaches back from its tip
HEAD_HALF = 13 if TILT else 9    # half the width of its base


def arc(x0, y0, x1, y1):
    """A quadratic arc from one card to the next, with a solid head on its tip.

    The head is a filled triangle rather than two barbs: at this size a pair of
    strokes reads as a tick, and the arrow has to say direction at a glance.
    """
    cx, cy = (x0 + x1) / 2, min(y0, y1) - LIFT

    # The tangent at the end of a quadratic is the line from its control point
    tx, ty = x1 - cx, y1 - cy
    length = math.hypot(tx, ty)
    tx, ty = tx / length, ty / length
    px, py = -ty, tx                      # perpendicular, for the head's base

    stop_x, stop_y = x1 - tx * HEAD_LEN * 0.62, y1 - ty * HEAD_LEN * 0.62
    base_x, base_y = x1 - tx * HEAD_LEN, y1 - ty * HEAD_LEN

    return (
        'M%.1f %.1f Q%.1f %.1f %.1f %.1f' % (x0, y0, cx, cy, stop_x, stop_y),
        'M%.1f %.1f L%.1f %.1f L%.1f %.1f Z' % (
            base_x + px * HEAD_HALF, base_y + py * HEAD_HALF,
            x1, y1,
            base_x - px * HEAD_HALF, base_y - py * HEAD_HALF),
    )


def edge(cx, dx):
    """A point CLEAR above a card's top edge, dx along it from the centre.

    Turned with the card when the row is tilted, so the arrows leave and land on
    the edge they are drawn against rather than on where it used to be: at seven
    degrees the right-hand corner of a card this wide rises about 4.
    """
    dy = -CARD_H / 2.0
    a = math.radians(TILT_DEG)
    return (cx + dx * math.cos(a) - dy * math.sin(a),
            CARD_Y + dx * math.sin(a) + dy * math.cos(a) - CLEAR)


arrows = [
    arc(*(edge(CENTRES[a], CARD_W / 2 - 8) + edge(CENTRES[b], -CARD_W / 2 + 8)))
    for a, b in ((0, 1), (1, 2))
]


def card(cx, fill):
    box = ('<rect x="%.1f" y="%.1f" width="%d" height="%d" rx="%d" fill="%s" />'
           % (cx - CARD_W / 2, CARD_Y - CARD_H / 2, CARD_W, CARD_H, CARD_R, fill))
    if not TILT:
        return box
    return '<g transform="rotate(%d %.1f %.1f)">%s</g>' % (TILT_DEG, cx, CARD_Y, box)


# the logo is drawn on a 32-unit grid whose card is 28.09 wide, so match widths
logo_scale = CARD_W / 28.09
logo_x = CENTRES[1] - (1.95 + 28.09 / 2) * logo_scale
logo_y = CARD_Y - 16 * logo_scale

# The middle card is the logo, at the geometry catalog.js draws it in the header
# -- the same 32-unit card, tilt included -- minus its eyes when --blank asks for
# a bare card.
#
# Eyes rather than the hollow rings this file drew before: the mark in the header
# wears a dark pupil inside a thin white ring, and a promo tile showing the older
# face would be a picture of a logo the app no longer has. make-icons.py and
# make-big-banner.py still draw the rings hollow.
#
# Written the way catalog.js writes them, as the two circles a reader actually
# sees: `eye` is how far the white reaches, `pupil` where the dark ends, and the
# ring is what is left between. SVG wants the other pair -- a path radius with a
# stroke straddling it -- and that conversion belongs in code rather than in a
# comment explaining that 4.405 and 2.41 happen to make an eye of 5.61.
#
# The left eye is the larger, and its pupil the smaller share of it: two pupils
# of one size in eyes of two sizes is what a face does when it is looking at
# something, and that look is the whole point of the mark.
EYES = ((11.37, 5.61, 3.2), (23.02, 3.76, 2.26))

# The dark theme's ground, written out rather than taken from tokens, exactly as
# catalog.js has it: one fixed value in both themes. Not black, which on this
# coral reads as a hole punched through the card.
PUPIL = '#0f2b3c'

RINGS = ''.join(
    '''
            <circle cx="%s" cy="16" r="%.6g" fill="%s" stroke="#ffffff" stroke-width="%.6g" />'''
    % (cx, (eye + pupil) / 2.0, PUPIL, eye - pupil)
    for cx, eye, pupil in EYES)

logo = '''<g transform="translate(%.1f %.1f) scale(%.3f)">
        <g transform="rotate(-7 16 16)">
            <rect x="1.95" y="4.34" width="28.09" height="23.31" rx="5.23" fill="#ef6f5a" />%s
        </g>
    </g>''' % (logo_x, logo_y, logo_scale, '' if BLANK else RINGS)

# What the file's own comment says about that middle card, which is a different
# thing depending on whether it kept its rings.
MIDDLE = '''Coral falls in the middle
        because coral is the logo: the middle card is the logo itself, at the
        geometry catalog.js draws it in the header — tilt, and eyes with a
        pupil inside the ring rather than the hollow ones this file drew once.'''
if BLANK:
    MIDDLE = '''Coral falls in the middle
        because coral is the logo: the middle card is the logo's own card, at
        the geometry catalog.js draws it in the header, tilt included. Its two
        eyes are off here — at 78 wide a face in the middle of the row pulls
        the eye off the arrows, which are what the tile is about.'''

TRACKED = '''Each line of the name is shifted right by half its own tracking.
        text-anchor centres a line on its advance width, and that width carries
        the letter-space after the last glyph as well as the ones between, so
        the ink of a tracked line hangs left of where it was asked to sit.
        Scanned off the rendered pixels, SPACED sat at 213.0 and REPETITION at
        218.0 against a true middle of 219.5 — half of 13.63 and half of 3.53.'''
if WIDE:
    TRACKED = '''Both lines are tracked out until their paint reaches the
        outer edges of the row of cards, %.2f to %.2f, so that the type and the
        cards read as one column instead of two widths stacked on each other.
        Those edges are the silhouette and not the box: a tilted rounded card
        stops 1.6 short of where the corner of its bounding box would be.

        Each line is then shifted right by half its own tracking, because
        text-anchor centres a line on its advance width and that width carries
        the letter-space after the last glyph as well as the ones between. And
        SPACED is pulled back 0.43 on top of that — S and D do not carry the
        same side bearing, which anywhere else would not be worth a number, and
        here decides whether the line ends where the card does.''' % row_span()

indent = '\n        '
arcs = indent.join('<path d="%s" />' % a for a, _ in arrows)
heads = indent.join('<path d="%s" />' % h for _, h in arrows)

# The two lines of the name, and under them the slogan when there is room for it
# — flipped, the cards take that room. Each line keeps its shift of half its own
# tracking: text-anchor centres a line on its advance, and that advance carries
# the letter-space after the last glyph as well as the ones between them.
LINES = [(226.3, 58, 800, '13.63', '#eef6f7', 'SPACED'),
         (221.3, 47, 700, '3.53', '#eef6f7', 'REPETITION')]

# What each line measures with no tracking at all. Scanned off the rendered
# tile, where the two sit 292.09 and 292.18 wide at the trackings above, less
# the gaps that put them there -- paint, not advance width, because paint is
# what has to line up with the cards.
BARE_INK = {'SPACED': 223.94, 'REPETITION': 260.41}

# And how far right of the arithmetic each line's paint actually sits. Half a
# tracking centres the advance, but the paint inside it is only centred if the
# first and last letters carry the same side bearing, and S and D do not:
# scanned, SPACED came out 0.43 right while REPETITION landed on the number.
# Small, and it would not matter anywhere else -- here the ends of the line are
# supposed to meet the edges of the cards, so half a pixel is the whole point.
BEARING = {'SPACED': 0.43, 'REPETITION': 0.0}


def stretch(size, weight, colour, word):
    """A line tracked until its paint spans the row of cards.

    Paint grows by one tracking per gap between letters, and there is one gap
    fewer than there are letters: the space after the last one is advance
    width, which is why the line is also shifted right by half a tracking --
    text-anchor centres a line on its advance, trailing space and all.
    """
    left, right = row_span()
    track = (right - left - BARE_INK[word]) / (len(word) - 1)
    return ('%.2f' % ((left + right) / 2 + track / 2 - BEARING[word]), size,
            weight, '%.2f' % track, colour, word)


if WIDE:
    LINES = [stretch(size, weight, colour, word)
             for _, size, weight, _, colour, word in LINES]

if not (FLIP or TILT):
    LINES.append((219.5, 25, 700, None, '#72dcbe', 'Remember words'))

first = 88 if FLIP else 172 + DROP
wordmark = indent.join(
    '<text x="%s" y="%d" font-size="%d" font-weight="%d"%s fill="%s">%s</text>'
    % (x, first + step, size, weight,
       ' letter-spacing="%s"' % track if track else '', colour, words)
    for step, (x, size, weight, track, colour, words) in zip((0, 44, 84), LINES))

svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
    <!--
        Small promo tile, 440x280 — the one that shows the idea rather than
        naming it. Built by promo/make-cards-banner.py.

        Three cards and two arrows: a word arrives, goes away, comes back, and
        comes back again. That is the whole of spaced repetition, and it is
        worth more at this size than any sentence about intervals.

        The three wear the colours the games wear on their buttons in the
        catalog — gold, coral, mint from registry.js — so the row is the app's
        own palette rather than a picture of it. %(middle)s

        The arrows are computed from the curve they sit on, not drawn by eye:
        the head is built on the tangent at the end of its own arc, and the arc
        stops short of the tip so the stroke does not show through the point.

        %(tracked)s
    -->
    <defs>
        <linearGradient id="ground" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#1b4a63" />
            <stop offset="0.55" stop-color="#11374c" />
            <stop offset="1" stop-color="#0a2130" />
        </linearGradient>

        <radialGradient id="glow" cx="0.5" cy="0.22" r="0.6">
            <stop offset="0" stop-color="#56c4a6" stop-opacity="0.2" />
            <stop offset="1" stop-color="#56c4a6" stop-opacity="0" />
        </radialGradient>
    </defs>

    <rect width="440" height="280" fill="url(#ground)" />
    <rect width="440" height="280" fill="url(#glow)" />

    %(card_left)s
    %(card_right)s

    %(logo)s

    <g stroke="#ffffff" stroke-width="%(stroke)s" fill="none" stroke-linecap="round">
        %(arcs)s
    </g>
    <g fill="#ffffff">
        %(heads)s
    </g>

    <g font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" text-anchor="middle">
        %(wordmark)s
    </g>
</svg>
''' % {
    'card_left': card(CENTRES[0], LEFT_FILL),
    'card_right': card(CENTRES[2], RIGHT_FILL),
    'logo': logo,
    'middle': MIDDLE,
    'tracked': TRACKED,
    'stroke': STROKE,
    'arcs': arcs,
    'heads': heads,
    'wordmark': wordmark,
}

name = 'promo/banner-440x280-cards%s%s%s.svg' % (
    '-flipped' if FLIP else '-tilted' if TILT else '',
    '-blank' if BLANK else '',
    '-wide' if WIDE else '')
io.open(name, 'w', encoding='utf-8', newline='\n').write(svg)
print('%s written: %d arcs, %d heads' % (name, len(arrows), len(arrows)))
