/**
 * Philippine mushroom locations — all 10 trained species
 */

export interface MushroomLocation {
  name: string;
  lat: number;
  lng: number;
  prevalence: 'high' | 'medium' | 'low';
  cultivated: boolean;
  toxic?: boolean;
  season?: string;
  notes?: string;
}

export const MUSHROOM_LOCATIONS: { [key: string]: MushroomLocation[] } = {

  // ── 1. Button Mushroom ────────────────────────────────────────────────
  'button mushroom': [
    { name: 'La Trinidad, Benguet (commercial farms)', lat: 16.4626, lng: 120.5928, prevalence: 'high', cultivated: true, notes: 'Major commercial cultivation hub' },
    { name: 'Bukidnon (mushroom growers)', lat: 8.0516, lng: 124.6517, prevalence: 'medium', cultivated: true },
    { name: 'Baguio City — BPI experimental facilities', lat: 16.4023, lng: 120.5960, prevalence: 'medium', cultivated: true, notes: 'Bureau of Plant Industry research site' },
    { name: 'UPLB, Laguna (research farms)', lat: 14.1654, lng: 121.2430, prevalence: 'medium', cultivated: true },
    { name: 'San Juan City — The Vegan Grocer', lat: 14.6009, lng: 121.0368, prevalence: 'low', cultivated: true, notes: 'Fresh brown button/portobello available' },
    { name: 'Las Piñas City — Evia Lifestyle Center', lat: 14.4360, lng: 120.9893, prevalence: 'low', cultivated: true, notes: 'The Vegan Grocer branch' },
    { name: 'Banilad, Cebu — Robinsons (Tuscan Fields)', lat: 10.3366, lng: 123.9186, prevalence: 'low', cultivated: true },
    { name: 'Makati City (commercial mushroom farm)', lat: 14.5547, lng: 121.0244, prevalence: 'low', cultivated: true },
  ],

  // ── 2. Death Cap ──────────────────────────────────────────────────────
  'death cap': [
    { name: 'Baguio City & Benguet pine forests', lat: 16.4023, lng: 120.5960, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ DEADLY — Do not touch or consume' },
    { name: 'Sagada, Mountain Province', lat: 17.0860, lng: 120.9011, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ Possible Amanita habitat in pine-oak forests' },
    { name: 'Mt. Makiling, Laguna', lat: 14.1490, lng: 121.1940, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ Forest habitat; similar Amanita species present' },
    { name: 'Mt. Apo, Davao', lat: 6.9920, lng: 125.2706, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ High-altitude forest; monitor sightings' },
  ],

  // ── 3. Enoki Mushroom ─────────────────────────────────────────────────
  'enoki mushroom': [
    { name: 'Tondo, Manila (YourDailyHarvest2021)', lat: 14.6218, lng: 120.9719, prevalence: 'medium', cultivated: true, notes: '986 Asuncion St. — local supplier' },
    { name: 'Caloocan City — Oppa Mart / Li-An Hotpot', lat: 14.6516, lng: 120.9672, prevalence: 'medium', cultivated: true },
    { name: 'Quezon City, Galas — bulk suppliers', lat: 14.6323, lng: 121.0141, prevalence: 'medium', cultivated: true, notes: 'Available via Facebook groups' },
    { name: 'Malabon / Navotas suppliers', lat: 14.6620, lng: 120.9573, prevalence: 'medium', cultivated: true, notes: 'Available via Facebook Marketplace' },
    { name: 'Benguet highlands', lat: 16.4023, lng: 120.5928, prevalence: 'high', cultivated: true, notes: 'Cool climate ideal for cultivation' },
    { name: 'Tanza, Cavite — Seoul Station Korean Minimart', lat: 14.4019, lng: 120.8527, prevalence: 'low', cultivated: true },
    { name: 'Mountain Province forests', lat: 17.0860, lng: 120.9011, prevalence: 'low', cultivated: false, notes: 'Wild occurrence in cool mossy forests' },
    { name: 'Davao City — Mother\'s Produce, Lanang', lat: 7.1100, lng: 125.6290, prevalence: 'medium', cultivated: true },
    { name: 'Angeles, Pampanga — Korean grocery wholesalers', lat: 15.1450, lng: 120.5887, prevalence: 'low', cultivated: true },
    { name: 'Ifugao mossy forests', lat: 16.8319, lng: 121.1711, prevalence: 'low', cultivated: false, notes: 'Wild; high-altitude habitat' },
  ],

  // ── 4. False Morel ────────────────────────────────────────────────────
  'false morel': [
    { name: 'Bohol (Visayas region)', lat: 9.6849, lng: 123.9659, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ TOXIC — possible sighting' },
    { name: 'Benguet pine forests', lat: 16.4023, lng: 120.6100, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ Cool pine forest habitat' },
    { name: 'Cordillera — Mountain Province highlands', lat: 17.0860, lng: 120.9011, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ High-altitude Gyromitra habitat' },
  ],

  // ── 5. Funeral Bell Mushroom ──────────────────────────────────────────
  'funeral bell mushroom': [
    { name: 'Mt. Makiling, Laguna', lat: 14.1490, lng: 121.1940, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ DEADLY — grows on decaying wood' },
    { name: 'Sierra Madre mountain range', lat: 15.5000, lng: 121.7000, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ Dense forest habitat' },
    { name: 'Bukidnon mountain forests', lat: 8.0516, lng: 124.6517, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ Montane forest; can be mistaken for edible species' },
  ],

  // ── 6. Jack O' Lantern Mushroom ───────────────────────────────────────
  'jack o lantern mushroom': [
    { name: 'Northwest Panay Peninsula National Park', lat: 11.5735, lng: 122.1300, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ TOXIC & bioluminescent at night' },
    { name: 'Palawan forests', lat: 9.8349, lng: 118.7384, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ Lowland tropical forest' },
    { name: 'Sibugay, Zamboanga (Visayas/Mindanao border)', lat: 7.5617, lng: 122.8322, prevalence: 'low', cultivated: false, toxic: true },
    { name: 'Quezon Province lowland forests', lat: 14.0313, lng: 121.9266, prevalence: 'low', cultivated: false, toxic: true },
    { name: 'Samar rainforest areas', lat: 11.9760, lng: 125.0339, prevalence: 'low', cultivated: false, toxic: true, notes: '⚠️ Eastern Visayas rainforest' },
    { name: 'Leyte rainforest areas', lat: 10.8505, lng: 124.8513, prevalence: 'low', cultivated: false, toxic: true },
  ],

  // ── 7. Oyster Mushroom ────────────────────────────────────────────────
  'oyster mushroom': [
    { name: 'UPLB & farms, Laguna', lat: 14.1654, lng: 121.2430, prevalence: 'high', cultivated: true, notes: 'Major research and commercial production' },
    { name: 'Agusan del Sur, Caraga', lat: 8.5400, lng: 125.9000, prevalence: 'high', cultivated: true },
    { name: 'Bukidnon', lat: 8.0516, lng: 124.6517, prevalence: 'high', cultivated: true },
    { name: 'Cavite', lat: 14.2829, lng: 120.8686, prevalence: 'medium', cultivated: true },
    { name: 'Nueva Ecija mushroom farms', lat: 15.5784, lng: 120.9726, prevalence: 'medium', cultivated: true },
    { name: 'Alilem, Ilocos Sur (major production site)', lat: 17.0618, lng: 120.4862, prevalence: 'high', cultivated: true },
    { name: 'Tuba, Benguet — Sanagi Farm', lat: 16.3910, lng: 120.4890, prevalence: 'medium', cultivated: true },
    { name: 'Lipa City, Batangas — Wilma\'s Mushroom Farm', lat: 13.9411, lng: 121.1580, prevalence: 'medium', cultivated: true },
    { name: 'General Trias, Cavite — Cubol\'s Farm', lat: 14.3874, lng: 120.8774, prevalence: 'medium', cultivated: true, notes: 'Fresh daily harvest' },
  ],

  // ── 8. Red Cage Mushroom ──────────────────────────────────────────────
  'red cage mushroom': [
    { name: 'Palawan tropical forests', lat: 9.8349, lng: 118.7384, prevalence: 'low', cultivated: false, notes: 'Rare; found on forest floor' },
    { name: 'Mindanao rainforests', lat: 7.1907, lng: 125.4553, prevalence: 'low', cultivated: false },
    { name: 'Mt. Makiling, Laguna', lat: 14.1490, lng: 121.1940, prevalence: 'low', cultivated: false },
  ],

  // ── 9. Shiitake Mushroom ──────────────────────────────────────────────
  'shiitake mushroom': [
    { name: 'Benguet highlands', lat: 16.4023, lng: 120.5928, prevalence: 'high', cultivated: true },
    { name: 'Baguio City', lat: 16.4023, lng: 120.5960, prevalence: 'high', cultivated: true, notes: 'Major trading hub for Benguet produce' },
    { name: 'Nueva Vizcaya', lat: 16.3301, lng: 121.1713, prevalence: 'medium', cultivated: true },
    { name: 'Bukidnon', lat: 8.0516, lng: 124.6517, prevalence: 'medium', cultivated: true },
    { name: 'Cavite / Batangas area', lat: 14.2829, lng: 120.8686, prevalence: 'low', cultivated: true },
    { name: 'Sarangani Province', lat: 6.0507, lng: 125.1965, prevalence: 'low', cultivated: true, notes: 'Occasional cultivation' },
    { name: 'Quezon Province mushroom farms', lat: 14.0313, lng: 121.9266, prevalence: 'low', cultivated: true },
  ],

  // ── 10. Wood Ear Mushroom ─────────────────────────────────────────────
  'wood ear mushroom': [
    { name: 'Zamboanga del Sur', lat: 7.8384, lng: 123.3978, prevalence: 'high', cultivated: false, notes: 'Very common on fallen logs' },
    { name: 'Sarangani Province', lat: 6.0507, lng: 125.1965, prevalence: 'high', cultivated: false },
    { name: 'Southern Luzon / Batangas area', lat: 13.9411, lng: 121.1580, prevalence: 'high', cultivated: false },
    { name: 'Mindoro', lat: 12.8797, lng: 121.0794, prevalence: 'high', cultivated: false },
    { name: 'Quezon Province', lat: 14.0313, lng: 121.9266, prevalence: 'high', cultivated: false },
    { name: 'Laguna', lat: 14.1654, lng: 121.2430, prevalence: 'high', cultivated: true },
    { name: 'Rizal Province', lat: 14.5794, lng: 121.3600, prevalence: 'medium', cultivated: false },
    { name: 'Mindanao forests', lat: 7.1907, lng: 125.4553, prevalence: 'high', cultivated: false, notes: 'Wild on fallen logs nationwide' },
  ],
};

/**
 * Get locations for a specific mushroom
 */
export function getMushroomLocations(mushroomName: string): MushroomLocation[] {
  const normalized = mushroomName.toLowerCase().trim();
  
  // Try exact match first
  if (MUSHROOM_LOCATIONS[normalized]) {
    return MUSHROOM_LOCATIONS[normalized];
  }
  
  // Try partial match
  for (const [key, locations] of Object.entries(MUSHROOM_LOCATIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return locations;
    }
  }
  
  // Default fallback
  return [
    { name: 'Philippines (Metro Manila)', lat: 14.5994, lng: 120.9842, prevalence: 'low', cultivated: false, notes: 'Mushroom location data not available' }
  ];
}

/**
 * Get color based on prevalence
 */
export function getPrevalenceColor(prevalence: 'high' | 'medium' | 'low'): string {
  switch (prevalence) {
    case 'high': return '#d32f2f'; // Red
    case 'medium': return '#f57c00'; // Orange
    case 'low': return '#fbc02d'; // Yellow
    default: return '#999';
  }
}
