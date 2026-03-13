import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';
import { type MedicineData } from '@/lib/medicineService';
import {
  ChevronLeft,
  Share2,
  Pill,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  BookOpen,
  Package,
  Thermometer,
  ShieldAlert,
} from 'lucide-react-native';

function ProductTypeBadge({ type }: { type: MedicineData['productType'] }) {
  const config = {
    OTC: { label: 'OTC', color: Colors.primary, bg: Colors.primaryGlow },
    Prescription: { label: 'Reçeteli', color: Colors.accent, bg: Colors.accent + '22' },
    Unknown: { label: 'Bilinmiyor', color: Colors.textSecondary, bg: Colors.surface2 },
  };
  const c = config[type];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

function RouteBadge({ route }: { route: string }) {
  if (!route) return null;
  return (
    <View style={[styles.badge, { backgroundColor: 'rgba(0,153,255,0.15)' }]}>
      <Text style={[styles.badgeText, { color: Colors.accentBlue }]}>{route}</Text>
    </View>
  );
}

function DosageFormBadge({ form }: { form: string }) {
  if (!form) return null;
  return (
    <View style={[styles.badge, { backgroundColor: Colors.surface2 }]}>
      <Text style={[styles.badgeText, { color: Colors.textSecondary }]}>{form}</Text>
    </View>
  );
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  accentColor,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={[styles.card, accentColor ? { borderLeftWidth: 3, borderLeftColor: accentColor } : undefined]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTitleRow}>
          {icon}
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {open ? (
          <ChevronUp size={18} color={Colors.textSecondary} />
        ) : (
          <ChevronDown size={18} color={Colors.textSecondary} />
        )}
      </TouchableOpacity>
      {open && <View style={styles.cardBody}>{children}</View>}
    </View>
  );
}

function InfoText({ text }: { text: string }) {
  if (!text) {
    return <Text style={styles.unavailable}>Bilgi bulunamadı</Text>;
  }
  return <Text style={styles.bodyText}>{text}</Text>;
}

export default function MedicineDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ medicine: string }>();

  let medicine: MedicineData | null = null;
  try {
    if (params.medicine) {
      medicine = JSON.parse(params.medicine) as MedicineData;
    }
  } catch {
    medicine = null;
  }

  if (!medicine) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İlaç Bilgisi</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.notFoundContainer}>
          <Pill size={48} color={Colors.textTertiary} />
          <Text style={styles.notFoundTitle}>İlaç bilgisi yüklenemedi</Text>
          <Text style={styles.notFoundText}>Lütfen tekrar deneyin.</Text>
        </View>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      const message = [
        `💊 ${medicine!.brandName}`,
        medicine!.genericName ? `Etken madde: ${medicine!.genericName}` : null,
        medicine!.manufacturer ? `Üretici: ${medicine!.manufacturer}` : null,
        medicine!.dosageForm ? `Form: ${medicine!.dosageForm}` : null,
        medicine!.purpose ? `\nKullanım amacı: ${medicine!.purpose}` : null,
      ]
        .filter(Boolean)
        .join('\n');
      await Share.share({ message });
    } catch {
      // ignore share error
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İlaç Bilgisi</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconRow}>
            {medicine.imageUrl ? (
              <Image
                source={{ uri: medicine.imageUrl }}
                style={styles.heroImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.heroIconWrapper}>
                <Pill size={40} color={Colors.accentBlue} />
              </View>
            )}
            <View style={styles.heroInfo}>
              <Text style={styles.brandName}>{medicine.brandName}</Text>
              {!!medicine.genericName && (
                <Text style={styles.genericName}>{medicine.genericName}</Text>
              )}
              {!!medicine.manufacturer && (
                <Text style={styles.manufacturer}>{medicine.manufacturer}</Text>
              )}
            </View>
          </View>

          {/* Badges */}
          <View style={styles.badgesRow}>
            <ProductTypeBadge type={medicine.productType} />
            {!!medicine.route && <RouteBadge route={medicine.route} />}
            {!!medicine.dosageForm && <DosageFormBadge form={medicine.dosageForm} />}
          </View>

          <Text style={styles.barcodeText}>{medicine.barcode}</Text>
        </View>

        {/* OFF data notice */}
        {medicine.dataSource === 'off' && (
          <View style={styles.offNoticeBanner}>
            <Info size={14} color={Colors.accentOrange} />
            <Text style={styles.offNoticeText}>
              Ürün genel ürün veritabanında bulundu. İlaç-spesifik bilgiler (etken madde, uyarı vb.) mevcut değil.
            </Text>
          </View>
        )}

        {/* Keep Out of Reach of Children */}
        {medicine.keepOutOfReachOfChildren && (
          <View style={styles.childrenWarningBanner}>
            <ShieldAlert size={18} color={Colors.accent} />
            <Text style={styles.childrenWarningText}>
              🚫 Çocukların ulaşamayacağı yerde saklayın
            </Text>
          </View>
        )}

        {/* Active Ingredients */}
        <CollapsibleSection
          title="Etken Maddeler"
          icon={<Info size={18} color={Colors.primary} />}
          defaultOpen={true}
        >
          {medicine.activeIngredients.length === 0 ? (
            <Text style={styles.unavailable}>Bilgi bulunamadı</Text>
          ) : (
            medicine.activeIngredients.map((ing, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <Text style={styles.ingredientName}>{ing.name}</Text>
                {!!ing.strength && (
                  <Text style={styles.ingredientStrength}>{ing.strength}</Text>
                )}
              </View>
            ))
          )}
        </CollapsibleSection>

        {/* Purpose & Indications */}
        {(!!medicine.purpose || !!medicine.indicationsAndUsage) && (
          <CollapsibleSection
            title="Ne İçin Kullanılır?"
            icon={<BookOpen size={18} color={Colors.accentOrange} />}
            defaultOpen={true}
          >
            {!!medicine.purpose && (
              <View style={styles.subSection}>
                <Text style={styles.subSectionLabel}>Amaç</Text>
                <Text style={styles.bodyText}>{medicine.purpose}</Text>
              </View>
            )}
            {!!medicine.indicationsAndUsage && (
              <View style={styles.subSection}>
                <Text style={styles.subSectionLabel}>Endikasyonlar ve Kullanım</Text>
                <Text style={styles.bodyText} numberOfLines={6}>
                  {medicine.indicationsAndUsage}
                </Text>
              </View>
            )}
          </CollapsibleSection>
        )}

        {/* Dosage */}
        {!!medicine.dosageAndAdministration && (
          <CollapsibleSection
            title="Nasıl Kullanılır?"
            icon={<Package size={18} color={Colors.accentBlue} />}
            defaultOpen={true}
          >
            <View style={styles.badgesRow}>
              {!!medicine.dosageForm && <DosageFormBadge form={medicine.dosageForm} />}
              {!!medicine.route && <RouteBadge route={medicine.route} />}
            </View>
            <Text style={styles.bodyText}>{medicine.dosageAndAdministration}</Text>
          </CollapsibleSection>
        )}

        {/* Warnings */}
        {(!!medicine.warnings || !!medicine.doNotUse || !!medicine.askDoctor) && (
          <CollapsibleSection
            title="⚠️ Uyarılar"
            icon={<AlertTriangle size={18} color={Colors.accent} />}
            defaultOpen={true}
            accentColor={Colors.accent}
          >
            {!!medicine.warnings && (
              <View style={styles.subSection}>
                <InfoText text={medicine.warnings} />
              </View>
            )}
            {!!medicine.doNotUse && (
              <View style={styles.subSection}>
                <Text style={styles.warningLabel}>Kullanmayın:</Text>
                <Text style={[styles.bodyText, styles.warningText]}>{medicine.doNotUse}</Text>
              </View>
            )}
            {!!medicine.askDoctor && (
              <View style={styles.subSection}>
                <Text style={styles.askDoctorLabel}>Doktora Danışın:</Text>
                <Text style={styles.bodyText}>{medicine.askDoctor}</Text>
              </View>
            )}
          </CollapsibleSection>
        )}

        {/* Inactive / All Ingredients */}
        {medicine.inactiveIngredients.length > 0 && (
          <CollapsibleSection
            title={medicine.dataSource === 'off' ? 'İçindekiler' : 'Yardımcı Maddeler'}
            icon={<Info size={18} color={Colors.textSecondary} />}
            defaultOpen={medicine.dataSource === 'off'}
          >
            {medicine.dataSource === 'off' ? (
              // Show as a clean tag list for OFF products
              <View style={styles.ingredientTagsWrap}>
                {medicine.inactiveIngredients.map((ing, idx) => (
                  <View key={idx} style={styles.ingredientTag}>
                    <Text style={styles.ingredientTagText}>{ing}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.bodyText}>
                {medicine.inactiveIngredients.join(', ')}
              </Text>
            )}
          </CollapsibleSection>
        )}

        {/* Storage */}
        {!!medicine.storageInstructions && (
          <CollapsibleSection
            title="Saklama Koşulları"
            icon={<Thermometer size={18} color={Colors.accentBlue} />}
            defaultOpen={true}
          >
            <InfoText text={medicine.storageInstructions} />
          </CollapsibleSection>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Bu bilgiler yalnızca referans amaçlıdır. Kullanmadan önce doktorunuza veya eczacınıza danışın.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },

  /* Hero */
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  heroIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  heroImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface2,
    flexShrink: 0,
  },
  heroIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,153,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  heroInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  brandName: {
    ...Typography.h2,
    color: Colors.text,
  },
  genericName: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  manufacturer: {
    ...Typography.small,
    color: Colors.textTertiary,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  badgeText: {
    ...Typography.captionMedium,
    fontSize: 12,
  },
  barcodeText: {
    ...Typography.small,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },

  /* Children warning */
  childrenWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent + '22',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    padding: Spacing.md,
  },
  childrenWarningText: {
    ...Typography.captionMedium,
    color: Colors.accent,
    flex: 1,
  },

  /* Card */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  cardTitle: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  cardBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },

  /* Ingredients */
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ingredientName: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  ingredientStrength: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
  },

  /* Sub sections */
  subSection: {
    gap: Spacing.xs,
  },
  subSectionLabel: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  warningLabel: {
    ...Typography.captionMedium,
    color: Colors.accent,
    fontWeight: '700',
  },
  askDoctorLabel: {
    ...Typography.captionMedium,
    color: Colors.accentOrange,
    fontWeight: '700',
  },

  /* Text */
  bodyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  warningText: {
    color: Colors.accent,
  },
  unavailable: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },

  /* OFF notice */
  offNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.accentOrange + '18',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.accentOrange + '40',
    padding: Spacing.md,
  },
  offNoticeText: {
    ...Typography.small,
    color: Colors.accentOrange,
    flex: 1,
    lineHeight: 17,
  },

  /* Ingredient tags (for OFF products) */
  ingredientTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  ingredientTag: {
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  ingredientTagText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },

  /* Disclaimer */
  disclaimer: {
    paddingHorizontal: Spacing.sm,
  },
  disclaimerText: {
    ...Typography.small,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },

  /* Not found */
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  notFoundTitle: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
  },
  notFoundText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
