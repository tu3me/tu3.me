/**
 * Spaced repetition algorithm. Pure: takes a word, replays its stored
 * repetitions and derives everything else. Owns no DOM and no storage.
 */
function spacedRepetitions() {
    const MINUTE = 60 * 1000;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    // Thirteen rungs, so a word has thirteen states to be in and the bubble ramp
    // has thirteen colours to say which. Roughly a doubling each time: the first
    // hour is where a new word is won or lost, so the early rungs are minutes
    // apart, and past a day the gaps stretch to weeks because a word that
    // survived a day is not at risk of being forgotten by tomorrow.
    const INTERVALS = [
        0,                      // stage 0 — starting state, word is available right away
        3 * MINUTE,
        5 * MINUTE,
        10 * MINUTE,
        30 * MINUTE,
        1 * HOUR,
        4 * HOUR,
        12 * HOUR,
        1 * DAY,
        2 * DAY,
        4 * DAY,
        7 * DAY,
        14 * DAY
    ];

    // Stage s waits INTERVALS[s]; the last interval is the maximum stage
    const MAX_STAGE = INTERVALS.length - 1;

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
        let nextRepetition = null; // null — stage 0, no timer set yet
        const marks = [];

        for (const rep of reps) {
            const success = rep.result === 1;
            const isEarly = nextRepetition !== null && rep.timestamp < nextRepetition;

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

        return { stage, errors, nextRepetition, marks };
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

    spacedRepetitions.getWordProgress = getWordProgress;
    spacedRepetitions.getWordStats = getWordStats;
    spacedRepetitions.isWordDue = isWordDue;
    spacedRepetitions.calculateSetProgress = calculateSetProgress;
}
