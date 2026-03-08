// Check if image contains a mushroom
const checkForMushroom = async (base64: string, photoUri?: string): Promise<{ isMushroom: boolean; confidence: number }> => {
  try {
    // Clean base64 string (remove data:image/jpeg;base64, prefix if present)
    let cleanBase64 = base64 || '';
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    // Build API URL from environment variables
    // Default to localhost so the device/emulator talking to the backend
    // on the same machine works without a hard-coded LAN IP.
    const BACKEND_IP = process.env.EXPO_PUBLIC_BACKEND_IP || 'localhost';
    const BACKEND_PORT = process.env.EXPO_PUBLIC_BACKEND_PORT || '5000';
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || `http://${BACKEND_IP}:${BACKEND_PORT}/api`;
    const response = await fetch(`${apiUrl}/toxicity/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: cleanBase64,
      }),
    });
    if (!response.ok) {
      console.warn('⚠️ Mushroom detection failed:', response.status);
      return { isMushroom: true, confidence: 0.5 };
    }
    const data = await response.json();
    console.log('Detection result:', data);
    const hasMushroom = data.detection_results?.detected === true || 
                       (data.objects && data.objects.length > 0);
    const confidence = data.confidence || 0;
    return {
      isMushroom: hasMushroom,
      confidence: confidence
    };
  } catch (error) {
    console.error('❌ Mushroom detection error:', error);
    return { isMushroom: true, confidence: 0.5 };
  }
};

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isWideScreen = width >= 768;

// Mushroom examples for user guidance
const MUSHROOM_EXAMPLES = [
  {
    id: 1,
    title: 'Button Mushroom',
    imageUrl: 'https://th.bing.com/th/id/R.c8f023cde84cfd6c334f1b3139a682b5?rik=e6FkdExXt4Iyvw&riu=http%3a%2f%2ftweedfruitexchange.com.au%2fcdn%2fshop%2fproducts%2fmushroomsbutton.jpg%3fv%3d1669848630&ehk=b1M5pzhJJZ9zasb9e69Z9iEPDl4GN%2bF6NV5Bz9RWNGw%3d&risl=&pid=ImgRaw&r=0',
    tips: 'Show the cap clearly',
  },
  {
    id: 2,
    title: 'Shiitake Mushroom',
    imageUrl: 'https://th.bing.com/th/id/R.f61484192894d9102f7dc09fb6cdb44e?rik=2hWbf6OEP0%2fNyw&riu=http%3a%2f%2fupload.wikimedia.org%2fwikipedia%2fcommons%2fe%2feb%2fShiitake_mushroom.jpg&ehk=mnyiAHI6vDE0UMoaM41qIYWgdZ00pRBt27vM1R7RQuY%3d&risl=&pid=ImgRaw&r=0',
    tips: 'Capture full specimen',
  },
  {
    id: 3,
    title: 'Oyster Mushroom',
    imageUrl: 'https://grocycle.com/wp-content/uploads/2017/03/GC-Site-HomePage.jpg',
    tips: 'Include gills in frame',
  },
  {
    id: 4,
    title: 'Enoki Mushroom',
    imageUrl: 'https://www.mashed.com/img/gallery/enoki-mushrooms-were-named-the-most-recalled-food-of-the-year/l-intro-1670008415.jpg',
    tips: 'Good lighting helps',
  },
];

// CLOUDINARY CONFIGURATION (from environment variables)
const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'snapshroom';
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

if (!CLOUDINARY_CLOUD_NAME) {
  console.warn('⚠️ EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME is not set in .env file');
}

export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const cornerAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(cornerAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(cornerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Upload image to Cloudinary
  const uploadToCloudinary = async (base64: string, photoUri?: string) => {
    try {
      let blobData: Blob | null = null;
      console.log('[Cloudinary] base64 length:', base64 ? base64.length : 0);
      console.log('[Cloudinary] photoUri:', photoUri);

      let uploadResponse = null;
      const uploadPreset = CLOUDINARY_UPLOAD_PRESET || 'snapshroom';
      console.log('📤 Uploading to Cloudinary with preset:', uploadPreset);

      try {
        let blobData: Blob | null = null;
        console.log('[Cloudinary] base64 length:', base64 ? base64.length : 0);
        console.log('[Cloudinary] photoUri:', photoUri);
        let cleanBase64 = base64 || '';
        if (cleanBase64.includes(',')) {
          cleanBase64 = cleanBase64.split(',')[1];
        }
        console.log('[Cloudinary] base64 preview:', cleanBase64.slice(0, 100));
        let uploadResponse = null;
        const uploadPreset = CLOUDINARY_UPLOAD_PRESET || 'snapshroom';
        console.log('📤 Uploading to Cloudinary with preset:', uploadPreset);
        if (cleanBase64) {
          const formData = new FormData();
          formData.append('file', `data:image/jpeg;base64,${cleanBase64}`);
          formData.append('upload_preset', uploadPreset);
          formData.append('folder', 'snapshroom/mushroom-captures');
          for (let pair of (formData as any)._parts || []) {
            console.log('[Cloudinary] FormData part:', pair[0], typeof pair[1] === 'string' ? pair[1].slice(0, 100) : pair[1]);
          }
          uploadResponse = await fetch(CLOUDINARY_API_URL, {
            method: 'POST',
            body: formData,
          });
        } else {
          throw new Error('No valid image data to upload.');
        }
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.text();
          console.error('❌ Cloudinary error response:', errorData);
          throw new Error(`Cloudinary upload failed: ${uploadResponse.status}`);
        }
        const data = await uploadResponse.json();
        console.log('✅ Cloudinary upload successful:', {
          url: data.secure_url,
          public_id: data.public_id,
        });
        return {
          cloudinaryUrl: data.secure_url,
          cloudinaryId: data.public_id,
          width: data.width,
          height: data.height,
        };
      } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      throw error;
    }
  };

  // Take picture and upload
  const takePicture = async () => {
    if (cameraRef.current && !isLoading) {
      try {
        setIsLoading(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
          exif: false,
        });

        if (!photo?.base64 && !photo?.uri) {
          setIsLoading(false);
          Alert.alert('Error', 'No image data found. Please retake the photo.');
          return;
        }
        console.log('📸 Photo captured, checking for mushroom...');
        const { isMushroom, confidence } = await checkForMushroom(photo.base64 || '', photo.uri);
        if (!isMushroom || confidence < 0.3) {
          setIsLoading(false);
          Alert.alert(
            'No Mushroom Detected',
            'Please make sure the mushroom is clearly visible in the frame. Tips:\n\n• Focus on the mushroom cap\n• Ensure good lighting\n• Fill most of the frame with the mushroom\n• Avoid blurry photos',
            [{ text: 'Try Again', onPress: () => console.log('Retaking photo'), style: 'default' }]
          );
          return;
        }
        console.log('✅ Mushroom detected with confidence:', confidence);
        const cloudinaryData = await uploadToCloudinary(photo.base64 || '', photo.uri);
        router.push({
          pathname: '/prediction',
          params: {
            imageUri: photo.uri,
            imageBase64: photo.base64 || '',
            cloudinaryUrl: cloudinaryData.cloudinaryUrl,
            cloudinaryId: cloudinaryData.cloudinaryId,
          },
        });
      } catch (error) {
        console.error('❌ Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture or upload image. Please make sure Cloudinary is configured correctly.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    if (isLoading) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to upload mushroom images.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      
      if (asset?.base64 || asset?.uri) {
        if (!asset?.base64 && !asset?.uri) {
          setIsLoading(false);
          Alert.alert('Error', 'No image data found. Please select another image.');
          return;
        }
        setIsLoading(true);
        console.log('📁 Image picked from gallery, checking for mushroom...');
        const { isMushroom, confidence } = await checkForMushroom(asset.base64 || '', asset.uri);
        if (!isMushroom || confidence < 0.3) {
          setIsLoading(false);
          Alert.alert(
            'No Mushroom Detected',
            'Please select an image with a clearly visible mushroom. Tips:\n\n• Choose a photo with good lighting\n• Ensure the mushroom fills most of the frame\n• Avoid blurry or distant photos',
            [
              { text: 'Try Again', onPress: () => pickImage(), style: 'default' },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          return;
        }
        console.log('✅ Mushroom detected in uploaded image with confidence:', confidence);
        const cloudinaryData = await uploadToCloudinary(asset.base64 || '', asset.uri);
        router.push({
          pathname: '/prediction',
          params: {
            imageUri: asset.uri,
            imageBase64: asset.base64 || '',
            cloudinaryUrl: cloudinaryData.cloudinaryUrl,
            cloudinaryId: cloudinaryData.cloudinaryId,
          },
        });
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to process the selected image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  // Loading state
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContent}>
          <View style={styles.mushroomIcon}>
            <Ionicons name="leaf" size={60} color="#7BA05B" />
          </View>
          <ActivityIndicator size="large" color="#7BA05B" style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>Initializing SnapShroom...</Text>
        </View>
      </View>
    );
  }

  // Permission denied state
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContent}>
          <View style={styles.permissionIconContainer}>
            <Ionicons name="camera-outline" size={80} color="#FF6B6B" />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            SnapShroom needs camera access to identify mushrooms from photos.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Ionicons name="camera" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#7BA05B" />
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── WEB WIDE LAYOUT ─────────────────────────────────────────────────────────
  if (isWideScreen) {
    return (
      <View style={styles.webRoot}>
        <StatusBar style="light" />

        {/* LEFT PANEL: Guide / Examples */}
        <LinearGradient colors={['#0A1A0F', '#0F1F0F', '#1A2D1A']} style={styles.webLeftPanel}>
          {/* Panel header */}
          <View style={styles.webPanelHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.webHeaderBtn}>
              <Ionicons name="arrow-back" size={22} color="#7BA05B" />
            </TouchableOpacity>
            <View style={styles.webPanelHeaderTitle}>
              <Ionicons name="leaf" size={20} color="#7BA05B" />
              <Text style={styles.webPanelHeaderText}>SnapShroom</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.webLeftScroll} contentContainerStyle={styles.webLeftScrollContent}>
            {/* Tips */}
            <Text style={styles.webSectionTitle}>Capture Tips</Text>
            <View style={styles.webTipsCard}>
              {[
                { icon: 'sunny', color: '#FFD700', text: 'Good natural lighting' },
                { icon: 'eye', color: '#4DA6FF', text: 'Focus on the mushroom cap' },
                { icon: 'grid', color: '#9C27B0', text: 'Include gills and stem' },
                { icon: 'map', color: '#7BA05B', text: 'Show surrounding habitat' },
                { icon: 'moon', color: '#A8B89D', text: 'Avoid shadows and glare' },
              ].map((tip) => (
                <View key={tip.text} style={styles.webTipRow}>
                  <View style={styles.webTipIcon}>
                    <Ionicons name={tip.icon as any} size={16} color={tip.color} />
                  </View>
                  <Text style={styles.webTipText}>{tip.text}</Text>
                </View>
              ))}
            </View>

            {/* Examples */}
            <Text style={styles.webSectionTitle}>Example Captures</Text>
            <View style={styles.webExamplesGrid}>
              {MUSHROOM_EXAMPLES.map((mushroom) => (
                <View key={mushroom.id} style={styles.webExampleCard}>
                  <Image source={{ uri: mushroom.imageUrl }} style={styles.webExampleImage} />
                  <Text style={styles.webExampleTitle}>{mushroom.title}</Text>
                  <Text style={styles.webExampleTip}>{mushroom.tips}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </LinearGradient>

        {/* RIGHT PANEL: Upload only (web) */}
        <View style={styles.webRightPanel}>
          <View style={styles.webUploadArea}>
            {/* Icon */}
            <View style={styles.webUploadIconWrap}>
              <LinearGradient
                colors={['rgba(123,160,91,0.2)', 'rgba(90,128,64,0.1)']}
                style={styles.webUploadIconGradient}
              >
                <Ionicons name="cloud-upload-outline" size={64} color="#7BA05B" />
              </LinearGradient>
            </View>

            <Text style={styles.webUploadTitle}>Upload a Mushroom Photo</Text>
            <Text style={styles.webUploadSubtitle}>
              Select an image from your device to identify the mushroom
            </Text>

            {/* Tips row */}
            <View style={styles.webInstructionsRow}>
              {[
                { icon: 'sunny', color: '#FFD700', label: 'Good lighting' },
                { icon: 'eye', color: '#7BA05B', label: 'Clear focus' },
                { icon: 'leaf', color: '#4DA6FF', label: 'Full specimen' },
              ].map((item) => (
                <View key={item.label} style={styles.webInstructionChip}>
                  <Ionicons name={item.icon as any} size={15} color={item.color} />
                  <Text style={styles.webInstructionChipText}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Upload button */}
            <TouchableOpacity
              style={[styles.webUploadBtn, isLoading && styles.captureButtonDisabled]}
              onPress={pickImage}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isLoading ? ['rgba(85,107,79,0.8)', 'rgba(68,90,63,0.8)'] : ['#7BA05B', '#5A8040']}
                style={styles.webUploadBtnGradient}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.webUploadBtnText}>Processing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="images" size={22} color="white" />
                    <Text style={styles.webUploadBtnText}>Choose Image</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.webHintText}>
              Supported formats: JPG, PNG, WEBP
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ─── MOBILE LAYOUT (original — completely untouched) ────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {showExamples ? (
        <LinearGradient
          colors={['#0A1A0F', '#0F1F0F', '#1A2D1A']}
          style={styles.examplesContainer}
        >
          <LinearGradient
            colors={['rgba(123, 160, 91, 0.15)', 'rgba(15, 31, 15, 0.95)']}
            style={styles.examplesHeader}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <LinearGradient
                colors={['rgba(123, 160, 91, 0.3)', 'rgba(123, 160, 91, 0.15)']}
                style={styles.headerButtonGradient}
              >
                <Ionicons name="arrow-back" size={26} color="#7BA05B" />
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="leaf" size={24} color="#7BA05B" />
              <Text style={styles.examplesTitle}>Capture Guide</Text>
            </View>
            <TouchableOpacity onPress={() => setShowExamples(false)} style={styles.headerButton}>
              <LinearGradient
                colors={['rgba(123, 160, 91, 0.4)', 'rgba(123, 160, 91, 0.2)']}
                style={styles.headerButtonGradient}
              >
                <Ionicons name="camera" size={26} color="#7BA05B" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.examplesScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.guideSection}>
              <View style={styles.guideTitleContainer}>
                <Ionicons name="sparkles" size={24} color="#7BA05B" />
                <Text style={styles.guideSectionTitle}>Perfect Capture Tips</Text>
              </View>
              <View style={styles.tipsContainer}>
                <View style={styles.tipItem}>
                  <View style={styles.tipIconContainer}>
                    <Ionicons name="sunny" size={18} color="#FFD700" />
                  </View>
                  <Text style={styles.tipText}>Good lighting - natural daylight is best</Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipIconContainer}>
                    <Ionicons name="eye" size={18} color="#4DA6FF" />
                  </View>
                  <Text style={styles.tipText}>Focus clearly on the mushroom cap</Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipIconContainer}>
                    <Ionicons name="grid" size={18} color="#9C27B0" />
                  </View>
                  <Text style={styles.tipText}>Include the gills and stem if possible</Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipIconContainer}>
                    <Ionicons name="map" size={18} color="#7BA05B" />
                  </View>
                  <Text style={styles.tipText}>Show surrounding habitat for context</Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipIconContainer}>
                    <Ionicons name="moon" size={18} color="#1A1A1A" />
                  </View>
                  <Text style={styles.tipText}>Avoid shadows and glare</Text>
                </View>
              </View>
            </View>

            <View style={styles.examplesGrid}>
              <View style={styles.examplesGridTitleContainer}>
                <Ionicons name="image" size={24} color="#7BA05B" />
                <Text style={styles.examplesGridTitle}>Example Captures</Text>
              </View>
              {MUSHROOM_EXAMPLES.map((mushroom) => (
                <View key={mushroom.id} style={styles.exampleCard}>
                  <Image source={{ uri: mushroom.imageUrl }} style={styles.exampleImage} />
                  <View style={styles.exampleInfo}>
                    <Text style={styles.exampleTitle}>{mushroom.title}</Text>
                    <View style={styles.exampleTipContainer}>
                      <Ionicons name="bulb" size={14} color="#FFD700" />
                      <Text style={styles.exampleTip}>{mushroom.tips}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.startCameraButtonContainer}
              onPress={() => setShowExamples(false)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7BA05B', '#6A8F4D', '#5A7E40']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startCameraButton}
              >
                <Ionicons name="camera" size={26} color="white" />
                <Text style={styles.startCameraButtonText}>Start Capturing</Text>
                <View style={styles.buttonArrow}>
                  <Ionicons name="arrow-forward" size={22} color="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadButtonContainer}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(123, 160, 91, 0.8)', 'rgba(106, 143, 77, 0.8)', 'rgba(90, 126, 64, 0.8)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.uploadButton}
              >
                <Ionicons name="images" size={26} color="white" />
                <Text style={styles.uploadButtonText}>Upload from Gallery</Text>
                <View style={styles.buttonArrow}>
                  <Ionicons name="cloud-upload" size={22} color="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" mode="picture" />
          <View style={styles.overlay}>
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.3)', 'transparent']}
              style={styles.topBar}
            >
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <LinearGradient colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)']} style={styles.buttonGradient}>
                  <Ionicons name="arrow-back" size={28} color="white" />
                </LinearGradient>
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <Ionicons name="leaf" size={26} color="#7BA05B" />
                <Text style={styles.titleText}>SnapShroom</Text>
              </View>
              <TouchableOpacity style={styles.tipsButton} onPress={() => setShowExamples(true)}>
                <LinearGradient
                  colors={['rgba(123, 160, 91, 0.7)', 'rgba(123, 160, 91, 0.5)']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="help-circle" size={28} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.targetingGuide}>
              <View style={styles.targetSquare}>
                <Animated.View style={[styles.cornerTL, { opacity: cornerAnim }]} />
                <Animated.View style={[styles.cornerTR, { opacity: cornerAnim }]} />
                <Animated.View style={[styles.cornerBL, { opacity: cornerAnim }]} />
                <Animated.View style={[styles.cornerBR, { opacity: cornerAnim }]} />
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [{
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-120, 120],
                        }),
                      }],
                    },
                  ]}
                />
                <Ionicons name="leaf" size={52} color="rgba(123, 160, 91, 0.7)" style={{ marginBottom: 14, zIndex: 2 }} />
                <Text style={styles.guideText}>Center the mushroom</Text>
                <Text style={styles.guideSubtext}>Fill the frame for best results</Text>
              </View>
            </View>

            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.7)']}
              style={styles.bottomBar}
            >
              <View style={styles.instructions}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
                  style={styles.instructionsGradient}
                >
                  <View style={styles.instructionItem}>
                    <Ionicons name="sunny" size={16} color="#FFD700" />
                    <Text style={styles.instructionText}>Good lighting</Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Ionicons name="eye" size={16} color="#7BA05B" />
                    <Text style={styles.instructionText}>Clear focus</Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Ionicons name="leaf" size={16} color="#4DA6FF" />
                    <Text style={styles.instructionText}>Full specimen</Text>
                  </View>
                </LinearGradient>
              </View>

              <Animated.View style={{ transform: [{ scale: isLoading ? 1 : pulseAnim }] }}>
                <TouchableOpacity
                  style={[styles.captureButton, isLoading && styles.captureButtonDisabled]}
                  onPress={takePicture}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={isLoading ? ['#556B4F', '#445A3F'] : ['#7BA05B', '#6A8F4D', '#5A7E40']}
                    style={styles.captureButtonGradient}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="white" />
                        <Text style={styles.loadingButtonText}>Processing...</Text>
                      </View>
                    ) : (
                      <View style={styles.captureButtonInner}>
                        <Ionicons name="camera" size={40} color="white" />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity
                style={[styles.galleryButton, isLoading && styles.captureButtonDisabled]}
                onPress={pickImage}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isLoading ? ['rgba(85, 107, 79, 0.8)', 'rgba(68, 90, 63, 0.8)'] : ['rgba(123, 160, 91, 0.9)', 'rgba(106, 143, 77, 0.9)']}
                  style={styles.galleryButtonGradient}
                >
                  <Ionicons name="images" size={24} color="white" />
                  <Text style={styles.galleryButtonText}>
                    {isLoading ? 'Processing...' : 'Upload from Gallery'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.captureHint}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.7)']}
                  style={styles.captureHintGradient}
                >
                  <Ionicons name="finger-print" size={16} color="white" />
                  <Text style={styles.hintText}>
                    {isLoading ? 'Processing...' : 'Tap to capture or upload'}
                  </Text>
                </LinearGradient>
              </View>
            </LinearGradient>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1F0F',
  },

  // Loading & Permission States
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mushroomIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(123, 160, 91, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#7BA05B',
  },
  loadingText: {
    fontSize: 16,
    color: '#A8B89D',
    marginTop: 20,
    fontWeight: '600',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E6F4FE',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#A8B89D',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#7BA05B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 15,
    width: '100%',
    gap: 10,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#7BA05B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '100%',
    gap: 10,
  },
  secondaryButtonText: {
    color: '#7BA05B',
    fontSize: 16,
    fontWeight: '600',
  },

  // Camera Container (mobile)
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },

  // Examples View (mobile)
  examplesContainer: {
    flex: 1,
    paddingTop: 40,
  },
  examplesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(123, 160, 91, 0.3)',
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#7BA05B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  headerButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123, 160, 91, 0.4)',
    borderRadius: 24,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  examplesTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#E6F4FE',
    letterSpacing: 0.5,
  },
  examplesScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  guideSection: {
    marginTop: 24,
    marginBottom: 28,
  },
  guideTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  guideSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#A8B89D',
  },
  tipsContainer: {
    gap: 16,
    backgroundColor: 'rgba(123, 160, 91, 0.08)',
    padding: 18,
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#7BA05B',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(123, 160, 91, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123, 160, 91, 0.3)',
  },
  tipText: {
    fontSize: 15,
    color: '#C8D8C8',
    flex: 1,
    lineHeight: 22,
    fontWeight: '600',
  },
  examplesGrid: {
    marginBottom: 28,
  },
  examplesGridTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  examplesGridTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#A8B89D',
  },
  exampleCard: {
    flexDirection: 'row',
    backgroundColor: '#1A2D1A',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(123, 160, 91, 0.3)',
  },
  exampleImage: {
    width: 120,
    height: 120,
  },
  exampleInfo: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  exampleTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#E6F4FE',
    marginBottom: 8,
  },
  exampleTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exampleTip: {
    fontSize: 13,
    color: '#A8B89D',
    fontWeight: '500',
  },
  startCameraButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  startCameraButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 14,
  },
  startCameraButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonArrow: {
    marginLeft: 4,
  },
  uploadButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 40,
  },
  uploadButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 14,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Camera overlay (mobile)
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123, 160, 91, 0.4)',
    borderRadius: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tipsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  targetingGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetSquare: {
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: 'rgba(123, 160, 91, 0.6)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 160, 91, 0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  cornerTL: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 40,
    height: 40,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderColor: '#7BA05B',
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 40,
    height: 40,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderColor: '#7BA05B',
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    width: 40,
    height: 40,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderColor: '#7BA05B',
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 40,
    height: 40,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderColor: '#7BA05B',
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(123, 160, 91, 0.6)',
  },
  guideText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
    zIndex: 2,
  },
  guideSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 4,
    zIndex: 2,
  },
  bottomBar: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  instructions: {
    borderRadius: 16,
    marginBottom: 28,
    width: '100%',
    overflow: 'hidden',
  },
  instructionsGradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(123, 160, 91, 0.4)',
    borderRadius: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instructionText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  captureButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 20,
  },
  captureButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 50,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  captureHint: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  captureHintGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(123, 160, 91, 0.5)',
    borderRadius: 28,
  },
  hintText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  galleryButton: {
    width: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  galleryButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  galleryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── WEB ONLY ────────────────────────────────────────────────────────────────
  webRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0A1A0F',
    minHeight: '100vh' as any,
  },

  // Left panel: guide + examples
  webLeftPanel: {
    width: '35%',
    minHeight: '100vh' as any,
  },
  webPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(123, 160, 91, 0.2)',
    backgroundColor: 'rgba(10, 26, 15, 0.95)',
  },
  webHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(123, 160, 91, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(123, 160, 91, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webPanelHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webPanelHeaderText: {
    color: '#E6F4FE',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  webLeftScroll: {
    flex: 1,
  },
  webLeftScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  webSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7BA05B',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 20,
  },
  webTipsCard: {
    backgroundColor: 'rgba(123, 160, 91, 0.07)',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#7BA05B',
    gap: 12,
  },
  webTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  webTipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(123, 160, 91, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webTipText: {
    fontSize: 13,
    color: '#C8D8C8',
    fontWeight: '500',
    flex: 1,
  },
  webExamplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  webExampleCard: {
    width: '47%',
    backgroundColor: '#1A2D1A',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(123, 160, 91, 0.25)',
  },
  webExampleImage: {
    width: '100%',
    height: 90,
  },
  webExampleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E6F4FE',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  webExampleTip: {
    fontSize: 11,
    color: '#A8B89D',
    paddingHorizontal: 8,
    paddingBottom: 8,
    marginTop: 2,
  },

  // Right panel: upload only (web)
  webRightPanel: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#0F1F0F',
    height: '100vh' as any,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webUploadArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    gap: 24,
    width: '100%',
  },
  webUploadIconWrap: {
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 8,
  },
  webUploadIconGradient: {
    width: 140,
    height: 140,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(123, 160, 91, 0.3)',
  },
  webUploadTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#E6F4FE',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  webUploadSubtitle: {
    fontSize: 15,
    color: '#A8B89D',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 340,
  },
  webInstructionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  webInstructionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(123, 160, 91, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(123, 160, 91, 0.3)',
  },
  webInstructionChipText: {
    color: '#C8D8C8',
    fontSize: 13,
    fontWeight: '600',
  },
  webButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  webCaptureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#7BA05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  webCaptureBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 40,
  },
  webUploadBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    width: 280,
  },
  webUploadBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 16,
  },
  webUploadBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  webHintText: {
    color: 'rgba(168, 184, 157, 0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
});