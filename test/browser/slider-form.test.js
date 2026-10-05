import { expect, test } from '#test';
import { dispatchDragEvent } from '../support/input/drag.js';

test.describe('Slider forms', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<form id="form"><fieldset><div id="host" style="width:360px;margin:40px">' +
                '<label for="slider">Amount</label><input id="slider" name="amount" value="3"></div></fieldset>' +
                '<button type="reset">Reset</button><button type="submit">Submit</button></form>',
            );
            window.changes = 0;
            window.submits = 0;
            $.addEvent('#slider', 'change.ui.slider', () => window.changes++);
            $.findOne('#form').addEventListener('submit', (event) => {
                event.preventDefault();
                window.submits++;
            });
        });
    });

    test.describe('native synchronization', () => {
        for (const type of ['input', 'change']) {
            test(`synchronizes native ${type} without duplicating changes`, async ({ page }) => {
                await page.evaluate((type) => {
                    const node = $.findOne('#slider');
                    UI.Slider.init(node);
                    node.value = '7.2';
                    node.dispatchEvent(new Event(type, { bubbles: true }));
                }, type);

                await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '7');
                await expect(page.locator('#slider')).toHaveValue('7');
                expect(await page.evaluate(() => window.changes)).toBe(type === 'change' ? 1 : 0);
            });

            test(`synchronizes native ${type} dispatched inside a component change listener`, async ({ page }) => {
                await page.evaluate((type) => {
                    const node = $.findOne('#slider');
                    const instance = UI.Slider.init(node);

                    $.addEventOnce(node, 'change.ui.slider', () => {
                        node.value = '7';
                        node.dispatchEvent(new Event(type, { bubbles: true }));
                    });

                    instance.setValue(8);
                }, type);

                await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '7');
                expect(await page.evaluate(() => $('#slider').slider('getValue'))).toBe(7);
                expect(await page.evaluate(() => new FormData($.findOne('#form')).get('amount'))).toBe('7');
                expect(await page.evaluate(() => window.changes)).toBe(type === 'change' ? 2 : 1);
            });
        }

        test('replaces a drag preview with an external value', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider')));
            await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .8 });
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                node.value = '5';
                node.dispatchEvent(new Event('input', { bubbles: true }));
            });
            await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: .9 });

            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '5');
            await expect(page.locator('#slider')).toHaveValue('5');
        });
    });

    test.describe('submission', () => {
        test('submits the committed value without replacing the default', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider')).setValue(7));

            expect(await page.evaluate(() => new FormData($.findOne('#form')).get('amount'))).toBe('7');
            await expect(page.locator('#slider')).toHaveAttribute('value', '3');
            await page.getByRole('button', { name: 'Submit' }).click();
            expect(await page.evaluate(() => window.submits)).toBe(1);
        });

        test('serializes a range and excludes a disabled control', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                range: true, rangeSeparator: ':',
            }).setValue(2, 8));

            expect(await page.evaluate(() => new FormData($.findOne('#form')).get('amount'))).toBe('2:8');
            await page.evaluate(() => $('#slider').slider('disable'));
            expect(await page.evaluate(() => new FormData($.findOne('#form')).has('amount'))).toBe(false);
        });

        test('does not submit when activating a handle', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider')));
            await page.getByRole('slider').press('Enter');

            expect(await page.evaluate(() => window.submits)).toBe(0);
        });
    });

    test.describe('validation', () => {
        test('preserves native validation and redirects invalid focus', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                $.setProperty(node, 'pattern', '[0-5]');
                UI.Slider.init(node).setValue(8);
            });

            expect(await page.locator('#slider').evaluate((node) => node.validity.patternMismatch)).toBe(true);
            await page.getByRole('button', { name: 'Submit' }).click();
            await expect(page.getByRole('slider')).toBeFocused();
            expect(await page.evaluate(() => window.submits)).toBe(0);
            await page.evaluate(() => $('#slider').slider('setValue', 4));
            expect(await page.locator('#slider').evaluate((node) => node.checkValidity())).toBe(true);
        });
    });

    test.describe('disabled state', () => {
        for (const range of [false, true]) {
            test(`tracks native and fieldset changes (range=${range})`, async ({ page }) => {
                await page.evaluate((range) => {
                    $.setProperty($.findOne('fieldset'), 'disabled', true);
                    UI.Slider.init($.findOne('#slider'), { range });
                }, range);

                const handles = page.getByRole('slider');
                await expect(handles).toHaveCount(range ? 2 : 1);
                for (const handle of await handles.all()) {
                    await expect(handle).toBeDisabled();
                }
                await page.evaluate(() => $.setProperty($.findOne('fieldset'), 'disabled', false));
                for (const handle of await handles.all()) {
                    await expect(handle).toBeEnabled();
                }
                await page.evaluate(() => $.setProperty($.findOne('#slider'), 'disabled', true));
                for (const handle of await handles.all()) {
                    await expect(handle).toBeDisabled();
                }
            });
        }

        test('cancels an active drag when its fieldset is disabled', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider')));
            await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .8 });
            await page.evaluate(() => $.setProperty($.findOne('fieldset'), 'disabled', true));

            await expect(page.getByRole('slider')).toBeDisabled();
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
            await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: .9 });
            await expect(page.locator('#slider')).toHaveValue('3');
            expect(await page.evaluate(() => window.changes)).toBe(0);
        });
    });

    test.describe('reset', () => {
        for (const range of [false, true]) {
            test(`restores defaults silently (range=${range})`, async ({ page }) => {
                await page.evaluate((range) => {
                    const node = $.findOne('#slider');
                    $.setProperty(node, 'defaultValue', range ? '2,8' : '3');
                    UI.Slider.init(node, { range }).setValue(4, 6);
                    window.changes = 0;
                }, range);
                await page.getByRole('button', { name: 'Reset' }).click();

                await expect(page.locator('#slider')).toHaveValue(range ? '2,8' : '3');
                await expect(page.getByRole('slider').first()).toHaveAttribute('aria-valuenow', range ? '2' : '3');
                if (range) {
                    await expect(page.getByRole('slider').last()).toHaveAttribute('aria-valuenow', '8');
                }
                expect(await page.evaluate(() => window.changes)).toBe(0);
            });
        }

        test('respects a cancelled reset', async ({ page }) => {
            await page.clock.install();
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider')).setValue(7);
                const form = $.findOne('#form');
                form.addEventListener('reset', (event) => event.preventDefault());
                form.reset();
            });
            await page.clock.runFor(1);

            await expect(page.locator('#slider')).toHaveValue('7');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '7');
        });

        test('retains a pending accepted reset when a later reset is cancelled', async ({ page }) => {
            await page.clock.install();
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider')).setValue(7);
                const form = $.findOne('#form');
                form.reset();
                form.addEventListener('reset', (event) => event.preventDefault());
                form.reset();
            });
            await page.clock.runFor(1);

            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
        });
    });

    test.describe('disposal', () => {
        test('preserves another instance and consumer reset handlers', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                $.after(node, '<input id="second" value="2" aria-label="Other amount">');
                $('input').slider();
                $('#second').slider('setValue', 8);
                window.resets = 0;
                $.addEvent('#form', 'reset.ui.slider', () => window.resets++);
                $('#slider').slider('dispose');
            });
            await page.getByRole('button', { name: 'Reset' }).click();

            await expect(page.getByRole('slider', { name: 'Other amount' })).toHaveAttribute('aria-valuenow', '2');
            expect(await page.evaluate(() => window.resets)).toBe(1);
        });

        test('clears pending reset work before reinitialization', async ({ page }) => {
            await page.clock.install();
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                UI.Slider.init(node);
                $.findOne('#form').reset();
                $('#slider').slider('dispose');
                UI.Slider.init(node).setValue(9);
            });
            await page.clock.runFor(1);

            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '9');
        });
    });
});
