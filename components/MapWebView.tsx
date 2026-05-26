/**
 * Android-safe map using a WebView + OpenStreetMap (Leaflet).
 * No Google Maps API key required.
 * On iOS the caller can still use native MapView with Apple Maps.
 */
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { WebView } from 'react-native-webview';

type Props = {
  lat: number;
  lng: number;
  height?: number;
  zoom?: number;
  markerTitle?: string;
  scrollEnabled?: boolean;
};

function buildHtml(lat: number, lng: number, zoom: number, markerTitle: string, scrollEnabled: boolean): string {
  const safeTitle = markerTitle.replace(/'/g, "\\'");
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%}
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', {
    zoomControl: ${scrollEnabled},
    attributionControl: false,
    dragging: ${scrollEnabled},
    touchZoom: ${scrollEnabled},
    scrollWheelZoom: false,
    doubleClickZoom: ${scrollEnabled},
    boxZoom: ${scrollEnabled},
  }).setView([${lat}, ${lng}], ${zoom});

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  var icon = L.divIcon({
    html: '<div style="width:18px;height:18px;background:#4F7BFF;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    className: '',
  });

  var marker = L.marker([${lat}, ${lng}], { icon: icon }).addTo(map);
  ${safeTitle ? `marker.bindTooltip('${safeTitle}', { permanent: false, direction: 'top' });` : ''}
</script>
</body>
</html>`;
}

export default function MapWebView({
  lat, lng, height = 300, zoom = 15, markerTitle = '', scrollEnabled = false,
}: Props) {
  const [loading, setLoading] = useState(true);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html: buildHtml(lat, lng, zoom, markerTitle, scrollEnabled) }}
        style={[styles.webview, { opacity: loading ? 0 : 1 }]}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onLoad={() => setLoading(false)}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color="#4F7BFF" size="small" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#E8EDF2' },
  webview:   { flex: 1, backgroundColor: 'transparent' },
  loader:    { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
});
