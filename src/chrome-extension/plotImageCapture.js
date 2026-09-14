const MIN_PLOT_IMAGE_SIDE = 400;

export async function waitForImageLoad(imageEl) {
    if (imageEl.complete && imageEl.naturalWidth > 0 && imageEl.naturalHeight > 0) {
        return imageEl;
    }

    return new Promise((resolve, reject) => {
        const onLoad = () => {
            cleanup();
            resolve(imageEl);
        };
        const onError = () => {
            cleanup();
            reject(new Error('Failed to load plot image'));
        };
        const cleanup = () => {
            imageEl.removeEventListener('load', onLoad);
            imageEl.removeEventListener('error', onError);
        };

        imageEl.addEventListener('load', onLoad);
        imageEl.addEventListener('error', onError);
    });
}

export function normalizeExtradomImageUrl(url) {
    if (!url) {
        return url;
    }

    const wpcdnMatch = url.match(/wpcdn\.pl\/(.+)$/);
    if (wpcdnMatch) {
        return `https://wpcdn.pl/${wpcdnMatch[1]}`;
    }

    return url;
}

export function getPlotImageCandidates() {
    const seen = new Set();
    const candidates = [];

    for (const imageEl of document.querySelectorAll('.location__image img[data-name="dzialka"]')) {
        if (!seen.has(imageEl)) {
            seen.add(imageEl);
            candidates.push(imageEl);
        }
    }

    for (const imageEl of document.querySelectorAll('.location__image img')) {
        if (!seen.has(imageEl)) {
            seen.add(imageEl);
            candidates.push(imageEl);
        }
    }

    return candidates;
}

export function getPlotImageTargetSrc(imageEl) {
    return normalizeExtradomImageUrl(
        imageEl.getAttribute('data-src') || imageEl.currentSrc || imageEl.src
    );
}

export async function loadPlotImageElement(imageEl) {
    const targetSrc = getPlotImageTargetSrc(imageEl);
    if (!targetSrc) {
        return null;
    }

    imageEl.crossOrigin = 'anonymous';

    const isUsableSize =
        imageEl.naturalWidth >= MIN_PLOT_IMAGE_SIDE &&
        imageEl.naturalHeight >= MIN_PLOT_IMAGE_SIDE;
    const isTargetLoaded =
        imageEl.complete &&
        isUsableSize &&
        (imageEl.currentSrc === targetSrc || imageEl.src === targetSrc);

    if (!isTargetLoaded) {
        if (imageEl.src === targetSrc) {
            imageEl.src = '';
        }
        imageEl.src = targetSrc;
        await waitForImageLoad(imageEl);
    }

    if (imageEl.naturalWidth < MIN_PLOT_IMAGE_SIDE || imageEl.naturalHeight < MIN_PLOT_IMAGE_SIDE) {
        return null;
    }

    return imageEl;
}

export async function resolvePlotImageElement() {
    const candidates = getPlotImageCandidates();
    let bestLoaded = null;
    let bestArea = 0;

    for (const candidate of candidates) {
        try {
            const loaded = await loadPlotImageElement(candidate);
            if (!loaded) {
                continue;
            }

            const area = loaded.naturalWidth * loaded.naturalHeight;
            if (area > bestArea) {
                bestArea = area;
                bestLoaded = loaded;
            }
        } catch {
            continue;
        }
    }

    return bestLoaded;
}

export async function getPlotImageDataUrl(imageEl) {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = imageEl.naturalWidth;
        canvas.height = imageEl.naturalHeight;
        canvas.getContext('2d').drawImage(imageEl, 0, 0);
        return canvas.toDataURL('image/png');
    } catch {
        return null;
    }
}

export { MIN_PLOT_IMAGE_SIDE };
