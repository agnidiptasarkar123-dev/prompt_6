// SPDX-License-Identifier: Apache-2.0

export interface IndianCityLocation {
  readonly id: string;
  readonly name: string;
  readonly state: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly aliases: readonly string[];
}

export const INDIAN_CITIES_REGISTRY: readonly IndianCityLocation[] = [
  { id: "delhi", name: "Delhi", state: "Delhi", latitude: 28.6139, longitude: 77.209, aliases: ["new delhi", "ncr", "dilli"] },
  { id: "kolkata", name: "Kolkata", state: "West Bengal", latitude: 22.5726, longitude: 88.3639, aliases: ["calcutta", "howrah", "wb"] },
  { id: "mumbai", name: "Mumbai", state: "Maharashtra", latitude: 19.076, longitude: 72.8777, aliases: ["bombay", "thane", "navi mumbai"] },
  { id: "bengaluru", name: "Bengaluru", state: "Karnataka", latitude: 12.9716, longitude: 77.5946, aliases: ["bangalore", "blore"] },
  { id: "chennai", name: "Chennai", state: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707, aliases: ["madras", "tn"] },
  { id: "hyderabad", name: "Hyderabad", state: "Telangana", latitude: 17.385, longitude: 78.4867, aliases: ["secunderabad", "cyberabad"] },
  { id: "ahmedabad", name: "Ahmedabad", state: "Gujarat", latitude: 23.0225, longitude: 72.5714, aliases: ["amdavad", "gandhinagar"] },
  { id: "pune", name: "Pune", state: "Maharashtra", latitude: 18.5204, longitude: 73.8567, aliases: ["poona", "pcmc"] },
  { id: "lucknow", name: "Lucknow", state: "Uttar Pradesh", latitude: 26.8467, longitude: 80.9462, aliases: ["up", "awadh"] },
  { id: "kanpur", name: "Kanpur", state: "Uttar Pradesh", latitude: 26.4499, longitude: 80.3319, aliases: ["cawnpore"] },
  { id: "patna", name: "Patna", state: "Bihar", latitude: 25.5941, longitude: 85.1376, aliases: ["patliputra", "bihar"] },
  { id: "jaipur", name: "Jaipur", state: "Rajasthan", latitude: 26.9124, longitude: 75.7873, aliases: ["pink city", "rajasthan"] },
  { id: "varanasi", name: "Varanasi", state: "Uttar Pradesh", latitude: 25.3176, longitude: 82.9739, aliases: ["banaras", "kashi"] },
  { id: "chandigarh", name: "Chandigarh", state: "Chandigarh", latitude: 30.7333, longitude: 76.7794, aliases: ["tricity", "mohali", "panchkula"] },
  { id: "bhopal", name: "Bhopal", state: "Madhya Pradesh", latitude: 23.2599, longitude: 77.4126, aliases: ["mp", "city of lakes"] },
  { id: "indore", name: "Indore", state: "Madhya Pradesh", latitude: 22.7196, longitude: 75.8577, aliases: ["malwa"] },
  { id: "guwahati", name: "Guwahati", state: "Assam", latitude: 26.1445, longitude: 91.7362, aliases: ["gauhati", "assam", "kamrup"] },
  { id: "bhubaneswar", name: "Bhubaneswar", state: "Odisha", latitude: 20.2961, longitude: 85.8245, aliases: ["orissa", "cuttack"] },
  { id: "kochi", name: "Kochi", state: "Kerala", latitude: 9.9312, longitude: 76.2673, aliases: ["cochin", "ernakulam", "kerala"] },
  { id: "srinagar", name: "Srinagar", state: "Jammu and Kashmir", latitude: 34.0837, longitude: 74.7973, aliases: ["kashmir", "j&k"] },
  { id: "amritsar", name: "Amritsar", state: "Punjab", latitude: 31.634, longitude: 74.8723, aliases: ["punjab", "golden temple"] },
  { id: "ranchi", name: "Ranchi", state: "Jharkhand", latitude: 23.3441, longitude: 85.3096, aliases: ["jharkhand"] },
  { id: "dehradun", name: "Dehradun", state: "Uttarakhand", latitude: 30.3165, longitude: 78.0322, aliases: ["doon", "uttarakhand"] },
  { id: "visakhapatnam", name: "Visakhapatnam", state: "Andhra Pradesh", latitude: 17.6868, longitude: 83.2185, aliases: ["vizag", "ap"] },
  { id: "nagpur", name: "Nagpur", state: "Maharashtra", latitude: 21.1458, longitude: 79.0882, aliases: ["orange city"] },
  { id: "raipur", name: "Raipur", state: "Chhattisgarh", latitude: 21.2514, longitude: 81.6296, aliases: ["chhattisgarh"] },
  { id: "shimla", name: "Shimla", state: "Himachal Pradesh", latitude: 31.1048, longitude: 77.1734, aliases: ["himachal", "simla"] }
];

export function searchIndianCities(query: string, limit: number = 10): readonly IndianCityLocation[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const matched = INDIAN_CITIES_REGISTRY.filter((c) => {
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.state.toLowerCase().includes(q)) return true;
    return c.aliases.some((a) => a.includes(q));
  });

  return matched.slice(0, limit);
}
