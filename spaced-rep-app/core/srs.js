/**
 * Spaced repetition algorithm. Pure: takes a word, replays its stored
 * repetitions and derives everything else. Owns no DOM and no storage.
 */
function spacedRepetitions() {
    const MINUTE = 60 * 1000;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    /*
     * Fifteen rungs, so a word has fifteen states to be in and the bubble
     * ramp has fifteen colours to say which.
     *
     * The ladder itself is the ordinary one, in two halves. Below a day each
     * rung is three times the last — five minutes, a quarter of an hour, three
     * quarters, two hours, six — which is the expanding rehearsal every
     * introduction to this subject opens with, and it is what carries a word
     * through the evening it was met in. Above a day it is 1-3-7-14-30 and
     * then double, which is Leitner.
     *
     * Eight months at the top, reached by doubling twice past two months. The
     * top of this ladder is not a place a word arrives at quickly — eleven
     * right answers in a row, the last of them most of a year after the
     * first — and that is what the last colour of the ramp is for: not
     * "answered a lot lately" but "this one is yours now".
     *
     * Days rather than months at the top, because days are what the settings
     * panel can write and read back: 60d, not 2mo. The unit is the only thing
     * being simplified, not the number.
     *
     * None of this is fixed any more — the panel edits every rung — so these
     * are the numbers a person starts from and not the numbers they are stuck
     * with.
     */
    const DEFAULTS = [
        0,                      // stage 0 — starting state, word is available right away

        /*
         * Stage 1 waits for nothing either, and it is the only rung a success
         * cannot reach: a success sets stage = successRun + 1 with successRun at
         * least 1, so it lands on 2 or above. Stage 1 is what an error leaves
         * behind when the penalty has taken the whole run — "got it wrong with
         * nothing to fall back on" — and that is a word to be asked again now
         * rather than in three minutes.
         */
        0,
        5 * MINUTE,
        15 * MINUTE,
        45 * MINUTE,
        2 * HOUR,
        6 * HOUR,
        1 * DAY,
        3 * DAY,
        7 * DAY,
        14 * DAY,
        30 * DAY,
        60 * DAY,
        120 * DAY,
        240 * DAY
    ];

    /*
     * The intervals actually in force, which the player is allowed to change —
     * see the Repetition intervals section of the settings panel.
     *
     * A copy rather than the array itself, because the defaults have to survive
     * being replaced: the panel offers a way back to them, and an array handed
     * out and then written into would take that away.
     *
     * How many there are is not up for discussion. Fifteen is not a number this
     * algorithm happens to use, it is the number of states a word can be in and
     * the number of colours the bubble ramp has to say which — one more rung
     * would be a rung with no colour and no meaning.
     */
    let INTERVALS = DEFAULTS.slice();

    // Stage s waits INTERVALS[s]; the last interval is the maximum stage
    const MAX_STAGE = DEFAULTS.length - 1;

    // How many stages a mistake costs (the stage never drops below 1)
    const ERROR_PENALTY = 3;

    // Statuses of the repetition timeline: one per repetition or elapsed interval.
    // How each one is drawn is dict's business — see MARK_ICONS there.
    const MARKS = {
        OK: 'OK',                 // success, repeated within the current interval window
        FAIL: 'FAIL',             // error, repeated within the current interval window
        LATE_OK: 'LATE_OK',       // success after one or more skipped intervals
        LATE_FAIL: 'LATE_FAIL',   // error after one or more skipped intervals
        MISSED: 'MISSED',         // interval elapsed and the word was not repeated (yet)
        EARLY_OK: 'EARLY_OK',     // success in an early (ahead of the timer) repetition
        EARLY_FAIL: 'EARLY_FAIL'  // error in an early repetition
    };

    // Helper: count how many progressive SRS checkpoints elapsed between two timestamps.
    // The first checkpoint is at nextRepetitionTime, then each skipped interval advances
    // the simulated stage, so the following checkpoint is INTERVALS[simStage + 1] later.
    function countElapsedCheckpoints(nextRepetitionTime, untilTime, stageAfterLastRepetition) {
        let count = 0;
        let checkTime = nextRepetitionTime;
        let simStage = stageAfterLastRepetition;

        while (checkTime < untilTime) {
            count++;
            simStage = Math.min(MAX_STAGE, simStage + 1);
            const nextCheck = checkTime + INTERVALS[simStage];
            if (nextCheck <= checkTime) break; // safety: prevent infinite loop
            checkTime = nextCheck;
        }

        return count;
    }

    /**
     * Single source of truth: replays the stored repetitions and derives everything else.
     * Only { timestamp, result, game } is persisted — stage, nextRepetition and the
     * timeline marks are always recalculated here.
     *
     * Rules:
     *  - stage 0 means "no repetitions yet": no timer, the word is due and cannot be repeated early;
     *  - otherwise stage = error-free repetitions since the start (or since the last error) + 1,
     *    so the very first successful repetition puts the word on stage 2;
     *  - an early repetition (before nextRepetition) never raises the stage; an early success also
     *    leaves the running timer alone, while an early error is a full mistake and restarts it;
     *  - a repetition that closes N elapsed checkpoints renders N-1 warnings plus its own result mark,
     *    and on success counts as N error-free repetitions (skipped intervals count as successful);
     *  - any mistake costs ERROR_PENALTY stages (stage - 3), but never drops below stage 1.
     */
    function getWordProgress(word, nowTs = Date.now()) {
        const reps = [...(word.repetitions || [])].sort((a, b) => a.timestamp - b.timestamp);

        let stage = 0;
        let successRun = 0; // error-free repetitions since the start or the last error
        let errors = 0;

        // Whether the most recent answer was wrong, which is not the same thing
        // as being on a low stage: a word with a long run behind it lands well
        // above the floor after a mistake, and is still a word that was just
        // got wrong. dict draws it differently — see FAIL_INK there.
        let lastFailed = false;
        let nextRepetition = null; // null — stage 0, no timer set yet
        const marks = [];

        for (const rep of reps) {
            const success = rep.result === 1;
            const isEarly = nextRepetition !== null && rep.timestamp < nextRepetition;

            // Set for every repetition, early ones included: an early success
            // changes nothing else about the word, but it is still the last
            // answer given and it was not a mistake.
            lastFailed = !success;

            if (isEarly) {
                marks.push(success ? MARKS.EARLY_OK : MARKS.EARLY_FAIL);

                // An early success changes nothing: the stage does not grow and the timer is
                // left running, so the word still comes up at its originally planned time.
                if (success) continue;

                errors += 1;
                successRun = Math.max(0, successRun - ERROR_PENALTY);
                stage = successRun + 1;
            } else {
                // How many checkpoints elapsed since the word became available
                const elapsed = nextRepetition === null
                    ? 1
                    : Math.max(1, countElapsedCheckpoints(nextRepetition, rep.timestamp, stage));

                for (let i = 0; i < elapsed - 1; i++) marks.push(MARKS.MISSED);

                if (success) {
                    marks.push(elapsed > 1 ? MARKS.LATE_OK : MARKS.OK);
                    successRun += elapsed;
                    stage = Math.min(MAX_STAGE, successRun + 1);
                } else {
                    marks.push(elapsed > 1 ? MARKS.LATE_FAIL : MARKS.FAIL);
                    errors += 1;
                    successRun = Math.max(0, successRun - ERROR_PENALTY);
                    stage = successRun + 1;
                }
            }

            nextRepetition = rep.timestamp + INTERVALS[stage];
        }

        // Checkpoints that already elapsed but have not been closed by a repetition yet.
        // They are displayed, but do not affect the stage until the word is actually repeated.
        if (nextRepetition !== null && nowTs >= nextRepetition) {
            const pending = countElapsedCheckpoints(nextRepetition, nowTs, stage);
            for (let i = 0; i < pending; i++) marks.push(MARKS.MISSED);
        }

        return { stage, errors, nextRepetition, marks, lastFailed };
    }

    // Thin wrapper used by the quiz screen and the set progress bar
    function getWordStats(word) {
        const progress = getWordProgress(word);
        return { stage: progress.stage, errors: progress.errors, nextReview: progress.nextRepetition };
    }

    function isWordDue(word) {
        const { nextRepetition } = getWordProgress(word);
        return nextRepetition === null || Date.now() >= nextRepetition;
    }

    function calculateSetProgress(words) {
        if (!words || words.length === 0) return 0;
        const totalStages = words.reduce((sum, w) => sum + (getWordStats(w).stage || 0), 0);
        const maxStages = words.length * MAX_STAGE;
        return Math.round((totalStages / maxStages) * 100);
    }

    /*
     * Taking a new set of intervals, and refusing a set that is not one.
     *
     * The only setting in this app a person types rather than picks, which is
     * the whole reason for the check: everything else arrives from a switch that
     * can only produce the two things it has. A length that does not match would
     * silently shorten the ladder, and a value that is not a number would turn
     * every date it touches into NaN — a word that is due never and shows a
     * timer of nothing.
     */
    function setIntervals(list) {
        if (!Array.isArray(list) || list.length !== DEFAULTS.length) return false;
        if (!list.every(ms => Number.isFinite(ms) && ms >= 0)) return false;

        INTERVALS = list.slice();
        return true;
    }

    spacedRepetitions.intervals = () => INTERVALS.slice();
    spacedRepetitions.defaultIntervals = () => DEFAULTS.slice();
    spacedRepetitions.setIntervals = setIntervals;
    spacedRepetitions.getWordProgress = getWordProgress;
    spacedRepetitions.getWordStats = getWordStats;
    spacedRepetitions.isWordDue = isWordDue;
    spacedRepetitions.calculateSetProgress = calculateSetProgress;
}
