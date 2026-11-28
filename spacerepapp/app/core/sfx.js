/*
 * The games' sound effects: everything they hear that is not the voice.
 *
 * Word search had them first, on 8 November 2026, in its own file; the owner
 * then asked for them in every game (9 November), and the means came here,
 * beside speech.js, for the same reason the voice is there: how a sound is
 * made is not a game's business. What each game plays, and when, stays in the
 * game -- a right answer in the quiz and a letter eaten by the snake are each
 * their own game's call.
 *
 * Made on the spot with Web Audio rather than played from files: nothing to
 * fetch, nothing more for the service worker to cache than this file, and a
 * chime that can climb with the stage. Quiet, under the voice that often
 * speaks at the same moment.
 *
 * Under a switch of their own, apart from the voice's (speech.mute): the
 * owner's call, 9 November 2026, with the settings in every game -- see
 * page.settingsButton in game-page.js. Until then Word search's sounds went
 * off with the voice.
 *
 * Loaded on the game pages only; the catalog plays none.
 */
function sfx() {
    let on = true;
    let audio = null;
    let out = null;
    let hiss = null;

    sfx.on = () => on;
    sfx.enable = (value) => { on = !!value; };

    /*
     * How loud, 0 to 1, from the slider the switch's line is in the games'
     * settings (the owner's call, 9 November 2026): every sound's level is
     * LOUDER times this much of what it was made at. VOLUME, the slider's
     * place until somebody moves it, is where the two come to the level the
     * sounds were made at -- the owner asked the same evening for room to go
     * louder, the slider standing at 40% and sounding as before: 0.4 x 2.5.
     * Nobody had moved the slider yet (it had not been published), so no
     * level saved before needed turning down.
     */
    sfx.VOLUME = 0.4;
    const LOUDER = 1 / sfx.VOLUME;

    let volume = sfx.VOLUME;

    sfx.volume = () => volume;
    sfx.setVolume = (value) => { volume = Math.max(0, Math.min(1, +value || 0)); };

    /*
     * The page's sound, or null when it is switched off or cannot be had
     * (the slider goes no lower than 5%: see LEAST_LEVEL in game-page.js). Off too with all the app's sound off -- the
     * switch in the catalog's settings and at the head of the games' (see
     * speech.mute), which is over this one: the owner's call, 9 November
     * 2026.
     */
    function sound() {
        if (!on || volume < 0.01) return null;
        if (typeof speech !== 'undefined' && speech.muted()) return null;

        try {
            if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
            if (audio.state === 'suspended') audio.resume();

            // Everything through a limiter on its way out: at the top of the
            // slider a fanfare's notes and a gust together come past full
            // scale, and a sound past it cracks. Below that it does nothing
            if (!out) {
                out = audio.createDynamicsCompressor();
                out.threshold.value = -3;
                out.knee.value = 6;
                out.ratio.value = 12;
                out.attack.value = 0.003;
                out.release.value = 0.15;
                out.connect(audio.destination);
            }
        } catch (e) {
            return null;
        }

        return audio;
    }

    // White noise, a second of it made once: what a gust and a pop are cut from
    function noise(ctx) {
        if (!hiss) {
            hiss = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const data = hiss.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }

        const src = ctx.createBufferSource();
        src.buffer = hiss;
        return src;
    }

    // A level that rises from nothing to `peak` at `top` seconds and dies by `end`
    function swell(ctx, t, peak, top, end) {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * volume * LOUDER), t + top);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + end);
        return gain;
    }

    // Wind, `length` ms from `delay` ms on: noise through a band that climbs
    // and falls back, swelling to the middle and fading. `loud` 0.16 unless said
    sfx.gust = (delay, length, loud) => {
        const ctx = sound();
        if (!ctx) return;

        const t = ctx.currentTime + delay / 1000;
        const d = length / 1000;

        const band = ctx.createBiquadFilter();
        band.type = 'bandpass';
        band.Q.value = 1.2;
        band.frequency.setValueAtTime(400, t);
        band.frequency.exponentialRampToValueAtTime(1800, t + d * 0.6);
        band.frequency.exponentialRampToValueAtTime(700, t + d);

        const src = noise(ctx);
        src.connect(band).connect(swell(ctx, t, loud || 0.16, d * 0.5, d)).connect(out);
        src.start(t);
        src.stop(t + d + 0.05);
    };

    // A burst: a short breath of low noise, `long` seconds of it
    sfx.pop = (delay, loud, long) => {
        const ctx = sound();
        if (!ctx) return;

        const t = ctx.currentTime + delay / 1000;
        const d = long || 0.2;

        const low = ctx.createBiquadFilter();
        low.type = 'lowpass';
        low.frequency.setValueAtTime(1400, t);
        low.frequency.exponentialRampToValueAtTime(200, t + d);

        const src = noise(ctx);
        src.connect(low).connect(swell(ctx, t, loud, 0.008, d)).connect(out);
        src.start(t);
        src.stop(t + d + 0.05);
    };

    // A note struck and dying away, sliding from `from` Hz to `to`
    sfx.note = (delay, from, to, long, loud, wave) => {
        const ctx = sound();
        if (!ctx) return;

        const t = ctx.currentTime + delay / 1000;
        const osc = ctx.createOscillator();
        osc.type = wave || 'sine';
        osc.frequency.setValueAtTime(from, t);
        if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + long);

        osc.connect(swell(ctx, t, loud, 0.01, long)).connect(out);
        osc.start(t);
        osc.stop(t + long + 0.05);
    };

    /*
     * The words every game says in the same sounds, so that a right answer
     * sounds right in all of them.
     */

    // Right: two notes a major third apart, a semitone higher every two stages
    sfx.chime = (stage, delay) => {
        const later = delay || 0;
        const base = 660 * Math.pow(2, Math.min(stage || 0, 14) / 24);
        sfx.note(later, base, base, 0.35, 0.11);
        sfx.note(later + 90, base * 1.26, base * 1.26, 0.55, 0.11);
    };

    /*
     * A mistake: a tone falling two octaves less a third, SPOIL long. Word
     * search's, where it first sounded with the red running down a star that
     * cannot be filled, and then with every mistake as it is made (the
     * owner's calls, 8 November 2026).
     */
    sfx.SPOIL = 650;

    sfx.lose = (delay) => {
        sfx.note(delay || 0, 330, 110, sfx.SPOIL / 1000, 0.12, 'triangle');
    };

    /*
     * A small bubble popping, `step` letters into a word, `later` ms from
     * now: a sine sliding up, a quarter-tone higher with every step, so that
     * the letters of a word taken one by one climb. Softer for one let go.
     * Word search's for a cell picked first (the owner's call, 8 November
     * 2026).
     */
    sfx.POP_STEP = 1 / 24;

    sfx.bubble = (step, later, soft) => {
        const f = 520 * Math.pow(2, (step || 0) * sfx.POP_STEP);
        sfx.note(later || 0, f * 0.7, f * 1.5, 0.07, soft ? 0.05 : 0.12);
    };

    // A thing turned over or swept aside: a short breath of wind
    sfx.whoosh = (delay) => {
        sfx.gust(delay || 0, 220, 0.1);
    };

    // A knock: a low thud, for running into something
    sfx.thud = (delay) => {
        sfx.pop(delay || 0, 0.3, 0.16);
        sfx.note(delay || 0, 150, 70, 0.18, 0.12, 'sine');
    };

    // A thing caught: two quick notes a fifth apart, up
    sfx.caught = (delay) => {
        const later = delay || 0;
        sfx.note(later, 880, 880, 0.12, 0.08);
        sfx.note(later + 70, 1320, 1320, 0.22, 0.08);
    };

    // A prize: the major chord rising, a note at a time, and ringing
    sfx.fanfare = (delay) => {
        const later = delay || 0;
        [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => sfx.note(later + k * 110, f, f, k === 3 ? 0.9 : 0.3, 0.09));
    };
}
sfx();
