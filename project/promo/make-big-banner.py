# Builds the large store banner, 1280x800.
#
#     python promo/make-big-banner.py            the dark window
#     python promo/make-big-banner.py --light    the light one
#     ... and --plain for either without the wash behind the words
#     ... and --nomark for the name set as type, with no logo beside it
#     ... and --tall for that same name over a pitch that fills the height
#     ... and --noline to drop the line that closes the block
#     ... and --words for a third row of bubbles, in three scripts
#     ... and --middle to centre the popup and the pitch instead of crossing them
#     ... and --stack for the three things one to a line, larger
#     ... and --small to take that stacked list back down a size
#
# A browser window with a video site behind it and the app's own popup in front.
#
# The site is drawn as wireframe blocks and carries no name, mark or wordmark of
# anyone else's: what it has to say is "an ordinary page you were already on",
# and grey rectangles say that without borrowing a brand.
#
# The popup is not a wireframe. It is the thing being sold, so it is drawn in
# the app's real colours, with its real words and its real buttons, only larger.
# Every label is placed from a width measured in the browser at the size it is
# set here, so nothing is centred by guess:
#
#     bubbles 25px    learn 62.3 / words 68.6     active 73.2 / recall 60.2
#                     flash 60.0 / cards 59.7     memory 102.6 / games 74.3
#                     spaced 84.6 / review 73.7   daily 59.8 / practice 89.7
#                     word 63.9 / streaks 79.1
#     with --words     the second row of phrases gives way to three rows of real
#                     words, each over its English. Keyed by the gloss, because
#                     a table is easier to read in one script: first number is
#                     the word's width, second is the gloss's.
#
#                     spaced 122.2 / 78.7   daily 50.0 / 53.9    practice 52.1 / 89.7
#                     review 50.0 / 73.7    remember 35.2 / 117.5  study 86.4 / 62.2
#                     any language 175.0 / 152.4   memorize 50.0 / 113.2
#                     read 56.8 / 50.4
#     buttons 36px    Cards 94.1   Quiz 76.6   Play 71.1
import io
import math
import sys

W, H = 1280, 800

# Browser chrome. No bookmarks strip: it is a band of nothing but grey pills,
# and without it the page starts 30 higher and the popup hangs straight off the
# toolbar, which is where a popup comes from.
TAB_H, BAR_H = 40, 48
PAGE_Y = TAB_H + BAR_H

# Two windows, one banner. Everything in front — the popup, the logo, the
# pitch — is the same in both; the only thing that changes is the window the app
# was opened over, so the two can be held up side by side and judged on the one
# thing that differs.
#
# The dark one is grey dark rather than black: near-black behind a near-black
# panel made the app look like part of the page it was opened on. On the light
# one the popup is the only dark surface on the banner.
LIGHT = '--light' in sys.argv
DROP = 36                           # how far below the window's middle the pitch sits
PLAIN = '--plain' in sys.argv       # no wash under the pitch, brighter type instead
TALL = '--tall' in sys.argv         # the pitch down the whole page, six lines
NOLINE = '--noline' in sys.argv     # no closing line under the three words
WORDS = '--words' in sys.argv       # a third row of bubbles, words not phrases
MIDDLE = '--middle' in sys.argv     # both blocks centred, no diagonal
STACK = '--stack' in sys.argv       # the three things stacked, one line each
SMALL = '--small' in sys.argv       # ... at the lower of the two stacked sizes
NOMARK = '--nomark' in sys.argv or TALL   # no logo; the name set to be read

if LIGHT:
    CHROME, CHROME_BAR, CHROME_LINE, CHROME_INK = '#dee1e6', '#ffffff', '#c8ccd1', '#9aa0a6'
    PAGE_BG, BLOCK, BLOCK_INK = '#ffffff', '#eaecef', '#d6d9de'
    TAB_BACK, TAB_BACK_INK, FIELD = '#cfd3d8', '#b0b4ba', '#f1f3f4'
    TOOL_TILE, EXT_TILE, KEBAB = '#f1f3f4', '#fbe4df', '#5f6368'
    AVATAR, STAMP = '#c3c7cc', '#b9bdc3'
    SHADOW, SHADOW_ALPHA = '#0b2330', '0.38'
else:
    CHROME, CHROME_BAR, CHROME_LINE, CHROME_INK = '#33363a', '#414549', '#2a2d30', '#9aa0a6'
    PAGE_BG, BLOCK, BLOCK_INK = '#4c5055', '#5b6066', '#6d7379'
    TAB_BACK, TAB_BACK_INK, FIELD = '#2b2e31', '#787e84', '#53575c'
    TOOL_TILE, EXT_TILE, KEBAB = '#53575c', '#5c4440', '#c4c7ca'
    AVATAR, STAMP = '#7d838a', '#3c4045'
    SHADOW, SHADOW_ALPHA = '#000000', '0.45'

#   CHROME      the frame the tabs are cut out of
#   CHROME_BAR  the toolbar, and the tab in front of the others
#   CHROME_INK  the grey the chrome draws its own shapes in
#   BLOCK       the page's big blocks — thumbnails, panels
#   BLOCK_INK   its smaller shapes, which have to hold their own

# The app, from core/tokens.js and registry.js
GROUND = '#0f2b3c'
SURFACE = '#1a4154'
SOFT = '#16384a'
BORDER = '#2a5568'
INK = '#eef6f7'
MUTED = '#9bb4c1'
CORAL = '#ef6f5a'
GOLD = '#d9a520'
MINT = '#56c4a6'
BLUE = '#6aa8f0'
# The ripening ramp a word climbs, straight out of core/tokens.js. A banner
# whose words were all one colour would show a set nobody had studied yet.
STAGES = (
    ('#ebedef', '#4a4f55', '#6d737a'),   # 0  stone — a seed, nothing yet
    ('#fbedc3', '#605024', '#857447'),   # 1  pale yellow
    ('#f8eabf', '#605124', '#857647'),   # 2  yellow
    ('#ebf1bb', '#596024', '#7d8547'),   # 3  gold
    ('#d4efb9', '#426024', '#668547'),   # 4  chartreuse
    ('#c0edb9', '#2c6024', '#508547'),   # 5  lime
    ('#bdefc8', '#246032', '#478556'),   # 6  green
    ('#bff0dc', '#246048', '#47856c'),   # 7  emerald
    ('#bcf0f0', '#246060', '#478585'),   # 8  sea
    ('#b8dff0', '#244e60', '#477285'),   # 9  teal
    ('#b4ccf0', '#243c60', '#476085'),   # 10 blue
    ('#b1b1f0', '#242460', '#474785'),   # 11 indigo
    ('#c6adf1', '#3a2460', '#5e4785'),   # 12 violet
    ('#c7a2f1', '#402460', '#644785'),   # 13 violet, deeper
    ('#cb91f2', '#482460', '#6c4785'),   # 14 violet, deepest — mastered
)

FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

LOGO = ('<g transform="rotate(-7 16 16)">'
        '<rect x="1.95" y="4.34" width="28.09" height="23.31" rx="5.23" fill="%s" />'
        '<circle cx="11.37" cy="16" r="4.86" fill="none" stroke="#ffffff" stroke-width="2.83" />'
        '<circle cx="23.02" cy="16" r="3.01" fill="none" stroke="#ffffff" stroke-width="1.75" />'
        '</g>') % CORAL

out = []
add = out.append


def rect(x, y, w, h, r=0, fill=BLOCK, extra=''):
    add('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s"%s />'
        % (x, y, w, h, r, fill, (' ' + extra) if extra else ''))


def circle(cx, cy, r, fill=BLOCK, extra=''):
    add('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"%s />'
        % (cx, cy, r, fill, (' ' + extra) if extra else ''))


def line(x0, y0, x1, y1, colour, width=2.2):
    add('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%s" '
        'stroke-linecap="round" />' % (x0, y0, x1, y1, colour, width))


def text(x, y, s, size, weight, fill, anchor='start', track=None):
    add('<text x="%.1f" y="%.1f" font-family="%s" font-size="%s" font-weight="%s" fill="%s"%s%s>%s</text>'
        % (x, y, FONT, size, weight, fill,
           ' text-anchor="middle"' if anchor == 'middle' else '',
           ' letter-spacing="%s"' % track if track else '',
           s))


def outlined(x, y, w, h, r):
    rect(x, y, w, h, r, 'none', 'stroke="%s" stroke-width="1.6"' % BORDER)


# ------------------------------------------------------------- the window
rect(0, 0, W, H, 0, CHROME)
rect(0, TAB_H, W, BAR_H, 0, CHROME_BAR)
rect(0, PAGE_Y, W, H - PAGE_Y, 0, PAGE_BG)

# tabs: the one in front is the colour of the toolbar it opens onto. They start
# at the same 24 the rest of the window keeps to its left edge — the gap that was
# there before belonged to nothing.
rect(24, 8, 250, 32, 10, CHROME_BAR)
circle(44, 24, 7, CHROME_INK)
rect(58, 18, 150, 12, 6, CHROME_INK)
for x in (284, 544):
    rect(x, 8, 250, 32, 10, TAB_BACK)
    circle(x + 20, 24, 7, TAB_BACK_INK)
    rect(x + 34, 18, 150, 12, 6, TAB_BACK_INK)

# back, forward, reload; then the address field
for cx in (28, 62, 96):
    circle(cx, TAB_H + 24, 9, CHROME_INK)
rect(124, TAB_H + 10, W - 124 - 260, 28, 14, FIELD)
circle(144, TAB_H + 24, 8, CHROME_INK)
rect(162, TAB_H + 18, 260, 12, 6, CHROME_INK)

# the toolbar, with the extension this popup belongs to lit up
rect(W - 236, TAB_H + 10, 28, 28, 9, TOOL_TILE)
rect(W - 198, TAB_H + 10, 28, 28, 9, TOOL_TILE)
rect(W - 160, TAB_H + 8, 32, 32, 10, EXT_TILE)
add('<g transform="translate(%d %d) scale(0.72)">%s</g>' % (W - 154, TAB_H + 14, LOGO))
circle(W - 100, TAB_H + 24, 13, CHROME_INK)
for i in range(3):
    circle(W - 52, TAB_H + 16 + i * 8, 2, KEBAB)

rect(0, PAGE_Y - 1, W, 1, 0, CHROME_LINE)

# --------------------------------------------------------------- the page
top = PAGE_Y + 12

# its own bar: a menu, a mark, a search field, some round controls
for i in range(3):
    rect(26, top + 14 + i * 7, 22, 3, 1.5, BLOCK_INK)
rect(64, top + 10, 104, 26, 6, BLOCK_INK)
rect(360, top + 8, 470, 30, 15, BLOCK)
rect(384, top + 18, 150, 10, 5, BLOCK_INK)
rect(830, top + 8, 52, 30, 15, BLOCK)
for cx in (960, 1010, 1060):
    circle(cx, top + 23, 13, BLOCK_INK)
circle(1110, top + 23, 15, AVATAR)

# the rail down the left
sy = top + 62
for i, wdt in enumerate((92, 74, 110, 86, 64, 100, 78)):
    rect(24, sy + i * 46, 22, 22, 5, BLOCK_INK)
    rect(58, sy + i * 46 + 6, wdt, 11, 5, BLOCK_INK)

# a grid of video cards: thumbnail, a stamp in its corner, avatar, two lines
gx, gy, gap = 250, top + 58, 26
card_w = (W - gx - 24 - gap * 2) / 3
# the third row runs off the bottom edge, which is what a page does
for row in range(3):
    for col in range(3):
        x = gx + col * (card_w + gap)
        shot = card_w * 9 / 16
        y = gy + row * (shot + 86)
        rect(x, y, card_w, shot, 12, BLOCK)
        rect(x + card_w - 62, y + shot - 26, 46, 16, 4, STAMP)
        circle(x + 18, y + shot + 30, 15, BLOCK_INK)
        rect(x + 44, y + shot + 18, card_w - 80, 12, 6, BLOCK_INK)
        rect(x + 44, y + shot + 38, (card_w - 80) * 0.6, 10, 5, BLOCK)

# ----------------------------------------------------------- the pitch
#
# The block sits low on the left, diagonally across from the popup in the top
# right, so the two things this banner has to say take opposite corners and the
# eye crosses the window between them, without the block being pushed so far
# down that it hangs off the bottom of the composition. DROP moves all of it at
# once, so the spacing inside the block is the same at any height.
#
# Normally set over a wash of the popup's own ground — solid where the type sits
# and gone by the time it reaches the popup, so the window still shows through at
# the edges and the two dark pieces read as one thing laid over it.
#
# --plain darkens nothing. Each line gets a solid strip of its own instead, cut
# to that line and no wider, so the words have a clean ground and the window
# keeps its own light everywhere else. Laid straight on the page they had the
# edge of a video card running through SPACED, which is what the strips fix.
#
# Each strip hugs its own line rather than all of them sharing the widest: four
# equal blocks would read as one panel with seams in it, which is the box this
# was meant to avoid. The right edges are the measured width of the line plus 22.
#
# The name's two lines share one strip. Given a strip each they left a seam
# between them, and the page showed through it as a grey line under SPACED —
# on the light window especially, where the strip is white and the line was not.
#
# Widths measured in the browser at these sizes, tracking included — every line
# is left-aligned on the same 72, so what they buy is knowing the longest of
# them (REPETITION APP, 358.1) still clears the popup by a good margin.
# The three are named in the three game colours, as banner-440x280-compact.svg
# names them. registry.js paints those buttons for white type on top of them, so
# the same colours used as type are dimmer than they should be and each is taken
# a few steps up its own hue. The one variant whose ground is white takes them
# the other way instead, since coral on white sits at about 3:1.
# ----- the name, which is two lines of one length in both versions
#
# What differs is which of the two is stretched to make that true. Ink width per
# em of type size with no tracking at all, and cap height the same way, scanned
# off rendered PNGs: per em rather than at one size, because --nomark picks its
# sizes from the measure it has to fill rather than the other way round.
PER_EM = {'SPACED': 3.8517, 'REPETITION APP': 7.8113}
CAP_EM = 0.711

# Hinting moves that first number a little from size to size — 3.8609 per em at
# 64, 3.8550 at 88, 3.8517 at 132 — so what is written above is what was read at
# the sizes actually set below, not an average of the three.
#
# Both lines are set from the same x as the slogan under them rather than from
# their own paint. The type already leans that way: the inset from origin to
# paint is 0.039 em on SPACED's S and 0.075 on REPETITION's R, because a round
# letter is drawn to hang a little past a straight one. Aligning the paint
# would apply that compensation twice. Measured, the three lines start their
# paint at 77.2, 76.6 and 75.2, which is the spread the font intends.
#
# Rendered, the two lines come out 534.7 and 534.9 against the 535 asked for.
# A fifth of a pixel apart, and a third of one short: that is the floor of
# what a scan of an antialiased edge can resolve, and where chasing it stops
# being measurement and starts being decoration.

MARGIN, MARK_SIZE = 72, 112


def tracking(words, size, measure):
    """The letter-space that brings a line's paint out to `measure`.

    Paint, not advance width: letter-spacing lands after the last glyph as well
    as between them, so a line matched on its advance sits a whole gap short of
    the line above it. len(words) - 1 counts the gaps, and the space inside
    REPETITION APP is one of the characters that gets one.
    """
    return (measure - PER_EM[words] * size) / (len(words) - 1)


# The mark holds the left of the block, the name sits beside it at 208, and both
# lines are 355.1 of paint. Reaching that from SPACED at 64 costs a tracking of
# 20.86 — a third of the type's own size, at which the word stops being a word
# and becomes six letters standing in a row.
#
# --nomark takes the logo away and sets the name to be read. The length the two
# lines share is bought with size instead of spacing: SPACED wants roughly twice
# the size of REPETITION APP to ink out as long as it, and at that ratio both
# lines land on the tracking display capitals actually want — 0.040 em on the
# big line and 0.063 on the small one. The rule behind those two numbers is that
# the larger the type, the less letterspacing it needs: 0.235 em is right for
# SPACED at 18 in the catalog header and absurd at 132.
#
# 535 is the measure the three game words below already occupy, so the name, the
# words and the slogan read as one column with one left edge and one right one.
# The block grows upward from the baseline the old one ended on, into empty page
# — downward it would close the gap that separates it from the words.
if NOMARK:
    NAME_W = 535
    TOP_SIZE, LOW_SIZE = 132, 62
    # Half the small line's cap height between them: enough to part the lines,
    # little enough that they stay one object.
    NAME_LOW = 427
    NAME_TOP = NAME_LOW - CAP_EM * LOW_SIZE * 1.5
    TOP_TRACK = '%.2f' % tracking('SPACED', TOP_SIZE, NAME_W)
    LOW_TRACK = '%.2f' % tracking('REPETITION APP', LOW_SIZE, NAME_W)
    NAME_STRIP = (MARGIN + NAME_W + 22,
                  int(round(NAME_TOP - CAP_EM * TOP_SIZE - 4)), NAME_LOW + 13)
else:
    TOP_SIZE, LOW_SIZE = 64, 40
    NAME_TOP, NAME_LOW = 375, 427
    # The pair the four shipped banners were drawn with, kept as literals. Those
    # two lines were matched on advance width rather than on paint — 250.8 for
    # SPACED at 64, where the paint is 246.7 — so tracking() would nudge them
    # both, and those four files are not the ones being redrawn here.
    TOP_TRACK, LOW_TRACK = '20.86', '3'
    NAME_STRIP = (588, 325, 440)

NAME_X = MARGIN if NOMARK else 208

# ----- the pitch down the page
#
# Ink width per em at weight 800, and the ascender and descender the same way,
# scanned like everything else here. Quizzes became quiz: on one line the plural
# was the longest thing in the column and said no more than the singular.
# The wording each variant was asked for rather than one imposed on both.
# --tall shortens the middle line to quiz and leaves the rest: there the list
# shares the page with the name, and the plural was the longest thing on it.
# --stack cuts further — Flashcards closed up into the one word it usually is,
# and Quizzes standing alone. The bubble in the popup still reads flash over
# cards, which is a phrase about the game and not the name of the thing.
#
# Dropping Vocabulary also takes the longest line off the list: Memory games is
# now the widest of the three at 7.53 per em, where Vocabulary quizzes was 9.42.
# The measure the popup leaves is no longer what decides the type size.
STACKED = STACK and not TALL
ROWS = ('Flashcards' if STACKED else 'Flash cards',
        'Quizzes' if STACKED else 'Vocabulary quiz',
        'Memory games')
ROW_EM = (5.0401, 3.7110, 7.5287) if STACKED else (5.3187, 7.8835, 7.5287)
ASC_EM, DESC_EM = 0.740, 0.230

# The two baselines of the three columns, before DROP. Named because --middle
# has to know where the pitch ends, and a number written twice drifts.
PITCH_TOP, PITCH_LOW = 524, 564

# How far the three sit below the last line of the name. Read off the layout
# that is already there rather than chosen: --stack hangs its list at the same
# distance the two-line columns hang at, so a bigger type size changes the size
# and nothing else about where the block sits.
PITCH_GAP = PITCH_TOP - ASC_EM * 36 - NAME_LOW

if STACK and not TALL:
    # Three columns of two lines became three lines of one, which is a list read
    # downward rather than a row read across.
    #
    # 54 against the 36 the columns took: half again as large, and the longest of
    # the three inks 407 there, well clear of the popup beside it.
    # --small takes it to 44. What the two sizes really differ in is how far they
    # stand from REPETITION APP at 62: 54 is 0.87 of it, close enough that the
    # list reads as a second name, where 44 is 0.71 and reads as a list under the
    # first. Neither is wrong — they say different things about what the three
    # words are for.
    #
    # Leading stays 1.45 of the size, so the three hold together as one group at
    # either size rather than loosening when they shrink.
    ROW_SIZE, ROW_LEAD = (44, 64) if SMALL else (54, 78)
    STACK_FIRST = NAME_LOW + PITCH_GAP + ASC_EM * ROW_SIZE   # before DROP
    PITCH_INK_LOW = STACK_FIRST + 2 * ROW_LEAD + DESC_EM * ROW_SIZE
else:
    ROW_SIZE, ROW_LEAD = 36, 40
    PITCH_INK_LOW = PITCH_LOW + DESC_EM * 36

# --middle gives up the diagonal. The block low on the left and the popup high on
# the right were placed to send the eye across the window between them; centred,
# the two simply stand side by side and the window is what they stand on.
#
# DROP moves the whole pitch at once, so centring it is one number: the one that
# puts the middle of its ink on the middle of the page. Ink, so the first line's
# cap at the top and the last line's descender at the bottom — two of the three
# words down there end in a tail, which is enough for the eye to count them.
#
# Scanned, the block lands on 443 against the 444 asked for. At 36 the tails
# rasterise shallower than the outline's 0.233 em, and a pixel is well inside
# the question of where a block ends at all: centred on cap-to-baseline instead,
# ignoring the tails, it would sit four higher. Not a number worth chasing.
if MIDDLE and not TALL:
    pitch_top = NAME_TOP - CAP_EM * TOP_SIZE
    DROP = (PAGE_Y + H) / 2.0 - (pitch_top + PITCH_INK_LOW) / 2.0

# How far the paint starts from the text's origin, per em, at weight 800. F and
# M carry 0.063. The middle line begins on whichever letter its wording gives
# it, and both of those hang: V carries 0.004 and Q 0.026, because a diagonal
# and a round are drawn to reach past where a stem stops. Set from one origin
# the lines would start apart — 3.2 of it in V's case — and between lines of
# one size sitting under each other that reads as a slip rather than as a
# refinement, since the eye compares them directly. It does not do that for the
# name and the slogan, which are at sizes of their own. So the middle line is
# given half of what it takes: it still hangs, by half as much.
ROW_INSET = (0.0628, 0.0264, 0.0628) if STACKED else (0.0628, 0.0037, 0.0628)

SLOGAN_SIZE, SLOGAN_ASC = 38, 29.0

# The line that closes the block. --nomark names the three places the app runs
# instead of saying again what the three coloured words above it already say;
# the four shipped banners keep the slogan they were drawn with. Ink at 38, so
# the strip under it in --plain is cut to the line and not to the old one: 498.3
# against the slogan's 475.
if NOMARK:
    SLOGAN_WORDS, SLOGAN_W = 'Extension / Desktop / Mobile', 498.3
else:
    SLOGAN_WORDS, SLOGAN_W = 'Remember words anywhere', 475.0

if TALL:
    # Three columns of two lines each became three lines stacked, which is a
    # list rather than a row: read down instead of across, and each of the three
    # is a phrase rather than two words that have to be put back together.
    #
    # 54 puts them well under REPETITION APP at 62, so the two things on the
    # page stay in the order they should be read in. Bigger would outrank the
    # name; the widest of the three inks 426 at this size and keeps clear of the
    # popup.
    ROW_SIZE, ROW_LEAD = 54, 78

    # No slogan here. Remember words anywhere was a line of white saying what the
    # three coloured ones underneath it already said, and a banner that says a
    # thing twice is a banner with one thing on it and a repetition.
    #
    # What is left takes the page by its two ends: the name against the top, the
    # three against the bottom, 46 clear of the chrome and of the lower edge. The
    # space between them is not a gap that wants filling — it is the window, which
    # is the other half of what this banner has to show.
    INSET = 46
    DROP = 0

    NAME_TOP = PAGE_Y + INSET + CAP_EM * TOP_SIZE
    NAME_LOW = NAME_TOP + CAP_EM * LOW_SIZE * 1.5

    # Counted up from the foot rather than down from the name: what has to land
    # on a round number is the last descender, and the lines above follow it.
    ROW_BASES = [H - INSET - DESC_EM * ROW_SIZE - i * ROW_LEAD for i in (2, 1, 0)]
    ROW_XS = [MARGIN + (max(ROW_INSET) - inset) * ROW_SIZE / 2.0
              for inset in ROW_INSET]

    NAME_STRIP = (MARGIN + NAME_W + 22,
                  int(round(NAME_TOP - CAP_EM * TOP_SIZE - 4)), int(round(NAME_LOW + 13)))
    ROW_STRIP = (MARGIN + max(ROW_EM) * ROW_SIZE + 22,
                 int(round(ROW_BASES[0] - ASC_EM * ROW_SIZE - 4)),
                 int(round(ROW_BASES[-1] + DESC_EM * ROW_SIZE + 8)))
    STRIPS = (NAME_STRIP, ROW_STRIP)
else:
    SLOGAN_BASE = 660 + DROP
    if STACK:
        ROW_BASES = [STACK_FIRST + i * ROW_LEAD + DROP for i in range(3)]
        ROW_XS = [MARGIN + (max(ROW_INSET) - inset) * ROW_SIZE / 2.0
                  for inset in ROW_INSET]
    else:
        ROW_BASES, ROW_XS = (), ()
    # 573 is the number the four shipped banners were drawn with, which is 4
    # wider than their own slogan asks for; only the new line is cut to measure.
    slogan_right = int(round(MARGIN + SLOGAN_W + 22)) if NOMARK else 573
    three = ((int(round(MARGIN + max(ROW_EM) * ROW_SIZE + 22)),
              int(round(ROW_BASES[0] - ASC_EM * ROW_SIZE - 4 - DROP)),
              int(round(ROW_BASES[-1] + DESC_EM * ROW_SIZE + 8 - DROP)))
             if STACK else (629, 493, 578))
    STRIPS = (NAME_STRIP, three)
    if not NOLINE:
        STRIPS += ((slogan_right, 629, 673),)

if LIGHT and PLAIN:
    WORD_INKS, SLOGAN_INK = ('#c4462f', '#8a6a10', '#0e8a6d'), '#0d2836'
else:
    WORD_INKS, SLOGAN_INK = ('#ff9d88', '#ecc04a', '#72dcbe'), '#ffffff'

if PLAIN:
    NAME_INK = '#0d2836' if LIGHT else '#ffffff'

    # right edge, top, bottom: the name, the three words, the slogan. The name's
    # strip follows wherever its two lines ended up — 4 above the first cap,
    # 13 under the last baseline, 22 past the line they are both as long as.
    for right, a, b in STRIPS:
        rect(48, a + DROP, right - 48, b - a, 10, '#ffffff' if LIGHT else GROUND)
else:
    NAME_INK = INK
    # A few steps below the popup's own ground rather than the same colour: at
    # equal darkness the panel merged into the wash behind it, and the way to
    # keep it a separate surface is for the thing around it to be the darker one.
    WASH = '#08202d'
    # A cosine ramp rather than a straight one, and carried to the far edge
    # instead of stopping at 0.8. A linear fade arrives at zero at an angle, and
    # the eye reads that arrival as a line; cosine leaves flat and arrives flat,
    # so there is nowhere in it for an edge to show. Solid to 0.35, which is
    # where the words end, then down over the whole of the rest.
    stops = ['<stop offset="0" stop-color="%s" stop-opacity="0.98" />' % WASH,
             '<stop offset="0.35" stop-color="%s" stop-opacity="0.95" />' % WASH]
    for i in range(1, 15):
        t = 0.35 + 0.65 * i / 14.0
        fade = 0.95 * (math.cos(math.pi * (t - 0.35) / 0.65) + 1) / 2
        stops.append('<stop offset="%.3f" stop-color="%s" stop-opacity="%.3f" />' % (t, WASH, fade))
    add('<linearGradient id="wash" x1="0" y1="0" x2="1" y2="0">%s</linearGradient>'
        % ''.join(stops))
    rect(0, PAGE_Y, W, H - PAGE_Y, 0, 'url(#wash)')

# The two lines of the name are the same length, and the letters of SPACED are
# what was stretched to do it — the size stays 64. That length is measured on the
# ink rather than on the advance: letter-spacing puts a gap after the last letter
# as well as between them, so a line matched by advance sits short by one of
# those gaps. SPACED is 250.8 of glyph at this size, so five gaps of 20.86 bring
# it to the 355.1 that REPETITION APP inks out at.
if not NOMARK:
    add('<g transform="translate(%d %d) scale(%.3f)">%s</g>'
        % (MARGIN, 325 + DROP, MARK_SIZE / 32.0, LOGO))
text(NAME_X, NAME_TOP + DROP, 'SPACED', TOP_SIZE, 800, NAME_INK, track=TOP_TRACK)
text(NAME_X, NAME_LOW + DROP, 'REPETITION APP', LOW_SIZE, 700, NAME_INK,
     track=LOW_TRACK)

# The three, set the way banner-440x280-compact.svg sets them: two lines each,
# broken where the words break. Splitting is what pays for the size — 36 against
# the 30 the row took on one line — and three two-line columns read as one row of
# three things rather than a list with something hanging off it.
#
# Each column is as wide as its wider line and they are set apart by space rather
# than by punctuation: a row of dots would be a mark nobody asked for. The gap is
# 46, which puts the right edge at 607 and leaves the popup its own room.
if TALL or STACK:
    for words, x, base, colour in zip(ROWS, ROW_XS, ROW_BASES, WORD_INKS):
        text(x, base, words, ROW_SIZE, 800, colour)
else:
    COLUMNS = (
        (('Flash', 90.4), ('cards', 94.2)),
        (('Vocabulary', 199.4), ('Quizzes', 135.4)),
        (('Memory', 149.1), ('games', 115.1)),
    )
    at = MARGIN
    for ((top_line, top_wide), (low_line, low_wide)), colour in zip(COLUMNS, WORD_INKS):
        column = max(top_wide, low_wide)
        mid = at + column / 2
        text(mid, PITCH_TOP + DROP, top_line, 36, 800, colour, anchor='middle')
        text(mid, PITCH_LOW + DROP, low_line, 36, 800, colour, anchor='middle')
        at += column + 46

# The slogan is the one line that is not shouted: the three above it are 800, and
# a fourth at that weight would leave nothing to look at first.
#
# The three blocks are 61 apart now rather than 33 — the name, the three things
# and the line about why. At 33 they were closer to each other than the two lines
# inside the name are, so the four lines read as one stack instead of three
# things said one after another.
# --noline ends the block on the three words. The line under them is the only
# thing on this banner set in plain white, and taking it off leaves the three
# game colours as the last thing read — which is what the tile is selling.
if not (TALL or NOLINE):
    text(MARGIN, SLOGAN_BASE, SLOGAN_WORDS, SLOGAN_SIZE, 600, SLOGAN_INK)

# -------------------------------------------------------------- the popup
#
# The panel is one set card and nothing else: no header over it, no name on it,
# no buttons for editing it. What is left is what the app is for — words
# ripening, a bar under them, and the three ways to play — and none of the
# furniture around that.
#
# The bubbles hold phrases rather than a word and its translation. On a banner
# the pair would only be legible to someone who already reads both languages;
# the phrases say what the thing does to anyone.
PX, PY, PW = 690, 100, 560

# Each phrase in two lines, the top one heavier, with both widths measured in
# the browser at the sizes they are set here. The stage on the end is the colour
# the bubble wears, so the row reads as a set part-way up the ramp.
#
# These two rows hold phrases rather than a word and its translation, because a
# pair would only be legible to someone who already reads both languages, and a
# phrase says what the thing does to anyone.
BUBBLES = [
    [('learn', 'words', 62.3, 68.6, 0),
     ('active', 'recall', 73.2, 60.2, 3),
     ('flash', 'cards', 60.0, 59.7, 5),
     ('memory', 'games', 102.6, 74.3, 1)],
    [('spaced', 'review', 84.6, 73.7, 7),
     ('daily', 'practice', 59.8, 89.7, 10),
     ('word', 'streaks', 63.9, 79.1, 12)],
]

# --words does the thing the paragraph above argues against, and on purpose. It
# rebuilds the whole set around real words, each over its English: Spanish,
# Chinese and Hebrew, Japanese, Arabic and Greek, Japanese again, Korean and
# Hindi. Latin, Han, kana, Hangul, Devanagari, Greek, and two alphabets written
# right to left.
#
# What those cards say is not what the app does but what it can hold, and no
# phrase in English shows that. Four of the phrases stay, because something has
# to say what the picture is of.
#
# The second card is どんな言語でも over "any language", and it is second because
# that is the claim the whole set is making — the one card that is not a word
# being learned. Sitting it there costs the first row two of its phrases: at 205
# it is the widest bubble on the banner by 53, and a row of four with it in runs
# 527 against the 472 the card has. So the row holds three and the rest reflow,
# which is why flash cards and memory games are now on the second row and read
# has come up to the third.
#
# The rows come out 427, 395, 424 and 427 wide, which is as even as thirteen
# bubbles of these widths go, and four rows is what the popup was already built
# for. Every gloss still avoids the words the phrases use, so nothing in the
# popup is said twice.
#
# Right to left needs nothing here: the bidi algorithm orders Hebrew and Arabic
# inside their own runs, and the label is centred on its bubble either way. The
# glyphs come from whatever the system falls back to, since the font stack in
# this file is a Latin one — fine for a PNG rendered on the machine that built
# it, and worth knowing before opening the SVG anywhere else.
#
# Thirteen bubbles over twelve steps of the ramp. All thirteen were distinct
# once, and two of them — practice and study — came back down because the top of
# the ramp is where its colours stop being pale: 14 and 13 sit at luminance 0.39
# and 0.44 against 0.47 to 0.85 for every other step, so those two bubbles read
# as the dark ones in a popup of pastels. There is no light violet to move them
# to, and inventing one is not on offer — this table is core/tokens.js and has to
# stay it — so they took 10 and 3 instead, and study now shares gold with active
# recall. A repeated step is what a real set looks like anyway; two identical
# bubbles side by side would not be, and neither would the two pale yellows of
# steps 1 and 2, which is why flash cards sits between them on the second row.
#
# The bar above them follows from these numbers rather than being set, so it
# reads 38, and moving cards between rows does not touch it.
if WORDS:
    BUBBLES = [
        [('learn', 'words', 62.3, 68.6, 0),
         (u'どんな言語でも', 'any language', 175.0, 152.4, 6),
         ('active', 'recall', 73.2, 60.2, 3)],
        [('memory', 'games', 102.6, 74.3, 1),
         ('flash', 'cards', 60.0, 59.7, 5),
         ('espaciado', 'spaced', 122.2, 78.7, 2)],
        [(u'每日', 'daily', 50.0, 53.9, 8),
         (u'תרגול', 'practice', 52.1, 89.7, 10),
         (u'復習', 'review', 50.0, 73.7, 4),
         (u'पढ़ना', 'read', 56.8, 50.4, 7)],
        [(u'تذكر', 'remember', 35.2, 117.5, 9),
         (u'μελέτη', 'study', 86.4, 62.2, 3),
         (u'암기', 'memorize', 50.0, 113.2, 11)],
    ]

phrases = [p for row in BUBBLES for p in row]
progress = int(round(sum(p[4] for p in phrases) * 100.0 / (len(phrases) * (len(STAGES) - 1))))

# The card is measured from what it holds rather than given a height: padding,
# the bar, the rows of bubbles, the buttons, padding again.
PAD, BAR_H2, BUBBLE_H, ROW_GAP, PLAY_H = 24, 10, 78, 10, 66
rows = len(BUBBLES)
CH = (PAD + BAR_H2 + 20 + rows * (BUBBLE_H + ROW_GAP) - ROW_GAP + 18 + PLAY_H + PAD)
PH = CH + 40

# Centred on the page rather than hung off the toolbar. PY is only read below,
# once PH is known, which is why it can be answered here and not where the popup
# is first described.
if MIDDLE:
    PY = (PAGE_Y + H) / 2.0 - PH / 2.0

# the percents are doubled because the whole string is formatted below
add('<filter id="lift" x="-20%%" y="-20%%" width="140%%" height="140%%">'
    '<feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="%s" flood-opacity="%s" /></filter>'
    % (SHADOW, SHADOW_ALPHA))
add('<g filter="url(#lift)">')
rect(PX, PY, PW, PH, 22, GROUND)
add('</g>')

CX, CY, CW = PX + 20, PY + 20, PW - 40
rect(CX, CY, CW, CH, 24, SURFACE, 'stroke="%s" stroke-width="1.4"' % BORDER)
inner = CW - 48

rect(CX + 24, CY + PAD, inner, BAR_H2, 5, SOFT)
rect(CX + 24, CY + PAD, inner * progress / 100.0, BAR_H2, 5, MINT)

by = CY + PAD + BAR_H2 + 20
for row in BUBBLES:
    widths = [max(a, b) + 30 for _, _, a, b, _ in row]
    x = CX + 24 + (inner - sum(widths) - ROW_GAP * (len(row) - 1)) / 2
    for (top_line, low_line, _, _, stage), bw in zip(row, widths):
        fill, ink, sub = STAGES[stage]
        rect(x, by, bw, BUBBLE_H, 18, fill)
        text(x + bw / 2, by + 33, top_line, 25, 800, ink, anchor='middle')
        text(x + bw / 2, by + 62, low_line, 25, 600, sub, anchor='middle')
        x += bw + ROW_GAP
    by += BUBBLE_H + ROW_GAP

# ---------------------------------------------------------- the three games
#
# No icons on them any more. The three words are the widest type on the banner
# and they earn that by being the only thing on their buttons: an icon beside a
# 36px label would either be lost against it or push the label back down.
#
# 36 is what the widest of them will take. Cards is 94.1 across at that size and
# the button is 149.3, which leaves 28 on each side; at 40 that falls to 23 and
# the row starts to look packed.
GAMES = (('Cards', CORAL), ('Quiz', GOLD), ('Play', MINT))
gw = (inner - 12 * (len(GAMES) - 1)) / len(GAMES)
gy2 = CY + CH - PAD - PLAY_H
for i, (label, colour) in enumerate(GAMES):
    x = CX + 24 + i * (gw + 12)
    rect(x, gy2, gw, PLAY_H, 17, colour)

    # Sat on the caps rather than on the line: they measure 27 tall at this size,
    # so half of that below the middle centres what the eye reads as the word.
    # The tails of Quiz and Play hang below it, which is where tails belong —
    # centring on them instead would push both labels visibly high.
    text(x + gw / 2, gy2 + PLAY_H / 2 + 13.5, label, 36, 700, '#ffffff', anchor='middle')

NOTE = """    <!--
        Store banner, 1280x800. Built by promo/make-big-banner.py.

        The app opened over a page you were already reading, which is what an
        extension is. The page behind it is wireframe on purpose: it stands for
        any video site without wearing anyone's name or mark.

        The popup is drawn in the real palette from core/tokens.js and
        registry.js, and every label sits at a width measured in the browser at
        the size it is set here — so each bubble fits its own two words, and the
        icon and the label on a game button are centred together as one object
        rather than each on its own.%s
    -->
""" % ''.join(paragraph for wanted, paragraph in (
    # Built up rather than concatenated onto the %-format: `a %% b + c` binds
    # the + after the %%, which used to put these paragraphs past the --> and
    # leave them loose in the file, outside the comment they belong to.
    (NOMARK, '''

        The name carries this corner without a mark beside it, so it is set to
        be read rather than locked up: its two lines are one length because
        their sizes make them one, not because the short one was spaced out to
        match. Both then keep the light tracking display capitals want.'''),
    (NOMARK and not (TALL or NOLINE), '''

        The line under the block names where the app runs — what it does is
        already said, in three colours, directly above it.'''),
    (STACK and not TALL, '''

        The three things the app offers are one line each, read down the page
        rather than across it, and larger than the two-line columns were. They
        hang below the name at the distance those columns hung at, so what
        changed is how large they are and not where the block sits.'''),
    (MIDDLE, '''

        The popup and the pitch share one vertical centre here, rather than
        taking opposite corners of the window. The diagonal was there to walk
        the eye from one to the other; centred, the two are read as one row of
        two things, and the window is the ground they are laid on instead of
        the distance between them.'''),
    (TALL, '''

        The pitch takes the page by its two ends: the name against the top,
        the three things it offers against the bottom, read downward as a list
        rather than across as a row. The slogan that used to close the block is
        gone with them — it said in white what the three say in their own
        colours, and what is between the two ends is the window.'''),
) if wanted)

svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">\n'
       '%s    %s\n</svg>\n' % (W, H, W, H, NOTE, '\n    '.join(out)))

# --noline earns a name of its own only where there was a line to drop: --tall
# has none to begin with, and a second file identical to the first helps nobody.
name = 'promo/banner-1280x800%s%s%s%s%s%s%s%s.svg' % (
    '-light' if LIGHT else '', '-plain' if PLAIN else '',
    '-tall' if TALL else '-nomark' if NOMARK else '',
    '-noline' if NOLINE and not TALL else '',
    '-words' if WORDS else '',
    '-middle' if MIDDLE else '',
    '-stack' if STACK and not TALL else '',
    '-small' if SMALL and STACK and not TALL else '')
io.open(name, 'w', encoding='utf-8', newline='\n').write(svg)
print('%s written, %d shapes' % (name, len(out)))
