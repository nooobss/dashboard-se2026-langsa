import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE_ERROR:', err.message));
  await page.goto('http://localhost:8000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => {
    const map = window.map;
    return {
      mapExists: !!document.getElementById('map'),
      mapSize: document.getElementById('map') ? getComputedStyle(document.getElementById('map')).height : 'missing',
      markers: document.querySelectorAll('.leaflet-marker-icon, .leaflet-interactive').length,
      tiles: document.querySelectorAll('.leaflet-tile').length,
      bodyText: document.body.innerText.slice(0, 200),
      title: document.title,
      allText: document.body.innerText,
      center: map && map.getCenter ? map.getCenter() : null,
      zoom: map && map.getZoom ? map.getZoom() : null,
      boundsValid: map && map.getBounds ? map.getBounds().isValid() : null,
      businessLayerCount: window.businessLayer && window.businessLayer.getLayers ? window.businessLayer.getLayers().length : null,
      familyLayerCount: window.familyLayer && window.familyLayer.getLayers ? window.familyLayer.getLayers().length : null,
      categoryLayerCount: window.categoryLayer && window.categoryLayer.getLayers ? window.categoryLayer.getLayers().length : null,
      _layers: map && map._layers ? Object.keys(map._layers).length : null
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.locator('#map').screenshot({ path: 'map-only.png' });
  console.log('saved map-only.png');
  await browser.close();
})();
