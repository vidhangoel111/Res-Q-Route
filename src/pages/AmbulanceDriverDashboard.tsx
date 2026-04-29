import { useAuth } from "@/context/AuthContext";
import { Activity, LogOut, Truck, MapPin, AlertTriangle, Navigation, RotateCcw } from "lucide-react";
import { MOCK_AMBULANCES, MOCK_HOSPITALS } from "@/data/mockData";
import { RealTimeEmergencyMap } from "@/components/RealTimeEmergencyMap";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import { useSocket } from "@/hooks/use-socket";
import { useState } from "react";

const AmbulanceDriverDashboard = () => {
  const { user, logout } = useAuth();
  const [ambulanceId] = useState("a1");
  
  // Auto GPS tracking - no manual enable needed!
  const { position, error, isTracking } = useLocationTracking(ambulanceId);
  
  // Real-time socket connection
  const { isConnected } = useSocket();

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const currentAmbulance = MOCK_AMBULANCES.find(a => a.id === ambulanceId);
  const centerPos = position ? [position.latitude, position.longitude] as [number, number] : [28.6139, 77.2090] as [number, number];

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-card-strong border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-emergency" />
            <span className="text-lg font-bold">Res<span className="text-emergency">Q</span>Route</span>
            <span className="text-xs bg-clinical/20 text-clinical px-2 py-0.5 rounded-full font-medium ml-2">🚑 Driver</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              {isTracking ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-success font-medium">GPS Active</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emergency" />
                  <span className="text-emergency font-medium">GPS Error</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                  <span className="text-warning font-medium">Initializing...</span>
                </div>
              )}
            </div>
            <div className="w-px h-6 bg-border/50" />
            <div className="text-sm text-muted-foreground hidden sm:block">
              <p className="text-xs font-semibold text-foreground">{user?.name ?? "Driver"}</p>
              {currentAmbulance && <p className="text-xs text-muted-foreground">{currentAmbulance.vehicleNo}</p>}
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground p-2"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Map - Real-Time Tracking */}
          <div className="lg:col-span-2 glass-card p-2">
            {currentAmbulance && (
              <RealTimeEmergencyMap
                center={centerPos}
                isAmbulanceDriver={true}
                currentAmbulanceId={ambulanceId}
                allAmbulances={MOCK_AMBULANCES}
                allHospitals={MOCK_HOSPITALS}
              />
            )}
          </div>

          {/* Side Panel - Tracking Info */}
          <div className="space-y-4">
            {/* Status Card */}
            <div className="glass-card p-4 animate-fade-in">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-clinical" /> Ambulance
              </h3>
              {currentAmbulance && (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle</p>
                    <p className="font-bold text-foreground">{currentAmbulance.vehicleNo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Driver</p>
                    <p className="font-bold text-foreground">{currentAmbulance.driverName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hospital</p>
                    <p className="font-bold text-foreground">
                      {MOCK_HOSPITALS.find(h => h.id === currentAmbulance.hospitalId)?.name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* GPS Tracking Status */}
            <div className="glass-card p-4 animate-fade-in">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emergency" /> Live Location
              </h3>

              {isTracking ? (
                <>
                  <div className="space-y-2">
                    <div className="bg-success/10 border border-success/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Latitude</p>
                      <p className="font-mono font-bold text-success">
                        {position?.latitude.toFixed(6)}
                      </p>
                    </div>
                    <div className="bg-success/10 border border-success/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Longitude</p>
                      <p className="font-mono font-bold text-success">
                        {position?.longitude.toFixed(6)}
                      </p>
                    </div>
                    <div className="bg-clinical/10 border border-clinical/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                      <p className="font-bold text-clinical">
                        ±{position?.accuracy.toFixed(0)}m
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-success/10 rounded-lg border border-success/30">
                    <div className="flex items-center gap-2 text-xs text-success">
                      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      <span className="font-medium">Transmitting to dispatchers</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updates every 5 seconds
                    </p>
                  </div>
                </>
              ) : error ? (
                <div className="p-3 bg-emergency/10 border border-emergency/30 rounded-lg">
                  <p className="text-xs font-semibold text-emergency mb-1">⚠️ Location Error</p>
                  <p className="text-xs text-muted-foreground">{error}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    • Ensure location services are enabled
                    • Grant browser permissions for location access
                    • Check if signal is available
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-xs font-semibold text-warning mb-1">🔄 Initializing GPS</p>
                  <p className="text-xs text-muted-foreground">
                    Requesting location access from device...
                  </p>
                </div>
              )}
            </div>

            {/* Connection Status */}
            <div className="glass-card p-4 animate-fade-in">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-clinical" /> Connection
              </h3>

              <div className="space-y-2">
                <div className={`p-2 rounded-lg border ${isConnected ? "bg-success/10 border-success/30" : "bg-warning/10 border-warning/30"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-success animate-pulse" : "bg-warning animate-pulse"}`} />
                    <span className={`text-xs font-medium ${isConnected ? "text-success" : "text-warning"}`}>
                      {isConnected ? "Connected to Server" : "Connecting..."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-muted-foreground space-y-1 bg-muted/30 p-2 rounded-lg">
                <p>✓ Broadcasting location in real-time</p>
                <p>✓ All dispatchers can see your position</p>
                <p>✓ Updates transmitted every 5 seconds</p>
              </div>
            </div>

            {/* Tips */}
            <div className="glass-card p-4 animate-fade-in">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" /> Tips
              </h3>

              <ul className="text-xs text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  <span>Keep location services enabled while on duty</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  <span>Ensure App has GPS permissions</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  <span>Active internet required for real-time tracking</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  <span>Check accuracy for tunnels/indoor areas</span>
                </li>
              </ul>
            </div>

            {/* Manual Refresh */}
            <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
              <RotateCcw className="w-4 h-4" /> Refresh Location
            </button>
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border/50 mt-6">
        Developed by Team LifeLine • Real-time tracking enabled
      </footer>
    </div>
  );
};

export default AmbulanceDriverDashboard;
