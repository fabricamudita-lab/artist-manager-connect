import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Search } from 'lucide-react';

// Nota: En producción, esto debería venir de Supabase Edge Function Secrets
const MAPBOX_TOKEN = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHprb3czcTEwNHFzMmpsb2l6dGg4aWEwIn0.MNLFryULDczqNHPXLH1m8Q';

interface LocationMapProps {
  onLocationSelect: (location: string, lat: number, lng: number) => void;
  initialLocation?: string;
  initialCoords?: { lat: number; lng: number };
}

export function LocationMap({ onLocationSelect, initialLocation, initialCoords }: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialLocation || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: initialCoords ? [initialCoords.lng, initialCoords.lat] : [-3.7026, 40.4165], // Madrid por defecto
      zoom: initialCoords ? 15 : 10,
    });

    // Agregar controles de navegación
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Si hay coordenadas iniciales, agregar marcador
    if (initialCoords) {
      addMarker(initialCoords.lng, initialCoords.lat, initialLocation || 'Ubicación seleccionada');
    }

    // Click en el mapa para seleccionar ubicación
    map.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      const locationName = await reverseGeocode(lng, lat);
      addMarker(lng, lat, locationName);
      setSearchQuery(locationName);
      onLocationSelect(locationName, lat, lng);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  const addMarker = (lng: number, lat: number, title: string) => {
    if (marker.current) {
      marker.current.remove();
    }

    marker.current = new mapboxgl.Marker()
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<div class="font-semibold">${title}</div>`))
      .addTo(map.current!);
  };

  const reverseGeocode = async (lng: number, lat: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es`
      );
      const data = await response.json();
      return data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&language=es&country=ES`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.center;
        const locationName = feature.place_name;
        
        // Centrar el mapa en la ubicación encontrada
        map.current?.flyTo({
          center: [lng, lat],
          zoom: 15,
          duration: 2000
        });
        
        addMarker(lng, lat, locationName);
        setSearchQuery(locationName);
        onLocationSelect(locationName, lat, lng);
      }
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchLocation();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Seleccionar Ubicación en Google Maps
        </CardTitle>
        <CardDescription>
          Busca una dirección o haz clic en el mapa para seleccionar la ubicación del evento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar dirección o lugar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button onClick={searchLocation} disabled={isLoading}>
            <Search className="h-4 w-4" />
            {isLoading ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
        
        <div 
          ref={mapContainer} 
          className="h-64 w-full rounded-lg border"
          style={{ minHeight: '256px' }}
        />
        
        <p className="text-sm text-muted-foreground">
          💡 Tip: Puedes hacer clic directamente en el mapa para seleccionar una ubicación específica
        </p>
      </CardContent>
    </Card>
  );
}