import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Keyboard,
  Linking,
  Image,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { useSubscription } from '@/context/SubscriptionContext';
import {
  fetchProductByBarcode,
  getRecentScans,
  type ProductData,
  type RecentScanItem,
} from '@/lib/barcodeService';
import { BarcodeOverlay } from '@/components/BarcodeOverlay';
import {
  ChevronLeft,
  Flashlight,
  AlertCircle,
  Search,
  Apple,
} from 'lucide-react-native';
import { PremiumGate } from '@/components/PremiumGate';

type FlashState = 'none' | 'success' | 'error';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPremium } = useSubscription();

  const [permission, requestPermission] = useCameraPermissions();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [flashState, setFlashState] = useState<FlashState>('none');
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    void (async () => {
      try {
        if (!permission) {
          const { status } = await requestPermission();
          setHasPermission(status === 'granted');
        } else {
          setHasPermission(permission.granted);
        }
      } catch {
        setHasPermission(false);
      }
    })();
  }, [permission, requestPermission]);

  const loadRecentScans = async () => {
    const items = await getRecentScans();
    setRecentScans(items.filter((i) => i.type === 'food'));
  };

  useEffect(() => {
    void loadRecentScans();
  }, []);

  useFocusEffect(
    useCallback(() => {
      isNavigatingRef.current = false;
      setScanned(false);
      setError(null);
      void loadRecentScans();
    }, [])
  );

  const navigateToProduct = (product: ProductData) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    Keyboard.dismiss();
    router.push({
      pathname: '/product-detail',
      params: { product: JSON.stringify(product) },
    });
  };

  const lookupBarcode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);

    try {
      const product = await fetchProductByBarcode(trimmed);
      if (!product) {
        setError('Ürün bulunamadı.');
        setScanned(false);
        return;
      }
      await loadRecentScans();
      navigateToProduct(product);
    } catch (e) {
      const message =
        e instanceof Error && e.name === 'TimeoutError'
          ? 'Zaman aşımı. Lütfen tekrar deneyin.'
          : 'Bir hata oluştu. İnternet bağlantınızı kontrol edin.';
      setError(message);
      setScanned(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarCodeScanned = async (result: { data: string }) => {
    if (scanned || isNavigatingRef.current) return;
    const barcode = result.data?.trim();
    if (!barcode) return;

    setScanned(true);
    setFlashState('success');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => setFlashState('none'), 400);

    await lookupBarcode(barcode);
  };

  const handleManualSubmit = async () => {
    if (!manualBarcode.trim()) {
      setError('Lütfen bir barkod numarası girin.');
      setTimeout(() => setError(null), 2000);
      return;
    }
    Keyboard.dismiss();
    setScanned(true);
    await lookupBarcode(manualBarcode);
    setManualBarcode('');
    setScanned(false);
  };

  /* ── Premium değil ── */
  if (!isPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
        <PremiumGate titleKey="scanPremiumTitle" subtitleKey="scanPremiumDesc" />
      </View>
    );
  }

  /* ── Kamera izni yok ── */
  if (hasPermission === false) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.permissionCard}>
          <AlertCircle size={36} color={Colors.accent} />
          <Text style={styles.permissionTitle}>Kamera izni gerekli</Text>
          <Text style={styles.permissionText}>
            Barkod taramak için kamera erişimine izin vermeniz gerekiyor.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => void Linking.openSettings()}
          >
            <Text style={styles.permissionButtonText}>Ayarları Aç</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Kamera arka plan */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'],
        }}
        enableTorch={torchOn}
      />

      {/* Kamera alanına dokunulunca klavye kapanır */}
      <Pressable style={styles.cameraDismissArea} onPress={() => Keyboard.dismiss()} />

      {/* Tarama overlay */}
      <BarcodeOverlay flashState={flashState} />

      {/* Yükleniyor */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Ürün aranıyor…</Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ürün Tara</Text>
        <TouchableOpacity
          style={[styles.iconButton, torchOn && styles.iconButtonActive]}
          onPress={() => setTorchOn((p) => !p)}
        >
          <Flashlight size={22} color={torchOn ? Colors.primary : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Alt panel – klavye ile birlikte kayar */}
      <KeyboardAvoidingView
        style={styles.bottomWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.bottomPanelScroll}
          contentContainerStyle={[styles.bottomPanel, { paddingBottom: insets.bottom + Spacing.md }]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hata */}
          {error && (
            <View style={styles.errorRow}>
              <AlertCircle size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Elle barkod gir */}
          <Text style={styles.inputLabel}>Elle barkod gir</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ör. 8691234567890"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              value={manualBarcode}
              onChangeText={setManualBarcode}
              onSubmitEditing={handleManualSubmit}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleManualSubmit}
              activeOpacity={0.8}
            >
              <Search size={18} color="#000" />
              <Text style={styles.searchButtonText}>Sorgula</Text>
            </TouchableOpacity>
          </View>

          {/* Son tarananlar */}
          {recentScans.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.recentLabel}>Son tarananlar</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentScroll}
                keyboardShouldPersistTaps="handled"
              >
                {recentScans.map((item) => (
                  <TouchableOpacity
                    key={`${item.barcode}_${item.timestamp}`}
                    style={styles.recentCard}
                    onPress={() =>
                      router.push({
                        pathname: '/product-detail',
                        params: { barcode: item.barcode },
                      })
                    }
                    activeOpacity={0.8}
                  >
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.recentImage} />
                    ) : (
                      <View style={styles.recentImagePlaceholder}>
                        <Apple size={20} color={Colors.primary} />
                      </View>
                    )}
                    <Text style={styles.recentName} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  /* Kamera alanı dismiss */
  cameraDismissArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '40%',
  },

  /* Header */
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {
    ...Typography.h3,
    color: '#fff',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: Colors.primaryGlow,
  },

  /* Loading */
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: '#fff',
    marginTop: Spacing.md,
  },

  /* Alt panel */
  bottomWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomPanelScroll: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    ...Shadows.lg,
  },
  bottomPanel: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },

  /* Hata */
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.error + '22',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  errorText: {
    ...Typography.small,
    color: Colors.error,
    flex: 1,
  },

  /* Input */
  inputLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    ...Typography.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
  },
  searchButtonText: {
    ...Typography.bodyMedium,
    color: '#000',
  },

  /* Son tarananlar */
  recentSection: {
    gap: Spacing.sm,
  },
  recentLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  recentCard: {
    width: 90,
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  recentImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface2,
  },
  recentImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentName: {
    ...Typography.small,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },


  /* İzin ekranı */
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  permissionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.md,
  },
  permissionTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'center',
  },
  permissionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
  },
  permissionButtonText: {
    ...Typography.bodyMedium,
    color: '#000',
  },
});
