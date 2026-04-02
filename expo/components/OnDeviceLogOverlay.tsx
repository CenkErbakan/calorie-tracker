import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  subscribeOnDeviceLog,
  clearOnDeviceLog,
  isOnDeviceLogEnabled,
  appendOnDeviceLog,
} from '@/lib/onDeviceLog';
import { Colors, Spacing } from '@/constants/theme';

/** IAP / RevenueCat debug — TestFlight’ta EXPO_PUBLIC_SHOW_DEVICE_LOGS=1 gerekir. */
export function OnDeviceLogOverlay() {
  const insets = useSafeAreaInsets();
  const [logLines, setLogLines] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!isOnDeviceLogEnabled() || Platform.OS === 'web') return;
    appendOnDeviceLog('App', 'Log paneli aktif (Gizle / Temizle)');
    return subscribeOnDeviceLog(setLogLines);
  }, []);

  useEffect(() => {
    if (expanded && logLines.length > 0) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [logLines, expanded]);

  if (!isOnDeviceLogEnabled() || Platform.OS === 'web') {
    return null;
  }

  if (!expanded) {
    return (
      <TouchableOpacity
        style={[styles.fab, { bottom: Math.max(insets.bottom, 12) + 56 }]}
        onPress={() => setExpanded(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>LOG {logLines.length > 0 ? logLines.length : ''}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}
      pointerEvents="box-none"
    >
      <View style={styles.panel} pointerEvents="auto">
        <View style={styles.toolbar}>
          <Text style={styles.toolbarTitle}>IAP log</Text>
          <View style={styles.toolbarBtns}>
            <TouchableOpacity
              style={styles.toolbarBtnPad}
              onPress={() => clearOnDeviceLog()}
              hitSlop={12}
            >
              <Text style={styles.link}>Temizle</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={12}>
              <Text style={styles.link}>Gizle</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {logLines.length === 0 ? (
            <Text style={styles.empty}>Henüz satır yok — paywall / satın alma dene</Text>
          ) : (
            logLines.map((line, i) => (
              <Text key={`${i}-${line.slice(0, 24)}`} style={styles.line} selectable>
                {line}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  panel: {
    marginHorizontal: Spacing.sm,
    maxHeight: 220,
    backgroundColor: 'rgba(17,24,39,0.94)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toolbarTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  toolbarBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarBtnPad: {
    marginRight: 16,
  },
  link: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    maxHeight: 168,
  },
  scrollContent: {
    padding: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  line: {
    color: Colors.text,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  empty: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    right: Spacing.md,
    backgroundColor: Colors.surface2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fabText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
