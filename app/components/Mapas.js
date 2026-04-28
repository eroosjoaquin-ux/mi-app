import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, MapPin } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function MapaFullScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Estado inicial rehidratado desde params o valores por defecto
  const [radio_alcance_km, setRadioAlcanceKm] = useState(
    params.radio_alcance_km ? parseFloat(params.radio_alcance_km) : 52
  );
  const [nombreZona, setNombreZona] = useState("Cargando ubicación..."); 
  
  const webViewRef = useRef(null);
  const lastCoords = useRef({ lat: 0, lon: 0 }); 
  const lastRequestTime = useRef(0);

  // Uso de coordenadas actuales con validación estricta (evita fallos si la coord es 0)
  const currentCoords = useRef({
    lat: params.latitud !== undefined ? parseFloat(params.latitud) : -35.0246,
    lon: params.longitud !== undefined ? parseFloat(params.longitud) : -58.4231
  });

  const obtenerNombreZona = async (lat, lon) => {
    const now = Date.now();
    
    // 1. FILTRO TEMPORAL (Throttle)
    if (now - lastRequestTime.current < 1500) return;

    // 2. FILTRO DE DISTANCIA
    const dx = Math.abs(lastCoords.current.lat - lat);
    const dy = Math.abs(lastCoords.current.lon - lon);
    if (dx < 0.002 && dy < 0.002) return;

    try {
      lastRequestTime.current = now;
      lastCoords.current = { lat, lon };
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
        { headers: { 'User-Agent': 'MiAppDeServicios' } }
      );
      const data = await response.json();
      const zona = data.address.city || data.address.town || data.address.village || data.address.municipality || "Zona seleccionada";
      setNombreZona(zona);
    } catch (error) {
      setNombreZona("Ubicación marcada");
    }
  };

  const leafletHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; font-family: sans-serif; overflow: hidden; }
          #map { height: 100vh; width: 100vw; background: #f0f0f0; }
          .osm-attribution {
            position: absolute; bottom: 5px; right: 5px;
            background: rgba(255,255,255,0.7); padding: 2px 5px;
            font-size: 10px; z-index: 1000; pointer-events: none;
          }
          .leaflet-interactive { pointer-events: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div class="osm-attribution">© OpenStreetMap contributors</div>
        <script>
          var map = L.map('map', { zoomControl: false, dragging: true })
            .setView([${currentCoords.current.lat}, ${currentCoords.current.lon}], 12);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
          
          var circle = L.circle(map.getCenter(), {
            color: '#1976D2',
            fillColor: '#1976D2',
            fillOpacity: 0.2,
            radius: ${radio_alcance_km * 1000},
            interactive: false 
          }).addTo(map);

          map.on('move', function () {
            requestAnimationFrame(function() {
              circle.setLatLng(map.getCenter());
            });
          });

          map.on('moveend', function () {
            var center = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              lat: center.lat,
              lon: center.lng
            }));
          });

          window.updateCircleOnly = function(newRadio) {
            circle.setRadius(newRadio * 1000);
          }

          window.centerMap = function(newLat, newLon) {
            map.setView([newLat, newLon], 12);
          }

          window.fitMapToCircle = function() {
            map.fitBounds(circle.getBounds(), { padding: [40, 40], animate: true });
          }
        </script>
      </body>
    </html>
  `;

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      currentCoords.current = { lat: data.lat, lon: data.lon };
      obtenerNombreZona(data.lat, data.lon);
    } catch (e) {
      console.error("Error parseando mensaje de WebView", e);
    }
  };

  const manejarCambioSlider = (val) => {
    setRadioAlcanceKm(val);
    webViewRef.current?.injectJavaScript(`window.updateCircleOnly(${val}); true;`);
  };

  const ajustarCamaraFinal = () => {
    webViewRef.current?.injectJavaScript(`window.fitMapToCircle(); true;`);
  };

  const buscarMiUbicacion = () => {
    // Retorno estricto a las coordenadas iniciales de la sesión
    const originalLat = params.latitud !== undefined ? parseFloat(params.latitud) : -35.0246;
    const originalLon = params.longitud !== undefined ? parseFloat(params.longitud) : -58.4231;
    currentCoords.current = { lat: originalLat, lon: originalLon };
    webViewRef.current?.injectJavaScript(`window.centerMap(${originalLat}, ${originalLon}); true;`);
  };

  const confirmarSeleccion = () => {
    const radioFinal = radio_alcance_km < 5 ? 5 : radio_alcance_km;

    router.replace({
      pathname: '/RegistroScreen',
      params: { 
        ...params, 
        latitud: currentCoords.current.lat.toString(),
        longitud: currentCoords.current.lon.toString(),
        // Limpieza de nombreZona antes de volver
        zona_residencial: nombreZona === "Cargando ubicación..." ? "Zona seleccionada" : nombreZona,
        radio_alcance_km: radioFinal.toString()
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={28} color="#333" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>Área de Cobertura</Text>
            <Text style={styles.subtitle}>{nombreZona}</Text>
        </View>
        <View style={{ width: 28 }} /> 
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: leafletHTML }}
          style={styles.map}
          onMessage={onMessage}
          scrollEnabled={true}
        />
      </View>

      <View style={styles.controlsPanel}>
        <View style={styles.dragHandle} />
        <Text style={styles.radioText}>Radio de trabajo: <Text style={{color: '#1976D2'}}>{radio_alcance_km} km</Text></Text>
        
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>5km</Text>
          <Slider
            style={{flex: 1, height: 40}}
            minimumValue={5}
            maximumValue={100}
            step={1}
            value={radio_alcance_km}
            onValueChange={manejarCambioSlider}
            onSlidingComplete={ajustarCamaraFinal}
            minimumTrackTintColor="#1976D2"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#1976D2"
          />
          <Text style={styles.sliderLabel}>100km</Text>
        </View>

        <View style={styles.buttonStack}>
          <TouchableOpacity style={styles.btnConfirm} onPress={confirmarSeleccion}>
            <Check size={20} color="#FFF" />
            <Text style={styles.btnConfirmText}>CONFIRMAR ÁREA Y ZONA</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnLocation} onPress={buscarMiUbicacion}>
            <MapPin size={20} color="#1976D2" />
            <Text style={styles.locationBtnText}>REINICIAR POSICIÓN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 13, color: '#1976D2', fontWeight: '600' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  controlsPanel: { 
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 65, 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#EEE',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 15
  },
  radioText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 25 },
  sliderLabel: { fontSize: 12, color: '#AAA', fontWeight: 'bold' },
  buttonStack: { gap: 12 },
  btnConfirm: { 
    backgroundColor: '#1976D2', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 15,
    gap: 10
  },
  btnConfirmText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  btnLocation: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#1976D2',
    gap: 8
  },
  locationBtnText: { color: '#1976D2', fontWeight: 'bold', fontSize: 13 }
});