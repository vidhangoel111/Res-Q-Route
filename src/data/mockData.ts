import { EmergencyRequest, Ambulance, Hospital } from "./types";

export const MOCK_HOSPITALS: Hospital[] = [
  { id: "h1", name: "City General Hospital", lat: 28.6139, lng: 77.209, icuBeds: 12, emergencyBeds: 24, totalBeds: 200, occupancy: 72, capacity: 18, burnUnit: false },
  { id: "h2", name: "Apollo Emergency Center", lat: 28.5672, lng: 77.2100, icuBeds: 8, emergencyBeds: 16, totalBeds: 150, occupancy: 65, capacity: 14, burnUnit: true },
  { id: "h3", name: "AIIMS Trauma Centre", lat: 28.5672, lng: 77.2099, icuBeds: 20, emergencyBeds: 40, totalBeds: 500, occupancy: 85, capacity: 28, burnUnit: true },
  { id: "h4", name: "Max Super Speciality", lat: 28.6304, lng: 77.2177, icuBeds: 15, emergencyBeds: 30, totalBeds: 300, occupancy: 58, capacity: 22, burnUnit: false },
];

export const MOCK_AMBULANCES: Ambulance[] = [
  { id: "a1", vehicleNo: "DL-01-AB-1234", driverName: "Suresh Kumar", lat: 28.6200, lng: 77.2150, status: "available", hospitalId: "h1" },
  { id: "a2", vehicleNo: "DL-02-CD-5678", driverName: "Rajesh Singh", lat: 28.5800, lng: 77.2000, status: "available", hospitalId: "h2" },
  { id: "a3", vehicleNo: "DL-03-EF-9012", driverName: "Amit Verma", lat: 28.6000, lng: 77.2300, status: "busy", hospitalId: "h1" },
  { id: "a4", vehicleNo: "DL-04-GH-3456", driverName: "Pradeep Yadav", lat: 28.6350, lng: 77.2050, status: "available", hospitalId: "h3" },
  { id: "a5", vehicleNo: "DL-05-IJ-7890", driverName: "Vikram Chauhan", lat: 28.5900, lng: 77.2250, status: "maintenance", hospitalId: "h4" },
];

export const TRAFFIC_ZONES = [
  { name: "Connaught Place", bounds: [[28.628, 77.215], [28.637, 77.225]] as [number, number][], multiplier: 1.6, level: "high" as const },
  { name: "India Gate Area", bounds: [[28.610, 77.225], [28.618, 77.235]] as [number, number][], multiplier: 1.3, level: "medium" as const },
  { name: "Karol Bagh", bounds: [[28.645, 77.185], [28.655, 77.200]] as [number, number][], multiplier: 1.6, level: "high" as const },
];

export const EMERGENCY_TYPES = ["Cardiac Arrest", "Road Accident", "Breathing Difficulty", "Burns", "Drowning", "Fall Injury", "Poisoning", "Stroke", "Pregnancy Emergency", "Other"];

export const SEVERITY_LEVELS = ["critical", "high", "medium", "low"] as const;

export function classifySeverity(type: string, description: string): typeof SEVERITY_LEVELS[number] {
  const text = `${type} ${description}`.toLowerCase();
  if (text.includes("cardiac") || text.includes("stroke") || text.includes("drowning") || text.includes("not breathing")) return "critical";
  if (text.includes("accident") || text.includes("burns") || text.includes("poisoning") || text.includes("pregnancy")) return "high";
  if (text.includes("breathing") || text.includes("fall") || text.includes("fracture")) return "medium";
  return "low";
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Calculate bearing (direction) from point1 to point2
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  
  return (bearing + 360) % 360; // Return 0-360 degrees
}

// Get direction name from bearing
export function getBearingDirection(bearing: number): string {
  const directions = ["North", "NNE", "NE", "ENE", "East", "ESE", "SE", "SSE", "South", "SSW", "SW", "WSW", "West", "WNW", "NW", "NNW"];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

const AVG_SPEED_KMPH = 40;

function isCardiacEmergency(type: string): boolean {
  const normalized = type.toLowerCase();
  return normalized.includes("cardiac") || normalized.includes("heart") || normalized.includes("stroke");
}

function isBurnEmergency(type: string): boolean {
  return type.toLowerCase().includes("burn");
}

function supportsEmergencyType(hospital: Hospital, emergencyType: string): boolean {
  if (hospital.capacity <= 0) return false;
  if (isCardiacEmergency(emergencyType) && hospital.icuBeds <= 0) return false;
  if (isBurnEmergency(emergencyType) && !hospital.burnUnit) return false;
  return hospital.emergencyBeds > 0 || hospital.icuBeds > 0;
}

export function estimateTravelTimeSeconds(distanceKm: number, avgSpeedKmph = AVG_SPEED_KMPH): number {
  if (distanceKm <= 0) return 0;
  return Math.round((distanceKm / avgSpeedKmph) * 3600);
}

export function findOptimalDispatch(
  userLat: number,
  userLng: number,
  emergencyType: string,
  ambulances: Ambulance[],
  hospitals: Hospital[],
): { ambulance: Ambulance | null; hospital: Hospital | null; totalEtaSeconds: number } {
  const availableAmbulances = ambulances.filter((a) => a.status === "available");
  const eligibleHospitals = hospitals.filter((h) => supportsEmergencyType(h, emergencyType));

  let best: { ambulance: Ambulance | null; hospital: Hospital | null; totalEtaSeconds: number } = {
    ambulance: null,
    hospital: null,
    totalEtaSeconds: 0,
  };

  for (const ambulance of availableAmbulances) {
    const toUserDistanceKm = haversineDistance(userLat, userLng, ambulance.lat, ambulance.lng);
    const toUserSeconds = estimateTravelTimeSeconds(toUserDistanceKm);

    for (const hospital of eligibleHospitals) {
      const toHospitalDistanceKm = haversineDistance(userLat, userLng, hospital.lat, hospital.lng);
      const totalEtaSeconds = toUserSeconds + estimateTravelTimeSeconds(toHospitalDistanceKm);

      if (!best.ambulance || totalEtaSeconds < best.totalEtaSeconds) {
        best = { ambulance, hospital, totalEtaSeconds };
      }
    }
  }

  return best;
}

export function findNearestAmbulance(userLat: number, userLng: number, ambulances: Ambulance[], emergencyType = "general"): Ambulance | null {
  return findOptimalDispatch(userLat, userLng, emergencyType, ambulances, MOCK_HOSPITALS).ambulance;
}

export function findBestHospital(userLat: number, userLng: number, hospitals: Hospital[], emergencyType = "general", ambulances: Ambulance[] = MOCK_AMBULANCES): Hospital | null {
  return findOptimalDispatch(userLat, userLng, emergencyType, ambulances, hospitals).hospital;
}

export function generateEmergencyId(): string {
  return `EMR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
}

export function interpolateRoute(start: [number, number], end: [number, number], steps: number): [number, number][] {
  const route: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jitterLat = (Math.random() - 0.5) * 0.001;
    const jitterLng = (Math.random() - 0.5) * 0.001;
    route.push([
      start[0] + (end[0] - start[0]) * t + (i > 0 && i < steps ? jitterLat : 0),
      start[1] + (end[1] - start[1]) * t + (i > 0 && i < steps ? jitterLng : 0),
    ]);
  }
  return route;
}

// Mock analytics data
export const MOCK_ANALYTICS = {
  totalEmergenciesToday: 47,
  avgResponseTime: 8.4,
  responseTimeReduction: 34,
  severityDistribution: [
    { name: "Critical", value: 8, fill: "hsl(0, 85%, 55%)" },
    { name: "High", value: 15, fill: "hsl(38, 92%, 50%)" },
    { name: "Medium", value: 16, fill: "hsl(210, 80%, 55%)" },
    { name: "Low", value: 8, fill: "hsl(142, 70%, 45%)" },
  ],
  emergencyTypes: [
    { type: "Cardiac", count: 12 },
    { type: "Accident", count: 18 },
    { type: "Breathing", count: 7 },
    { type: "Burns", count: 4 },
    { type: "Other", count: 6 },
  ],
  peakHours: Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    emergencies: Math.floor(Math.random() * 8) + (i >= 8 && i <= 22 ? 3 : 0),
  })),
  ambulanceUtilization: 78,
  bedOccupancy: 72,
};
