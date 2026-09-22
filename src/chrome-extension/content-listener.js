async function fetchLandDetailsFromExtraDom() {
    const items = document.querySelectorAll('.parameters__item');
    let value = null;
    items.forEach(item => {
        const name = item.querySelector('.parameters__name')?.textContent.trim();
        if (name && name.includes('Min. szer. i dł. działki')) {
            value = item.querySelector('.parameters__value')?.innerText.trim();
        }
    });

    const re = /(?<width>\d{1,3}(?:[.,]\d+)?)[\s]*[x×][\s]*(?<height>\d{1,3}(?:[.,]\d+)?)[\s]*m\b/i;

    const imageEl = await resolvePlotImageElement();
    const fallbackEl = getPlotImageCandidates()[0] ?? null;
    const imgUrl =
        (imageEl && getPlotImageTargetSrc(imageEl)) ||
        (fallbackEl && getPlotImageTargetSrc(fallbackEl)) ||
        null;

    if (!value || !imgUrl) {
        return null;
    }

    const match = value.match(re);
    if (!match) {
        return null;
    }

    const widthStr = match.groups.width;
    const heightStr = match.groups.height;
    const widthM = parseFloat(widthStr.replace(',', '.'));
    const heightM = parseFloat(heightStr.replace(',', '.'));
    const imageDataUrl = imageEl ? await getPlotImageDataUrl(imageEl) : null;

    return JSON.stringify({
        width: widthM,
        height: heightM,
        imageUrl: imgUrl,
        imageDataUrl,
        sourceWidth: imageEl?.naturalWidth ?? 0,
        sourceHeight: imageEl?.naturalHeight ?? 0,
    });
}

function readWizjaPlotDimension(label) {
    const heading = [...document.querySelectorAll('h3')].find(
        (element) => element.textContent.trim() === label
    );
    const valueText = heading
        ?.closest('.d-flex')
        ?.querySelector('.text-right.font-weight-bold')
        ?.textContent.trim();
    const match = valueText?.match(/(?<value>\d{1,3}(?:[.,]\d+)?)/);

    return match ? parseFloat(match.groups.value.replace(',', '.')) : null;
}

async function fetchLandDetailsFromProjektyZWizja() {
    const widthM = readWizjaPlotDimension('Min. szerokość działki');
    const heightM = readWizjaPlotDimension('Min. długość działki');

    const imageEl = await resolvePlotImageElement();
    const fallbackEl = getPlotImageCandidates()[0] ?? null;
    const imgUrl =
        (imageEl && getPlotImageTargetSrc(imageEl)) ||
        (fallbackEl && getPlotImageTargetSrc(fallbackEl)) ||
        null;

    if (!widthM || !heightM || !imgUrl) {
        return null;
    }

    const imageDataUrl = imageEl ? await getPlotImageDataUrl(imageEl) : null;

    return JSON.stringify({
        width: widthM,
        height: heightM,
        imageUrl: imgUrl,
        imageDataUrl,
        sourceWidth: imageEl?.naturalWidth ?? 0,
        sourceHeight: imageEl?.naturalHeight ?? 0,
    });
}

async function fetchLandDetailsFromArchon() {
    const item = [...document.querySelectorAll('.product-data__item')].find(el =>
        el.querySelector('.product-data__title')?.textContent.includes('Minimalne wymiary działki')
    );

    const rawText = item?.querySelector('.product-data__value')?.innerText.trim();

    const link = document.querySelector('.fancybox3.sytuacja');
    const href = link?.getAttribute('href');
    const absoluteUrl = new URL(href, window.location.origin).href;

    const match = rawText?.match(/(?<width>\d{1,3}(?:[.,]\d+)?)\s*[x×]\s*(?<height>\d{1,3}(?:[.,]\d+)?)/);
    if (match) {
        const width = parseFloat(match.groups.width.replace(',', '.'));
        const height = parseFloat(match.groups.height.replace(',', '.'));
        return JSON.stringify({ width: width, height: height, imageUrl: absoluteUrl, imageDataUrl: null });
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getLandDetails") {
        if (window.location.hostname.includes('extradom.pl')) {
            fetchLandDetailsFromExtraDom()
                .then((data) => sendResponse({ data }))
                .catch(() => sendResponse({ data: null }));
            return true;
        }
        if (window.location.hostname.includes('archon.pl')) {
            fetchLandDetailsFromArchon()
                .then((data) => sendResponse({ data }))
                .catch(() => sendResponse({ data: null }));
            return true;
        }
        if (window.location.hostname.includes('projektyzwizja.pl')) {
            fetchLandDetailsFromProjektyZWizja()
                .then((data) => sendResponse({ data }))
                .catch(() => sendResponse({ data: null }));
            return true;
        }
    }
});
