const img = (id) => `https://images.unsplash.com/${id}?w=800&h=600&fit=crop`;

export const FALLBACK_IMG = img('photo-1558981806-ec527fa84c39');

const BROKEN = 'photo-1558618666-fcd25c85f82e';

const SCOOTER_THUMBS = [
  img('photo-1591637333184-19aa84b3e01f'),
  img('photo-1518987048-93e29699e79a'),
  img('photo-1583417319070-4a69db38a482'),
  img('photo-1580910051074-3eb694886505'),
];

const SCOOTER_KEYWORDS = ['ntorq', 'access', 'activa', 'dio', 'scooty', 'vespa', 'scooter', 'jupiter', 'ray zr'];

const MODEL_SPECS = {
  'tvs ntorq 125': { engine: '125 CC', fuel: 'Petrol', type: 'Scooter', capacity: 2 },
  'yamaha fz-s v3': { engine: '149 CC', fuel: 'Petrol', type: 'Bike', capacity: 2 },
  'honda cb hornet 160r': { engine: '162 CC', fuel: 'Petrol', type: 'Bike', capacity: 2 },
  'bajaj pulsar ns160': { engine: '160 CC', fuel: 'Petrol', type: 'Bike', capacity: 2 },
  'tvs apache rtr 160': { engine: '160 CC', fuel: 'Petrol', type: 'Bike', capacity: 2 },
  'hero splendor plus': { engine: '97 CC', fuel: 'Petrol', type: 'Bike', capacity: 2 },
  'toyota axio': { engine: '1300 CC', fuel: 'Petrol', type: 'Car', capacity: 5 },
  'toyota allion': { engine: '1500 CC', fuel: 'Petrol', type: 'Car', capacity: 5 },
  'toyota premio': { engine: '1500 CC', fuel: 'Petrol', type: 'Car', capacity: 5 },
  'toyota hiace': { engine: '2500 CC', fuel: 'Diesel', type: 'Jeep', capacity: 12 },
  'hyundai h1': { engine: '2500 CC', fuel: 'Diesel', type: 'Jeep', capacity: 11 },
};

const normalize = (v) => String(v || '').toLowerCase().trim();

export const isScooter = (bike) => {
  const hay = `${bike?.model || ''} ${bike?.brand || ''} ${bike?.description || ''}`.toLowerCase();
  return SCOOTER_KEYWORDS.some((k) => hay.includes(k));
};

export const resolveImages = (bike) => {
  const raw = (bike?.images || []).filter(Boolean);
  const cleaned = raw.map((u) => (u.includes(BROKEN) ? FALLBACK_IMG : u));

  if (isScooter(bike)) {
    const valid = cleaned.filter((u) => !u.includes('placehold'));
    return [...SCOOTER_THUMBS, ...valid].slice(0, 4);
  }

  const out = cleaned.filter((u) => !u.includes('placehold'));
  return out.length > 0 ? out : [FALLBACK_IMG];
};

export const getBikeSpecs = (bike) => {
  const model = normalize(bike?.model);
  const key = Object.keys(MODEL_SPECS).find((k) => model.includes(k));
  const known = key ? MODEL_SPECS[key] : null;
  const type = isScooter(bike) ? 'Scooter' : known?.type || bike?.category?.name || 'Vehicle';

  const specs = [];

  specs.push({ label: 'Capacity', value: `${bike?.capacity || known?.capacity || 2} Persons` });
  specs.push({ label: 'Type', value: type });
  specs.push({ label: 'Fuel', value: known?.fuel || 'Petrol' });
  if (known?.engine) {
    specs.push({ label: 'Engine', value: known.engine });
  }

  return specs;
};
