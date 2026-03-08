import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { analyzeMushroom, searchSpecies } from '@/utils/api';
import { generateMushroomLocationMap } from '@/utils/map-generator';
import { getMushroomLocations } from '@/utils/mushroom-locations';
import { AuthContext } from '@/contexts/AuthContext';

// Conditionally import WebView only for native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('WebView not available');
  }
}

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface PredictionResult {
  timestamp: string;
  image_analysis: {
    species: any;
    toxicity: any;
    habitat: any;
  };
  risk_assessment: any;
  recommendations: string[];
  safety_actions: string[];
}

interface MushroomData {
  mushroom_id: string;
  english_name: string;
  local_name: string;
  scientific_name: string;
  edible: string;
  poisonous: string;
  location_region: string;
  habitat: string;
  season_month: string;
  cultivated_wild: string;
  description: string;
  notes: string;
}

interface BackendClassification {
  label?: string;
  confidence?: number;
  toxicity_level?: string;
}

interface BackendDetection {
  found?: boolean;
  confidence?: number;
  prediction?: string;
}

interface BackendResult {
  detection?: BackendDetection;
  classification?: BackendClassification;
  success?: boolean;
  message?: string;
  cloudinary_url?: string;  // Add this
  email_sent?: boolean;
  email_error?: string;
  [key: string]: any;
}

interface DetectionStatus extends BackendDetection {
  message?: string;
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '—'}</Text>
  </View>
);

const Divider = () => <View style={styles.divider} />;

export default function PredictionScreen() {
  const { imageUri, imageBase64, cloudinaryUrl } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useContext(AuthContext) as {
    user: { id: string; email: string; name?: string; username?: string } | null;
  } || {};
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mushroomData, setMushroomData] = useState<MushroomData | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapHtml, setMapHtml] = useState<string>('');
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus | null>(null);
  const [cloudinaryImageUrl, setCloudinaryImageUrl] = useState<string | null>(null);
  const [backendResponse, setBackendResponse] = useState<BackendResult | null>(null);
  
  // Ensure URLs are strings (useLocalSearchParams can return string or string[])
  const normalizeUrl = (url: string | string[] | undefined): string | undefined => {
    if (Array.isArray(url)) return url[0];
    return url;
  };

  const normalizedImageUri = normalizeUrl(imageUri as any);
  const normalizedImageBase64 = normalizeUrl(imageBase64 as any);
  const normalizedCloudinaryUrl = normalizeUrl(cloudinaryUrl as any);

  // Use cloudinaryUrl from backend response (if available), otherwise fall back to param or imageUri
  const displayImageUrl = cloudinaryImageUrl || normalizedCloudinaryUrl || normalizedImageUri;

  // Debug image URLs
  useEffect(() => {
    console.log('🔍 Image URL Debug:');
    console.log('  - cloudinaryImageUrl (from backend):', cloudinaryImageUrl);
    console.log('  - normalizedCloudinaryUrl (from params):', normalizedCloudinaryUrl);
    console.log('  - normalizedImageUri:', normalizedImageUri);
    console.log('  - final displayImageUrl:', displayImageUrl);
  }, [cloudinaryImageUrl, normalizedCloudinaryUrl, normalizedImageUri, displayImageUrl]);

  // Analyze image once loaded
  useEffect(() => {
    if (normalizedImageBase64) {
      analyzeImage();
    }
  }, [normalizedImageBase64]);

  // Fetch mushroom data from database when result is available
  useEffect(() => {
    if (result?.image_analysis?.species) {
      fetchMushroomFromDatabase(result.image_analysis.species.english_name || result.image_analysis.species.species);
    }
  }, [result]);

  // Generate map when mushroom data is available
  useEffect(() => {
    if (mushroomData) {
      generateMap();
    }
  }, [mushroomData]);

  const fetchMushroomFromDatabase = async (detectedSpeciesName: string) => {
    try {
      console.log('🔍 Fetching mushroom data from database:', detectedSpeciesName);

      // Normalize species name for DB search
      let searchQuery = detectedSpeciesName
        .replace(/\s*Mushroom\s*/gi, '')    // remove "Mushroom"
        .replace(/\bJack O Lantern\b/i, "Jack O' Lantern")  // fix apostrophe
        .trim();

      let results = await searchSpecies(searchQuery);

      if ((!results || results.length === 0) && searchQuery !== detectedSpeciesName) {
        console.log('🔍 Retry original name as fallback:', detectedSpeciesName);
        results = await searchSpecies(detectedSpeciesName);
      }

      console.log('📊 Search results:', results?.length || 0, 'matches found');

      if (results && results.length > 0) {
        const species = results[0];
        const transformedData: MushroomData = {
          mushroom_id: species._id || '',
          english_name: species.english_name || '',
          local_name: species.local_name || '',
          scientific_name: species.scientific_name || '',
          edible: species.edible ? 'TRUE' : 'FALSE',
          poisonous: !species.edible ? 'TRUE' : 'FALSE',
          location_region: species.location || '',
          habitat: species.habitat || '',
          season_month: species.season || '',
          cultivated_wild: species.cultivated_wild || '',
          description: species.description || '',
          notes: species.notes || '',
        };

        setMushroomData(transformedData);
        console.log('✅ Fetched mushroom from database:', transformedData.english_name);
      } else {
        console.log('⚠️ No database match found for:', detectedSpeciesName);
        setMushroomData(null);
      }
    } catch (error) {
      console.error('❌ Error fetching mushroom data:', error);
      setMushroomData(null);
    }
  };

  const generateMap = () => {
    if (!mushroomData) return;

    // Get the mushroom species name
    const mushroomName = mushroomData.english_name || mushroomData.scientific_name || 'Unknown Mushroom';

    // Get global locations for this mushroom species
    const locations = getMushroomLocations(mushroomName);

    // Generate appropriate map based on platform
    const html = generateMushroomLocationMap(
      mushroomName,
      locations,
      Platform.OS === 'web'
    );

    setMapHtml(html);
  };

  const analyzeImage = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setDetectionStatus(null);

      // Clean base64 string (remove data URI prefix if present)
      let cleanBase64 = normalizedImageBase64 || '';
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }

      console.log('Sending image for analysis...');
      console.log('Image size:', cleanBase64.length, 'characters');
      console.log('📧 User Email:', user?.email);
      console.log('👤 User Name:', user?.name || user?.username);

      // Send image to backend for analysis
      const backendResult: BackendResult = await analyzeMushroom({
        image_base64: cleanBase64,
        // Pass user_id explicitly so the backend can
        // associate this scan with the authenticated user.
        user_id: user?.id,
        user_email: user?.email,
        user_name: user?.name || user?.username,
        location: {
          region: "Region 4A",
          province: "Laguna"
        },
        date: new Date().toISOString().split('T')[0],
        user_context: {
          experience_level: "intermediate",
          purpose: "identification"
        }
      });

      console.log('Analysis result received:', backendResult);
      
      // Store the full backend response
      setBackendResponse(backendResult);

      // Extract and save Cloudinary URL from backend response
      if (backendResult?.cloudinary_url) {
        console.log('☁️ Cloudinary URL received from backend:', backendResult.cloudinary_url);
        setCloudinaryImageUrl(backendResult.cloudinary_url);
      } else {
        console.log('⚠️ No Cloudinary URL in backend response');
      }

      // Log email status
      if (backendResult?.email_sent !== undefined) {
        console.log('📧 Email Status:', backendResult.email_sent ? '✅ SENT' : '❌ NOT SENT');
        if (backendResult?.email_error) {
          console.log('📧 Email Error:', backendResult.email_error);
        }
      } else {
        console.log('📧 Email info not in response - user email may not have been provided');
      }

      // Check if mushroom was detected
      const detection = backendResult?.detection;
      const mushroomDetected = detection?.found !== false;
      const detectionMessage = backendResult?.message;

      if (!mushroomDetected) {
        setDetectionStatus({
          found: false,
          confidence: detection?.confidence,
          prediction: detection?.prediction,
          message: detectionMessage || 'No mushroom detected in the image. Please try again with a clearer photo of the mushroom.'
        });
        setResult(null);
        setMushroomData(null);
        return;
      }

      setDetectionStatus({
        found: true,
        confidence: detection?.confidence,
        prediction: detection?.prediction,
        message: detectionMessage || 'Mushroom detected in the image.'
      });

      const classification = backendResult?.classification;
      const label = classification?.label || 'Unknown';
      const confidence = classification?.confidence || 0;
      const toxicityLevel = classification?.toxicity_level;

      const transformedResult: PredictionResult = {
        timestamp: new Date().toISOString(),
        image_analysis: {
          species: {
            english_name: label,
            species: label,
            scientific_name: '',
            confidence: confidence,
            metadata: {
              edible: label ? !['Death Cap', 'False Morel', 'Jack O Lantern Mushroom', 'Funeral Bell Mushroom', 'Red Cage Fungus'].includes(label) : null,
              habitat: '',
              season_month: ''
            }
          },
          toxicity: {
            edible: label ? !['Death Cap', 'False Morel', 'Jack O Lantern Mushroom', 'Funeral Bell Mushroom', 'Red Cage Fungus'].includes(label) : null,
            toxicity_status: toxicityLevel === 'DANGEROUS' ? 'POISONOUS' : 'EDIBLE',
            confidence: confidence,
            warning: toxicityLevel === 'DANGEROUS' ? '⚠️ DANGEROUS - Do not consume!' : null
          },
          habitat: {}
        },
        risk_assessment: {
          risk_level: toxicityLevel?.toLowerCase() === 'dangerous' ? 'extreme' : 'low',
          overall_risk_score: toxicityLevel?.toLowerCase() === 'dangerous' ? 95 : 10,
          risk_factors: toxicityLevel?.toLowerCase() === 'dangerous' ? ['Highly toxic species', 'Can be fatal if consumed', 'Similar appearance to edible species'] : []
        },
        recommendations: toxicityLevel?.toLowerCase() === 'dangerous' 
          ? ['Do NOT consume this mushroom', 'Seek expert identification if uncertain', 'Contact poison control if ingested']
          : ['Verify identification with local expert', 'Consider habitat and season', 'Ensure proper cooking if edible'],
        safety_actions: toxicityLevel?.toLowerCase() === 'dangerous'
          ? ['⚠️ AVOID - Extremely toxic species', 'Call poison control immediately if ingested: +63-1-522-4444']
          : ['Safe if properly identified and cooked']
      };

      setResult(transformedResult);
    
    } catch (err: any) {
      console.error('Analysis error:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      
      let errorMessage = 'Analysis failed. ';
      if (err.message) {
        errorMessage += err.message;
      } else if (err.toString) {
        errorMessage += err.toString();
      } else {
        errorMessage += 'Please check your connection and ensure the backend server is running.';
      }
      
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'extreme': return '#D32F2F';
      case 'high': return '#F57C00';
      case 'medium': return '#FBC02D';
      case 'low': return '#388E3C';
      case 'very_low': return '#2E7D32';
      default: return '#666';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'extreme': return 'warning';
      case 'high': return 'alert-circle';
      case 'medium': return 'information-circle';
      case 'low': return 'checkmark-circle';
      case 'very_low': return 'shield-checkmark';
      default: return 'help-circle';
    }
  };

  const SafeComponent = ({ component }: { component: React.ReactNode }) => {
    if (!component) return null;
    return component;
  };

  const renderDetectionSummary = () => {
    if (!detectionStatus || !detectionStatus.found) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="search" size={24} color="#2E7D32" />
          <Text style={styles.sectionTitle}>Detection Result</Text>
        </View>

        <View style={styles.detectionCard}>
          <Text style={styles.detectionStatusText}>
            {detectionStatus.message || 'Mushroom detected'}
          </Text>
          {typeof detectionStatus.confidence === 'number' && (
            <Text style={styles.detectionConfidence}>
              Confidence: {Math.round(detectionStatus.confidence * 100)}%
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderRiskAssessment = () => {
    if (!result?.risk_assessment) return null;

    const risk = result.risk_assessment;
    const riskLevel = risk.risk_level;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name={getRiskIcon(riskLevel)} size={24} color={getRiskColor(riskLevel)} />
          <Text style={[styles.sectionTitle, { color: getRiskColor(riskLevel) }]}>
            Risk Assessment: {riskLevel.toUpperCase()}
          </Text>
        </View>

        <View style={[styles.riskCard, { borderColor: getRiskColor(riskLevel) }]}>
          <Text style={styles.riskScore}>
            Risk Score: {risk.overall_risk_score}/100
          </Text>

          {risk.risk_factors && risk.risk_factors.length > 0 && (
            <View style={styles.factorsList}>
              <Text style={styles.factorsTitle}>Risk Factors:</Text>
              {risk.risk_factors
                .filter((factor: string) => factor && typeof factor === 'string' && factor.trim().length > 0)
                .map((factor: string, index: number) => (
                  <Text key={index} style={styles.factorText}>• {factor.trim()}</Text>
                ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSpeciesInfo = () => {
    if (!result?.image_analysis?.species) return null;

    const species = result.image_analysis.species;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="leaf" size={24} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Species Identification</Text>
        </View>

        <View style={styles.speciesCard}>
          {/* Detection Status Badge */}
          <View style={styles.detectionBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.detectionText}>Mushroom Detected</Text>
          </View>

          <Text style={styles.speciesName}>
            {species.english_name || species.species}
          </Text>
          {species.scientific_name && (
            <Text style={styles.scientificName}>{species.scientific_name}</Text>
          )}
          {species.local_name && (
            <Text style={styles.localName}>{species.local_name}</Text>
          )}

          <View style={styles.confidenceBar}>
            <Text style={styles.confidenceText}>
              Confidence: {Math.round((species.confidence || 0) * 100)}%
            </Text>
            <View style={styles.confidenceFill}>
              <View
                style={[
                  styles.confidenceProgress,
                  { width: `${(species.confidence || 0) * 100}%` }
                ]}
              />
            </View>
          </View>

          {species.metadata && (
            <View style={styles.metadataContainer}>
              {species.metadata.edible !== undefined && (
                <View style={styles.metadataItem}>
                  <Ionicons
                    name={species.metadata.edible ? "checkmark-circle" : "close-circle"}
                    size={16}
                    color={species.metadata.edible ? "#4CAF50" : "#F44336"}
                  />
                  <Text style={styles.metadataText}>
                    {species.metadata.edible ? "Edible" : "Not Edible"}
                  </Text>
                </View>
              )}

              {species.metadata.habitat && (
                <View style={styles.metadataItem}>
                  <Ionicons name="home" size={16} color="#666" />
                  <Text style={styles.metadataText}>{species.metadata.habitat}</Text>
                </View>
              )}

              {species.metadata.season_month && (
                <View style={styles.metadataItem}>
                  <Ionicons name="calendar" size={16} color="#666" />
                  <Text style={styles.metadataText}>{species.metadata.season_month}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderToxicityInfo = () => {
    if (!result?.image_analysis?.toxicity) return null;

    const toxicity = result.image_analysis.toxicity;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons
            name={toxicity.edible ? "shield-checkmark" : "warning"}
            size={24}
            color={toxicity.edible ? "#4CAF50" : "#F44336"}
          />
          <Text style={styles.sectionTitle}>Toxicity Analysis</Text>
        </View>

        <View style={[styles.toxicityCard, {
          backgroundColor: toxicity.edible ? '#E8F5E8' : '#FFEBEE',
          borderColor: toxicity.edible ? '#4CAF50' : '#F44336'
        }]}>
          <Text style={[styles.toxicityStatus, {
            color: toxicity.edible ? '#2E7D32' : '#C62828'
          }]}>
            {toxicity.toxicity_status.toUpperCase()}
          </Text>

          <Text style={styles.confidenceText}>
            Confidence: {Math.round((toxicity.confidence || 0) * 100)}%
          </Text>

          {toxicity.warning && (
            <Text style={styles.warningText}>{toxicity.warning}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderDatabaseSection = () => {
    if (!mushroomData) return null;

    const isEdible = mushroomData.edible === 'TRUE';

    const ecologyRows = [
      { label: 'Habitat',     value: mushroomData.habitat,         icon: 'trail-sign-outline'  as const },
      { label: 'Region',      value: mushroomData.location_region, icon: 'location-outline'    as const },
      { label: 'Season',      value: mushroomData.season_month,    icon: 'sunny-outline'       as const },
      { label: 'Cultivation', value: mushroomData.cultivated_wild, icon: 'leaf-outline'        as const },
    ].filter(r => r.value);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="leaf" size={22} color="#2E7D32" />
          <Text style={styles.sectionTitle}>Mushroom Information</Text>
        </View>

        <View style={styles.dbCard}>

          {/* ── Identity ─────────────────────────────── */}
          <View style={styles.dbIdentityBlock}>
            <Text style={styles.dbCommonName}>{mushroomData.english_name || '—'}</Text>
            {mushroomData.local_name ? (
              <Text style={styles.dbLocalName}>{mushroomData.local_name}</Text>
            ) : null}
            {mushroomData.scientific_name ? (
              <Text style={styles.dbScientificName}>{mushroomData.scientific_name}</Text>
            ) : null}
          </View>

          {/* ── Edibility badge ──────────────────────── */}
          <View style={[styles.dbEdibilityBanner, isEdible ? styles.dbEdibleBanner : styles.dbPoisonBanner]}>
            <Ionicons
              name={isEdible ? 'checkmark-circle' : 'warning'}
              size={18}
              color={isEdible ? '#1B5E20' : '#7F0000'}
            />
            <Text style={[styles.dbEdibilityText, { color: isEdible ? '#1B5E20' : '#7F0000' }]}>
              {isEdible ? 'Edible — Safe for consumption' : 'Poisonous — Do not consume'}
            </Text>
          </View>

          {/* ── Ecology rows ─────────────────────────── */}
          {ecologyRows.length > 0 ? (
            <View style={styles.dbGroup}>
              <Text style={styles.dbGroupTitle}>ECOLOGY</Text>
              {ecologyRows.map((item, i) => (
                <View key={i} style={[styles.dbRow, i % 2 === 0 && styles.dbRowAlt]}>
                  <View style={styles.dbLabelRow}>
                    <Ionicons name={item.icon} size={13} color="#78909C" style={{ marginRight: 5 }} />
                    <Text style={styles.dbLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.dbValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* ── Description ──────────────────────────── */}
          {mushroomData.description ? (
            <View style={styles.dbDescriptionBlock}>
              <View style={styles.dbGroupTitleRow}>
                <Ionicons name="document-text-outline" size={13} color="#78909C" />
                <Text style={[styles.dbGroupTitle, { marginLeft: 5 }]}>DESCRIPTION</Text>
              </View>
              <Text style={styles.dbDescriptionText}>{mushroomData.description}</Text>
            </View>
          ) : null}

          {/* ── Notes ────────────────────────────────── */}
          {mushroomData.notes ? (
            <View style={styles.dbNotesBlock}>
              <View style={styles.dbGroupTitleRow}>
                <Ionicons name="pencil-outline" size={13} color="#78909C" />
                <Text style={[styles.dbGroupTitle, { marginLeft: 5 }]}>NOTES</Text>
              </View>
              <Text style={styles.dbNotesText}>{mushroomData.notes}</Text>
            </View>
          ) : null}

        </View>
      </View>
    );
  };

  const renderMapSection = () => {
    if (!mapHtml) return null;

    if (isWeb) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="map" size={22} color="#1976D2" />
            <Text style={styles.sectionTitle}>Where to Find This Mushroom</Text>
          </View>
          <View style={{ borderRadius: 12, overflow: 'hidden', height: 520 }}>
            {/* @ts-ignore */}
            <iframe
              srcDoc={mapHtml}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Mushroom Location Map"
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="map" size={22} color="#1976D2" />
          <Text style={styles.sectionTitle}>Where to Find This Mushroom</Text>
        </View>
        <TouchableOpacity style={styles.mapButton} onPress={() => setShowMap(true)}>
          <Ionicons name="map" size={20} color="white" />
          <Text style={styles.mapButtonText}>View Location Map</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRecommendations = () => {
    if (!result?.recommendations?.length) return null;

    const validRecommendations = result.recommendations.filter(
      (rec: string) => rec && typeof rec === 'string' && rec.trim().length > 0
    );

    if (!validRecommendations.length) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb" size={24} color="#FF9800" />
          <Text style={styles.sectionTitle}>Recommendations</Text>
        </View>

        <View style={styles.recommendationsList}>
          {validRecommendations.map((rec: string, index: number) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.recommendationText}>{rec.trim()}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderSafetyActions = () => {
    if (!result?.safety_actions?.length) return null;

    const validActions = result.safety_actions.filter(
      (action: string) => action && typeof action === 'string' && action.trim().length > 0
    );

    if (!validActions.length) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="medical" size={24} color="#F44336" />
          <Text style={styles.sectionTitle}>Safety Actions</Text>
        </View>

        <View style={styles.safetyList}>
          {validActions.map((action: string, index: number) => (
            <View key={index} style={styles.safetyItem}>
              <Ionicons name="shield-checkmark" size={16} color="#F44336" />
              <Text style={styles.safetyText}>{action.trim()}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };


  
  if (isAnalyzing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Analyzing mushroom...</Text>
        <Text style={styles.loadingSubtext}>
          This may take a few moments
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={80} color="#F44336" />
        <Text style={styles.errorTitle}>Analysis Failed</Text>
        <Text style={styles.errorText}>{error}</Text>

        <View style={styles.errorActions}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={analyzeImage}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (detectionStatus && detectionStatus.found === false) {
    return (
      <ScrollView
        contentContainerStyle={styles.noDetectionContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Image with "No Mushroom Detected" overlay ── */}
        {displayImageUrl ? (
          <View style={styles.noDetectionImageWrapper}>
            <Image
              source={{ uri: displayImageUrl }}
              style={styles.noDetectionImage}
              resizeMode="cover"
            />
            {/* Red banner across the bottom of the image */}
            <View style={styles.noDetectionImageOverlay}>
              <Ionicons name="close-circle" size={20} color="white" />
              <Text style={styles.noDetectionImageOverlayText}>No Mushroom Detected</Text>
            </View>
          </View>
        ) : (
          <Ionicons name="search-circle" size={80} color="#FF9800" style={{ marginBottom: 8 }} />
        )}

        <Text style={styles.noDetectionTitle}>No Mushroom Detected</Text>
        <Text style={styles.noDetectionText}>
          {detectionStatus.message || 'Please capture a closer, clearer image of the mushroom.'}
        </Text>
        {typeof detectionStatus.confidence === 'number' && (
          <Text style={styles.noDetectionConfidence}>
            Detector confidence: {Math.round(detectionStatus.confidence * 100)}%
          </Text>
        )}

        <View style={styles.noDetectionActions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/camera')}
          >
            <Ionicons name="camera" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Retake Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── WEB LAYOUT ──────────────────────────────────────────────────────────────
  if (isWeb) {
    return (
      <>
        <View style={webStyles.pageWrapper}>
          {/* LEFT COLUMN — sticky image panel */}
          <View style={webStyles.leftColumn}>
            {displayImageUrl && (
              <View style={webStyles.imageCard}>
                <Image
                  source={{ uri: displayImageUrl }}
                  style={webStyles.squareImage}
                  resizeMode="cover"
                />
                <View style={webStyles.imageOverlayBadge}>
                  <Ionicons name="camera" size={14} color="white" />
                  <Text style={webStyles.imageOverlayText}>Captured Image</Text>
                </View>
              </View>
            )}

            {/* Quick stats below image */}
            {result && (
              <View style={webStyles.quickStats}>
                {/* Risk badge */}
                <View style={[
                  webStyles.statBadge,
                  { backgroundColor: getRiskColor(result.risk_assessment?.risk_level) + '18',
                    borderColor: getRiskColor(result.risk_assessment?.risk_level) }
                ]}>
                  <Ionicons
                    name={getRiskIcon(result.risk_assessment?.risk_level)}
                    size={18}
                    color={getRiskColor(result.risk_assessment?.risk_level)}
                  />
                  <Text style={[webStyles.statBadgeText, { color: getRiskColor(result.risk_assessment?.risk_level) }]}>
                    {result.risk_assessment?.risk_level?.toUpperCase()} RISK
                  </Text>
                </View>

                {/* Edible badge */}
                {result.image_analysis?.toxicity?.edible !== undefined && (
                  <View style={[
                    webStyles.statBadge,
                    {
                      backgroundColor: result.image_analysis.toxicity.edible ? '#E8F5E920' : '#FFEBEE',
                      borderColor: result.image_analysis.toxicity.edible ? '#4CAF50' : '#F44336'
                    }
                  ]}>
                    <Ionicons
                      name={result.image_analysis.toxicity.edible ? 'shield-checkmark' : 'warning'}
                      size={18}
                      color={result.image_analysis.toxicity.edible ? '#4CAF50' : '#F44336'}
                    />
                    <Text style={[webStyles.statBadgeText, {
                      color: result.image_analysis.toxicity.edible ? '#2E7D32' : '#C62828'
                    }]}>
                      {result.image_analysis.toxicity.edible ? 'EDIBLE' : 'POISONOUS'}
                    </Text>
                  </View>
                )}

                {/* Confidence badge */}
                {result.image_analysis?.species?.confidence !== undefined && (
                  <View style={[webStyles.statBadge, { backgroundColor: '#E3F2FD', borderColor: '#2196F3' }]}>
                    <Ionicons name="analytics" size={18} color="#2196F3" />
                    <Text style={[webStyles.statBadgeText, { color: '#1565C0' }]}>
                      {Math.round(result.image_analysis.species.confidence * 100)}% CONFIDENCE
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Action buttons in left panel on web */}
            <View style={webStyles.leftActions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/camera')}
              >
                <Ionicons name="camera" size={18} color="white" />
                <Text style={styles.primaryButtonText}>Take Another Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/')}
              >
                <Text style={styles.secondaryButtonText}>Home</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* RIGHT COLUMN — scrollable results */}
          <ScrollView style={webStyles.rightColumn} contentContainerStyle={webStyles.rightColumnContent}>
            <SafeComponent component={renderDetectionSummary()} />
            <SafeComponent component={renderRiskAssessment()} />
            <SafeComponent component={renderSpeciesInfo()} />
            <SafeComponent component={renderToxicityInfo()} />
            <SafeComponent component={renderDatabaseSection()} />
            <SafeComponent component={renderMapSection()} />
            <SafeComponent component={renderRecommendations()} />
            <SafeComponent component={renderSafetyActions()} />
          </ScrollView>
        </View>

        {/* Map Modal - Web */}
        {showMap && mapHtml && (
          <Modal
            visible={showMap}
            animationType="fade"
            onRequestClose={() => setShowMap(false)}
          >
            <View style={styles.mapContainer}>
              <View style={styles.mapHeader}>
                <Text style={styles.mapTitle}>Mushroom Location Map</Text>
                <TouchableOpacity
                  onPress={() => setShowMap(false)}
                  style={styles.closeMapButton}
                >
                  <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1, overflow: 'hidden' }}>
                <iframe
                  srcDoc={mapHtml}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Mushroom Location Map"
                />
              </View>
            </View>
          </Modal>
        )}
      </>
    );
  }

  // ── MOBILE LAYOUT ─────────────────────────────────────────────────────────────
  return (
    <>
      <ScrollView style={styles.container}>
        {/* Captured Image */}
        {displayImageUrl && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: displayImageUrl }} style={styles.capturedImage} />
            <Text style={styles.imageCaption}>Captured Image</Text>
          </View>
        )}

        {/* Analysis Results */}
        <SafeComponent component={renderDetectionSummary()} />
        <SafeComponent component={renderRiskAssessment()} />
        <SafeComponent component={renderSpeciesInfo()} />
        <SafeComponent component={renderToxicityInfo()} />
        <SafeComponent component={renderDatabaseSection()} />
        <SafeComponent component={renderMapSection()} />
        <SafeComponent component={renderRecommendations()} />
        <SafeComponent component={renderSafetyActions()} />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/camera')}
          >
            <Ionicons name="camera" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Take Another Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.secondaryButtonText}>Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Map Modal - Native */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showMap}
          animationType="slide"
          onRequestClose={() => setShowMap(false)}
        >
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>Mushroom Location Map</Text>
              <TouchableOpacity
                onPress={() => setShowMap(false)}
                style={styles.closeMapButton}
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>

            {WebView && mapHtml ? (
              <WebView
                source={{ html: mapHtml }}
                style={styles.webView}
                scrollEnabled={true}
              />
            ) : (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.mapLoadingText}>Loading map...</Text>
              </View>
            )}
          </View>
        </Modal>
      )}
    </>
  );
}

// ── WEB-SPECIFIC STYLES ────────────────────────────────────────────────────────
const webStyles = StyleSheet.create({
  pageWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F0F2F5',
    height: '100%' as any,
  },
  leftColumn: {
    width: 340,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#E8EAF0',
    padding: 24,
    gap: 16,
    position: 'sticky' as any,
    top: 0,
    alignSelf: 'flex-start',
    height: '100vh' as any,
    overflowY: 'auto' as any,
  },
  imageCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    backgroundColor: '#000',
  },
  squareImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  quickStats: {
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  statBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  leftActions: {
    gap: 10,
    marginTop: 8,
  },
  rightColumn: {
    flex: 1,
    height: '100vh' as any,
  },
  rightColumnContent: {
    padding: 24,
    paddingTop: 16,
    gap: 0,
  },
});

// ── MOBILE STYLES ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  noDetectionContainer: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
    paddingTop: 40,
  },
  noDetectionImageWrapper: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  noDetectionImage: {
    width: '100%',
    aspectRatio: 1,
  },
  noDetectionImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(211, 47, 47, 0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  noDetectionImageOverlayText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorActions: {
    flexDirection: 'row',
    marginTop: 30,
    gap: 15,
  },
  noDetectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  noDetectionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  noDetectionConfidence: {
    fontSize: 14,
    color: '#333',
    marginTop: 12,
  },
  noDetectionActions: {
    width: '100%',
    marginTop: 30,
    gap: 10,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#666',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  capturedImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  imageCaption: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  riskCard: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#FAFAFA',
  },
  riskScore: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  factorsList: {
    marginTop: 10,
  },
  factorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  factorText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 3,
  },
  speciesCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
  },
  detectionCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 15,
  },
  detectionStatusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 6,
  },
  detectionConfidence: {
    fontSize: 14,
    color: '#2E7D32',
  },
  detectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  detectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 6,
  },
  speciesName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 5,
  },
  localName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  confidenceBar: {
    marginBottom: 15,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  confidenceFill: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceProgress: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  toxicityCard: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 15,
  },
  toxicityStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  warningText: {
    fontSize: 14,
    color: '#C62828',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  recommendationsList: {
    gap: 10,
  },
  recommendationItem: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  safetyList: {
    gap: 8,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  safetyText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  mapButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 0,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 0.4,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 0.6,
    textAlign: 'right',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2196F3',
    marginTop: 12,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#DDD',
    marginVertical: 10,
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  notesLabel: {
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  notesText: {
    color: '#444',
    lineHeight: 20,
  },
  actionButtons: {
    margin: 15,
    marginTop: 0,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  // Map Modal Styles
  mapContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingBottom: 12,
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  closeMapButton: {
    padding: 8,
  },
  webView: {
    flex: 1,
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mapLoadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  databaseCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#111',
    maxWidth: '55%',
    textAlign: 'right',
  },
  /* ── Redesigned Mushroom Info Card ─────────────── */
  dbCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EDF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  dbIdentityBlock: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#F0F7F0',
    borderBottomWidth: 1,
    borderBottomColor: '#D8EDD8',
  },
  dbCommonName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B5E20',
    textAlign: 'center',
    marginBottom: 4,
  },
  dbLocalName: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 3,
    textAlign: 'center',
  },
  dbScientificName: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#6B8E6B',
    textAlign: 'center',
  },
  dbEdibilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  dbEdibleBanner: {
    backgroundColor: '#E8F5E9',
    borderBottomColor: '#C8E6C9',
  },
  dbPoisonBanner: {
    backgroundColor: '#FFEBEE',
    borderBottomColor: '#FFCDD2',
  },
  dbEdibilityText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dbGroup: {
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  dbGroupTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#90A4AE',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  dbGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  dbRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dbRowAlt: {
    backgroundColor: '#F8FAFB',
  },
  dbLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.45,
  },
  dbLabel: {
    fontSize: 13,
    color: '#607D8B',
    fontWeight: '600',
  },
  dbValue: {
    fontSize: 13,
    color: '#263238',
    fontWeight: '500',
    flex: 0.55,
    textAlign: 'right',
  },
  dbDescriptionBlock: {
    marginHorizontal: 16,
    marginBottom: 4,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
    backgroundColor: '#F9FBF9',
    borderRadius: 6,
    paddingBottom: 12,
  },
  dbDescriptionText: {
    fontSize: 13,
    color: '#37474F',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  dbNotesBlock: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#90A4AE',
    backgroundColor: '#F5F7F9',
    borderRadius: 6,
    paddingBottom: 12,
  },
  dbNotesText: {
    fontSize: 13,
    color: '#546E7A',
    lineHeight: 20,
    fontStyle: 'italic',
    paddingHorizontal: 12,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});