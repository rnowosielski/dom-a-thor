function fetchLandDetailsFromExtraDom() {
    const items = document.querySelectorAll('.parameters__item');
    let value = null;
    items.forEach(item => {
        const name = item.querySelector('.parameters__name')?.textContent.trim();
        if (name && name.includes('Min. szer. i dł. działki')) {
            value = item.querySelector('.parameters__value')?.innerText.trim();
        }
    });

    const re = /(?<width>\d{1,3}(?:[.,]\d+)?)[\s]*[x×][\s]*(?<height>\d{1,3}(?:[.,]\d+)?)[\s]*m\b/i;

    const imageEl = document.querySelector('.location__image img');
    const imgUrl = imageEl?.getAttribute('data-src') || imageEl?.src;

    const match = value.match(re);
    if (match) {
        const widthStr  = match.groups.width;
        const heightStr = match.groups.height;
        const widthM  = parseFloat(widthStr.replace(',', '.'));   // 21.7
        const heightM = parseFloat(heightStr.replace(',', '.'));  // 23.40
        return JSON.stringify({ width: widthM, height: heightM, imageUrl: imgUrl });
    }
    return null;
}

function fetchLandDetailsFromArchon() {
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
        return JSON.stringify({ width: width, height: height, imageUrl: absoluteUrl });
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getLandDetails") {
        if (window.location.hostname.includes('extradom.pl')) {
            const data = fetchLandDetailsFromExtraDom();
            sendResponse({ data });
        }
        if (window.location.hostname.includes('archon.pl')) {
            const data = fetchLandDetailsFromArchon();
            sendResponse({ data });
        }
    }
});
