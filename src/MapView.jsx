import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default icon paths for CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function MapView({ zones = [], onSelect }) {
  const center = zones.length ? [zones[0].lat, zones[0].lng] : [-6.975, 110.415];

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='© OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {zones.map(z => (
          <Marker key={z.id} position={[z.lat, z.lng]} eventHandlers={{ click: () => onSelect && onSelect(z.id) }}>
            <Popup>
              <div style={{ fontWeight: 700 }}>{z.name}</div>
              <div>Risk: {z.risk} ({z.level}%)</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
