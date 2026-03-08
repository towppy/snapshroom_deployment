import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { ThemedText } from './themed-text';

// For mobile (Expo Go), use a WebView to display a Google Map iframe
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('WebView not available');
  }
}

function generateMapHtml(mushrooms: any[], farmLocations: any[] = []) {
  // Generates a simple Google Map with markers for mushrooms and farms
  const centerLat = 12.8797;
  const centerLng = 121.7740;
  // Helper to escape single quotes for JS string literals
  const escapeJS = (str: string) => String(str).replace(/'/g, "\\'");
  const mushroomMarkers = mushrooms.map((m: any) =>
    `new google.maps.Marker({position: {lat: ${m.lat}, lng: ${m.lng}}, map, title: '${escapeJS(m.name)}', icon: { url: '${m.edible ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png" : "http://maps.google.com/mapfiles/ms/icons/red-dot.png"}' }});`
  ).join('\n');
  const farmMarkers = farmLocations.map((f: any) =>
    `new google.maps.Marker({position: {lat: ${f.lat}, lng: ${f.lng}}, map, title: '${escapeJS(f.name)}', icon: { url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }});`
  ).join('\n');
  return `<!DOCTYPE html>
  <html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <style>html,body,#map{height:100%;margin:0;padding:0;}#map{border-radius:12px;}</style>
  <script src='https://maps.googleapis.com/maps/api/js?key=AIzaSyAQKuhDa1x_EaBHo2G18Xm4xJsAIK8QFDg'></script>
  </head><body><div id='map' style='width:100vw;height:400px;'></div>
  <script>const map=new google.maps.Map(document.getElementById('map'),{center:{lat:${centerLat},lng:${centerLng}},zoom:6});${mushroomMarkers}${farmMarkers}</script>
  </body></html>`;
}

export default function GoogleMap({ mushrooms, farmLocations = [], selectedMushroom, onSelectMushroom }: any) {
  if (Platform.OS === 'web') {
    // Dynamically import the web version (uses @react-google-maps/api)
    const GoogleMapWeb = require('./GoogleMap.web').default;
    return <GoogleMapWeb mushrooms={mushrooms} farmLocations={farmLocations} selectedMushroom={selectedMushroom} onSelectMushroom={onSelectMushroom} />;
  }
  if (WebView) {
    const html = generateMapHtml(mushrooms, farmLocations);
    return (
      <View style={styles.map}>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    );
  }
  return (
    <View style={styles.placeholder}>
      <ThemedText>Map is not available on this platform.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 20,
  },
});