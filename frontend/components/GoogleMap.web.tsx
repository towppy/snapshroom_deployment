import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';

// Web version using @react-google-maps/api

export default function GoogleMap(props: any) {
  let GoogleMapComponent: any = null;
  try {
    const { GoogleMap, LoadScript, Marker, InfoWindow } = require('@react-google-maps/api');
    const MapComponent = ({ mushrooms, farmLocations = [], selectedMushroom, onSelectMushroom }: any) => {
      const [selected, setSelected] = useState<any>(selectedMushroom);

      const mapContainerStyle = {
        width: '100%',
        height: '400px',
        borderRadius: '12px',
      };

      const center = {
        lat: 12.8797, // Center of Philippines
        lng: 121.7740,
      };

      const options = {
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      };

      const handleMarkerClick = (mushroom: any) => {
        setSelected(mushroom);
        onSelectMushroom(mushroom);
      };

      return (
        <LoadScript googleMapsApiKey="AIzaSyAQKuhDa1x_EaBHo2G18Xm4xJsAIK8QFDg">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={6}
            options={options}
          >
            {mushrooms.map((mushroom: any) => (
              <Marker
                key={mushroom.id}
                position={{ lat: mushroom.lat, lng: mushroom.lng }}
                onClick={() => handleMarkerClick(mushroom)}
                icon={{
                  url: mushroom.edible 
                    ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                    : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                }}
              />
            ))}
            {farmLocations.map((farm: any) => (
              <Marker
                key={farm.id}
                position={{ lat: farm.lat, lng: farm.lng }}
                icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }}
                title={farm.name}
                onClick={() => handleMarkerClick(farm)}
              />
            ))}

            {selected && (
              <InfoWindow
                position={{ lat: selected.lat, lng: selected.lng }}
                onCloseClick={() => {
                  setSelected(null);
                  onSelectMushroom(null);
                }}
              >
                <View style={selected.type === 'farm' ? styles.farmInfoWindow : styles.infoWindow}>
                  <ThemedText style={selected.type === 'farm' ? styles.farmInfoTitle : styles.infoTitle}>{selected.name}</ThemedText>
                </View>
              </InfoWindow>
            )}
          </GoogleMap>
        </LoadScript>
      );
    };
    GoogleMapComponent = MapComponent;
  } catch (e) {
    console.warn('Google Maps component not available', e);
  }

  if (GoogleMapComponent) {
    return <GoogleMapComponent {...props} />;
  } else {
    return (
      <View style={styles.placeholder}>
        <ThemedText>Map is loading...</ThemedText>
        <ThemedText style={styles.note}>
          Install @react-google-maps/api for interactive maps on web
        </ThemedText>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  placeholder: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 20,
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  infoWindow: {
    padding: 8,
    maxWidth: 200,
  },
  infoTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
    color: '#222',
  },
  farmInfoWindow: {
    padding: 6,
    maxWidth: 120,
  },
  farmInfoTitle: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#222',
    textAlign: 'center',
  },
});