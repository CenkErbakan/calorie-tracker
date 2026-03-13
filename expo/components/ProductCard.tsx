import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '@/constants/theme';
import type { ProductData } from '@/lib/barcodeService';

interface ProductCardProps {
  product: ProductData;
  onPress?: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageWrapper}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {product.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        {!!product.brand && (
          <Text style={styles.brand} numberOfLines={1}>
            {product.brand}
          </Text>
        )}
        <Text style={styles.barcode} numberOfLines={1}>
          {product.barcode}
        </Text>
      </View>
      {product.nutriscore && (
        <View style={[styles.nutriscoreBadge, getNutriscoreStyle(product.nutriscore)]}>
          <Text style={styles.nutriscoreText}>
            {product.nutriscore.toUpperCase()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function getNutriscoreStyle(grade: string) {
  const g = grade.toLowerCase();
  let backgroundColor = '#038141';

  if (g === 'a') backgroundColor = '#038141';
  else if (g === 'b') backgroundColor = '#85BB2F';
  else if (g === 'c') backgroundColor = '#FECB02';
  else if (g === 'd') backgroundColor = '#EE8100';
  else if (g === 'e') backgroundColor = '#E63E11';

  return { backgroundColor };
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginRight: Spacing.md,
    minWidth: 220,
    ...Shadows.sm,
  },
  imageWrapper: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginRight: Spacing.md,
    backgroundColor: Colors.surface2,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...Typography.h2,
    color: Colors.textSecondary,
  },
  info: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  brand: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  barcode: {
    ...Typography.small,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  nutriscoreBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  nutriscoreText: {
    ...Typography.smallMedium,
    color: '#000',
  },
});

