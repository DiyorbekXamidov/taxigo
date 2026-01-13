// Approximate coordinates for Surxondaryo region districts and regional centers
// Corrected coordinates for accurate map display
export const districtCoordinates: { [key: string]: { lat: number; lng: number } } = {
  // Surxondaryo tumanlari (verified coordinates)
  termiz: { lat: 37.2242, lng: 67.2783 },
  denov: { lat: 38.2747, lng: 67.8936 },
  sherobod: { lat: 37.6289, lng: 67.0047 }, // Fixed: was pointing to wrong location
  boysun: { lat: 38.2028, lng: 67.1997 },
  jarkorgon: { lat: 37.5064, lng: 67.4108 },
  qumqorgon: { lat: 37.3833, lng: 67.5667 },
  angor: { lat: 37.5833, lng: 67.3333 }, // Fixed: adjusted longitude
  oltinsoy: { lat: 38.3333, lng: 68.0833 },
  sariosiyo: { lat: 38.4167, lng: 67.9167 },
  kizirik: { lat: 37.7333, lng: 67.1667 },
  muzrobod: { lat: 38.5667, lng: 67.8333 },
  shurchi: { lat: 37.9333, lng: 67.7500 },
  uzun: { lat: 38.1000, lng: 67.9500 },
  bandixon: { lat: 37.8667, lng: 67.3333 }, // Fixed: was pointing to wrong location
  // Viloyat markazlari
  toshkent: { lat: 41.2995, lng: 69.2401 },
  samarqand: { lat: 39.6542, lng: 66.9597 },
  buxoro: { lat: 39.7745, lng: 64.4286 },
  andijon: { lat: 40.7821, lng: 72.3442 },
  fargona: { lat: 40.3842, lng: 71.7869 },
  namangan: { lat: 40.9983, lng: 71.6726 },
  qarshi: { lat: 38.8607, lng: 65.8006 },
  navoiy: { lat: 40.0844, lng: 65.3792 },
  jizzax: { lat: 40.1158, lng: 67.8422 },
  guliston: { lat: 40.4897, lng: 68.7842 },
  nukus: { lat: 42.4619, lng: 59.6166 },
  urganch: { lat: 41.5500, lng: 60.6333 },
};

// Estimated travel times between districts (in minutes)
// Based on approximate road distances
export const travelTimes: { [key: string]: { [key: string]: number } } = {
  termiz: {
    denov: 90,
    sherobod: 60,
    boysun: 120,
    jarkorgon: 45,
    qumqorgon: 30,
    angor: 75,
    oltinsoy: 105,
    sariosiyo: 110,
    kizirik: 55,
    muzrobod: 130,
    shurchi: 80,
    uzun: 95,
    bandixon: 100,
  },
  denov: {
    termiz: 90,
    sherobod: 150,
    boysun: 60,
    jarkorgon: 70,
    qumqorgon: 75,
    angor: 100,
    oltinsoy: 40,
    sariosiyo: 35,
    kizirik: 55,
    muzrobod: 65,
    shurchi: 45,
    uzun: 30,
    bandixon: 120,
  },
  sherobod: {
    termiz: 60,
    denov: 150,
    boysun: 120,
    jarkorgon: 100,
    qumqorgon: 85,
    angor: 40,
    oltinsoy: 160,
    sariosiyo: 165,
    kizirik: 75,
    muzrobod: 180,
    shurchi: 130,
    uzun: 145,
    bandixon: 55,
  },
  boysun: {
    termiz: 120,
    denov: 60,
    sherobod: 120,
    jarkorgon: 80,
    qumqorgon: 95,
    angor: 85,
    oltinsoy: 70,
    sariosiyo: 65,
    kizirik: 50,
    muzrobod: 90,
    shurchi: 45,
    uzun: 55,
    bandixon: 75,
  },
};

// Get travel time between two districts
export const getTravelTime = (from: string, to: string): number | null => {
  if (from === to) return 0;
  
  if (travelTimes[from] && travelTimes[from][to]) {
    return travelTimes[from][to];
  }
  
  if (travelTimes[to] && travelTimes[to][from]) {
    return travelTimes[to][from];
  }
  
  // Fallback: estimate based on coordinates (rough estimate)
  const coord1 = districtCoordinates[from];
  const coord2 = districtCoordinates[to];
  
  if (coord1 && coord2) {
    const distance = Math.sqrt(
      Math.pow(coord2.lat - coord1.lat, 2) + Math.pow(coord2.lng - coord1.lng, 2)
    );
    // Rough estimate: 1 degree ≈ 111km, average speed 50km/h
    return Math.round(distance * 111 / 50 * 60);
  }
  
  return null;
};

// Get distance between two districts (in km)
export const getDistance = (from: string, to: string): number | null => {
  const coord1 = districtCoordinates[from];
  const coord2 = districtCoordinates[to];
  
  if (!coord1 || !coord2) return null;
  
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // Add 30% for road winding
  return Math.round(distance * 1.3);
};
