import React, { useEffect, useState, useRef, useCallback } from 'react';

interface Mushroom {
  id: number;
  name: string;
  localName: string;
  region: string;
  province: string;
  lat: number;
  lng: number;
  edible: boolean;
  notes: string;
  capColor: string;
}

interface Props {
  mushrooms: Mushroom[];
  selectedMushroom: Mushroom | null;
  onSelectMushroom: (mushroom: Mushroom) => void;
}

declare global {
  var L: any;
}

const LeafletMapComponent: React.FC<Props> = ({ 
  mushrooms, 
  selectedMushroom, 
  onSelectMushroom 
}) => {
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Define initializeMap outside the effect
  const initializeMap = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const L = window.L;
    const phCenter = [12.8797, 121.774];
    
    mapInstanceRef.current = L.map(mapRef.current).setView(phCenter, 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    // Add markers for each mushroom
    mushrooms.forEach((mushroom) => {
      const isEdible = mushroom.edible;
      const color = isEdible ? '#7BA05B' : '#D32F2F';

      // Create custom HTML icon
      const iconHtml = `
        <div style="
          width: 40px;
          height: 40px;
          background: ${color};
          border: 2px solid rgba(0,0,0,0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          🍄
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
        className: 'custom-div-icon',
      });

      const marker = L.marker([mushroom.lat, mushroom.lng], { icon: customIcon })
        .addTo(mapInstanceRef.current);

      // Create popup content
      const popupContent = `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-width: 200px;
        ">
          <div style="font-weight: 700; margin-bottom: 8px; color: #2D3E2D; font-size: 14px;">
            ${mushroom.name}
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            ${mushroom.localName}
          </div>
          <div style="margin-bottom: 4px; font-size: 12px;">
            <strong>📍 Province:</strong> ${mushroom.province}
          </div>
          <div style="margin-bottom: 4px; font-size: 12px;">
            <strong>🏷️ Region:</strong> ${mushroom.region}
          </div>
          <div style="margin-bottom: 4px; font-size: 12px;">
            <strong>🎨 Cap Color:</strong> ${mushroom.capColor}
          </div>
          <div style="
            margin-top: 8px;
            padding: 6px 8px;
            border-radius: 4px;
            background: ${mushroom.edible ? '#E8F5E9' : '#FFEBEE'};
            color: ${mushroom.edible ? '#2E7D32' : '#C62828'};
            font-weight: 600;
            text-align: center;
            font-size: 12px;
          ">
            ${mushroom.edible ? '✅ Edible' : '⚠️ Poisonous'}
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: #555; line-height: 1.4;">
            ${mushroom.notes}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        onSelectMushroom(mushroom);
        marker.openPopup();
      });

      markersRef.current.set(mushroom.id, marker);
    });
  }, [mushrooms, onSelectMushroom]);

  useEffect(() => {
    if (!isMounted || !mapRef.current) return;

    // Load Leaflet dynamically
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.async = true;
      script.onload = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(link);
        initializeMap();
      };
      document.head.appendChild(script);
    } else {
      initializeMap();
    }

    return () => {
      // Cleanup
    };
  }, [isMounted, mushrooms, onSelectMushroom, initializeMap]);

  // Update marker styling when selection changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((marker, id) => {
      const isSelected = selectedMushroom?.id === id;
      const mushroom = mushrooms.find(m => m.id === id);
      if (!mushroom) return;

      const color = mushroom.edible ? '#7BA05B' : '#D32F2F';
      const borderColor = isSelected ? '#000' : 'rgba(0,0,0,0.5)';
      const borderWidth = isSelected ? '3px' : '2px';

      const iconHtml = `
        <div style="
          width: ${isSelected ? 50 : 40}px;
          height: ${isSelected ? 50 : 40}px;
          background: ${color};
          border: ${borderWidth} solid ${borderColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? 24 : 20}px;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: all 0.2s ease;
          transform: ${isSelected ? 'scale(1.3)' : 'scale(1)'};
        ">
          🍄
        </div>
      `;

      const newIcon = window.L.divIcon({
        html: iconHtml,
        iconSize: [isSelected ? 50 : 40, isSelected ? 50 : 40],
        iconAnchor: [isSelected ? 25 : 20, isSelected ? 50 : 40],
        popupAnchor: [0, isSelected ? -50 : -40],
        className: 'custom-div-icon',
      });

      marker.setIcon(newIcon);
    });
  }, [selectedMushroom, mushrooms]);

  if (!isMounted) {
    return (
      <div style={{
        width: '100%',
        height: '400px',
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
      }}>
        <span style={{ color: '#999' }}>Loading Map...</span>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '400px',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        backgroundColor: '#E8F4F8',
      }}
    />
  );
};

export default LeafletMapComponent;
