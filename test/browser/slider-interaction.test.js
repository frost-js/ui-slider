import { expect, test } from '#test';
import { dispatchDragEvent } from '../support/input/drag.js';

test.describe('Slider interactions', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<button id="outside">Outside</button>' +
                '<div id="host" style="width:360px;margin:40px">' +
                '<label for="slider">Amount</label><input id="slider" value="3"><input id="slider2" value="7"></div>',
            );
        });
    });

    test.describe('events', () => {
        test('emits change once per distinct normalized value', async ({ page }) => {
            await page.evaluate(() => {
                const instance = UI.Slider.init($.findOne('#slider'));
                window.changes = 0;
                $.addEvent('#slider', 'change.ui.slider', () => window.changes++);
                instance.setValue(5);
                instance.setValue(5.1);
                instance.setValue(6);
            });

            expect(await page.evaluate(() => window.changes)).toBe(2);
            await expect(page.locator('#slider')).toHaveValue('6');
        });

        for (const range of [false, true]) {
            test(`emits drag events in order (range=${range})`, async ({ page }) => {
                await page.evaluate((range) => {
                    const node = $.findOne('#slider');
                    $.setValue(node, range ? '2,4' : '2');
                    UI.Slider.init(node, { range, tooltip: false });
                    window.events = [];
                    $.addEvent('#slider', 'slide.ui.slider sliding.ui.slider change.ui.slider slid.ui.slider', (event) => {
                        window.events.push(event.type);
                        window.lastDetail = event.detail;
                    });
                }, range);

                const box = await page.locator('#host .progress.position-relative').boundingBox();
                const y = box.y + box.height / 2;
                await page.mouse.move(box.x + box.width * .5, y);
                await page.mouse.down();
                await page.mouse.move(box.x + box.width * .8, y);
                await page.mouse.up();

                expect(await page.evaluate(() => window.events)).toEqual(['slide', 'sliding', 'change', 'slid']);
                if (range) {
                    expect(await page.evaluate(() => window.lastDetail.start)).toBe(2);
                    expect(await page.evaluate(() => window.lastDetail.end)).toBe(8);
                } else {
                    expect(await page.evaluate(() => window.lastDetail)).toBe(8);
                }
            });
        }

        for (const event of ['slide', 'sliding']) {
            test(`cancels a gesture when disabled in a ${event} listener`, async ({ page }) => {
                await page.evaluate((event) => {
                    const instance = UI.Slider.init($.findOne('#slider'));
                    window.changes = 0;
                    window.releases = 0;
                    $.addEvent('#slider', `${event}.ui.slider`, () => instance.disable());
                    $.addEvent('#slider', 'change.ui.slider', () => window.changes++);
                    $.addEvent('#slider', 'slid.ui.slider', () => window.releases++);
                }, event);
                await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .5 });
                await page.evaluate(dispatchDragEvent, { type: 'touchmove', fraction: .8 });
                await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: .9 });

                await expect(page.getByRole('slider')).toBeDisabled();
                await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
                await expect(page.locator('#slider')).toHaveValue('3');
                expect(await page.evaluate(() => window.changes)).toBe(0);
                expect(await page.evaluate(() => window.releases)).toBe(0);
            });
        }

        for (const event of ['slide', 'sliding', 'change', 'slid']) {
            test(`allows disposal in a ${event} listener`, async ({ page }) => {
                await page.evaluate((event) => {
                    const instance = UI.Slider.init($.findOne('#slider'));
                    $.addEvent('#slider', `${event}.ui.slider`, () => instance.dispose());
                }, event);
                const box = await page.locator('#host .progress.position-relative').boundingBox();
                await page.mouse.move(box.x + box.width * .5, box.y + box.height / 2);
                await page.mouse.down();
                await page.mouse.move(box.x + box.width * .8, box.y + box.height / 2);
                await page.mouse.up();

                await expect(page.getByRole('slider')).toHaveCount(0);
                await expect(page.getByRole('tooltip')).toHaveCount(0);
            });
        }
    });

    test.describe('user events', () => {
        test.beforeEach(async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { tooltip: false }));
        });

        test.describe('click', () => {
            test('sets the value and focuses the handle', async ({ page }) => {
                const box = await page.locator('#host .progress.position-relative').boundingBox();
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

                await expect(page.locator('#slider')).toHaveValue('5');
                await expect(page.getByRole('slider')).toBeFocused();
            });

            test('ignores secondary mouse buttons', async ({ page }) => {
                await page.locator('#host .progress.position-relative').click({ button: 'right' });

                await expect(page.locator('#slider')).toHaveValue('3');
            });
        });

        test.describe('keyboard', () => {
            for (const { key, expected } of [
                { key: 'ArrowRight', expected: '4' },
                { key: 'ArrowUp', expected: '4' },
                { key: 'ArrowLeft', expected: '2' },
                { key: 'ArrowDown', expected: '2' },
                { key: 'Home', expected: '0' },
                { key: 'End', expected: '10' },
                { key: 'a', expected: '3' },
            ]) {
                test(`handles ${key}`, async ({ page }) => {
                    await page.getByRole('slider').press(key);

                    await expect(page.locator('#slider')).toHaveValue(expected);
                    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', expected);
                });
            }

            test('ignores keyboard input while disabled', async ({ page }) => {
                await page.evaluate(() => {
                    $('#slider').slider('disable');
                    $.findOne('[role="slider"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
                });

                await expect(page.locator('#slider')).toHaveValue('3');
            });
        });

        test.describe('focus', () => {
            test('redirects native input focus to the handle', async ({ page }) => {
                await page.locator('#slider').focus();

                await expect(page.getByRole('slider')).toBeFocused();
            });

            test('keeps the original input out of the tab order', async ({ page }) => {
                await page.locator('#outside').focus();
                await page.keyboard.press('Tab');
                await expect(page.getByRole('slider')).toBeFocused();
                await page.keyboard.press('Tab');
                await expect(page.locator('#slider2')).toBeFocused();
            });
        });

        test.describe('drag', () => {
            test('previews values without committing until release', async ({ page }) => {
                const box = await page.locator('#host .progress.position-relative').boundingBox();
                const y = box.y + box.height / 2;
                await page.mouse.move(box.x + box.width * .5, y);
                await page.mouse.down();
                await page.mouse.move(box.x + box.width * .8, y);

                await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '8');
                await expect(page.locator('#slider')).toHaveValue('3');
                expect(await page.evaluate(() => $('#slider').slider('getValue'))).toBe(8);
                await page.mouse.up();
                await expect(page.locator('#slider')).toHaveValue('8');
            });

            test('clamps movement outside the track', async ({ page }) => {
                const box = await page.locator('#host .progress.position-relative').boundingBox();
                const y = box.y + box.height / 2;
                await page.mouse.move(box.x + box.width / 2, y);
                await page.mouse.down();
                await page.mouse.move(box.x - 20, y);
                await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
                await page.mouse.move(box.x + box.width + 20, y);
                await page.mouse.up();
                await expect(page.locator('#slider')).toHaveValue('10');
            });

            test('uses touch release coordinates', async ({ page }) => {
                expect(await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .2 })).toBe(true);
                await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: .9 });

                await expect(page.locator('#slider')).toHaveValue('9');
            });

            test('ignores additional fingers during a touch gesture', async ({ page }) => {
                await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .5 });
                await page.evaluate(dispatchDragEvent, { type: 'touchstart', id: 2 });
                await page.evaluate(dispatchDragEvent, { type: 'touchmove', id: 2, fraction: .9 });
                await page.evaluate(dispatchDragEvent, { type: 'touchend', id: 2, fraction: .9 });
                await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '5');
                await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: .5 });
                await expect(page.locator('#slider')).toHaveValue('5');
            });

            for (const reason of ['touchcancel', 'blur', 'disable']) {
                test(`restores the committed value after ${reason}`, async ({ page }) => {
                    await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .8 });
                    await page.evaluate((reason) => {
                        if (reason === 'disable') {
                            $('#slider').slider('disable');
                        } else {
                            $.triggerEvent(window, reason, { data: { touches: [], changedTouches: [] } });
                        }
                    }, reason);
                    await page.evaluate(dispatchDragEvent, { type: 'touchmove', fraction: .1 });
                    await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: .1 });

                    await expect(page.locator('#slider')).toHaveValue('3');
                    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
                });
            }

            test('preserves a programmatic commit when a gesture is canceled', async ({ page }) => {
                await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .8 });
                await page.evaluate(() => $('#slider').slider('setValue', 6));
                await page.evaluate(dispatchDragEvent, { type: 'touchcancel' });

                await expect(page.locator('#slider')).toHaveValue('6');
                await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '6');
            });
        });
    });

    test.describe('touch cancellation', () => {
        for (const { direction, remainingTouch, positions } of [
            { direction: 'ltr', remainingTouch: false, positions: { 2: '72px', 3: '108px', 8: '288px' } },
            { direction: 'ltr', remainingTouch: true, positions: { 2: '72px', 3: '108px', 8: '288px' } },
            { direction: 'rtl', remainingTouch: false, positions: { 2: '288px', 3: '252px', 8: '72px' } },
            { direction: 'rtl', remainingTouch: true, positions: { 2: '288px', 3: '252px', 8: '72px' } },
        ]) {
            test.describe(`${direction}, ${remainingTouch ? 'another touch active' : 'no other touch active'}`, () => {
                const fraction = (value) => direction === 'rtl' ? 1 - value : value;

                for (const { name, values, start, move, preview, active } of [
                    { name: 'single slider at startup', values: [3], start: .4, preview: [4], active: 0 },
                    { name: 'single slider after movement', values: [3], start: .3, move: .7, preview: [7], active: 0 },
                    { name: 'range slider at startup', values: [2, 8], start: .2, preview: [2, 8], active: 0 },
                    { name: 'range slider after movement', values: [2, 8], start: .2, move: .5, preview: [5, 8], active: 0 },
                    { name: 'start handle crossing the end', values: [2, 8], start: .2, move: .9, preview: [2, 9], active: 1 },
                    { name: 'end handle crossing the start', values: [2, 8], start: .8, move: .1, preview: [1, 8], active: 0 },
                ]) {
                    test(`restores ${name} and allows a fresh gesture`, async ({ page }) => {
                        const range = values.length === 2;
                        const committed = values.join(',');
                        const apiValue = range ? values : values[0];

                        await page.evaluate(({ direction, range, committed }) => {
                            const node = $.findOne('#slider');
                            $.setAttribute(node, 'dir', direction);
                            $.setValue(node, committed);
                            UI.Slider.init(node, { range });
                            window.events = [];
                            $.addEvent('#slider', 'slide.ui.slider sliding.ui.slider change.ui.slider slid.ui.slider', (event) => {
                                window.events.push(event.type);
                            });
                        }, { direction, range, committed });
                        await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: fraction(start) });

                        if (move !== undefined) {
                            await page.evaluate(dispatchDragEvent, { type: 'touchmove', fraction: fraction(move) });
                        }

                        const handles = page.getByRole('slider');
                        await expect(handles).toHaveCount(preview.length);
                        for (const [index, value] of preview.entries()) {
                            await expect(handles.nth(index)).toHaveAttribute('aria-valuenow', `${value}`);
                        }
                        await expect(handles.nth(active)).toBeFocused();
                        await expect(page.locator('#slider')).toHaveValue(committed);
                        await expect(page.getByRole('tooltip')).toHaveText(preview.join(' - '));

                        if (remainingTouch) {
                            await page.evaluate(dispatchDragEvent, { type: 'touchstart', id: 2 });
                        }

                        await page.evaluate(dispatchDragEvent, { type: 'touchcancel', fraction: fraction(.9) });

                        expect(await page.evaluate(() => $('#slider').slider('getValue'))).toEqual(apiValue);
                        await expect(handles).toHaveCount(values.length);
                        for (const [index, value] of values.entries()) {
                            await expect(handles.nth(index)).toHaveAttribute('aria-valuenow', `${value}`);
                            await expect(handles.nth(index)).toHaveCSS('left', positions[value]);
                        }

                        await expect(page.locator('#slider')).toHaveValue(committed);
                        await expect(handles.nth(active)).toBeFocused();
                        await expect(page.getByRole('tooltip')).toHaveText(values.join(' - '));
                        await page.locator('#outside').focus();
                        await expect(page.getByRole('tooltip')).toHaveCount(0);

                        for (const id of [1, 2]) {
                            await page.evaluate(dispatchDragEvent, { type: 'touchmove', id, fraction: fraction(.1) });
                            await page.evaluate(dispatchDragEvent, { type: 'touchend', id, fraction: fraction(.1) });
                        }

                        await expect(page.locator('#slider')).toHaveValue(committed);
                        expect(await page.evaluate(() => $('#slider').slider('getValue'))).toEqual(apiValue);
                        const canceledEvents = move === undefined ? ['slide'] : ['slide', 'sliding'];
                        expect(await page.evaluate(() => window.events)).toEqual(canceledEvents);

                        await page.evaluate(dispatchDragEvent, { type: 'touchstart', id: 3, fraction: fraction(.3) });
                        await page.evaluate(dispatchDragEvent, { type: 'touchmove', id: 3, fraction: fraction(.6) });
                        await page.evaluate(dispatchDragEvent, { type: 'touchend', id: 3, fraction: fraction(.6) });
                        await expect(page.locator('#slider')).toHaveValue(range ? '6,8' : '6');
                        await expect(handles.first()).toHaveAttribute('aria-valuenow', '6');
                        expect(await page.evaluate(() => window.events)).toEqual([...canceledEvents, 'slide', 'sliding', 'change', 'slid']);
                    });
                }
            });
        }

        for (const { direction, values, freshValue } of [
            { direction: 'ltr', values: [3], freshValue: '7' },
            { direction: 'ltr', values: [2, 8], freshValue: '7,8' },
            { direction: 'rtl', values: [3], freshValue: '7' },
            { direction: 'rtl', values: [2, 8], freshValue: '7,8' },
        ]) {
            const range = values.length === 2;
            const committed = values.join(',');
            const fraction = (value) => direction === 'rtl' ? 1 - value : value;

            test(`cancels when another touch is canceled (${direction}, range=${range})`, async ({ page }) => {
                await page.evaluate(({ direction, range, committed }) => {
                    const node = $.findOne('#slider');
                    $.setAttribute(node, 'dir', direction);
                    $.setValue(node, committed);
                    UI.Slider.init(node, { range, tooltip: false });
                    window.events = [];
                    $.addEvent('#slider', 'slide.ui.slider sliding.ui.slider change.ui.slider slid.ui.slider', (event) => {
                        window.events.push(event.type);
                    });
                }, { direction, range, committed });
                await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: fraction(.3) });
                await page.evaluate(dispatchDragEvent, { type: 'touchmove', fraction: fraction(.5) });
                await page.evaluate(dispatchDragEvent, { type: 'touchstart', id: 2 });
                await page.evaluate(dispatchDragEvent, { type: 'touchcancel', id: 2, fraction: fraction(.9) });
                await page.evaluate(dispatchDragEvent, { type: 'touchmove', id: 2, fraction: fraction(.9) });
                await page.evaluate(dispatchDragEvent, { type: 'touchend', id: 2, fraction: fraction(.9) });

                const handles = page.getByRole('slider');
                await expect(handles).toHaveCount(values.length);
                for (const [index, value] of values.entries()) {
                    await expect(handles.nth(index)).toHaveAttribute('aria-valuenow', `${value}`);
                }
                await expect(page.locator('#slider')).toHaveValue(committed);
                expect(await page.evaluate(() => window.events)).toEqual(['slide', 'sliding']);
                await page.evaluate(dispatchDragEvent, { type: 'touchmove', fraction: fraction(.6) });
                await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: fraction(.7) });

                await expect(page.locator('#slider')).toHaveValue(committed);
                expect(await page.evaluate(() => window.events)).toEqual(['slide', 'sliding']);
                await page.evaluate(dispatchDragEvent, { type: 'touchstart', id: 3, fraction: fraction(.3) });
                await page.evaluate(dispatchDragEvent, { type: 'touchend', id: 3, fraction: fraction(.7) });
                await expect(page.locator('#slider')).toHaveValue(freshValue);
                expect(await page.evaluate(() => window.events)).toEqual(['slide', 'sliding', 'slide', 'change', 'slid']);
            });
        }
    });
});
