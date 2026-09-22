/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getPlotImageTargetSrc,
    isAcceptablePlotImageSize,
    loadPlotImageElement,
    MIN_PLOT_IMAGE_MIN_SIDE,
    normalizeExtradomImageUrl,
} from '../plotImageCapture.js';

describe('chrome-extension/content.js', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('normalizes wpcdn urls', () => {
        expect(normalizeExtradomImageUrl('https://example.com/x?file=wpcdn.pl/extradom/plot.jpg')).toBe(
            'https://wpcdn.pl/extradom/plot.jpg'
        );
    });

    it('waits for the full plot image after replacing a lazy-loaded thumbnail', async () => {
        document.body.innerHTML = `
            <div class="location__image">
                <img
                    data-name="dzialka"
                    data-src="https://wpcdn.pl/extradom/designs/full-plot.jpg"
                    src="https://wpcdn.pl/extradom/designs/thumbnail.jpg"
                    width="217"
                    height="281"
                />
            </div>
        `;

        const imageEl = document.querySelector('img');
        Object.defineProperty(imageEl, 'complete', {
            configurable: true,
            get() {
                return this.src.includes('full-plot') || this.src.includes('thumbnail');
            },
        });
        Object.defineProperty(imageEl, 'naturalWidth', {
            configurable: true,
            get() {
                return this.src.includes('full-plot') ? 915 : 217;
            },
        });
        Object.defineProperty(imageEl, 'naturalHeight', {
            configurable: true,
            get() {
                return this.src.includes('full-plot') ? 1028 : 281;
            },
        });

        const loadPromise = loadPlotImageElement(imageEl);
        imageEl.src = 'https://wpcdn.pl/extradom/designs/full-plot.jpg';
        imageEl.dispatchEvent(new Event('load'));

        const loaded = await loadPromise;

        expect(loaded).toBe(imageEl);
        expect(loaded.naturalWidth).toBe(915);
        expect(loaded.naturalHeight).toBe(1028);
        expect(getPlotImageTargetSrc(loaded)).toBe('https://wpcdn.pl/extradom/designs/full-plot.jpg');
    });

    it('rejects plot images below the minimum capture size', async () => {
        document.body.innerHTML = `
            <div class="location__image">
                <img
                    data-name="dzialka"
                    src="https://wpcdn.pl/extradom/designs/thumbnail.jpg"
                />
            </div>
        `;

        const imageEl = document.querySelector('img');
        Object.defineProperty(imageEl, 'naturalWidth', { configurable: true, value: 217 });
        Object.defineProperty(imageEl, 'naturalHeight', { configurable: true, value: 281 });

        const loadPromise = loadPlotImageElement(imageEl);
        imageEl.dispatchEvent(new Event('load'));

        await expect(loadPromise).resolves.toBeNull();
        expect(isAcceptablePlotImageSize(217, 281)).toBe(false);
        expect(MIN_PLOT_IMAGE_MIN_SIDE).toBeGreaterThan(217);
    });

    it('accepts extradom media plot sources that are narrow but tall enough', async () => {
        document.body.innerHTML = `
            <div class="location__image">
                <img
                    data-name="dzialka"
                    data-src="https://wpcdn.pl/extradom/media/340891/source"
                    src="https://i.wpimg.pl/c/x335/wpcdn.pl/extradom/media/340891/source"
                />
            </div>
        `;

        const imageEl = document.querySelector('img');
        Object.defineProperty(imageEl, 'complete', { configurable: true, value: true });
        Object.defineProperty(imageEl, 'naturalWidth', {
            configurable: true,
            get() {
                return this.src.includes('wpcdn.pl/extradom/media/340891/source') ? 352 : 335;
            },
        });
        Object.defineProperty(imageEl, 'naturalHeight', {
            configurable: true,
            get() {
                return this.src.includes('wpcdn.pl/extradom/media/340891/source') ? 439 : 418;
            },
        });

        const loadPromise = loadPlotImageElement(imageEl);
        imageEl.src = 'https://wpcdn.pl/extradom/media/340891/source';
        imageEl.dispatchEvent(new Event('load'));

        const loaded = await loadPromise;

        expect(loaded).toBe(imageEl);
        expect(isAcceptablePlotImageSize(352, 439)).toBe(true);
        expect(getPlotImageTargetSrc(loaded)).toBe('https://wpcdn.pl/extradom/media/340891/source');
    });
});
