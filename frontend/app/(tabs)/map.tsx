import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, ActivityIndicator, Image, Modal, useWindowDimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import HamburgerMenu from '@/components/HamburgerMenu';
import NotificationDropdown from '@/components/NotificationDropdown';
import { API_URL } from '@/constants/api';
import GoogleMap from '@/components/GoogleMap';
import { farmsService, Farm } from '@/services/farmsService';

// Mushroom image mapping
const MUSHROOM_IMAGES: Record<string, any> = {
  'Oyster Mushroom': require('@/assets/images/mushrooms/oyster-mushroom.jpg'),
  'Enoki Mushroom': require('@/assets/images/mushrooms/enoki-mushroom.jpg'),
  'Button Mushroom': require('@/assets/images/mushrooms/button-mushroom.jpg'),
  'Shiitake': require('@/assets/images/mushrooms/shiitake-mushroom.jpg'),
  'Shiitake Mushroom': require('@/assets/images/mushrooms/shiitake-mushroom.jpg'),
  'Wood Ear': require('@/assets/images/mushrooms/wood-ear.jpg'),
  'Wood Ear Mushroom': require('@/assets/images/mushrooms/wood-ear.jpg'),
  'Death Cap': require('@/assets/images/mushrooms/death-cap.jpg'),
  'False Morel': require('@/assets/images/mushrooms/false-morel.jpg'),
  'Jack O Lantern': require('@/assets/images/mushrooms/jack-o-lantern.jpg'),
  "Jack O' Lantern": require('@/assets/images/mushrooms/jack-o-lantern.jpg'),
  "Jack O' Lantern Mushroom": require('@/assets/images/mushrooms/jack-o-lantern.jpg'),
  'Jack O Lantern Mushroom': require('@/assets/images/mushrooms/jack-o-lantern.jpg'),
  'Funeral Bell': require('@/assets/images/mushrooms/funeral-bell.jpg'),
  'Funeral Bell Mushroom': require('@/assets/images/mushrooms/funeral-bell.jpg'),
  'Red Cage': require('@/assets/images/mushrooms/red-cage.jpg'),
  'Red Cage Fungus': require('@/assets/images/mushrooms/red-cage.jpg'),
};

// Normalised image lookup — strips common suffixes so DB names match
const getMushroomImage = (name: string): any => {
  if (!name) return null;
  if (MUSHROOM_IMAGES[name]) return MUSHROOM_IMAGES[name];
  // Try stripping " Mushroom" / " Fungus" suffix
  const stripped = name.replace(/\s+(Mushroom|Fungus)$/i, '').trim();
  if (MUSHROOM_IMAGES[stripped]) return MUSHROOM_IMAGES[stripped];
  // Case-insensitive fallback
  const lower = name.toLowerCase();
  const key = Object.keys(MUSHROOM_IMAGES).find(k => k.toLowerCase() === lower);
  return key ? MUSHROOM_IMAGES[key] : null;
};

// Coordinate mapping for Philippine regions/provinces from database location field
const LOCATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // NCR
  'NCR – Manila': { lat: 14.5995, lng: 120.9842 },
  'NCR – Quezon City': { lat: 14.6760, lng: 121.0437 },
  'NCR – Makati': { lat: 14.5547, lng: 121.0244 },
  
  // Luzon Regions
  'CAR – Benguet': { lat: 16.4023, lng: 120.6026 },
  'CAR – Baguio': { lat: 16.4023, lng: 120.5960 },
  'Region 1 – Pangasinan': { lat: 15.8949, lng: 120.2863 },
  'Region 1 – La Union': { lat: 16.6159, lng: 120.3209 },
  'Region 2 – Isabela': { lat: 16.9754, lng: 121.8107 },
  'Region 2 – Cagayan': { lat: 18.2490, lng: 121.8870 },
  'Region 3 – Bulacan': { lat: 14.7942, lng: 120.8799 },
  'Region 3 – Pampanga': { lat: 15.0794, lng: 120.6200 },
  'Region 4A – Cavite': { lat: 14.4791, lng: 120.8970 },
  'Region 4A – Laguna': { lat: 14.2691, lng: 121.4113 },
  'Region 4A – Batangas': { lat: 13.7565, lng: 121.0583 },
  'Region 4A – Rizal': { lat: 14.6037, lng: 121.3084 },
  'Region 4A – Quezon': { lat: 14.0223, lng: 122.1215 },
  'Region 4B – Mindoro': { lat: 13.1000, lng: 121.0000 },
  'Region 5 – Albay': { lat: 13.1391, lng: 123.7377 },
  'Region 5 – Camarines Sur': { lat: 13.5291, lng: 123.3483 },
  
  // Visayas Regions
  'Region 6 – Iloilo': { lat: 10.7202, lng: 122.5621 },
  'Region 6 – Negros Occidental': { lat: 10.6710, lng: 122.9539 },
  'Region 6 – Aklan': { lat: 11.9204, lng: 122.0107 },
  'Region 7 – Cebu': { lat: 10.3157, lng: 123.8854 },
  'Region 7 – Bohol': { lat: 9.8500, lng: 124.1435 },
  'Region 8 – Leyte': { lat: 11.2500, lng: 124.8333 },
  'Region 8 – Samar': { lat: 11.5804, lng: 125.0300 },
  
  // Mindanao Regions
  'Region 9 – Zamboanga': { lat: 6.9214, lng: 122.0790 },
  'Region 10 – Bukidnon': { lat: 8.0542, lng: 124.9292 },
  'Region 10 – Misamis Oriental': { lat: 8.5050, lng: 124.6450 },
  'Region 11 – Davao': { lat: 7.1907, lng: 125.4553 },
  'Region 12 – South Cotabato': { lat: 6.3333, lng: 124.8333 },
  'BARMM – Maguindanao': { lat: 6.9414, lng: 124.4111 },
  'CARAGA – Agusan del Norte': { lat: 8.9472, lng: 125.5281 },
};

interface MushroomLocation {
  id: string;
  name: string;
  localName: string;
  region: string;
  province: string;
  lat: number;
  lng: number;
  edible: boolean;
  notes: string;
  capColor: string;
  scientificName?: string;
  habitat?: string;
}

const isWeb = Platform.OS === 'web';

export default function MapScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobileWeb = isWeb && screenWidth < 768;
  const [mushroomLocations, setMushroomLocations] = useState<MushroomLocation[]>([]);
  const [farmLocations, setFarmLocations] = useState<any[]>([]); // Add farm locations state
  const [showFarms, setShowFarms] = useState(false); // Toggle for farm markers
  const [showMushrooms, setShowMushrooms] = useState(true); // Toggle for mushroom markers
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMushroom, setSelectedMushroom] = useState<MushroomLocation | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'chart'>('map');
  const [modalVisible, setModalVisible] = useState(false);
  const [edibleIndex, setEdibleIndex] = useState(0);
  const [poisonousIndex, setPoisonousIndex] = useState(0);

  // Fetch mushroom species from database
  useEffect(() => {
    fetchMushroomData();
    fetchFarmData();
  }, []);

  const fetchFarmData = async () => {
    try {
      const response = await farmsService.getFarms();
      if (response.success) {
        setFarmLocations(response.farms);
      } else {
        console.error('Failed to fetch farms:', response.error);
        setError('Failed to load farm locations');
      }
    } catch (error) {
      console.error('Error fetching farm data:', error);
      setError('Failed to load farm locations');
    }
  };

  const fetchMushroomData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/species/all`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      const data = await response.json();

      if (data.success && data.species) {
        // Transform database format to component format
        const transformedData: MushroomLocation[] = data.species.map((species: any) => {
          // Parse location string (e.g., "Region 2 – Isabela" or "NCR – Manila")
          // Handle both en dash (–) and regular hyphen (-)
          const locationParts = species.location?.split(/[–-]/) || ['Unknown', 'Unknown'];
          const region = locationParts[0]?.trim() || 'Unknown';
          const province = locationParts[1]?.trim() || 'Unknown';

          // Normalize location key by replacing hyphens with en dashes for lookup
          const locationKey = (species.location || 'NCR – Manila').replace(/-/g, '–');
          const coords = LOCATION_COORDINATES[locationKey] || { lat: 14.5995, lng: 120.9842 }; // Default to Manila

          console.log(`${species.english_name}: location="${species.location}" normalized="${locationKey}" -> lat:${coords.lat}, lng:${coords.lng}`);

          return {
            id: species._id || species.id,
            name: species.english_name || 'Unknown',
            localName: species.local_name || 'Unknown',
            region,
            province,
            lat: coords.lat,
            lng: coords.lng,
            edible: species.edible === true || species.edible === 'true',
            notes: species.notes || species.description || 'No information available',
            capColor: species.cap || 'Unknown',
            scientificName: species.scientific_name,
            habitat: species.habitat,
          };
        });

        setMushroomLocations(transformedData);
      } else {
        throw new Error('Failed to fetch mushroom data');
      }
    } catch (err) {
      console.error('Error fetching mushroom data:', err);
      setError('Unable to load mushroom data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get mushrooms by category
  const edibleMushrooms = mushroomLocations.filter(m => m.edible);
  const poisonousMushrooms = mushroomLocations.filter(m => !m.edible);
  const edibleMushroom = edibleMushrooms[edibleIndex];
  const poisonousMushroom = poisonousMushrooms[poisonousIndex];

  // Navigation functions
  const navigateEdible = (direction: 'prev' | 'next') => {
    if (direction === 'next' && edibleIndex < edibleMushrooms.length - 1) {
      setEdibleIndex(edibleIndex + 1);
    } else if (direction === 'prev' && edibleIndex > 0) {
      setEdibleIndex(edibleIndex - 1);
    }
  };

  const navigatePoisonous = (direction: 'prev' | 'next') => {
    if (direction === 'next' && poisonousIndex < poisonousMushrooms.length - 1) {
      setPoisonousIndex(poisonousIndex + 1);
    } else if (direction === 'prev' && poisonousIndex > 0) {
      setPoisonousIndex(poisonousIndex - 1);
    }
  };

  const openModal = (mushroom: MushroomLocation) => {
    setSelectedMushroom(mushroom);
    setModalVisible(true);
  };

  // Prepare statistics data
  const edibleCount = mushroomLocations.filter(m => m.edible).length;
  const poisonousCount = mushroomLocations.filter(m => !m.edible).length;

  // Data by region for bar chart
  const regionCounts = mushroomLocations.reduce((acc, mushroom) => {
    const region = mushroom.region;
    if (!acc[region]) acc[region] = { edible: 0, poisonous: 0 };
    if (mushroom.edible) acc[region].edible++;
    else acc[region].poisonous++;
    return acc;
  }, {} as Record<string, { edible: number; poisonous: number }>);

  // Show loading state
  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#7BA05B" />
        <ThemedText style={styles.loadingText}>Loading mushroom data...</ThemedText>
      </ThemedView>
    );
  }

  // Show error state
  if (error) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle" size={48} color="#D32F2F" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMushroomData}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Filter out invalid mushroom locations (missing or non-numeric lat/lng)
  const validMushroomLocations = mushroomLocations.filter(
    m => typeof m.lat === 'number' && !isNaN(m.lat) && typeof m.lng === 'number' && !isNaN(m.lng)
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <HamburgerMenu />
          <NotificationDropdown iconColor="#7BA05B" />
        </View>
        <ThemedText style={styles.headerTitle}>Mushroom Map</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {/* View Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
          onPress={() => setViewMode('map')}
        >
          <Ionicons name="map" size={18} color={viewMode === 'map' ? '#FFF' : '#999'} />
          <ThemedText style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'chart' && styles.toggleBtnActive]}
          onPress={() => setViewMode('chart')}
        >
          <Ionicons name="bar-chart" size={18} color={viewMode === 'chart' ? '#FFF' : '#999'} />
          <ThemedText style={[styles.toggleText, viewMode === 'chart' && styles.toggleTextActive]}>Stats</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {viewMode === 'map' ? (
          // MAP VIEW
          <>
            <View style={styles.mapSection}>
              <ThemedText style={styles.sectionTitle}>Philippine Mushroom Locations</ThemedText>
              
              {/* Google Maps - Auto selects web/native version */}


              {/* Toggle Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8, gap: 8 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: showMushrooms ? '#7BA05B' : '#E0E0E0',
                    paddingVertical: 6,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                  }}
                  onPress={() => setShowMushrooms(!showMushrooms)}
                >
                  <Text style={{ color: showMushrooms ? '#FFF' : '#333', fontWeight: 'bold' }}>
                    {showMushrooms ? 'Hide Mushrooms' : 'Show Mushrooms'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: showFarms ? '#7BA05B' : '#E0E0E0',
                    paddingVertical: 6,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                  }}
                  onPress={() => setShowFarms(!showFarms)}
                >
                  <Text style={{ color: showFarms ? '#FFF' : '#333', fontWeight: 'bold' }}>
                    {showFarms ? 'Hide Farms' : 'Show Farms'}
                  </Text>
                </TouchableOpacity>
              </View>

              <GoogleMap 
                mushrooms={showMushrooms ? validMushroomLocations : []}
                farmLocations={showFarms ? farmLocations : []}
                selectedMushroom={selectedMushroom}
                onSelectMushroom={setSelectedMushroom}
              />

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#7BA05B' }]} />
                  <ThemedText style={styles.legendText}>Edible ({edibleCount})</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#D32F2F' }]} />
                  <ThemedText style={styles.legendText}>Poisonous ({poisonousCount})</ThemedText>
                </View>
              </View>
            </View>

            {/* Mushroom Examples */}
            <View style={styles.examplesSection}>
              <ThemedText style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>Philippine Mushroom Species ({mushroomLocations.length})</ThemedText>
              <ThemedText style={styles.sectionSubtitle}>
                Examples of edible and poisonous mushrooms found across the Philippines
              </ThemedText>

              <View style={[styles.examplesGrid, isWeb && !isMobileWeb && { flexDirection: 'row' }]}>
                {/* Edible Example */}
                {edibleMushroom && (
                  <View style={styles.exampleCard}>
                    <View style={styles.exampleHeader}>
                      <View style={[styles.exampleBadge, { backgroundColor: '#E8F5E9' }]}>  
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <ThemedText style={[styles.exampleBadgeText, { color: '#2E7D32' }]}>
                          Edible ({edibleMushrooms.length})
                        </ThemedText>
                      </View>
                      <View style={styles.arrowControls}>
                        <TouchableOpacity 
                          style={[styles.arrowBtn, edibleIndex === 0 && styles.arrowBtnDisabled]} 
                          onPress={() => navigateEdible('prev')}
                          disabled={edibleIndex === 0}
                        >
                          <Ionicons name="chevron-back" size={20} color={edibleIndex === 0 ? '#CCC' : '#7BA05B'} />
                        </TouchableOpacity>
                        <ThemedText style={styles.counterText}>{edibleIndex + 1}/{edibleMushrooms.length}</ThemedText>
                        <TouchableOpacity 
                          style={[styles.arrowBtn, edibleIndex === edibleMushrooms.length - 1 && styles.arrowBtnDisabled]} 
                          onPress={() => navigateEdible('next')}
                          disabled={edibleIndex === edibleMushrooms.length - 1}
                        >
                          <Ionicons name="chevron-forward" size={20} color={edibleIndex === edibleMushrooms.length - 1 ? '#CCC' : '#7BA05B'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.mushroomCard}
                      onPress={() => openModal(edibleMushroom)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.mushroomImageWrap}>
                        <Image
                          source={getMushroomImage(edibleMushroom.name) || require('@/assets/images/react-logo.png')}
                          style={styles.mushroomImage}
                          resizeMode="cover"
                        />
                        <View style={[styles.edibilityBadge, { backgroundColor: '#4CAF50' }]}>
                          <Ionicons name="checkmark-circle" size={12} color="#FFF" />
                          <Text style={styles.badgeText}>Edible</Text>
                        </View>
                      </View>
                      <View style={styles.mushroomCardBody}>
                        <ThemedText style={styles.cardTitle} numberOfLines={1}>{edibleMushroom.name}</ThemedText>
                        <ThemedText style={styles.cardLocalName} numberOfLines={1}>({edibleMushroom.localName})</ThemedText>
                        {edibleMushroom.scientificName && (
                          <ThemedText style={styles.cardScientific} numberOfLines={1}>
                            <Text style={{ fontStyle: 'italic' }}>{edibleMushroom.scientificName}</Text>
                          </ThemedText>
                        )}
                        <View style={styles.cardInfoRow}>
                          <Ionicons name="location" size={12} color="#7BA05B" />
                          <ThemedText style={styles.cardInfoText} numberOfLines={1}>{edibleMushroom.province}</ThemedText>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Poisonous Example */}
                {poisonousMushroom && (
                  <View style={styles.exampleCard}>
                    <View style={styles.exampleHeader}>
                      <View style={[styles.exampleBadge, { backgroundColor: '#FFEBEE' }]}>
                        <Ionicons name="alert-circle" size={16} color="#D32F2F" />
                        <ThemedText style={[styles.exampleBadgeText, { color: '#C62828' }]}>
                          Poisonous ({poisonousMushrooms.length})
                        </ThemedText>
                      </View>
                      <View style={styles.arrowControls}>
                        <TouchableOpacity 
                          style={[styles.arrowBtn, poisonousIndex === 0 && styles.arrowBtnDisabled]} 
                          onPress={() => navigatePoisonous('prev')}
                          disabled={poisonousIndex === 0}
                        >
                          <Ionicons name="chevron-back" size={20} color={poisonousIndex === 0 ? '#CCC' : '#D32F2F'} />
                        </TouchableOpacity>
                        <ThemedText style={styles.counterText}>{poisonousIndex + 1}/{poisonousMushrooms.length}</ThemedText>
                        <TouchableOpacity 
                          style={[styles.arrowBtn, poisonousIndex === poisonousMushrooms.length - 1 && styles.arrowBtnDisabled]} 
                          onPress={() => navigatePoisonous('next')}
                          disabled={poisonousIndex === poisonousMushrooms.length - 1}
                        >
                          <Ionicons name="chevron-forward" size={20} color={poisonousIndex === poisonousMushrooms.length - 1 ? '#CCC' : '#D32F2F'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.mushroomCard}
                      onPress={() => openModal(poisonousMushroom)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.mushroomImageWrap}>
                        <Image
                          source={getMushroomImage(poisonousMushroom.name) || require('@/assets/images/react-logo.png')}
                          style={styles.mushroomImage}
                          resizeMode="cover"
                        />
                        <View style={[styles.edibilityBadge, { backgroundColor: '#D32F2F' }]}>
                          <Ionicons name="alert-circle" size={12} color="#FFF" />
                          <Text style={styles.badgeText}>Toxic</Text>
                        </View>
                      </View>
                      <View style={styles.mushroomCardBody}>
                        <ThemedText style={styles.cardTitle} numberOfLines={1}>{poisonousMushroom.name}</ThemedText>
                        <ThemedText style={styles.cardLocalName} numberOfLines={1}>({poisonousMushroom.localName})</ThemedText>
                        {poisonousMushroom.scientificName && (
                          <ThemedText style={styles.cardScientific} numberOfLines={1}>
                            <Text style={{ fontStyle: 'italic' }}>{poisonousMushroom.scientificName}</Text>
                          </ThemedText>
                        )}
                        <View style={styles.cardInfoRow}>
                          <Ionicons name="location" size={12} color="#D32F2F" />
                          <ThemedText style={styles.cardInfoText} numberOfLines={1}>{poisonousMushroom.province}</ThemedText>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </>
        ) : (
          // STATS VIEW
          <View style={styles.statsSection}>
            <ThemedText style={styles.sectionTitle}>Mushroom Statistics</ThemedText>

            {/* Summary Cards */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: '#7BA05B' }]}>
                <Ionicons name="checkmark-circle" size={32} color="#7BA05B" />
                <ThemedText style={styles.statNumber}>{edibleCount}</ThemedText>
                <ThemedText style={styles.statLabel}>Edible Species</ThemedText>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#D32F2F' }]}>
                <Ionicons name="alert-circle" size={32} color="#D32F2F" />
                <ThemedText style={styles.statNumber}>{poisonousCount}</ThemedText>
                <ThemedText style={styles.statLabel}>Poisonous Species</ThemedText>
              </View>
            </View>

            {/* Distribution by Region */}
            <ThemedText style={[styles.sectionTitle, { marginTop: 24 }]}>Distribution by Region</ThemedText>
            {Object.entries(regionCounts).map(([region, counts]) => (
              <View key={region} style={styles.regionCard}>
                <ThemedText style={styles.regionName}>{region}</ThemedText>
                <View style={styles.regionBars}>
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { width: `${(counts.edible / 10) * 100}%`, backgroundColor: '#7BA05B' }]} />
                    <ThemedText style={styles.barLabel}>✅ {counts.edible}</ThemedText>
                  </View>
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { width: `${(counts.poisonous / 10) * 100}%`, backgroundColor: '#D32F2F' }]} />
                    <ThemedText style={styles.barLabel}>⚠️ {counts.poisonous}</ThemedText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal for Mushroom Details */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedMushroom && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.modalTitle}>{selectedMushroom.name}</ThemedText>
                      <ThemedText style={styles.modalSubtitle}>({selectedMushroom.localName})</ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                      <Ionicons name="close" size={28} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalImageWrap}>
                    <Image
                      source={getMushroomImage(selectedMushroom.name) || require('@/assets/images/react-logo.png')}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                    <View style={[styles.modalBadge, { backgroundColor: selectedMushroom.edible ? '#4CAF50' : '#D32F2F' }]}>
                      <Ionicons name={selectedMushroom.edible ? 'checkmark-circle' : 'alert-circle'} size={16} color="#FFF" />
                      <Text style={styles.modalBadgeText}>{selectedMushroom.edible ? 'Edible' : 'Toxic'}</Text>
                    </View>
                  </View>

                  <View style={styles.modalBody}>
                    <View style={styles.detailRow}>
                      <Ionicons name="map" size={20} color="#6B7C61" />
                      <View style={styles.detailContent}>
                        <ThemedText style={styles.detailLabel}>Location</ThemedText>
                        <ThemedText style={styles.detailValue}>
                          {selectedMushroom.province}, {selectedMushroom.region}
                        </ThemedText>
                      </View>
                    </View>

                    {selectedMushroom.scientificName && (
                      <View style={styles.detailRow}>
                        <Ionicons name="flask" size={20} color="#6B7C61" />
                        <View style={styles.detailContent}>
                          <ThemedText style={styles.detailLabel}>Scientific Name</ThemedText>
                          <ThemedText style={[styles.detailValue, { fontStyle: 'italic' }]}>{selectedMushroom.scientificName}</ThemedText>
                        </View>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <Ionicons name="color-palette" size={20} color="#6B7C61" />
                      <View style={styles.detailContent}>
                        <ThemedText style={styles.detailLabel}>Cap Description</ThemedText>
                        <ThemedText style={styles.detailValue}>{selectedMushroom.capColor}</ThemedText>
                      </View>
                    </View>

                    {selectedMushroom.habitat && (
                      <View style={styles.detailRow}>
                        <Ionicons name="leaf" size={20} color="#6B7C61" />
                        <View style={styles.detailContent}>
                          <ThemedText style={styles.detailLabel}>Habitat</ThemedText>
                          <ThemedText style={styles.detailValue}>{selectedMushroom.habitat}</ThemedText>
                        </View>
                      </View>
                    )}

                    <View style={styles.notesSection}>
                      <ThemedText style={styles.notesTitle}>📝 Notes</ThemedText>
                      <ThemedText style={styles.notesText}>{selectedMushroom.notes}</ThemedText>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFCFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3E2D',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
    backgroundColor: '#F5F3EF',
    borderRadius: 8,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#7BA05B',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  mapSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3E2D',
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F5F3EF',
    borderRadius: 8,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  detailsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F3EF',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3E2D',
  },
  detailCard: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3E2D',
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E4DE',
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F3EF',
    borderRadius: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3E2D',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  regionCard: {
    padding: 12,
    backgroundColor: '#F5F3EF',
    borderRadius: 8,
    marginBottom: 8,
  },
  regionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3E2D',
    marginBottom: 8,
  },
  regionBars: {
    gap: 8,
  },
  barContainer: {
    gap: 4,
  },
  bar: {
    height: 20,
    borderRadius: 4,
    minWidth: 20,
  },
  barLabel: {
    fontSize: 11,
    color: '#666',
  },
  gallerySection: {
    paddingVertical: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  // ── Examples Section ──────────────────────────────────────────
  examplesSection: {
    paddingVertical: 16,
  },
  examplesGrid: {
    flexDirection: 'column',
    gap: 16,
    paddingHorizontal: 20,
  },
  exampleCard: {
    flex: 1,
  },
  exampleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    marginBottom: 12,
  },
  exampleBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  mushroomCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mushroomCardSelected: {
    borderColor: '#7BA05B',
    shadowOpacity: 0.18,
    transform: [{ scale: 1.02 }],
  },
  mushroomImageWrap: {
    width: '100%',
    height: 180,
    backgroundColor: '#F5F3EF',
    position: 'relative',
  },
  mushroomImage: {
    width: '100%',
    height: '100%',
  },
  mushroomCardBody: {
    padding: 16,
  },
  edibilityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3E2D',
    marginBottom: 2,
  },
  cardLocalName: {
    fontSize: 11,
    color: '#7BA05B',
    fontWeight: '500',
    marginBottom: 6,
  },
  cardScientific: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  cardInfoText: {
    fontSize: 10,
    color: '#666',
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#7BA05B',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Arrow controls and navigation
  exampleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  arrowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.4,
  },
  counterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%' as any,
    maxWidth: 600,
    maxHeight: '80%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4DE',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3E2D',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7BA05B',
    fontWeight: '500',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  modalImageWrap: {
    width: '100%',
    height: 250,
    backgroundColor: '#F5F3EF',
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
});