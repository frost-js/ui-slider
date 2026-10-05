import { expect, test } from '#test';
import { dispatchDragEvent } from '../support/input/drag.js';

test.describe('Slider', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<button id="outside">Outside</button>' +
                '<div id="host" style="width:360px;margin:40px">' +
                '<label for="slider">Amount</label><input id="slider" value="3"><input id="slider2" value="7"></div>',
            );
        });
    });

    test.describe('#init', () => {
        for (const { name, init } of [
            { name: 'class', init: () => UI.Slider.init($.findOne('#slider')) },
            { name: 'QuerySet', init: () => $('#slider').slider() },
        ]) {
            test(`creates and registers a Slider (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(init);

                expect(await instance.evaluate((value) => value instanceof UI.Slider)).toBe(true);
                expect(await instance.evaluate((value) => $.getData('#slider', 'slider') === value)).toBe(true);
                await expect(page.getByRole('slider')).toHaveCount(1);
                await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
            });
        }

        test('creates multiple Sliders (QuerySet)', async ({ page }) => {
            await page.evaluate(() => $('input').slider());

            await expect(page.getByRole('slider')).toHaveCount(2);
            expect(await page.evaluate(() => $.getData('#slider2', 'slider') instanceof UI.Slider)).toBe(true);
        });

        test('returns the first Slider (QuerySet)', async ({ page }) => {
            expect(await page.evaluate(() => $('input').slider() === $.getData('#slider', 'slider'))).toBe(true);
        });

        test('reuses an existing Slider', async ({ page }) => {
            expect(await page.evaluate(() => {
                const node = $.findOne('#slider');
                const first = UI.Slider.init(node);
                return UI.Slider.init(node, { range: true }) === first;
            })).toBe(true);
            await expect(page.getByRole('slider')).toHaveCount(1);
        });

        test('exposes frozen options', async ({ page }) => {
            const instance = await page.evaluateHandle(() => UI.Slider.init($.findOne('#slider')));

            expect(await instance.evaluate((value) => Object.isFrozen(value.options))).toBe(true);
            expect(await instance.evaluate((value) => value.node === $.findOne('#slider'))).toBe(true);
        });

        test('merges defaults, data attributes, and explicit options in order', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                $.setDataset(node, 'uiMin', 2);
                $.setDataset(node, 'uiMax', 8);
                UI.Slider.init(node, { max: 12 });
            });

            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuemin', '2');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuemax', '12');
        });

        test('normalizes numeric strings while keeping public options frozen', async ({ page }) => {
            const instance = await page.evaluateHandle(() => {
                return UI.Slider.init($.findOne('#slider'), { min: '2', max: '8', step: '.5' });
            });

            expect(await instance.evaluate((slider) => Object.isFrozen(slider.options))).toBe(true);
            expect(await instance.evaluate((slider) => slider.options.step)).toBe('.5');
            await page.getByRole('slider').press('ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('3.5');
        });

        test('rejects non-input nodes without registering an instance', async ({ page }) => {
            expect(await page.evaluate(() => {
                try {
                    UI.Slider.init($.findOne('#outside'));
                } catch (error) {
                    return error.message;
                }
            })).toBe('Slider must be created on an input element.');
            expect(await page.evaluate(() => $.hasData('#outside', 'slider'))).toBe(false);
        });

        for (const range of [false, true]) {
            for (const focused of [false, true]) {
                test(`exposes only generated controls for a ${range ? 'range' : 'single'} slider initialized ${focused ? 'focused' : 'unfocused'}`, async ({ page }) => {
                    await page.evaluate(({ range, focused }) => {
                        $.setHtml(document.body,
                            '<button id="outside">Outside</button>' +
                            '<label for="slider">Amount</label>' +
                            `<input id="slider" value="${range ? '2,8' : '3'}">`,
                        );
                        const node = $.findOne('#slider');
                        (focused ? node : $.findOne('#outside')).focus();
                        UI.Slider.init(node, { range, tooltip: false });
                    }, { range, focused });

                    const handles = page.getByRole('slider');
                    await expect(handles).toHaveCount(range ? 2 : 1);
                    await expect(handles.first()).toHaveAccessibleName(range ? 'Amount start' : 'Amount');
                    await expect(handles.first()).toHaveAttribute('aria-valuenow', range ? '2' : '3');
                    if (range) {
                        await expect(handles.last()).toHaveAccessibleName('Amount end');
                        await expect(handles.last()).toHaveAttribute('aria-valuenow', '8');
                    }
                    await expect(page.locator('#slider')).toHaveAttribute('aria-hidden', 'true');
                    await expect(page.getByRole('textbox')).toHaveCount(0);
                    await expect(focused ? handles.first() : page.locator('#outside')).toBeFocused();

                    await page.locator('label').click();
                    await expect(handles.first()).toBeFocused();
                    await handles.first().press('ArrowRight');
                    await expect(page.locator('#slider')).toHaveValue(range ? '3,8' : '4');
                    await expect(page.getByRole('textbox')).toHaveCount(0);

                    await page.evaluate(() => $.getData('#slider', 'slider').dispose());
                    await expect(handles).toHaveCount(0);
                    await expect(page.getByRole('textbox', { name: 'Amount' })).toHaveValue(range ? '3,8' : '4');
                });
            }
        }

        for (const ariaHidden of [null, 'false', 'true']) {
            test(`restores the input with original aria-hidden ${ariaHidden ?? 'absence'} if a formatter fails during initialization`, async ({ page }) => {
                expect(await page.evaluate((ariaHidden) => {
                    const node = $.findOne('#slider');
                    if (ariaHidden !== null) {
                        $.setAttribute(node, 'aria-hidden', ariaHidden);
                    }
                    $.setAttribute(node, 'tabindex', '4');
                    try {
                        UI.Slider.init(node, {
                            valueText: () => {
                                throw new Error('Invalid formatter');
                            },
                        });
                    } catch (error) {
                        return { message: error.message, ariaHidden: $.getAttribute(node, 'aria-hidden') };
                    }
                }, ariaHidden)).toEqual({ message: 'Invalid formatter', ariaHidden });
                await expect(page.getByRole('slider')).toHaveCount(0);
                await expect(page.locator('#slider')).not.toHaveClass(/visually-hidden/);
                await expect(page.locator('#slider')).toHaveAttribute('tabindex', '4');
                expect(await page.evaluate(() => $.hasData('#slider', 'slider'))).toBe(false);
            });
        }
    });

    test.describe('#dispose', () => {
        for (const ariaHidden of [null, 'false', 'true']) {
            test(`restores original aria-hidden ${ariaHidden ?? 'absence'} after disposal`, async ({ page }) => {
                await page.evaluate((ariaHidden) => {
                    const node = $.findOne('#slider');
                    if (ariaHidden !== null) {
                        $.setAttribute(node, 'aria-hidden', ariaHidden);
                    }
                    UI.Slider.init(node, { tooltip: false });
                }, ariaHidden);

                const input = page.locator('#slider');
                await expect(input).toHaveAttribute('aria-hidden', 'true');
                await page.evaluate(() => $.getData('#slider', 'slider').dispose());

                if (ariaHidden === null) {
                    await expect(input).not.toHaveAttribute('aria-hidden');
                } else {
                    await expect(input).toHaveAttribute('aria-hidden', ariaHidden);
                }
            });
        }

        for (const { name, dispose } of [
            { name: 'class', dispose: (instance) => instance.dispose() },
            { name: 'QuerySet', dispose: () => $('#slider').slider('dispose') },
        ]) {
            test(`restores the original input (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(() => {
                    const node = $.findOne('#slider');
                    $.setAttribute(node, 'class', 'existing');
                    $.setProperty(node, 'tabIndex', 4);
                    const instance = UI.Slider.init(node);
                    $.addClass(node, 'runtime');
                    return instance;
                });
                await page.evaluate(dispose, instance);

                expect(await instance.evaluate((value) => value.node)).toBeNull();
                expect(await instance.evaluate((value) => value.options)).toBeNull();
                expect(await page.evaluate(() => $.hasData('#slider', 'slider'))).toBe(false);
                await expect(page.getByRole('slider')).toHaveCount(0);
                await expect(page.locator('#slider')).toHaveClass('existing runtime');
                await expect(page.locator('#slider')).toHaveAttribute('tabindex', '4');
            });
        }

        test('restores an existing hidden class and absent tabindex', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                $.addClass(node, 'visually-hidden');
                const instance = UI.Slider.init(node);
                $.removeClass(node, 'visually-hidden');
                instance.dispose();
                instance.dispose();
            });

            await expect(page.locator('#slider')).toHaveClass('visually-hidden');
            await expect(page.locator('#slider')).not.toHaveAttribute('tabindex');
        });

        test('disposes when fQuery removes the original input', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), { tooltip: 'always' });
                $.remove('#slider');
            });

            await expect(page.getByRole('slider')).toHaveCount(0);
            await expect(page.getByRole('tooltip')).toHaveCount(0);
        });

        test('allows reinitialization after disposal', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                UI.Slider.init(node).dispose();
                UI.Slider.init(node).setValue(8);
            });

            await expect(page.getByRole('slider')).toHaveCount(1);
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '8');
        });

        test('preserves other instances and consumer change listeners', async ({ page }) => {
            await page.evaluate(() => {
                $('input').slider();
                window.changes = 0;
                $.addEvent('#slider', 'change.ui.slider', () => window.changes++);
                $('#slider').slider('dispose');
                $.triggerEvent('#slider', 'change.ui.slider');
                $('#slider2').slider('setValue', 9);
            });

            expect(await page.evaluate(() => window.changes)).toBe(1);
            await expect(page.getByRole('slider')).toHaveCount(1);
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '9');
        });
    });

    for (const method of ['disable', 'enable']) {
        test.describe(`#${method}`, () => {
            for (const { name, update } of [
                { name: 'class', update: (method) => $.getData('#slider', 'slider')[method]() },
                { name: 'QuerySet', update: (method) => $('#slider').slider(method) },
            ]) {
                test(`${method}s the input and handles (${name})`, async ({ page }) => {
                    await page.evaluate((method) => {
                        const instance = UI.Slider.init($.findOne('#slider'), { range: true });
                        if (method === 'enable') {
                            instance.disable();
                        }
                    }, method);
                    await page.evaluate(update, method);

                    const enabled = method === 'enable';
                    await expect(page.locator('#slider')).toBeEnabled({ enabled });
                    const handles = page.getByRole('slider');
                    await expect(handles).toHaveCount(2);
                    await expect(handles.nth(0)).toBeEnabled({ enabled });
                    await expect(handles.nth(1)).toBeEnabled({ enabled });
                });
            }
        });
    }

    test.describe('#getValue', () => {
        for (const { name, getValue } of [
            { name: 'class', getValue: () => $.getData('#slider', 'slider').getValue() },
            { name: 'QuerySet', getValue: () => $('#slider').slider('getValue') },
        ]) {
            test(`gets a single value (${name})`, async ({ page }) => {
                await page.evaluate(() => UI.Slider.init($.findOne('#slider')));

                expect(await page.evaluate(getValue)).toBe(3);
            });

            test(`gets a range (${name})`, async ({ page }) => {
                await page.evaluate(() => {
                    $.setValue($.findOne('#slider'), '2,8');
                    UI.Slider.init($.findOne('#slider'), { range: true });
                });

                expect(await page.evaluate(getValue)).toEqual([2, 8]);
            });
        }

        test('returns a copy of range values', async ({ page }) => {
            expect(await page.evaluate(() => {
                const instance = UI.Slider.init($.findOne('#slider'), { range: true });
                instance.setValue(2, 8);
                instance.getValue()[0] = 100;
                return instance.getValue();
            })).toEqual([2, 8]);
        });
    });

    test.describe('#setValue', () => {
        test('preserves large integer values on the step grid', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), { max: 1e16, step: 1 }).setValue(1234567890123456);
            });

            await expect(page.locator('#slider')).toHaveValue('1234567890123456');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '1234567890123456');
        });

        for (const { name, setValue } of [
            { name: 'class', setValue: () => $.getData('#slider', 'slider').setValue(7) },
            { name: 'QuerySet', setValue: () => $('#slider').slider('setValue', 7) },
        ]) {
            test(`sets a single value (${name})`, async ({ page }) => {
                await page.evaluate(() => UI.Slider.init($.findOne('#slider')));
                await page.evaluate(setValue);

                await expect(page.locator('#slider')).toHaveValue('7');
                await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '7');
            });
        }

        for (const { name, setValue } of [
            { name: 'class', setValue: () => $.getData('#slider', 'slider').setValue(9, 1) },
            { name: 'QuerySet', setValue: () => $('#slider').slider('setValue', 9, 1) },
        ]) {
            test(`orders range endpoints (${name})`, async ({ page }) => {
                await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { range: true }));
                await page.evaluate(setValue);

                await expect(page.locator('#slider')).toHaveValue('1,9');
                await expect(page.getByRole('slider', { name: 'Amount start' })).toHaveAttribute('aria-valuenow', '1');
                await expect(page.getByRole('slider', { name: 'Amount end' })).toHaveAttribute('aria-valuenow', '9');
            });
        }
    });

    test.describe('input attributes', () => {
        test('inherits initial disabled state', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                $.setProperty(node, 'disabled', true);
                UI.Slider.init(node);
            });

            await expect(page.getByRole('slider')).toBeDisabled();
            await expect(page.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
        });

        for (const { name, markup, expected } of [
            { name: 'explicit label', markup: '<label for="slider">Volume</label><input id="slider">', expected: 'Volume' },
            { name: 'wrapping label', markup: '<label>Volume<input id="slider"></label>', expected: 'Volume' },
            { name: 'aria-label', markup: '<input id="slider" aria-label="Volume">', expected: 'Volume' },
            { name: 'aria-labelledby', markup: '<span id="title">Volume</span><input id="slider" aria-labelledby="title">', expected: 'Volume' },
            { name: 'no label', markup: '<input id="slider">', expected: 'Value' },
        ]) {
            test(`sets the accessible name from ${name}`, async ({ page }) => {
                await page.evaluate((markup) => {
                    $.setHtml($.findOne('#host'), markup);
                    UI.Slider.init($.findOne('#slider'));
                }, markup);

                await expect(page.getByRole('slider')).toHaveAccessibleName(expected);
            });
        }

        test('supports unusual input IDs without changing label IDs', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                $.setProperty(node, 'id', 'amount"value');
                $.setProperty($.findOne('label'), 'htmlFor', $.getProperty(node, 'id'));
                UI.Slider.init(node);
            });

            await expect(page.getByRole('slider')).toHaveAccessibleName('Amount');
            await expect(page.locator('label')).not.toHaveAttribute('id');
        });

        test('copies descriptions and invalid state to the handle', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                $.setAttribute(node, 'aria-describedby', 'help');
                $.setAttribute(node, 'aria-invalid', 'true');
                UI.Slider.init(node, { tooltip: false });
            });

            await expect(page.getByRole('slider')).toHaveAttribute('aria-describedby', 'help');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-invalid', 'true');
        });

        test('preserves help descriptions while showing and hiding the tooltip', async ({ page }) => {
            await page.evaluate(() => {
                $.append('#host', '<p id="help">First help</p><p id="other-help">Second help</p>');
                $.setAttribute('#slider', 'aria-describedby', 'help other-help');
                UI.Slider.init($.findOne('#slider'));
            });

            const handle = page.getByRole('slider');
            await handle.focus();
            await expect(page.getByRole('tooltip')).toBeVisible();
            const tooltipId = await page.getByRole('tooltip').getAttribute('id');
            await expect(handle).toHaveAttribute('aria-describedby', `help other-help ${tooltipId}`);
            await expect(handle).toHaveAccessibleDescription('First help Second help 3');
            await page.evaluate(() => $('#slider').slider('setValue', 5));
            await expect(handle).toHaveAttribute('aria-describedby', `help other-help ${tooltipId}`);
            await page.locator('#outside').focus();
            await expect(page.getByRole('tooltip')).toHaveCount(0);
            await expect(handle).toHaveAttribute('aria-describedby', 'help other-help');
            await expect(handle).toHaveAccessibleDescription('First help Second help');
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
                    for (const name of ['slide', 'sliding', 'change', 'slid']) {
                        $.addEvent(node, `${name}.ui.slider`, (event) => {
                            window.events.push(name);
                            window.lastDetail = event.detail;
                        });
                    }
                }, range);
                const box = await page.locator('#host .progress.position-relative').boundingBox();
                const y = box.y + box.height / 2;
                await page.mouse.move(box.x + box.width * .5, y);
                await page.mouse.down();
                await page.mouse.move(box.x + box.width * .8, y);
                await page.mouse.up();

                expect(await page.evaluate(() => window.events.join(','))).toBe('slide,sliding,change,slid');
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
                const errors = [];
                page.on('pageerror', (error) => errors.push(error.message));
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
                expect(errors).toHaveLength(0);
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
        for (const direction of ['ltr', 'rtl']) {
            test.describe(direction, () => {
                const fraction = (value) => direction === 'rtl' ? 1 - value : value;

                for (const { name, range, start, move, preview, active } of [
                    { name: 'single slider at startup', range: false, start: .4, preview: [4], active: 0 },
                    { name: 'single slider after movement', range: false, start: .3, move: .7, preview: [7], active: 0 },
                    { name: 'range slider at startup', range: true, start: .2, preview: [2, 8], active: 0 },
                    { name: 'range slider after movement', range: true, start: .2, move: .5, preview: [5, 8], active: 0 },
                    { name: 'start handle crossing the end', range: true, start: .2, move: .9, preview: [2, 9], active: 1 },
                    { name: 'end handle crossing the start', range: true, start: .8, move: .1, preview: [1, 8], active: 0 },
                ]) {
                    for (const remainingTouch of [false, true]) {
                        test(`restores ${name} with ${remainingTouch ? 'another touch active' : 'no other touch active'} and allows a fresh gesture`, async ({ page }) => {
                            await page.evaluate(({ direction, range }) => {
                                const node = $.findOne('#slider');
                                $.setAttribute(node, 'dir', direction);
                                $.setValue(node, range ? '2,8' : '3');
                                UI.Slider.init(node, { range });
                                window.events = [];
                                for (const name of ['slide', 'sliding', 'change', 'slid']) {
                                    $.addEvent(node, `${name}.ui.slider`, () => window.events.push(name));
                                }
                            }, { direction, range });
                            await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: fraction(start) });
                            if (move !== undefined) {
                                await page.evaluate(dispatchDragEvent, { type: 'touchmove', fraction: fraction(move) });
                            }

                            const handles = page.getByRole('slider');
                            for (const [index, value] of preview.entries()) {
                                await expect(handles.nth(index)).toHaveAttribute('aria-valuenow', `${value}`);
                            }
                            await expect(handles.nth(active)).toBeFocused();
                            await expect(page.locator('#slider')).toHaveValue(range ? '2,8' : '3');
                            await expect(page.getByRole('tooltip')).toHaveText(range ? preview.join(' - ') : `${preview[0]}`);
                            if (remainingTouch) {
                                await page.evaluate(dispatchDragEvent, { type: 'touchstart', id: 2 });
                            }
                            await page.evaluate(dispatchDragEvent, { type: 'touchcancel', fraction: fraction(.9) });

                            const committed = range ? [2, 8] : [3];
                            expect(await page.evaluate(() => $('#slider').slider('getValue'))).toEqual(range ? committed : committed[0]);
                            for (const [index, value] of committed.entries()) {
                                await expect(handles.nth(index)).toHaveAttribute('aria-valuenow', `${value}`);
                                expect(await handles.nth(index).evaluate((node) => $.getStyle(node, 'left'))).toBe(`${direction === 'rtl' ? 100 - value * 10 : value * 10}%`);
                            }
                            await expect(page.locator('#slider')).toHaveValue(committed.join(','));
                            await expect(handles.nth(active)).toBeFocused();
                            await expect(page.getByRole('tooltip')).toHaveText(range ? '2 - 8' : '3');
                            await page.locator('#outside').focus();
                            await expect(page.getByRole('tooltip')).toHaveCount(0);

                            for (const id of [1, 2]) {
                                await page.evaluate(dispatchDragEvent, { type: 'touchmove', id, fraction: fraction(.1) });
                                await page.evaluate(dispatchDragEvent, { type: 'touchend', id, fraction: fraction(.1) });
                            }
                            await expect(page.locator('#slider')).toHaveValue(committed.join(','));
                            expect(await page.evaluate(() => $('#slider').slider('getValue'))).toEqual(range ? committed : committed[0]);
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
                }

                for (const range of [false, true]) {
                    test(`cancels when another touch is canceled during a ${range ? 'range' : 'single'} slider gesture`, async ({ page }) => {
                        await page.evaluate(({ direction, range }) => {
                            const node = $.findOne('#slider');
                            $.setAttribute(node, 'dir', direction);
                            $.setValue(node, range ? '2,8' : '3');
                            UI.Slider.init(node, { range, tooltip: false });
                            window.events = [];
                            for (const name of ['slide', 'sliding', 'change', 'slid']) {
                                $.addEvent(node, `${name}.ui.slider`, () => window.events.push(name));
                            }
                        }, { direction, range });
                        await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: fraction(.3) });
                        await page.evaluate(dispatchDragEvent, { type: 'touchmove', fraction: fraction(.5) });
                        await page.evaluate(dispatchDragEvent, { type: 'touchstart', id: 2 });
                        await page.evaluate(dispatchDragEvent, { type: 'touchcancel', id: 2, fraction: fraction(.9) });
                        await page.evaluate(dispatchDragEvent, { type: 'touchmove', id: 2, fraction: fraction(.9) });
                        await page.evaluate(dispatchDragEvent, { type: 'touchend', id: 2, fraction: fraction(.9) });

                        await expect(page.getByRole('slider').first()).toHaveAttribute('aria-valuenow', range ? '2' : '3');
                        await expect(page.locator('#slider')).toHaveValue(range ? '2,8' : '3');
                        expect(await page.evaluate(() => window.events)).toEqual(['slide', 'sliding']);
                        await page.evaluate(dispatchDragEvent, { type: 'touchmove', fraction: fraction(.6) });
                        await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: fraction(.7) });

                        await expect(page.locator('#slider')).toHaveValue(range ? '2,8' : '3');
                        expect(await page.evaluate(() => window.events)).toEqual(['slide', 'sliding']);
                        await page.evaluate(dispatchDragEvent, { type: 'touchstart', id: 3, fraction: fraction(.3) });
                        await page.evaluate(dispatchDragEvent, { type: 'touchend', id: 3, fraction: fraction(.7) });
                        await expect(page.locator('#slider')).toHaveValue(range ? '7,8' : '7');
                        expect(await page.evaluate(() => window.events)).toEqual(['slide', 'sliding', 'slide', 'change', 'slid']);
                    });
                }
            });
        }
    });

    test.describe('min option', () => {
        test('clamps values below the minimum', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { min: 4 }).setValue(-1));

            await expect(page.locator('#slider')).toHaveValue('4');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuemin', '4');
        });

        test('clamps the maximum to the minimum for descending bounds', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { min: 20 }));

            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuemin', '20');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuemax', '20');
            await page.getByRole('slider').press('End');
            await expect(page.locator('#slider')).toHaveValue('20');
        });
    });

    test.describe('max option', () => {
        test('keeps the maximum reachable when the step does not divide the interval', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { max: 10, step: 6 }).setValue(20));

            await expect(page.locator('#slider')).toHaveValue('10');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuemax', '10');
        });

        for (const scale of ['linear', 'logarithmic']) {
            test(`renders equal bounds without invalid geometry (${scale})`, async ({ page }) => {
                await page.evaluate((scale) => UI.Slider.init($.findOne('#slider'), { min: 5, max: 5, scale }), scale);

                await expect(page.locator('#slider')).toHaveValue('5');
                await expect(page.getByRole('slider')).toHaveCSS('left', '0px');
                await page.getByRole('slider').press('End');
                await expect(page.locator('#slider')).toHaveValue('5');
                await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .5 });
                await page.evaluate(dispatchDragEvent, { type: 'touchend', fraction: .8 });
                await expect(page.locator('#slider')).toHaveValue('5');
                await expect(page.getByRole('slider')).toHaveCSS('left', '0px');
            });
        }

        test('falls back to the default for non-finite bounds', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { max: Infinity }));

            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuemax', '10');
            await page.getByRole('slider').press('End');
            await expect(page.locator('#slider')).toHaveValue('10');
        });

        test('renders overflowing intervals as a fixed-value slider', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                min: -Number.MAX_VALUE, max: Number.MAX_VALUE,
            }));

            await expect(page.getByRole('slider')).toHaveCSS('left', '0px');
            await page.getByRole('slider').press('End');
            expect(await page.evaluate(() => $('#slider').slider('getValue'))).toBe(-Number.MAX_VALUE);
        });
    });

    test.describe('defaultValue option', () => {
        for (const { name, value } of [
            { name: 'empty', value: '' },
            { name: 'invalid text', value: 'invalid' },
            { name: 'null', value: null },
            { name: 'boolean', value: false },
            { name: 'infinity', value: Infinity },
        ]) {
            test(`uses the fallback for ${name}`, async ({ page }) => {
                await page.evaluate((value) => {
                    UI.Slider.init($.findOne('#slider'), { defaultValue: 4 }).setValue(value);
                }, value);

                await expect(page.locator('#slider')).toHaveValue('4');
                await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '4');
            });
        }

        test('falls back to the minimum when defaultValue is invalid', async ({ page }) => {
            await page.evaluate(() => {
                $.setValue($.findOne('#slider'), '');
                UI.Slider.init($.findOne('#slider'), { min: 2, defaultValue: 'invalid' });
            });

            await expect(page.locator('#slider')).toHaveValue('2');
        });
    });

    test.describe('step option', () => {
        for (const { min, max, step, expected } of [
            { min: 0, max: 10, step: 3, expected: '9' },
            { min: .1, max: .4, step: .1, expected: '0.3' },
            { min: .1, max: .8, step: .2, expected: '0.7' },
        ]) {
            test(`moves to the adjacent step below max=${max} with min=${min} and step=${step}`, async ({ page }) => {
                await page.evaluate(({ min, max, step }) => {
                    UI.Slider.init($.findOne('#slider'), { min, max, step });
                }, { min, max, step });
                await page.getByRole('slider').press('End');
                await page.getByRole('slider').press('ArrowLeft');

                await expect(page.locator('#slider')).toHaveValue(expected);
            });
        }

        test('keeps finite values when the step count overflows', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), { step: 1e-309 }).setValue(1);
            });

            await expect(page.locator('#slider')).toHaveValue('1');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '1');
            await page.getByRole('slider').press('ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('1');
        });

        test('rounds decimal steps relative to the minimum', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { min: .1, step: .2 }).setValue(.24));

            await expect(page.locator('#slider')).toHaveValue('0.3');
            await page.getByRole('slider').press('ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('0.5');
        });

        test('clamps the result after rounding', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { step: 6 }).setValue(9.5));

            await expect(page.locator('#slider')).toHaveValue('10');
        });

        for (const step of [0, -1, 'invalid', Infinity]) {
            test(`uses the default step for step=${step}`, async ({ page }) => {
                await page.evaluate((step) => UI.Slider.init($.findOne('#slider'), { step }), step);
                await page.getByRole('slider').press('ArrowRight');

                await expect(page.locator('#slider')).toHaveValue('4');
            });
        }
    });

    test.describe('range option', () => {
        test('renders two separately named handles', async ({ page }) => {
            await page.evaluate(() => {
                $.setValue($.findOne('#slider'), '2,8');
                UI.Slider.init($.findOne('#slider'), { range: true });
            });

            await expect(page.getByRole('slider')).toHaveCount(2);
            await expect(page.getByRole('slider', { name: 'Amount start' })).toHaveAttribute('aria-valuenow', '2');
            await expect(page.getByRole('slider', { name: 'Amount end' })).toHaveAttribute('aria-valuenow', '8');
        });

        test('uses defaultValue for a missing endpoint', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { range: true, defaultValue: 1 }).setValue(8));

            await expect(page.locator('#slider')).toHaveValue('1,8');
        });

        for (const { name, key, expected, focused } of [
            { name: 'start', key: 'End', expected: '2,10', focused: 'Amount end' },
            { name: 'end', key: 'Home', expected: '0,8', focused: 'Amount start' },
        ]) {
            test(`hands focus to the other handle when ${name} crosses`, async ({ page }) => {
                await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { range: true }).setValue(2, 8));
                await page.getByRole('slider', { name: `Amount ${name}` }).press(key);

                await expect(page.locator('#slider')).toHaveValue(expected);
                await expect(page.getByRole('slider', { name: focused })).toBeFocused();
            });
        }

        test('selects the closest handle when clicking the track', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { range: true, tooltip: false }).setValue(2, 8));
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.click(box.x + box.width * .7, box.y + box.height / 2);

            await expect(page.locator('#slider')).toHaveValue('2,7');
            await expect(page.getByRole('slider', { name: 'Amount end' })).toBeFocused();
        });
    });

    test.describe('rangeSeparator option', () => {
        test('reads and serializes the configured separator', async ({ page }) => {
            await page.evaluate(() => {
                $.setValue($.findOne('#slider'), '2:8');
                UI.Slider.init($.findOne('#slider'), { range: true, rangeSeparator: ':' });
            });
            await page.getByRole('slider', { name: 'Amount end' }).press('ArrowLeft');

            await expect(page.locator('#slider')).toHaveValue('2:7');
        });

        test('uses the default for an empty separator', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), { range: true, rangeSeparator: '' }).setValue(2, 8);
            });

            await expect(page.locator('#slider')).toHaveValue('2,8');
            await page.getByRole('slider').last().press('End');
            await expect(page.locator('#slider')).toHaveValue('2,10');
        });
    });

    test.describe('orientation option', () => {
        test('uses horizontal linear behavior for unrecognized modes', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                orientation: 'invalid', scale: 'invalid', tooltip: false,
            }));

            await expect(page.getByRole('slider')).toHaveAttribute('aria-orientation', 'horizontal');
            await page.getByRole('slider').press('ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('4');
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            await expect(page.locator('#slider')).toHaveValue('5');
        });

        for (const orientation of ['horizontal', 'vertical']) {
            test(`exposes ${orientation} orientation`, async ({ page }) => {
                await page.evaluate((orientation) => UI.Slider.init($.findOne('#slider'), { orientation }), orientation);

                await expect(page.getByRole('slider')).toHaveAttribute('aria-orientation', orientation);
            });
        }

        test('maps vertical pointer movement to values', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { orientation: 'vertical', tooltip: false }));
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.click(box.x + box.width / 2, box.y + box.height * .8);

            await expect(page.locator('#slider')).toHaveValue('8');
        });
    });

    test.describe('reversed option', () => {
        test('reverses horizontal clicks and arrow keys', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { reversed: true, tooltip: false }));
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.click(box.x + box.width * .8, box.y + box.height / 2);

            await expect(page.locator('#slider')).toHaveValue('2');
            await page.getByRole('slider').press('ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('1');
        });
    });

    test.describe('scale option', () => {
        for (const min of [-10, 0, 10]) {
            test(`maps logarithmic midpoints with min=${min}`, async ({ page }) => {
                await page.evaluate((min) => UI.Slider.init($.findOne('#slider'), { min, max: min + 99, scale: 'logarithmic', tooltip: false }), min);
                const box = await page.locator('#host .progress.position-relative').boundingBox();
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

                await expect(page.locator('#slider')).toHaveValue(`${min + 9}`);
                await expect(page.getByRole('slider')).toHaveCSS('left', '180px');
            });
        }

        test('keeps logarithmic endpoints reachable', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { min: 10, max: 100, scale: 'logarithmic', tooltip: false }));
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x - 5, box.y + box.height / 2);
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '10');
            await page.mouse.move(box.x + box.width + 5, box.y + box.height / 2);
            await page.mouse.up();
            await expect(page.locator('#slider')).toHaveValue('100');
        });
    });

    test.describe('ticks option', () => {
        test('sorts and deduplicates usable ticks without changing the caller array', async ({ page }) => {
            const ticks = await page.evaluate(() => {
                const ticks = Object.freeze([10, 0, 5, 5, -1, 11, 'invalid']);
                UI.Slider.init($.findOne('#slider'), { ticks });
                return ticks;
            });

            await expect(page.locator('[data-ui-value]')).toHaveCount(3);
            await expect(page.locator('[data-ui-value]').nth(0)).toHaveAttribute('data-ui-value', '0');
            await expect(page.locator('[data-ui-value]').nth(1)).toHaveAttribute('data-ui-value', '5');
            expect(ticks).toEqual([10, 0, 5, 5, -1, 11, 'invalid']);
        });

        for (const { key, expected } of [
            { key: 'Control+ArrowRight', expected: '5' },
            { key: 'Control+ArrowLeft', expected: '0' },
        ]) {
            test(`navigates ticks with ${key}`, async ({ page }) => {
                await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { ticks: [0, 5, 10] }));
                await page.getByRole('slider').press(key);

                await expect(page.locator('#slider')).toHaveValue(expected);
            });
        }

        for (const { key, value } of [
            { key: 'Control+ArrowRight', value: 0 },
            { key: 'Control+ArrowLeft', value: 10 },
        ]) {
            test(`preserves off-step ticks with ${key}`, async ({ page }) => {
                await page.evaluate((value) => {
                    UI.Slider.init($.findOne('#slider'), { ticks: [0, 2.5, 10], step: 1 }).setValue(value);
                }, value);
                await page.getByRole('slider').press(key);

                await expect(page.locator('#slider')).toHaveValue('2.5');
                await page.getByRole('slider').press('ArrowRight');
                await expect(page.locator('#slider')).toHaveValue('3');
            });
        }

        test('reaches the bound after the last off-step tick without snapping back', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), { ticks: [9.8], tickSnapBounds: 1 }).setValue(10);
            });
            await page.getByRole('slider').press('Control+ArrowLeft');
            await expect(page.locator('#slider')).toHaveValue('9.8');
            await page.getByRole('slider').press('Control+ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('10');
        });

        test('sets a range endpoint when a tick is clicked', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { range: true, ticks: [0, 2.5, 10] }).setValue(0, 8));
            await page.locator('[data-ui-value="2.5"]').click();

            await expect(page.locator('#slider')).toHaveValue('2.5,8');
        });
    });

    test.describe('tickLabels option', () => {
        test('keeps labels associated with ticks after sorting', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                ticks: [10, 0, 5, 7], tickLabels: ['Ten', 0, 'Five', ''],
            }));

            await expect(page.locator('#host small')).toHaveText(['0', 'Five', 'Ten']);
        });
    });

    test.describe('tickSnapBounds option', () => {
        test('snaps to the zero tick within the configured distance', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { ticks: [0, 5], tickSize: 10, step: .1, tickSnapBounds: .5, tooltip: false }));
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.click(box.x + box.width * .04, box.y + box.height / 2);

            await expect(page.locator('#slider')).toHaveValue('0');
        });

        test('restores an off-step committed tick after cancellation', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                ticks: [2.5], tickSnapBounds: .5, step: 1, tooltip: false,
            }));
            await page.locator('[data-ui-value="2.5"]').click();
            await expect(page.locator('#slider')).toHaveValue('2.5');
            await page.evaluate(dispatchDragEvent, { type: 'touchstart', fraction: .8 });
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '8');
            await page.evaluate(dispatchDragEvent, { type: 'touchcancel' });

            await expect(page.locator('#slider')).toHaveValue('2.5');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '2.5');
        });

        test('does not snap outside the configured distance', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { ticks: [0, 5], tickSnapBounds: .5, tooltip: false }));
            const box = await page.locator('#host .progress.position-relative').boundingBox();
            await page.mouse.click(box.x + box.width * .3, box.y + box.height / 2);

            await expect(page.locator('#slider')).toHaveValue('3');
        });
    });

    test.describe('lockToTicks option', () => {
        test('snaps setters to the nearest tick including zero', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { ticks: [0, 5, 10], lockToTicks: true }).setValue(.2));

            await expect(page.locator('#slider')).toHaveValue('0');
            await page.getByRole('slider').press('ArrowRight');
            await expect(page.locator('#slider')).toHaveValue('5');
            await page.getByRole('slider').press('ArrowLeft');
            await expect(page.locator('#slider')).toHaveValue('0');
        });

        test('uses ordinary steps when there are no usable ticks', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { ticks: [-1, 20], lockToTicks: true }));
            await page.getByRole('slider').press('ArrowRight');

            await expect(page.locator('#slider')).toHaveValue('4');
            await expect(page.locator('[data-ui-value]')).toHaveCount(0);
        });
    });

    test.describe('tooltip option', () => {
        test('does not create a tooltip when disabled', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { tooltip: false }));
            await page.getByRole('slider').focus();

            await expect(page.getByRole('tooltip')).toHaveCount(0);
        });

        test('shows on focus and hides when focus leaves', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider')));
            await page.getByRole('slider').focus();
            await expect(page.getByRole('tooltip')).toHaveText('3');
            await page.locator('#outside').focus();
            await expect(page.getByRole('tooltip')).toHaveCount(0);
        });

        test('keeps the tooltip visible while focus remains after hover ends', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider')));
            await page.getByRole('slider').hover();
            await page.getByRole('slider').focus();
            await page.mouse.move(0, 0);

            await expect(page.getByRole('tooltip')).toBeVisible();
        });

        test('shows always-visible content after initialization', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { tooltip: 'always' }));

            await expect(page.getByRole('tooltip')).toBeVisible();
            await expect(page.getByRole('tooltip')).toHaveText('3');
            await page.evaluate(() => $('#slider').slider('disable'));
            await expect(page.getByRole('tooltip')).toHaveCount(0);
        });

        test('settles rapid focus changes without stale visibility', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { range: true }).setValue(2, 8));
            await page.getByRole('slider', { name: 'Amount start' }).focus();
            await page.evaluate(() => {
                const handles = $.find('[role="slider"]');
                handles[0].blur();
                handles[1].focus();
            });

            await expect(page.getByRole('tooltip')).toBeVisible();
            await page.locator('#outside').focus();
            await expect(page.getByRole('tooltip')).toHaveCount(0);
        });
    });

    test.describe('tooltipPlacement option', () => {
        test('uses the requested placement', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), { tooltip: 'always', tooltipPlacement: 'bottom' }));

            await expect(page.getByRole('tooltip')).toHaveAttribute('data-ui-placement', /bottom/);
        });
    });

    test.describe('valueText option', () => {
        test('formats accessible text and tooltip content', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                tooltip: 'always', valueText: (value) => `Value ${value}`,
            }).setValue(7));

            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Value 7');
            await expect(page.getByRole('tooltip')).toHaveText('Value 7');
        });

        test('uses the default for a non-function formatter', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), { tooltip: 'always', valueText: 'invalid' }).setValue(7);
            });

            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuetext', '7');
            await expect(page.getByRole('tooltip')).toHaveText('7');
        });
    });

    test.describe('rangeText option', () => {
        test('formats the range tooltip', async ({ page }) => {
            await page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                range: true, tooltip: 'always', rangeText: (start, end) => `${start} to ${end}`,
            }).setValue(2, 8));

            await expect(page.getByRole('tooltip')).toHaveText('2 to 8');
        });

        test('uses the default for a non-function formatter', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), {
                    range: true, tooltip: 'always', rangeText: null,
                }).setValue(2, 8);
            });

            await expect(page.getByRole('tooltip')).toHaveText('2 - 8');
        });
    });
});
