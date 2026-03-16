import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '@/constants/theme';

type FlashState = 'none' | 'success' | 'error';
type ScanMode = 'food' | 'medicine';

interface BarcodeOverlayProps {
  flashState?: FlashState;
  scanMode?: ScanMode;
}

export function BarcodeOverlay({ flashState = 'none', scanMode = 'food' }: BarcodeOverlayProps) {
  const lineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [boxHeight, setBoxHeight] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(lineAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ).start();
  }, [lineAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const handleBoxLayout = (event: LayoutChangeEvent) => {
    setBoxHeight(event.nativeEvent.layout.height);
  };

  const translateY = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(boxHeight - 4, 0)],
  });

  const pulseBorderWidth = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 3],
  });

  const pulseBorderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,212,170,0.25)', 'rgba(0,212,170,0.6)'],
  });

  const flashColor =
    flashState === 'success'
      ? 'rgba(0,212,170,0.3)'
      : flashState === 'error'
        ? 'rgba(255,107,107,0.3)'
        : 'transparent';

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {/* Karanlık katmanlar: üst / alt / yanlar */}
      <View style={styles.topOverlay} />
      <View style={styles.middleRow}>
        <View style={styles.sideOverlay} />

        <View style={styles.boxContainer} onLayout={handleBoxLayout}>
          <Animated.View
            style={[
              styles.pulseBorder,
              {
                borderWidth: pulseBorderWidth,
                borderColor: pulseBorderColor as any,
              },
            ]}
          />

          <View style={styles.boxInner}>
            {/* Köşe braketleri */}
            <View style={styles.cornerRow}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
            </View>

            <View style={styles.boxCenter}>
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [{ translateY }],
                  },
                ]}
              />
            </View>

            <View style={styles.cornerRow}>
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>

            <Animated.View
              style={[
                styles.flashOverlay,
                {
                  backgroundColor: flashColor,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.sideOverlay} />
      </View>
      <View style={styles.bottomOverlay}>
        <Text style={styles.helperText}>
          {scanMode === 'medicine' ? 'İlaç barkodunu hizalayın' : 'Ürün barkodunu hizalayın'}
        </Text>
      </View>
    </View>
  );
}

const BOX_WIDTH = 280;
const BOX_HEIGHT = 180;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '25%',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Spacing.xxxl,
    paddingTop: Spacing.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  helperText: {
    ...Typography.body,
    color: Colors.text,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideOverlay: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    height: BOX_HEIGHT + Spacing.lg * 2,
    flex: 1,
  },
  boxContainer: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxInner: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pulseBorder: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: BorderRadius.lg + 4,
  },
  boxCenter: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cornerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  corner: {
    width: 30,
    height: 30,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  cornerTopLeft: {
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

