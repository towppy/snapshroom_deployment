/**
 * Web-compatible interactive map for mushroom locations
 * Uses Google Maps for all platforms
 */

declare const google: any;

import type { MushroomLocation } from './mushroom-locations';
import { getPrevalenceColor } from './mushroom-locations';

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const COLORS = {
  sage: '#9CAF88',
  moss: '#7D9B6E',
  forest: '#5F7C52',
  olive: '#4A6244',
  cream: '#FAF8F3',
  sand: '#F5F1E8',
  terracotta: '#E89B7C',
  coral: '#F4A896',
  charcoal: '#3F4941',
  stone: '#8B9388',
  cloud: '#E8EBE6',
  white: '#FFFFFF',
  success: '#81C995',
  warning: '#F4B860',
  danger: '#E88B7C',
};

export function generateMushroomLocationMap(
  mushroomName: string,
  locations: MushroomLocation[],
  isPlatformWeb: boolean = false
): string {
  if (!locations || locations.length === 0) {
    return getErrorMapHTML(mushroomName);
  }

  if (isPlatformWeb) {
    return generateWebMapHTML(mushroomName, locations);
  }

  return generateNativeMapHTML(mushroomName, locations);
}

const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=DM+Sans:wght@300;400;500&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'DM Sans', sans-serif;
    background-color: ${COLORS.sand};
    background-image:
      radial-gradient(ellipse at 20% 50%, rgba(156,175,136,0.15) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 20%, rgba(125,155,110,0.10) 0%, transparent 50%);
    min-height: 100vh;
    padding: 24px;
    color: ${COLORS.charcoal};
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    background: ${COLORS.cream};
    border-radius: 20px;
    box-shadow:
      0 2px 4px rgba(63,73,65,0.04),
      0 8px 24px rgba(63,73,65,0.08),
      0 32px 64px rgba(63,73,65,0.10);
    overflow: hidden;
    border: 1px solid rgba(156,175,136,0.3);
  }

  .header {
    background: ${COLORS.olive};
    background-image:
      radial-gradient(ellipse at 70% 30%, rgba(125,155,110,0.5) 0%, transparent 60%),
      url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239CAF88' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    color: ${COLORS.cream};
    padding: 36px 40px;
    position: relative;
    overflow: hidden;
  }

  .header::after {
    content: '🍄';
    position: absolute;
    right: 40px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 80px;
    opacity: 0.15;
  }

  .header-eyebrow {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: ${COLORS.sage};
    margin-bottom: 10px;
  }

  .header h1 {
    font-family: 'Playfair Display', serif;
    font-size: 34px;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.15;
    margin-bottom: 6px;
  }

  .header p {
    font-size: 13px;
    font-weight: 300;
    color: rgba(250,248,243,0.7);
    letter-spacing: 0.02em;
  }

  #map {
    width: 100%;
    height: 480px;
    border-top: 3px solid ${COLORS.sage};
    border-bottom: 3px solid ${COLORS.sage};
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    background: ${COLORS.forest};
  }

  .stat-card {
    padding: 20px 24px;
    text-align: center;
    border-right: 1px solid rgba(250,248,243,0.1);
    position: relative;
    transition: background 0.2s;
  }

  .stat-card:last-child { border-right: none; }

  .stat-card .value {
    font-family: 'Playfair Display', serif;
    font-size: 32px;
    font-weight: 700;
    color: ${COLORS.cream};
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-card .label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${COLORS.sage};
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 24px 32px;
    background: ${COLORS.sand};
    border-top: 1px solid ${COLORS.cloud};
    border-bottom: 1px solid ${COLORS.cloud};
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: ${COLORS.cream};
    border-radius: 100px;
    font-size: 12px;
    font-weight: 500;
    color: ${COLORS.charcoal};
    border: 1px solid ${COLORS.cloud};
    letter-spacing: 0.01em;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .locations-list {
    padding: 32px;
    background: ${COLORS.cream};
  }

  .locations-list h2 {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 500;
    color: ${COLORS.charcoal};
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid ${COLORS.cloud};
    letter-spacing: -0.01em;
  }

  .locations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  @media (max-width: 400px) {
    .locations-grid {
      grid-template-columns: 1fr;
    }
    body { padding: 8px; }
    .header { padding: 20px 16px; }
    .header h1 { font-size: 22px; }
    .header::after { font-size: 50px; right: 16px; }
    .locations-list { padding: 16px; }
    .legend { padding: 16px; }
    .stat-card { padding: 12px 8px; }
    .stat-card .value { font-size: 22px; }
    #map { height: 300px; }
  }

  .location-item {
    padding: 16px 18px;
    background: ${COLORS.white};
    border-radius: 12px;
    border: 1px solid ${COLORS.cloud};
    font-size: 13px;
    transition: box-shadow 0.2s, transform 0.2s;
    position: relative;
    overflow: hidden;
  }

  .location-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    border-radius: 0;
  }

  .location-item.high::before { background: ${COLORS.danger}; }
  .location-item.medium::before { background: ${COLORS.warning}; }
  .location-item.low::before { background: ${COLORS.success}; }

  .location-item:hover {
    box-shadow: 0 4px 16px rgba(63,73,65,0.1);
    transform: translateY(-1px);
  }

  .location-name {
    font-weight: 500;
    color: ${COLORS.charcoal};
    margin-bottom: 6px;
    font-size: 14px;
  }

  .location-meta {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.03em;
  }

  .badge-prevalence-high   { background: rgba(232,139,124,0.15); color: #c0624e; }
  .badge-prevalence-medium { background: rgba(244,184,96,0.2);  color: #b8821a; }
  .badge-prevalence-low    { background: rgba(129,201,149,0.2); color: #3d8c57; }
  .badge-cultivated  { background: rgba(95,124,82,0.12); color: ${COLORS.forest}; }
  .badge-wild        { background: rgba(139,147,136,0.12); color: ${COLORS.stone}; }
  .badge-toxic       { background: rgba(211,47,47,0.12); color: #B71C1C; font-weight: 600; }

  .location-notes {
    margin-top: 8px;
    font-size: 12px;
    color: ${COLORS.stone};
    line-height: 1.5;
    font-style: italic;
  }
`;

const mapScript = (locationsJSON: string, apiKey: string) => `
  <script>
    const locations = ${locationsJSON};

    function initMap() {
      const centerPH = { lat: 12.8797, lng: 121.774 };

      const map = new google.maps.Map(document.getElementById('map'), {
        center: centerPH,
        zoom: 6,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#f0ede6' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#3F4941' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#FAF8F3' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e8e4da' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c5d8d1' }] },
          { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d4e5c8' }] },
          { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#9CAF88' }] },
        ],
      });

      const infoWindow = new google.maps.InfoWindow();
      const bounds = new google.maps.LatLngBounds();

      locations.forEach(loc => {
        const markerScale = loc.toxic ? 13 : loc.cultivated ? 10 : 9;
        const fillColor = loc.toxic ? '#D32F2F' : (loc.cultivated ? '#2E7D32' : '#F57C00');

        const marker = new google.maps.Marker({
          map,
          position: { lat: loc.lat, lng: loc.lng },
          title: loc.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: markerScale,
            fillColor,
            fillOpacity: 0.88,
            strokeColor: '#FAF8F3',
            strokeWeight: 2.5,
          },
        });

        marker.addListener('click', () => {
          infoWindow.setContent(\`
            <div style="min-width:200px; font-family:'DM Sans',sans-serif; padding:4px;">
              <div style="font-size:15px; font-weight:500; color:#3F4941; margin-bottom:8px;">\${loc.name}</div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                \${loc.toxic ? '<span style="padding:2px 10px; border-radius:100px; font-size:11px; font-weight:600; background:rgba(211,47,47,0.12); color:#B71C1C;">☠️ Toxic</span>' : ''}
                <span style="padding:2px 10px; border-radius:100px; font-size:11px; font-weight:500; background:rgba(95,124,82,0.12); color:#5F7C52;">
                  \${loc.cultivated ? '🌱 Cultivated' : '🌲 Wild'}
                </span>
              </div>
              \${loc.notes ? '<p style="margin:10px 0 0 0; font-size:12px; color:#8B9388; font-style:italic; line-height:1.5;">📝 ' + loc.notes + '</p>' : ''}
            </div>
          \`);
          infoWindow.open(map, marker);
        });

        bounds.extend(marker.getPosition());
      });

      if (locations.length > 0) map.fitBounds(bounds, 60);
    }
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
`;

function buildBody(mushroomName: string, locations: MushroomLocation[], locationsJSON: string, apiKey: string): string {
  const escapedName = escapeHtml(mushroomName);

  const locationCards = locations.map(l => {
    const notes = l.notes ? `<div class="location-notes">📝 ${escapeHtml(l.notes)}</div>` : '';
    const toxicBadge = l.toxic ? `<span class="badge badge-toxic">☠️ Toxic</span>` : '';
    return `
      <div class="location-item ${l.toxic ? 'high' : l.cultivated ? 'low' : 'medium'}">
        <div class="location-name">${escapeHtml(l.name)}</div>
        <div class="location-meta">
          ${toxicBadge}
          <span class="badge ${l.cultivated ? 'badge-cultivated' : 'badge-wild'}">${l.cultivated ? '🌱 Cultivated' : '🌲 Wild'}</span>
        </div>
        ${notes}
      </div>`;
  }).join('');

  return `
  <div class="container">
    <div class="header">
      <div class="header-eyebrow">Distribution Map</div>
      <h1>${escapedName}</h1>
      <p>Philippine distribution &amp; sighting locations</p>
    </div>

    <div id="map"></div>

    <div class="stats">
      <div class="stat-card">
        <div class="value">${locations.length}</div>
        <div class="label">Locations</div>
      </div>
      <div class="stat-card">
        <div class="value">${locations.filter(l => l.toxic).length}</div>
        <div class="label">Toxic Sites</div>
      </div>
      <div class="stat-card">
        <div class="value">${locations.filter(l => !l.cultivated).length}</div>
        <div class="label">Wild</div>
      </div>
    </div>

    <div class="legend">
      <div class="legend-item"><div class="legend-dot" style="background:#D32F2F;"></div>☠️ Toxic / Dangerous</div>
      <div class="legend-item"><div class="legend-dot" style="background:#2E7D32;"></div>🌱 Cultivated</div>
      <div class="legend-item"><div class="legend-dot" style="background:#F57C00;"></div>🌲 Wild</div>
    </div>

    <div class="locations-list">
      <h2>📍 Locations</h2>
      <div class="locations-grid">${locationCards}</div>
    </div>
  </div>

  ${mapScript(locationsJSON, apiKey)}
  `;
}

function generateWebMapHTML(mushroomName: string, locations: MushroomLocation[]): string {
  const locationsJSON = JSON.stringify(locations.map(l => ({
    name: escapeHtml(l.name), lat: l.lat, lng: l.lng,
    prevalence: l.prevalence, cultivated: l.cultivated,
    toxic: l.toxic || false,
    notes: l.notes ? escapeHtml(l.notes) : '',
    color: getPrevalenceColor(l.prevalence),
  })));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>${sharedStyles}</style>
</head>
<body>
  ${buildBody(mushroomName, locations, locationsJSON, GOOGLE_MAPS_API_KEY)}
</body>
</html>`;
}

function generateNativeMapHTML(mushroomName: string, locations: MushroomLocation[]): string {
  const locationsJSON = JSON.stringify(locations.map(l => ({
    name: escapeHtml(l.name), lat: l.lat, lng: l.lng,
    prevalence: l.prevalence, cultivated: l.cultivated,
    toxic: l.toxic || false,
    notes: l.notes ? escapeHtml(l.notes) : '',
    color: getPrevalenceColor(l.prevalence),
  })));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${sharedStyles}
    /* Native-specific tweaks */
    body { padding: 12px; }
    .header { padding: 24px; }
    .header h1 { font-size: 26px; }
    #map { height: 380px; }
  </style>
</head>
<body>
  ${buildBody(mushroomName, locations, locationsJSON, GOOGLE_MAPS_API_KEY)}
</body>
</html>`;
}

function getErrorMapHTML(mushroomName: string): string {
  const escapedMushroomName = escapeHtml(mushroomName);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500&family=DM+Sans:wght@300;400&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: #F5F1E8;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .error-container {
      background: #FAF8F3;
      border-radius: 20px;
      padding: 52px 48px;
      text-align: center;
      max-width: 420px;
      border: 1px solid #E8EBE6;
      box-shadow: 0 8px 40px rgba(63,73,65,0.1);
    }
    .error-icon { font-size: 56px; margin-bottom: 24px; opacity: 0.6; }
    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      font-weight: 500;
      color: #3F4941;
      margin-bottom: 12px;
    }
    p { font-size: 14px; color: #8B9388; line-height: 1.6; font-weight: 300; }
    strong { color: #5F7C52; font-weight: 500; }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">🔍</div>
    <h1>No Location Data Found</h1>
    <p>We couldn't find distribution data for <strong>${escapedMushroomName}</strong>.</p>
    <p style="margin-top: 12px; font-size: 12px; color: #9CAF88;">This species is not yet in our database.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}