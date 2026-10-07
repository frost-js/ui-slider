import { expect, test } from '#test';

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

        test('rejects non-element arguments without disturbing an existing instance', async ({ page }) => {
            const state = await page.evaluate(() => {
                const node = $.findOne('#slider');
                const instance = UI.Slider.init(node);
                const html = $.getHtml(document.body);
                const errors = [];

                for (const [name, argument] of [
                    ['null', null],
                    ['undefined', undefined],
                    ['selector', '#slider'],
                    ['malformed selector', '['],
                    ['array', [node]],
                    ['QuerySet', $('#slider')],
                    ['document', document],
                    ['text node', document.createTextNode('text')],
                ]) {
                    for (const [method, init] of [
                        ['constructor', (node) => new UI.Slider(node)],
                        ['init', (node) => UI.Slider.init(node)],
                    ]) {
                        let message = null;

                        try {
                            init(argument);
                        } catch (error) {
                            message = `${error.name}: ${error.message}`;
                        }

                        errors.push({ name, method, message });
                    }
                }

                return {
                    errors,
                    unchanged: $.getHtml(document.body) === html &&
                        $.getData(node, UI.Slider.DATA_KEY) === instance,
                };
            });

            for (const { name, method, message } of state.errors) {
                expect(message, `${name} (${method})`).toBe('TypeError: Slider must be created on an input element.');
            }
            expect(state.unchanged).toBe(true);
        });

        test('rejects non-input nodes without registering an instance', async ({ page }) => {
            await expect(page.evaluate(() => UI.Slider.init($.findOne('#outside')))).rejects.toThrow(
                'Slider must be created on an input element.',
            );
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
                await page.evaluate((ariaHidden) => {
                    const node = $.findOne('#slider');

                    if (ariaHidden !== null) {
                        $.setAttribute(node, 'aria-hidden', ariaHidden);
                    }

                    $.setAttribute(node, 'tabindex', '4');
                }, ariaHidden);
                await expect(page.evaluate(() => UI.Slider.init($.findOne('#slider'), {
                    valueText: () => {
                        throw new Error('Invalid formatter');
                    },
                }))).rejects.toThrow('Invalid formatter');

                if (ariaHidden === null) {
                    await expect(page.locator('#slider')).not.toHaveAttribute('aria-hidden');
                } else {
                    await expect(page.locator('#slider')).toHaveAttribute('aria-hidden', ariaHidden);
                }

                await expect(page.getByRole('slider')).toHaveCount(0);
                await expect(page.locator('#slider')).not.toHaveClass(/visually-hidden/);
                await expect(page.locator('#slider')).toHaveAttribute('tabindex', '4');
                expect(await page.evaluate(() => $.hasData('#slider', 'slider'))).toBe(false);
            });
        }
    });

    test.describe('#dispose', () => {
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

        test('allows reinitialization after disposal', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#slider');
                UI.Slider.init(node).dispose();
                UI.Slider.init(node).setValue(8);
            });

            await expect(page.getByRole('slider')).toHaveCount(1);
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '8');
        });

        test('disposes when fQuery removes the original input', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), { tooltip: 'always' });
                $.remove('#slider');
            });

            await expect(page.getByRole('slider')).toHaveCount(0);
            await expect(page.getByRole('tooltip')).toHaveCount(0);
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

        test('preserves large integer values on the step grid', async ({ page }) => {
            await page.evaluate(() => {
                UI.Slider.init($.findOne('#slider'), { max: 1e16, step: 1 }).setValue(1234567890123456);
            });

            await expect(page.locator('#slider')).toHaveValue('1234567890123456');
            await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '1234567890123456');
        });
    });
});
