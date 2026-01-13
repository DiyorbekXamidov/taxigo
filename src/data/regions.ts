export interface Region {
  id: string;
  name: {
    'uz-latin': string;
    'uz-cyrillic': string;
  };
  districts: District[];
}

export interface District {
  id: string;
  name: {
    'uz-latin': string;
    'uz-cyrillic': string;
  };
}

// O'zbekiston viloyat markazlari
export interface RegionalCenter {
  id: string;
  name: {
    'uz-latin': string;
    'uz-cyrillic': string;
  };
  isRegionalCenter: true;
}

export const regionalCenters: RegionalCenter[] = [
  { id: 'toshkent', name: { 'uz-latin': 'Toshkent', 'uz-cyrillic': 'Тошкент' }, isRegionalCenter: true },
  { id: 'samarqand', name: { 'uz-latin': 'Samarqand', 'uz-cyrillic': 'Самарқанд' }, isRegionalCenter: true },
  { id: 'buxoro', name: { 'uz-latin': 'Buxoro', 'uz-cyrillic': 'Бухоро' }, isRegionalCenter: true },
  { id: 'andijon', name: { 'uz-latin': 'Andijon', 'uz-cyrillic': 'Андижон' }, isRegionalCenter: true },
  { id: 'fargona', name: { 'uz-latin': 'Farg\'ona', 'uz-cyrillic': 'Фарғона' }, isRegionalCenter: true },
  { id: 'namangan', name: { 'uz-latin': 'Namangan', 'uz-cyrillic': 'Наманган' }, isRegionalCenter: true },
  { id: 'qarshi', name: { 'uz-latin': 'Qarshi', 'uz-cyrillic': 'Қарши' }, isRegionalCenter: true },
  { id: 'navoiy', name: { 'uz-latin': 'Navoiy', 'uz-cyrillic': 'Навоий' }, isRegionalCenter: true },
  { id: 'jizzax', name: { 'uz-latin': 'Jizzax', 'uz-cyrillic': 'Жиззах' }, isRegionalCenter: true },
  { id: 'guliston', name: { 'uz-latin': 'Guliston', 'uz-cyrillic': 'Гулистон' }, isRegionalCenter: true },
  { id: 'nukus', name: { 'uz-latin': 'Nukus', 'uz-cyrillic': 'Нукус' }, isRegionalCenter: true },
  { id: 'urganch', name: { 'uz-latin': 'Urganch', 'uz-cyrillic': 'Урганч' }, isRegionalCenter: true },
];

export const surxondaryoRegion: Region = {
  id: 'surxondaryo',
  name: {
    'uz-latin': 'Surxondaryo viloyati',
    'uz-cyrillic': 'Сурхондарё вилояти'
  },
  districts: [
    { id: 'termiz', name: { 'uz-latin': 'Termiz', 'uz-cyrillic': 'Термиз' } },
    { id: 'denov', name: { 'uz-latin': 'Denov', 'uz-cyrillic': 'Денов' } },
    { id: 'sherobod', name: { 'uz-latin': 'Sherobod', 'uz-cyrillic': 'Шеробод' } },
    { id: 'boysun', name: { 'uz-latin': 'Boysun', 'uz-cyrillic': 'Бойсун' } },
    { id: 'jarkorgon', name: { 'uz-latin': 'Jarqo\'rg\'on', 'uz-cyrillic': 'Жарқўрғон' } },
    { id: 'qumqorgon', name: { 'uz-latin': 'Qumqo\'rg\'on', 'uz-cyrillic': 'Қумқўрғон' } },
    { id: 'angor', name: { 'uz-latin': 'Angor', 'uz-cyrillic': 'Ангор' } },
    { id: 'oltinsoy', name: { 'uz-latin': 'Oltinsoy', 'uz-cyrillic': 'Олтинсой' } },
    { id: 'sariosiyo', name: { 'uz-latin': 'Sariosiyo', 'uz-cyrillic': 'Сариосиё' } },
    { id: 'kizirik', name: { 'uz-latin': 'Qiziriq', 'uz-cyrillic': 'Қизириқ' } },
    { id: 'muzrobod', name: { 'uz-latin': 'Muzrobod', 'uz-cyrillic': 'Музробод' } },
    { id: 'shurchi', name: { 'uz-latin': 'Sho\'rchi', 'uz-cyrillic': 'Шўрчи' } },
    { id: 'uzun', name: { 'uz-latin': 'Uzun', 'uz-cyrillic': 'Узун' } },
    { id: 'bandixon', name: { 'uz-latin': 'Bandixon', 'uz-cyrillic': 'Бандихон' } },
  ]
};

// Combined list of all locations (districts + regional centers)
export const getAllLocations = () => {
  return [
    ...surxondaryoRegion.districts,
    ...regionalCenters
  ];
};

// Get location by ID
export const getLocationById = (id: string) => {
  const district = surxondaryoRegion.districts.find(d => d.id === id);
  if (district) return district;
  return regionalCenters.find(r => r.id === id);
};

// Check if location is a regional center
export const isRegionalCenter = (id: string) => {
  return regionalCenters.some(r => r.id === id);
};

export const popularRoutes = [
  { from: 'termiz', to: 'denov', price: 30000 },
  { from: 'termiz', to: 'sherobod', price: 25000 },
  { from: 'denov', to: 'boysun', price: 35000 },
  { from: 'termiz', to: 'jarkorgon', price: 20000 },
  { from: 'termiz', to: 'qumqorgon', price: 15000 },
  { from: 'denov', to: 'sariosiyo', price: 40000 },
  // Inter-regional popular routes
  { from: 'termiz', to: 'toshkent', price: 300000 },
  { from: 'termiz', to: 'samarqand', price: 200000 },
  { from: 'termiz', to: 'qarshi', price: 100000 },
  { from: 'denov', to: 'toshkent', price: 280000 },
];

export const vehicleModels = [
  'Chevrolet Cobalt',
  'Chevrolet Nexia',
  'Chevrolet Lacetti',
  'Chevrolet Gentra',
  'Chevrolet Malibu',
  'Daewoo Matiz',
  'Daewoo Nexia',
];

export const vehicleColors: { [key: string]: { 'uz-latin': string; 'uz-cyrillic': string } } = {
  'white': { 'uz-latin': 'Oq', 'uz-cyrillic': 'Оқ' },
  'black': { 'uz-latin': 'Qora', 'uz-cyrillic': 'Қора' },
  'silver': { 'uz-latin': 'Kumush', 'uz-cyrillic': 'Кумуш' },
  'gray': { 'uz-latin': 'Kulrang', 'uz-cyrillic': 'Кулранг' },
  'red': { 'uz-latin': 'Qizil', 'uz-cyrillic': 'Қизил' },
  'blue': { 'uz-latin': 'Ko\'k', 'uz-cyrillic': 'Кўк' },
  'green': { 'uz-latin': 'Yashil', 'uz-cyrillic': 'Яшил' },
};
