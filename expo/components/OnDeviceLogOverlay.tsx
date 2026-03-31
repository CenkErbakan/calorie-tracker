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

/**
 * Abonelik / reklam debug: ekranın altında kaydırmalı log.
 */
export function OnDeviceLogOverlay() {
  const insets = useSafeAreaInsets();
  const [logLines, setLogLines] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!isOnDeviceLogEnabled() || Platform.OS === 'web') return;
    appendOnDeviceLog('App', 'Cihaz log paneli aktif (kapat: Gizle)');
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
        <Text style={styles.fabText}>LOG {logLines.length}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}
      pointerEvents="box-none"
    >
      <View style={styles.panel} pointerEvents="auto">
        <View style={styles.toolbar}>
          <Text style={styles.title}>Cihaz logu</Text>
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
        >
          {logLines.length === 0 ? (
            <Text style={styles.empty}>Henüz satır yok (abonelik / reklam dene)</Text>
          ) : (
            logLines.map((line, i) => (
              <Text key={i} style={styles.line} selectable>
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
    zIndex: 99999,
    pointerEvents: 'box-none',
  },
  panel: {
    maxHeight: '32%',
    backgroundColor: 'rgba(10, 15, 30, 0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,212,170,0.5)',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  title: {
    color: '#00D4AA',
    fontSize: 13,
    fontWeight: '700',
  },
  toolbarBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarBtnPad: {
    marginRight: 16,
  },
  link: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    maxHeight: 220,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingBottom: 12,
  },
  line: {
    color: '#e2e8f0',
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    marginBottom: 4,
  },
  empty: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    right: 12,
    zIndex: 99999,
    backgroundColor: 'rgba(0,212,170,0.25)',
    borderWidth: 1,
    borderColor: '#00D4AA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fabText: {
    color: '#00D4AA',
    fontSize: 12,
    fontWeight: '700',
  },
});
