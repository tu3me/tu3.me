/**
 * "Snake" game. The snake collects the letters of the word in order; a wrong
 * letter or a self-collision costs a heart. The round state is persisted on
 * every step, so closing the popup mid-game loses at most the last move.
 *
 * Four sub-modules are private to this game and follow the same init-once
 * shape as the top-level ones:
 *
 *     view    everything that draws — DOM, canvas, d-pad. Decides nothing.
 *     clock   pacing: the tick, acceleration, and every timer the game owns.
 *     board   the rules and the field. Touches no DOM and no storage.
 *     input   keyboard and d-pad presses turned into direction intents.
 *
 * What is left in snake() is the session: which word is current, what a step
 * means for the player's progress, and when the session is over.
 */
function snake(container) {
    // How many words this game takes per session — its own decision
    const POOL_LIMIT = 10;

    // The playing field: board reasons about it, view draws it
    const GRID_COUNT = 12;

    // The two header toggles: the label is what the button shows, the index is what is persisted
    const CONTROL_MODES = ['Off', 'D-pad', 'Stick'];
    const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

    // Milliseconds between free-running steps per difficulty; null — the player steps by hand
    const STEP_MS = [null, 400, 220];

    let state = getEmptyState();

    /**
     * Rendering. Holds the DOM references and the palette, and knows nothing
     * about the rules: mount() builds the screen and stores the callbacks,
     * every other method just paints what it is handed.
     */
    function view(host) {

        let palette = {};
        let cb = {};
        let header, hintBanner, gatheredBar, canvas, ctx, controlsArea;
        let cellSize = 0;
        let controlMode = 0;
        let difficulty = 1;

        function translationEl() {
            return hintBanner ? hintBanner.querySelector('#snake-translation') : null;
        }

        // Shrinks the translation until it fits the fixed-height banner
        function fitTranslation(el) {
            if (!el) return;
            let size = 19.2;
            el.style.fontSize = size + 'px';
            el.style.lineHeight = '1.25';
            const maxH = 42;
            while ((el.scrollHeight > maxH || el.offsetHeight > maxH) && size > 9 && el.offsetHeight > 0) {
                size -= 0.5;
                el.style.fontSize = size + 'px';
            }
        }

        function fitGathered() {
            const boxes = gatheredBar.querySelectorAll('.snake-gathered-box');
            if (boxes.length === 0) return;

            let size = 15.6;
            let gap = 5;
            const maxH = 42;

            gatheredBar.style.gap = gap + 'px';
            boxes.forEach(b => {
                b.style.fontSize = size + 'px';
            });

            while ((gatheredBar.scrollHeight > maxH || gatheredBar.offsetHeight > maxH) && size > 8 && gatheredBar.offsetHeight > 0) {
                size -= 0.5;
                gap = Math.max(1, Math.round(size * 0.25));
                gatheredBar.style.gap = gap + 'px';
                boxes.forEach(b => {
                    b.style.fontSize = size + 'px';
                });
            }
        }

        // The header chips draw their state instead of naming it. Everything is currentColor,
        // so both icons follow the chip's own colour in either theme.
        function chipIcon(body, extra) {
            return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" ${extra || ''}>${body}</svg>`;
        }

        // The control chip keeps one face whatever mode is on — a d-pad laid out like the
        // panel itself: one key on top, three in a row below. Which scheme is actually on
        // is visible in the panel and named in the tooltip.
        function controlIcon() {
            const key = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" rx="1.5" fill="currentColor" />`;
            return chipIcon(key(8.5, 4.5) + key(0.5, 12.5) + key(8.5, 12.5) + key(16.5, 12.5));
        }

        // Speed as three chevrons: one lit on easy, two on medium, all three on hard.
        // Each mark keeps its own colour and only lights up once the level reaches it.
        function difficultyIcon(level) {
            const marks = [[3, '#eab308'], [10, '#f97316'], [17, '#ef4444']];
            return chipIcon(
                marks.map(([x, colour], i) => `<path d="M${x} 7l4 5-4 5" stroke="${colour}" opacity="${i <= level ? 1 : 0.25}" />`).join(''),
                'fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"'
            );
        }

        // One button style for every on-screen control, d-pad and turn row alike. Both
        // panels are 3-column grids filling the whole width — this is thumb territory on
        // a phone, so the cell places the button and `place` only says which cell.
        function padBtn(id, glyph, place) {
            return `<button class="snake-pad-btn" id="${id}" style="grid-area: ${place}; width: 100%; height: 56px; background: ${palette.dpadBg}; border: 1px solid ${palette.dpadBorder}; border-radius: 12px; font-weight: 700; font-size: 24px; cursor: pointer; color: ${palette.dpadColor}; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;">${glyph}</button>`;
        }

        // Both panels share it: three equal columns, full width
        const PAD_GRID = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%;';

        // A press asks for a move, a release drops the acceleration the hold built up.
        //
        // touchstart is cancelled too: holding a button to accelerate looks exactly like
        // the long press that opens a context menu, and Android answers that gesture with
        // a short vibration. Cancelling pointerdown does not stop it — the gesture is
        // recognized from the touch stream, so the touch default is what has to go.
        function bindPad(root, id, press) {
            const btn = root.querySelector('#' + id);
            if (!btn) return;

            const handlePress = (e) => {
                if (e) e.preventDefault();
                press();
            };
            const handleRelease = (e) => {
                if (e) e.preventDefault();
                cb.onDirectionRelease();
            };

            const swallow = (e) => e.preventDefault();

            btn.addEventListener('pointerdown', handlePress);
            btn.addEventListener('pointerup', handleRelease);
            btn.addEventListener('pointerleave', handleRelease);
            btn.addEventListener('pointercancel', handleRelease);
            btn.addEventListener('touchstart', swallow, { passive: false });
            btn.addEventListener('contextmenu', swallow);
        }

        // Touch joystick. The knob follows the finger inside the frame, and the direction
        // is the larger of the two offsets measured against the travel available on that
        // axis — so a wide frame does not favour left and right. A direction is handed over
        // only when it changes: every one of them forces a step and restarts the
        // hold-to-accelerate timer, which a stream of pointermove events would abuse.
        function bindJoystick(frame, knob) {
            // The frame is the dead zone. Nothing is sent while the knob still fits inside
            // it; the direction engages once the knob clears the edge, and it may hang this
            // many pixels out — which is also what makes the engaged state visible.
            const OVERHANG = 10;
            let last = null;
            let pressed = false;

            function follow(pointerX, pointerY) {
                const box = frame.getBoundingClientRect();
                // Offsets at which the knob still just fits inside the frame — the edge of
                // the dead zone. Travel goes OVERHANG further, and that is all it goes.
                const edgeX = (box.width - knob.offsetWidth) / 2;
                const edgeY = (box.height - knob.offsetHeight) / 2;

                const clamp = (v, limit) => Math.max(-limit, Math.min(limit, v));
                const dx = clamp(pointerX - box.left - box.width / 2, edgeX + OVERHANG);
                const dy = clamp(pointerY - box.top - box.height / 2, edgeY + OVERHANG);

                const nx = edgeX ? dx / edgeX : 0;
                const ny = edgeY ? dy / edgeY : 0;

                // One axis at a time — the knob slides along the dominant one and stays
                // centred on the other, so where it sits is exactly the direction it stands for
                const horizontal = Math.abs(nx) > Math.abs(ny);
                knob.style.transform = horizontal ? `translate(${dx}px, 0px)` : `translate(0px, ${dy}px)`;

                // Back inside the frame counts as letting go: the knob still follows the
                // finger, but nothing is engaged — the acceleration a hold built up is
                // dropped, and leaving the frame again is a fresh command even if it points
                // the same way as the last one
                if (Math.max(Math.abs(nx), Math.abs(ny)) <= 1) {
                    if (last) {
                        last = null;
                        cb.onDirectionRelease();
                    }
                    return;
                }

                const dir = horizontal ? { x: Math.sign(nx), y: 0 } : { x: 0, y: Math.sign(ny) };

                if (last && last.x === dir.x && last.y === dir.y) return;
                last = dir;
                cb.onDirection(dir.x, dir.y);
            }

            function release(e) {
                if (e) e.preventDefault();
                pressed = false;
                last = null;
                knob.style.transform = 'translate(0px, 0px)';
                cb.onDirectionRelease();
            }

            frame.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                pressed = true;
                frame.setPointerCapture(e.pointerId);
                follow(e.clientX, e.clientY);
            });
            frame.addEventListener('pointermove', (e) => {
                // The stick steers only while it is held down — a mouse merely passing over
                // the frame must not move anything. `buttons` catches the case of a button
                // let go somewhere the pointerup never reached us from.
                if (!pressed) return;
                if (e.pointerType === 'mouse' && e.buttons === 0) { release(e); return; }
                e.preventDefault();
                follow(e.clientX, e.clientY);
            });
            frame.addEventListener('pointerup', release);
            frame.addEventListener('pointercancel', release);
            // Same reason as the buttons: a held stick is a long press, and Android
            // answers that gesture with a vibration unless the touch default is cancelled
            frame.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
            frame.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        function renderControls() {
            const wrapper = controlsArea.querySelector('#controls-wrapper');
            if (!wrapper) return;

            wrapper.innerHTML = '';

            if (controlMode === 0) {
                wrapper.style.display = 'none';
                return;
            }

            wrapper.style.display = 'flex';

            if (controlMode === 1) {
                const dPad = $(wrapper, `<div class="snake-dpad" style="${PAD_GRID}">
                    ${padBtn('dpad-up', '▲', '1 / 2')}
                    ${padBtn('dpad-left', '◀', '2 / 1')}
                    ${padBtn('dpad-down', '▼', '2 / 2')}
                    ${padBtn('dpad-right', '▶', '2 / 3')}
                </div>`);

                bindPad(dPad, 'dpad-up', () => cb.onDirection(0, -1));
                bindPad(dPad, 'dpad-down', () => cb.onDirection(0, 1));
                bindPad(dPad, 'dpad-left', () => cb.onDirection(-1, 0));
                bindPad(dPad, 'dpad-right', () => cb.onDirection(1, 0));
                return;
            }

            // Stick mode. The knob ignores pointer events itself — they all belong to the frame.
            const stick = $(wrapper, `<div class="snake-stick" style="position: relative; width: 120px; height: 120px; margin: 10px 0; background: ${palette.dpadBg}; border: 2px solid ${palette.dpadBorder}; border-radius: 12px; box-sizing: border-box; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; cursor: pointer;">
                <div class="snake-stick-knob" style="position: absolute; left: 50%; top: 50%; width: 60px; height: 60px; margin-left: -30px; margin-top: -30px; background: ${palette.stickKnob}; border-radius: 6px; pointer-events: none; transition: transform 0.08s ease-out;"></div>
            </div>`);

            bindJoystick(stick, stick.querySelector('.snake-stick-knob'));
        }


        view.setTheme = (p) => { palette = p; };

        // Builds the screen from scratch and remembers the callbacks
        view.mount = (opts) => {
            cb = opts;
            controlMode = opts.controlMode || 0;
            difficulty = opts.difficulty === undefined ? 1 : opts.difficulty;

            const chipStyle = `display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 28px; padding: 0; background: ${palette.dpadBg}; border: 1px solid ${palette.dpadBorder}; border-radius: 6px; color: ${palette.dpadColor}; cursor: pointer;`;

            header = $(host, `<div class="snake-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div class="snake-header-info" style="display: flex; align-items: center; gap: 8px;">
                    <a class="back-btn" href="index.html" title="Back" style="display: inline-flex; align-items: center; background: transparent; border: none; color: ${palette.backBtn}; cursor: pointer; padding: 0; text-decoration: none;"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H5" /><path d="M11 6l-6 6 6 6" /></svg></a>
                    <button class="snake-control-btn" id="snake-control-toggle" title="Controls: ${CONTROL_MODES[controlMode]}" style="${chipStyle}">${controlIcon()}</button>
                    <button class="snake-difficulty-btn" id="snake-difficulty-toggle" title="Difficulty: ${DIFFICULTIES[difficulty]}" style="${chipStyle}">${difficultyIcon(difficulty)}</button>
                </div>
                <div class="snake-dots-group" id="snake-dots" style="display: flex; align-items: center; gap: 6px;"></div>
            </div>`);

            header.querySelector('.back-btn').addEventListener('click', (e) => {
                e.preventDefault();
                cb.onBack();
            });
            header.querySelector('#snake-control-toggle').addEventListener('click', () => cb.onControlMode());
            header.querySelector('#snake-difficulty-toggle').addEventListener('click', () => cb.onDifficulty());

            hintBanner = $(host, `<div class="snake-hint-banner" style="background: ${palette.hintBg}; border: ${palette.hintBorder}; border-radius: 12px; padding: 8px 14px; text-align: center; margin-bottom: 10px; height: 104px; min-height: 104px; max-height: 104px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; overflow: hidden;">
                <div class="snake-translation-text" id="snake-translation" style="font-size: 19.2px; font-weight: 700; line-height: 1.25; color: ${palette.hintText}; text-align: center; word-break: break-word; overflow-wrap: anywhere; max-width: 100%; max-height: 42px; overflow: hidden;">${opts.translation}</div>
            </div>`);

            gatheredBar = $(hintBanner, `<div class="snake-gathered-bar" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px; max-width: 100%; max-height: 42px; overflow: hidden; cursor: pointer; width: 100%;" title="Click to reveal answer (counts as mistake)"></div>`);

            gatheredBar.addEventListener('click', () => cb.onRevealHint());

            canvas = $(host, `<canvas class="snake-canvas" id="snake-canvas" width="${document.body.clientWidth}" height="${document.body.clientWidth}" style="background: ${palette.canvasBg}; border: 1px solid ${palette.canvasBorder}; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,${palette.canvasShadow}); display: block; touch-action: none; width: 100%; height: auto; aspect-ratio: 1; cursor: pointer;"></canvas>`);

            ctx = canvas.getContext('2d');
            cellSize = document.body.clientWidth / GRID_COUNT;

            controlsArea = $(host, `<div class="snake-controls-panel" style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 10px; margin-bottom: 10px;">
                <div class="snake-controls-wrapper" id="controls-wrapper" style="display: none; justify-content: center; width: 100%; min-height: 80px; align-items: center;"></div>
            </div>`);

            canvas.addEventListener('click', () => cb.onCanvasClick());

            renderControls();
        };

        view.dots = (pool, results, currentIndex) => {
            const dotsEl = header.querySelector('#snake-dots');
            if (!dotsEl) return;
            dotsEl.innerHTML = pool.map((_, idx) => {
                const res = results[idx];
                let bg = palette.dotIdle;
                if (res === 'correct') bg = '#22c55e';
                if (res === 'wrong') bg = '#ef4444';

                const isCurrent = idx === currentIndex;
                const ringStyle = isCurrent ? `outline: 2px solid ${palette.ring}; outline-offset: 1px; transform: scale(1.15);` : '';

                return `<div class="snake-dot" style="width: 10px; height: 10px; border-radius: 50%; background: ${bg}; ${ringStyle} transition: all 0.2s; flex-shrink: 0;"></div>`;
            }).join('');
        };

        view.banner = (text) => {
            const el = translationEl();
            if (el) {
                el.textContent = text;
                fitTranslation(el);
            }
        };

        // The heart round shows a single big glyph instead of the translation
        view.bannerHeart = () => {
            const el = translationEl();
            if (el) {
                el.innerHTML = '❤️';
                el.style.fontSize = '28.8px';
            }
        };

        view.gathered = (targetWord, collected, showHint) => {
            gatheredBar.innerHTML = '';
            for (let i = 0; i < targetWord.length; i++) {
                const char = targetWord[i].toUpperCase();
                const isCollected = i < collected;

                let color = palette.letterPending;
                let displayText = '?';

                if (isCollected) {
                    color = palette.letterCollected;
                    displayText = char === ' ' ? '␣' : char;
                } else if (showHint) {
                    color = palette.letterHinted;
                    displayText = char === ' ' ? '␣' : char;
                }

                const box = document.createElement('div');
                box.className = 'snake-gathered-box';
                box.style.cssText = `display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15.6px; line-height: 1.2; color: ${color}; transition: color 0.2s;`;
                box.textContent = displayText;
                gatheredBar.appendChild(box);
            }
            fitGathered();
        };

        view.setControlMode = (mode) => {
            controlMode = mode;
            // Only the tooltip moves — the icon is the same in every mode
            const btn = header.querySelector('#snake-control-toggle');
            if (btn) btn.title = 'Controls: ' + CONTROL_MODES[mode];
            renderControls();
        };

        view.setDifficulty = (level) => {
            difficulty = level;
            const btn = header.querySelector('#snake-difficulty-toggle');
            if (btn) {
                btn.innerHTML = difficultyIcon(level);
                btn.title = 'Difficulty: ' + DIFFICULTIES[level];
            }
        };

        // Replaces the banner and the letter row with the end-of-session panel
        view.victory = () => {
            const el = translationEl();
            if (el) {
                el.innerHTML = '🎉 Victory! Snake completed! 🏆';
                fitTranslation(el);
            }

            gatheredBar.innerHTML = `
                <div class="snake-win-actions" style="display: flex; gap: 8px; width: 100%;">
                    <button class="snake-go-dict-btn" id="snake-go-dict" style="flex: 1; padding: 9px 10px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: 700; font-size: 14.4px; cursor: pointer; transition: background 0.2s;">📚 Dictionary</button>
                </div>
            `;

            if (controlsArea) controlsArea.style.display = 'none';

            const goDictBtn = gatheredBar.querySelector('#snake-go-dict');
            if (goDictBtn) {
                goDictBtn.addEventListener('click', () => cb.onGoDictionary());
            }
        };

        // Centres a glyph by its ink rather than by its baseline. A fixed baseline centres
        // the em box, and the ink of a comma or a period sits at the very bottom of that box,
        // which is what dropped them onto the edge of their cell.
        function drawGlyph(char, cx, cy) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            const m = ctx.measureText(char);
            const ink = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
            ctx.fillText(char, cx, cy + (ink || 0));
        }

        view.draw = (s) => {
            ctx.fillStyle = palette.canvasBg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = palette.grid;
            ctx.lineWidth = 1;
            for (let i = 0; i <= GRID_COUNT; i++) {
                ctx.beginPath();
                ctx.moveTo(i * cellSize, 0);
                ctx.lineTo(i * cellSize, canvas.height);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, i * cellSize);
                ctx.lineTo(canvas.width, i * cellSize);
                ctx.stroke();
            }

            if (s.phase === 'HEART' && s.heartPos) {
                ctx.fillStyle = '#ef4444';
                ctx.font = '19.2px system-ui';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('❤️', (s.heartPos.x + 0.5) * cellSize, (s.heartPos.y + 0.5) * cellSize);
            }

            // A space is a letter like any other here: same colour, its own glyph, one size down
            s.lettersOnBoard.forEach(l => {
                if (l.isEaten) return;

                ctx.fillStyle = palette.boardLetter;
                ctx.font = `bold ${l.char === ' ' ? 21.6 : 30}px system-ui`;
                drawGlyph(l.char === ' ' ? '␣' : l.char, (l.x + 0.5) * cellSize, (l.y + 0.5) * cellSize);
            });

            // The head has its own colour; the body runs along a hue ramp and goes deeper
            // wherever a letter is being carried
            const segmentColor = (idx) => {
                if (idx === 0) return palette.head;

                const bodyLength = s.snakeBody.length - 1;
                const ratio = bodyLength > 1 ? (idx - 1) / (bodyLength - 1) : 0;
                const h = palette.bodyHueStart + ratio * (palette.bodyHueEnd - palette.bodyHueStart);

                const carries = s.snakeBody[idx].char;
                const sat = carries ? palette.bodySatChar : palette.bodySatPlain;
                const light = carries ? palette.bodyLightChar : palette.bodyLightPlain;

                return `hsl(${h}, ${sat}%, ${light}%)`;
            };

            // Joints between consecutive segments, drawn under them. A tightly coiled snake
            // is otherwise one blob: a neighbouring cell looks the same whether it is the
            // next segment or another coil lying alongside, and the path cannot be read.
            // The segments are inset far enough that only a real joint bridges the gap.
            // Pairs split by the wrap around the board edge are skipped — on screen those
            // two cells are on opposite sides and there is nothing to bridge.
            const SEG_INSET = 3;
            const jointReach = SEG_INSET + 1;   // 1px into each segment, so no seam shows
            const jointWidth = cellSize * 0.42;

            for (let i = 0; i < s.snakeBody.length - 1; i++) {
                const a = s.snakeBody[i];
                const b = s.snakeBody[i + 1];
                if (Math.abs(b.x - a.x) + Math.abs(b.y - a.y) !== 1) continue;

                ctx.fillStyle = segmentColor(i + 1);

                if (a.y === b.y) {
                    const edge = Math.max(a.x, b.x) * cellSize;
                    ctx.fillRect(edge - jointReach, (a.y + 0.5) * cellSize - jointWidth / 2, jointReach * 2, jointWidth);
                } else {
                    const edge = Math.max(a.y, b.y) * cellSize;
                    ctx.fillRect((a.x + 0.5) * cellSize - jointWidth / 2, edge - jointReach, jointWidth, jointReach * 2);
                }
            }

            s.snakeBody.forEach((part, idx) => {
                ctx.save();

                const partColor = segmentColor(idx);

                if (s.isFrozen && idx === s.losingHeartIdx) {
                    const centerX = (part.x + 0.5) * cellSize;
                    const centerY = (part.y + 0.5) * cellSize;

                    ctx.translate(centerX, centerY);
                    ctx.scale(1.5, 1.5);

                    ctx.fillStyle = partColor;
                    ctx.beginPath();
                    ctx.roundRect(
                        -cellSize / 2 + 1,
                        -cellSize / 2 + 1,
                        cellSize - 2,
                        cellSize - 2,
                        idx === 0 ? 6 : 4
                    );
                    ctx.fill();

                    const heartChar = s.blinkVisible ? '❤️' : '🖤';
                    ctx.font = 'bold 15.6px system-ui';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(heartChar, 0, 0);
                } else {
                    ctx.fillStyle = partColor;
                    ctx.beginPath();
                    ctx.roundRect(
                        part.x * cellSize + SEG_INSET,
                        part.y * cellSize + SEG_INSET,
                        cellSize - SEG_INSET * 2,
                        cellSize - SEG_INSET * 2,
                        idx === 0 ? 6 : 4
                    );
                    ctx.fill();

                    if (part.char) {
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 14.4px system-ui';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        const displayChar = part.char === ' ' ? '␣' : part.char;
                        ctx.fillText(displayChar, (part.x + 0.5) * cellSize, (part.y + 0.5) * cellSize);
                    }
                }
                ctx.restore();
            });

            // The spark sits on the edge the head ran into: half a cell along the heading,
            // which is exactly the border between the head and whatever it hit. Drawn with
            // strokes rather than a glyph — an emoji star ignores fillStyle and cannot be red.
            if (s.crashPhase === 1) {
                const head = s.snakeBody[0];
                const cx = (head.x + 0.5 + s.dir.x * 0.5) * cellSize;
                const cy = (head.y + 0.5 + s.dir.y * 0.5) * cellSize;
                const reach = cellSize * 0.3;

                ctx.save();
                ctx.strokeStyle = '#ff1744';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const angle = (Math.PI / 4) * i;
                    const len = i % 2 === 0 ? reach : reach * 0.55; // long cross, short diagonals
                    const dx = Math.cos(angle) * len;
                    const dy = Math.sin(angle) * len;
                    ctx.moveTo(cx - dx, cy - dy);
                    ctx.lineTo(cx + dx, cy + dy);
                }
                ctx.stroke();
                ctx.restore();
            }
        };
    }

    /**
     * Pacing. Owns every timer the game creates, so cleanup() is guaranteed to
     * leave nothing running — including the crash-animation delays, which used
     * to be bare setTimeouts that survived leaving the screen.
     *
     * "Halted" means paused (waiting for the first key) or blocked by the board
     * (frozen during a crash); the board supplies that check at attach time.
     */
    function clock() {
        const FAST_SPEED = 100;

        let difficulty = 1;
        let isAccelerating = false;
        let paused = true;
        let tickTimer = null;
        let accelTimer = null;
        let delayed = [];

        let onTick = () => { };
        let blocked = () => false;

        function halted() {
            return paused || blocked();
        }

        function tick() {
            if (halted()) return;
            onTick();
            if (tickTimer !== null && !halted()) clock.schedule();
        }

        clock.attach = (opts) => {
            onTick = opts.onTick;
            blocked = opts.blocked;
            isAccelerating = false;
            paused = true;
            tickTimer = null;
            accelTimer = null;
            delayed = [];
        };

        clock.isPaused = () => paused;

        clock.pause = () => {
            paused = true;
            if (tickTimer) clearTimeout(tickTimer);
        };

        clock.resume = () => {
            paused = false;
        };

        clock.schedule = () => {
            if (tickTimer) clearTimeout(tickTimer);
            tickTimer = null;
            if (halted()) return;

            // Easy has no free-running clock — every step comes from a press. Holding a
            // button down still accelerates, in every difficulty.
            const delay = isAccelerating ? FAST_SPEED : STEP_MS[difficulty];
            if (!delay) return;

            tickTimer = setTimeout(tick, delay);
        };

        clock.forceStep = () => {
            if (halted()) return;
            if (tickTimer) clearTimeout(tickTimer);
            onTick();
            if (!halted()) clock.schedule();
        };

        clock.setAcceleration = (accel) => {
            if (isAccelerating === accel) return;
            isAccelerating = accel;
            // Rescheduled even with no timer running: in easy mode a held button is the
            // only thing that ever starts the clock.
            if (!halted()) clock.schedule();
        };

        clock.setDifficulty = (level) => {
            difficulty = level;
            if (!halted()) clock.schedule();
        };

        // Holding a direction speeds the snake up after a short delay
        clock.startAccelTimeout = () => {
            if (accelTimer) clearTimeout(accelTimer);
            accelTimer = setTimeout(() => clock.setAcceleration(true), 300);
        };

        clock.cancelAccel = () => {
            if (accelTimer) clearTimeout(accelTimer);
        };

        // Tracked setTimeout — cleared by stop(), unlike a bare one
        clock.after = (ms, fn) => {
            const id = setTimeout(() => {
                delayed = delayed.filter(x => x !== id);
                fn();
            }, ms);
            delayed.push(id);
        };

        clock.stop = () => {
            // Paused as well, so nothing can schedule the clock back to life afterwards
            paused = true;
            if (tickTimer) clearTimeout(tickTimer);
            if (accelTimer) clearTimeout(accelTimer);
            delayed.forEach(clearTimeout);
            delayed = [];
        };
    }

    /**
     * The rules and the field. No DOM, no storage, no timers — the only part
     * of the game that can be reasoned about (and tested) on its own.
     *
     * step() reports what happened and lets the session decide what it means:
     *   'moved' | 'letter' | 'wordDone' | 'heart' | 'crashHeart' | 'crashRestart'
     */
    function board() {
        let snakeBody = [];
        let dir = { x: 0, y: -1 };
        let inputQueue = [];
        let nextLetterIndex = 0;
        let lettersOnBoard = [];
        let phase = 'WORD';
        let heartPos = null;
        let isFrozen = false;
        let blinkVisible = true;
        let losingHeartIdx = -1;
        let inputCooldown = false;
        let crashPhase = 0;
        let newTail = null;
        let targetWord = '';

        const clone = (v) => JSON.parse(JSON.stringify(v));
        const randomCell = () => ({
            x: Math.floor(Math.random() * GRID_COUNT),
            y: Math.floor(Math.random() * GRID_COUNT)
        });

        function placeSnake() {
            const rx = Math.floor(Math.random() * (GRID_COUNT - 4)) + 2;
            const ry = Math.floor(Math.random() * (GRID_COUNT - 4)) + 2;
            snakeBody = [{ x: rx, y: ry, char: '' }];
        }

        function spawnLetters() {
            lettersOnBoard = [];
            const lettersNeeded = targetWord.split('');

            lettersNeeded.forEach((char, idx) => {
                let pos;
                let attempts = 0;
                while (attempts < 500) {
                    attempts++;
                    pos = randomCell();
                    const onSnake = snakeBody.some(s => s.x === pos.x && s.y === pos.y);
                    const onOtherLetter = lettersOnBoard.some(l => l.x === pos.x && l.y === pos.y);
                    if (!onSnake && !onOtherLetter) break;
                }
                lettersOnBoard.push({
                    char: char.toUpperCase(),
                    index: idx,
                    x: pos.x,
                    y: pos.y,
                    isEaten: false
                });
            });
        }

        function spawnHeart() {
            let attempts = 0;
            while (attempts < 500) {
                attempts++;
                const pos = randomCell();
                if (!snakeBody.some(s => s.x === pos.x && s.y === pos.y)) {
                    heartPos = pos;
                    break;
                }
            }
        }

        // Every segment follows the one in front of it, head lands on (x, y)
        function advance(x, y) {
            for (let i = snakeBody.length - 1; i > 0; i--) {
                snakeBody[i].x = snakeBody[i - 1].x;
                snakeBody[i].y = snakeBody[i - 1].y;
            }
            snakeBody[0].x = x;
            snakeBody[0].y = y;
        }

        // Same move, but the old tail cell stays behind as a new segment
        function grow(x, y, char) {
            const oldTailPos = { x: snakeBody[snakeBody.length - 1].x, y: snakeBody[snakeBody.length - 1].y };
            advance(x, y);
            snakeBody.push({ x: oldTailPos.x, y: oldTailPos.y, char });
        }

        function hits(x, y) {
            return snakeBody.some(s => s.x === x && s.y === y);
        }

        // Rolls the move back and freezes; a collected heart pays for the mistake
        function crash(prev) {
            const heartIdx = prev.findIndex(s => s.char === '❤️');
            snakeBody = prev;

            crashPhase = 1;
            isFrozen = true;

            if (heartIdx !== -1) {
                snakeBody[heartIdx].char = '🖤';
                losingHeartIdx = heartIdx;
                blinkVisible = true;
                return 'crashHeart';
            }

            losingHeartIdx = -1;
            return 'crashRestart';
        }

        board.load = (saved, word) => {
            targetWord = word;

            if (saved.savedSnake && saved.savedSnake.length > 0) {
                snakeBody = clone(saved.savedSnake);
                dir = clone(saved.savedDir || { x: 0, y: -1 });
                inputQueue = clone(saved.savedInputQueue || []);
                nextLetterIndex = saved.savedNextLetterIndex !== undefined ? saved.savedNextLetterIndex : 0;
                lettersOnBoard = clone(saved.savedLettersOnBoard || []);
                phase = saved.savedPhase || 'WORD';
                heartPos = saved.savedHeartPos ? clone(saved.savedHeartPos) : null;
                isFrozen = saved.savedIsFrozen || false;
                blinkVisible = saved.savedBlinkVisible !== undefined ? saved.savedBlinkVisible : true;
                losingHeartIdx = saved.savedLosingHeartIdx !== undefined ? saved.savedLosingHeartIdx : -1;
                inputCooldown = false;
                crashPhase = saved.savedCrashPhase || 0;
                newTail = saved.savedNewTail ? clone(saved.savedNewTail) : null;
                return false;
            }

            placeSnake();
            dir = { x: 0, y: -1 };
            inputQueue = [];
            nextLetterIndex = 0;
            lettersOnBoard = [];
            phase = 'WORD';
            heartPos = null;
            isFrozen = false;
            blinkVisible = true;
            losingHeartIdx = -1;
            inputCooldown = false;
            crashPhase = 0;
            newTail = null;
            return true; // fresh round — the caller spawns the letters
        };

        // Writes the round into the game state, which is what gets persisted
        board.persistTo = (saved) => {
            saved.savedSnake = clone(snakeBody);
            saved.savedDir = clone(dir);
            saved.savedInputQueue = clone(inputQueue);
            saved.savedNextLetterIndex = nextLetterIndex;
            saved.savedLettersOnBoard = clone(lettersOnBoard);
            saved.savedPhase = phase;
            saved.savedHeartPos = heartPos ? clone(heartPos) : null;
            saved.savedIsFrozen = isFrozen;
            saved.savedLosingHeartIdx = losingHeartIdx;
            saved.savedBlinkVisible = blinkVisible;
            saved.crashPhase = crashPhase;
            saved.savedCrashPhase = crashPhase;
            saved.c_new_tail = newTail;
            saved.savedNewTail = newTail ? clone(newTail) : null;
        };

        board.snapshot = () => ({
            snakeBody, lettersOnBoard, phase, heartPos,
            isFrozen, losingHeartIdx, blinkVisible, crashPhase, dir
        });

        board.phase = () => phase;
        board.isFrozen = () => isFrozen;
        board.crashPhase = () => crashPhase;
        board.progress = () => nextLetterIndex;
        board.spawnLetters = spawnLetters;

        board.acceptsInput = () => !inputCooldown && !(isFrozen && crashPhase === 1);
        board.releaseInput = () => { inputCooldown = false; };

        // Frozen frames blink the lost heart between red and black
        board.blink = () => {
            if (isFrozen) blinkVisible = !blinkVisible;
        };

        board.setWord = (word) => {
            targetWord = word;
            nextLetterIndex = 0;
            phase = 'WORD';
            heartPos = null;
            spawnLetters();
        };

        board.beginHeartPhase = () => {
            phase = 'HEART';
            lettersOnBoard = [];
            spawnHeart();
        };

        board.restartRound = () => {
            placeSnake();
            dir = { x: 0, y: -1 };
            inputQueue = [];
            nextLetterIndex = 0;
            phase = 'WORD';
            heartPos = null;
            isFrozen = false;
            losingHeartIdx = -1;
            inputCooldown = false;
            crashPhase = 0;
            newTail = null;
            spawnLetters();
        };

        // Second stage of a crash: the snake turns around, head where the tail was
        board.headToTail = () => {
            if (!isFrozen || crashPhase !== 1) return false;

            crashPhase = 2;

            const newCoords = [];
            for (let i = snakeBody.length - 1; i >= 0; i--) {
                newCoords.push({ x: snakeBody[i].x, y: snakeBody[i].y });
            }
            for (let i = 0; i < snakeBody.length; i++) {
                snakeBody[i].x = newCoords[i].x;
                snakeBody[i].y = newCoords[i].y;
            }

            inputCooldown = true;
            return true;
        };

        // false — the press is refused; otherwise says whether it thawed the board
        board.tryUnfreeze = (reqDirX, reqDirY) => {
            if (!isFrozen) return 'notFrozen';

            if (crashPhase === 1) return false;

            if (crashPhase === 2) {
                if (reqDirX === undefined || reqDirY === undefined) return false;

                // Turning straight back into its own neck is not a way out
                if (snakeBody.length > 1) {
                    const neck = snakeBody[1];
                    if (snakeBody[0].x + reqDirX === neck.x && snakeBody[0].y + reqDirY === neck.y) {
                        return false;
                    }
                }

                dir = { x: reqDirX, y: reqDirY };
                inputQueue = [];
                crashPhase = 0;
            }

            isFrozen = false;
            losingHeartIdx = -1;
            blinkVisible = true;
            return 'unfroze';
        };

        // What a new direction is measured against: the last queued turn, or the current heading
        board.refDir = () => ({ ...(inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : dir) });

        board.enqueueDir = (dx, dy) => {
            const refDir = board.refDir();
            if (snakeBody.length > 1 || inputQueue.length > 0) {
                if (refDir.x === -dx && refDir.y === -dy) {
                    return false;
                }
            }
            inputQueue.push({ x: dx, y: dy });
            return true;
        };

        board.step = () => {
            if (inputQueue.length > 0) {
                dir = inputQueue.shift();
            }

            const headX = (snakeBody[0].x + dir.x + GRID_COUNT) % GRID_COUNT;
            const headY = (snakeBody[0].y + dir.y + GRID_COUNT) % GRID_COUNT;
            const prev = snakeBody.map(s => ({ ...s }));

            if (phase === 'HEART') {
                if (hits(headX, headY)) return crash(prev);

                if (heartPos && headX === heartPos.x && headY === heartPos.y) {
                    grow(headX, headY, '❤️');
                    return 'heart';
                }

                advance(headX, headY);
                return 'moved';
            }

            if (hits(headX, headY)) return crash(prev);

            const touched = lettersOnBoard.find(l => !l.isEaten && l.x === headX && l.y === headY);

            if (touched) {
                if (touched.char !== targetWord[nextLetterIndex].toUpperCase()) return crash(prev);

                touched.isEaten = true;
                nextLetterIndex++;
                grow(headX, headY, touched.char);

                return nextLetterIndex === targetWord.length ? 'wordDone' : 'letter';
            }

            advance(headX, headY);
            return 'moved';
        };
    }

    /**
     * Keyboard input. Produces direction intents and nothing else — it does not
     * know whether the game is frozen, paused or finished.
     */
    function input() {
        const DIRECTIONS = {
            ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
            ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 }
        };
        const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

        let keyDown = null;
        let keyUp = null;

        input.attach = (opts) => {
            input.detach();

            keyDown = (e) => {
                const reqDir = DIRECTIONS[e.code];
                if (!reqDir) return;
                // Arrows would scroll the popup otherwise
                if (ARROWS.includes(e.code)) e.preventDefault();
                opts.onDirection(reqDir, !e.repeat);
            };

            keyUp = (e) => {
                if (DIRECTIONS[e.code]) opts.onRelease();
            };

            window.addEventListener('keydown', keyDown);
            window.addEventListener('keyup', keyUp);
        };

        input.detach = () => {
            if (keyDown) window.removeEventListener('keydown', keyDown);
            if (keyUp) window.removeEventListener('keyup', keyUp);
            keyDown = null;
            keyUp = null;
        };
    }

    function getEmptyState() {
        return {
            selectedSetId: 'all', currentIndex: 0, sessionResults: [], sessionPool: null, allowEarly: false,
            hadErrorThisRound: false, showHint: false, controlMode: 0, difficulty: 1, savedSnake: null,
            savedDir: null, savedInputQueue: null, savedNextLetterIndex: 0, savedLettersOnBoard: null,
            savedPhase: 'WORD', savedHeartPos: null, savedIsFrozen: false, savedLosingHeartIdx: -1,
            savedBlinkVisible: true, crashPhase: 0, c_new_tail: null, savedCrashPhase: 0, savedNewTail: null
        };
    }


    function cleanup() {
        clock.stop();
        input.detach();
    }

    function render() {
        cleanup();

        container.innerHTML = '';

        if (!state.sessionPool) {
            const pool = store.duePool(state.selectedSetId, state.allowEarly, POOL_LIMIT);

            state.sessionPool = pool;
            state.sessionResults = new Array(pool.length).fill(null);
            state.currentIndex = 0;
        }

        let pool = state.sessionPool;

        if (pool.length === 0 || state.currentIndex >= pool.length) {
            state.sessionPool = null;
            state.savedSnake = null;
            state.allowEarly = false;
            store.save();
            page.finish();
            return;
        }

        let currentItem = pool[state.currentIndex];
        let targetWord = currentItem.word.original.toLowerCase();

        view.mount({
            translation: currentItem.word.translation,
            controlMode: state.controlMode,
            difficulty: state.difficulty,

            onBack: () => {
                state.savedIsFrozen = state.savedIsFrozen || false;
                cleanup();
                page.home();
            },

            onRevealHint: () => {
                if (!state.showHint) {
                    state.showHint = true;
                    state.hadErrorThisRound = true;
                    refreshGathered();
                }
            },

            onCanvasClick: () => {
                clock.pause();
                board.persistTo(state);
            },

            onControlMode: () => {
                state.controlMode = (state.controlMode + 1) % CONTROL_MODES.length;
                view.setControlMode(state.controlMode);
                page.save();
            },

            onDifficulty: () => {
                state.difficulty = (state.difficulty + 1) % DIFFICULTIES.length;
                view.setDifficulty(state.difficulty);
                clock.setDifficulty(state.difficulty);
                page.save();
            },

            onDirection: (dx, dy) => handleInput({ x: dx, y: dy }, true),

            onDirectionRelease: () => {
                clock.cancelAccel();
                clock.setAcceleration(false);
            },

            onGoDictionary: () => {
                state.sessionPool = null;
                state.savedSnake = null;
                page.home();
            }
        });

        function refreshDots() {
            view.dots(pool, state.sessionResults, state.currentIndex);
        }

        function refreshGathered() {
            view.gathered(targetWord, board.progress(), state.showHint);
        }

        function paint() {
            view.draw(board.snapshot());
        }

        refreshDots();

        if (board.load(state, targetWord)) board.spawnLetters();

        clock.attach({ onTick: onTick, blocked: () => board.isFrozen() });
        clock.setDifficulty(state.difficulty);
        input.attach({
            onDirection: (reqDir, isNewPress) => handleInput(reqDir, isNewPress),
            onRelease: () => {
                clock.cancelAccel();
                clock.setAcceleration(false);
            }
        });

        // Thaws the board and starts the clock on the first press of a round
        function unfreezeAndResume(reqDirX, reqDirY) {
            const result = board.tryUnfreeze(reqDirX, reqDirY);
            if (result === false) return false;

            if (result === 'unfroze') {
                board.persistTo(state);
                paint();
            }

            if (clock.isPaused()) {
                clock.resume();
                view.banner(currentItem.word.translation);
                clock.schedule();
                board.persistTo(state);
            }
            return true;
        }

        function stepNow() {
            clock.setAcceleration(false);
            clock.startAccelTimeout();
            clock.forceStep();
        }

        function handleInput(reqDir, isNewPress) {
            if (!reqDir) return;
            if (!board.acceptsInput()) return;

            const wasFrozenOrPaused = (board.isFrozen() || clock.isPaused());
            const wasPhase2 = (board.isFrozen() && board.crashPhase() === 2);

            if (wasFrozenOrPaused) {
                if (unfreezeAndResume(reqDir.x, reqDir.y)) {
                    if (wasPhase2) {
                        stepNow();
                    } else if (board.enqueueDir(reqDir.x, reqDir.y)) {
                        stepNow();
                    } else if (clock.isPaused()) {
                        clock.schedule();
                    }
                }
                return;
            }

            if (isNewPress && board.enqueueDir(reqDir.x, reqDir.y)) {
                stepNow();
            }
        }

        // Restarts the round after the crash animation has played out
        function afterCrash(event) {
            if (event === 'crashHeart') {
                if (!board.headToTail()) return;
                paint();
                board.persistTo(state);
                clock.after(500, () => board.releaseInput());
                return;
            }

            clock.pause();
            clock.cancelAccel();
            board.restartRound();
            view.banner(currentItem.word.translation);
            refreshGathered();
            board.persistTo(state);
            paint();
        }

        function moveToNextWord() {
            currentItem = pool[state.currentIndex];
            targetWord = currentItem.word.original.toLowerCase();
            state.hadErrorThisRound = false;
            state.showHint = false;
            board.setWord(targetWord);
            view.banner(currentItem.word.translation);
            refreshGathered();
            board.persistTo(state);
            page.save();
        }

        // The whole session is finished: freeze the board and offer the way back
        function showVictory() {
            cleanup();
            clock.setAcceleration(false);
            paint();
            page.endSession();
            view.victory();
        }

        // One tick of the game: the board says what happened, the session
        // decides what it means for the player's progress.
        function onTick() {
            if (board.isFrozen() || clock.isPaused()) {
                board.blink();
                paint();
                board.persistTo(state);
                return;
            }

            const wasHeartPhase = board.phase() === 'HEART';
            const event = board.step();

            if (event === 'crashHeart' || event === 'crashRestart') {
                board.persistTo(state);
                paint();
                clock.after(500, () => afterCrash(event));
                return;
            }

            if (wasHeartPhase) {
                if (event === 'heart') {
                    state.currentIndex++;
                    state.savedSnake = null;
                    refreshDots();
                    store.save();

                    if (state.currentIndex >= pool.length) {
                        showVictory();
                    } else {
                        moveToNextWord();
                    }
                } else {
                    board.persistTo(state);
                }
                paint();
                return;
            }

            if (event === 'letter') {
                refreshGathered();
                board.persistTo(state);
                paint();
                page.save();
                return;
            }

            if (event === 'wordDone') {
                refreshGathered();
                board.persistTo(state);

                const clean = !state.hadErrorThisRound;
                store.recordRepetition(currentItem, clean ? 1 : 0, 'snake');
                state.sessionResults[state.currentIndex] = clean ? 'correct' : 'wrong';
                store.save();

                // The last word of the session ends it right away; otherwise the
                // player has to catch a heart before the next word appears
                if (state.currentIndex >= pool.length - 1) {
                    state.currentIndex++;
                    state.savedSnake = null;
                    refreshDots();
                    showVictory();
                    return;
                }

                board.beginHeartPhase();
                board.persistTo(state);
                view.bannerHeart();
                paint();
                page.save();
                return;
            }

            board.persistTo(state);
            paint();
            page.save();
        }

        refreshGathered();
        view.banner(currentItem.word.translation);
        paint();
        board.persistTo(state);
    }

    snake.render = render;

    snake.setTheme = (isDark) => {
        const t = tokens.of(isDark);

        view.setTheme({
            backBtn: t.muted,
            dotIdle: t.border,
            ring: t.accent,
            hintBg: t.soft,
            hintBorder: '1px solid ' + t.border,
            hintText: t.accent,
            canvasBg: isDark ? t.ground : t.surface,
            canvasBorder: t.border,
            canvasShadow: '0',
            dpadBg: t.soft,
            dpadBorder: t.border,
            dpadColor: t.ink,
            stickKnob: isDark ? 'rgba(63, 125, 242, 0.45)' : 'rgba(42, 102, 232, 0.32)',
            letterPending: t.muted,
            letterCollected: t.ink,
            letterHinted: t.muted,
            grid: t.soft,
            boardLetter: t.warm,
            head: t.warm,
            bodyHueStart: isDark ? 180 : 210,
            bodyHueEnd: isDark ? 280 : 300,
            bodySatChar: isDark ? 85 : 90,
            bodySatPlain: isDark ? 50 : 60,
            bodyLightChar: isDark ? 55 : 45,
            bodyLightPlain: isDark ? 35 : 60
        });
    };

    // The third argument is the previous session, handed over even on a fresh
    // start so a game can carry its own settings across. Progress never rides along.
    snake.start = (setId, allowEarly, previous) => {
        state.selectedSetId = setId;
        state.allowEarly = allowEarly;

        // The two header toggles are settings, not progress: a new session keeps them
        if (previous) {
            if (previous.controlMode !== undefined) state.controlMode = previous.controlMode;
            if (previous.difficulty !== undefined) state.difficulty = previous.difficulty;
        }
    };

    snake.getState = () => ({
        selectedSetId: state.selectedSetId,
        currentIndex: state.currentIndex,
        sessionResults: state.sessionResults,
        sessionPool: state.sessionPool,
        allowEarly: state.allowEarly,
        controlMode: state.controlMode,
        difficulty: state.difficulty,
        hadErrorThisRound: state.hadErrorThisRound,
        showHint: state.showHint,
        savedSnake: state.savedSnake,
        savedDir: state.savedDir,
        savedInputQueue: state.savedInputQueue,
        savedNextLetterIndex: state.savedNextLetterIndex,
        savedLettersOnBoard: state.savedLettersOnBoard,
        savedPhase: state.savedPhase,
        savedHeartPos: state.savedHeartPos,
        savedIsFrozen: state.savedIsFrozen,
        savedLosingHeartIdx: state.savedLosingHeartIdx,
        savedBlinkVisible: state.savedBlinkVisible,
        savedCrashPhase: state.crashPhase,
        savedNewTail: state.c_new_tail
    });

    snake.setState = (snap) => {
        if (!snap) return;
        state = { ...getEmptyState(), ...snap };
        if (Array.isArray(state.sessionPool)) {
            state.sessionPool.forEach(item => store.migrateWord(item && item.word));
        }
    };

    // Sub-modules are initialized once, like the top-level ones
    view(container);
    clock();
    board();
    input();
}

bootGame('snake', snake);
