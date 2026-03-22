import { useEffect, useState } from "react";
import L from "leaflet";
import { Ambulance, Hospital } from "@/data/types";

const ambulanceIcon = L.divIcon({
  html: `<div style="background:#E53E3E;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;">🚑</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: "",
});

const ambulanceIconDim = L.divIcon({
  html: `<div style="background:#E53E3E80;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);font-size:13px;opacity:0.6;">🚑</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  className: "",
});

const hospitalIcon = L.divIcon({
  html: `<div style="background:#3182CE;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;">🏥</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: "",
});

const hospitalIconDim = L.divIcon({
  html: `<div style="background:#3182CE80;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);font-size:13px;opacity:0.6;">🏥</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  className: "",
});

const userIcon = L.divIcon({
  html: `<div style="background:#E53E3E;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #E53E3E,0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: "",
});

interface Props {
  center: [number, number];
  userPos?: [number, number];
  ambulancePos?: [number, number];
  hospitalPos?: [number, number];
  allAmbulances?: Ambulance[];
  allHospitals?: Hospital[];
  selectedAmbulanceId?: string;
  selectedHospitalId?: string;
  onMapClick?: (lat: number, lng: number) => void;
}

const EmergencyMap = ({ center, userPos, ambulancePos, hospitalPos, allAmbulances, allHospitals, selectedAmbulanceId, selectedHospitalId, onMapClick }: Props) => {
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    import("react-leaflet").then((mod) => {
      setMapComponents({
        MapContainer: mod.MapContainer,
        TileLayer: mod.TileLayer,
        Marker: mod.Marker,
        Popup: mod.Popup,
        Polyline: mod.Polyline,
        useMap: mod.useMap,
        useMapEvents: mod.useMapEvents,
      });
    });
  }, []);

  if (!MapComponents) {
    return (
      <div className="flex items-center justify-center bg-muted rounded-xl" style={{ height: "400px" }}>
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } = MapComponents;

  function FlyTo({ pos, zoom }: { pos: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
      map.flyTo(pos, zoom, { animate: true, duration: 1.5 });
    }, [pos[0], pos[1]]);
    return null;
  }

  function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
    useMapEvents({ click: (e: any) => onClick(e.latlng.lat, e.latlng.lng) });
    return null;
  }

  const routeLine = ambulancePos && userPos ? [ambulancePos, userPos] : null;

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", minHeight: "400px", width: "100%", borderRadius: "0.75rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo pos={center} zoom={13} />
      {onMapClick && <ClickHandler onClick={onMapClick} />}

      {/* All hospitals */}
      {allHospitals?.map(h => (
        <Marker key={h.id} position={[h.lat, h.lng]} icon={h.id === selectedHospitalId ? hospitalIcon : hospitalIconDim}>
          <Popup>
            <div style={{ minWidth: 140 }}>
              <strong>🏥 {h.name}</strong><br/>
              ICU: {h.icuBeds} | ER: {h.emergencyBeds}<br/>
              Occupancy: {h.occupancy}%
              {h.id === selectedHospitalId && <><br/><span style={{ color: '#3182CE', fontWeight: 'bold' }}>✓ Selected</span></>}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* All ambulances (non-moving, dimmed) */}
      {allAmbulances?.filter(a => a.id !== selectedAmbulanceId).map(a => (
        <Marker key={a.id} position={[a.lat, a.lng]} icon={ambulanceIconDim}>
          <Popup>
            <div style={{ minWidth: 120 }}>
              <strong>🚑 {a.vehicleNo}</strong><br/>
              {a.driverName}<br/>
              Status: {a.status}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Single hospital marker fallback (no array) */}
      {!allHospitals && hospitalPos && (
        <Marker position={hospitalPos} icon={hospitalIcon}>
          <Popup>🏥 Hospital</Popup>
        </Marker>
      )}

      {userPos && (
        <Marker position={userPos} icon={userIcon}>
          <Popup>📍 Emergency Location</Popup>
        </Marker>
      )}

      {/* Selected/moving ambulance */}
      {ambulancePos && (
        <Marker position={ambulancePos} icon={ambulanceIcon}>
          <Popup>🚑 Assigned Ambulance</Popup>
        </Marker>
      )}

      {routeLine && (
        <Polyline positions={routeLine} pathOptions={{ color: "#E53E3E", weight: 4, dashArray: "10, 10" }} />
      )}
    </MapContainer>
  );
};

export default EmergencyMap;
