export type EmergencyStatus = "SUBMITTED" | "CLASSIFIED" | "ASSIGNED" | "EN_ROUTE" | "ARRIVED" | "TRANSPORTING" | "COMPLETED";

export type SeverityLevel = "critical" | "high" | "medium" | "low";

export interface EmergencyRequest {
  id: string;
  patientName: string;
  phone: string;
  type: string;
  description: string;
  lat: number;
  lng: number;
  severity: SeverityLevel;
  status: EmergencyStatus;
  assignedAmbulance?: Ambulance;
  assignedHospital?: Hospital;
  etaSeconds: number;
  createdAt: Date;
  completedAt?: Date;
  baselineTime?: number;
  optimizedTime?: number;
}

export interface Ambulance {
  id: string;
  vehicleNo: string;
  driverName: string;
  lat: number;
  lng: number;
  status: "available" | "busy" | "maintenance";
  hospitalId: string;
}

export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icuBeds: number;
  emergencyBeds: number;
  totalBeds: number;
  occupancy: number;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  timestamp: Date;
  details: string;
}
