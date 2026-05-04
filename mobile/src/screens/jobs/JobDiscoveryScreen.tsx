import React, {useState} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';

interface JobDiscoveryScreenProps {
  availableJobs: any[];
  documentsApproved: boolean;
  onSelectJob: (job: any) => void;
  onGoToDocuments: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

function addr(val: unknown): string {
  if (!val) {return '';}
  if (typeof val === 'string') {return val;}
  if (typeof val === 'object' && val !== null && 'address' in val) {
    return String((val as {address?: string}).address ?? '');
  }
  return String(val);
}

const JobDiscoveryScreen: React.FC<JobDiscoveryScreenProps> = ({
  availableJobs,
  documentsApproved,
  onSelectJob,
  onGoToDocuments,
  onRefresh,
  refreshing,
}) => {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? availableJobs.filter(j => {
        const q = search.toLowerCase();
        return (
          String(j.jobReference ?? '').toLowerCase().includes(q) ||
          addr(j.pickupLocation).toLowerCase().includes(q) ||
          addr(j.dropLocation).toLowerCase().includes(q) ||
          String(j.goodsType ?? '').toLowerCase().includes(q) ||
          String(j.vehicleTypeRequired ?? '').toLowerCase().includes(q)
        );
      })
    : availableJobs;

  const renderJobItem = ({item}: {item: any}) => {
    const pickup = addr(item.pickupLocation) || '—';
    const drop = addr(item.dropLocation) || '—';
    const amount = item.agreedAmount ?? item.amount ?? null;
    const isUrgent = String(item.status ?? '').toLowerCase() === 'urgent' ||
      String(item.jobReference ?? '').includes('URGENT');

    return (
      <View style={[styles.jobCard, isUrgent && styles.jobCardUrgent]}>
        {isUrgent && (
          <View style={styles.urgentBadge}>
            <View style={styles.urgentDot} />
            <Text style={styles.urgentText}>URGENT PICKUP</Text>
          </View>
        )}

        <View style={styles.jobCardTop}>
          <View style={styles.refWrap}>
            <Text style={styles.jobRef}>REF: {String(item.jobReference ?? item.jobId ?? '')}</Text>
          </View>
          {amount ? (
            <Text style={styles.jobAmount}>
              ₹{Number(amount).toLocaleString('en-IN')}
            </Text>
          ) : (
            <View style={styles.openBadge}>
              <Text style={styles.openBadgeText}>OPEN</Text>
            </View>
          )}
        </View>

        <Text style={styles.routeText}>{pickup}  →  {drop}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📦</Text>
            <View>
              <Text style={styles.metaTag}>CARGO</Text>
              <Text style={styles.metaVal}>{item.goodsType || 'General Goods'}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>⚖️</Text>
            <View>
              <Text style={styles.metaTag}>WEIGHT</Text>
              <Text style={styles.metaVal}>{item.weight || '—'}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📅</Text>
            <View>
              <Text style={styles.metaTag}>PICKUP</Text>
              <Text style={styles.metaVal}>{item.jobDate || 'Today'}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📏</Text>
            <View>
              <Text style={styles.metaTag}>DURATION</Text>
              <Text style={styles.metaVal}>{item.distance || '—'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          <Pressable
            onPress={() => onSelectJob(item)}
            style={styles.applyBtn}>
            <Text style={styles.applyBtnText}>Apply Now</Text>
          </Pressable>
          <Pressable
            onPress={() => onSelectJob(item)}
            style={styles.detailsBtn}>
            <Text style={styles.detailsBtnText}>Details</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // Document gate — show locked state if not verified
  const DocumentGate = () => (
    <View style={styles.gateWrap}>
      <View style={styles.gateIconCircle}>
        <Text style={styles.gateIcon}>🔒</Text>
      </View>
      <Text style={styles.gateTitle}>Jobs Locked</Text>
      <Text style={styles.gateSubtitle}>
        Job requests are restricted until all documents are approved by the admin.
      </Text>
      <View style={styles.gateSteps}>
        {['Upload your documents', 'Admin reviews within 24 hrs', 'Jobs unlock automatically'].map(
          (step, i) => (
            <View key={i} style={styles.gateStep}>
              <View style={[styles.gateStepNum, i === 0 && styles.gateStepActive]}>
                <Text style={styles.gateStepNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.gateStepText, i === 0 && styles.gateStepTextActive]}>
                {step}
              </Text>
            </View>
          ),
        )}
      </View>
      <Pressable onPress={onGoToDocuments} style={styles.gateBtn}>
        <Text style={styles.gateBtnText}>Upload Documents  →</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Available Jobs</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by location or load..."
            placeholderTextColor="#7A8699"
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {!documentsApproved ? (
        <DocumentGate />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.jobId ?? item.jobReference ?? Math.random())}
          renderItem={renderJobItem}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListHeaderComponent={
            filtered.length > 0 ? (
              <Text style={styles.countLabel}>
                {filtered.length} {filtered.length === 1 ? 'job' : 'jobs'} nearby
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🚛</Text>
              <Text style={styles.emptyTitle}>
                {search.trim() ? 'No matches found' : 'No Jobs Available'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search.trim()
                  ? 'Try a different search term.'
                  : 'Check back later for new opportunities in your area.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},

  // Header
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: {fontSize: 28, fontWeight: '900', color: colors.navy, marginBottom: spacing.md},
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EEF5FB', borderRadius: radius.lg,
    paddingHorizontal: spacing.md, minHeight: 50,
    borderWidth: 1, borderColor: '#D6E5F1',
  },
  searchIcon: {marginRight: spacing.sm, fontSize: 16},
  searchInput: {flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 8},
  clearSearch: {color: colors.inkSoft, fontSize: 16, paddingLeft: 8},

  listContent: {padding: spacing.xl, paddingBottom: 110, gap: 14},
  countLabel: {
    color: colors.inkSoft, fontSize: 13, fontWeight: '700',
    marginBottom: 4, letterSpacing: 0.3,
  },

  // Job Card
  jobCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl, overflow: 'hidden',
  },
  jobCardUrgent: {borderColor: '#F59E0B', borderWidth: 2},
  urgentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10,
  },
  urgentDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#F59E0B'},
  urgentText: {color: '#92620A', fontSize: 11, fontWeight: '900', letterSpacing: 0.5},
  jobCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  refWrap: {},
  jobRef: {color: colors.inkSoft, fontSize: 11, fontWeight: '700'},
  jobAmount: {color: '#16A34A', fontSize: 18, fontWeight: '900'},
  openBadge: {
    backgroundColor: '#EAF3FD', borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  openBadgeText: {color: colors.accent, fontSize: 11, fontWeight: '900'},
  routeText: {color: colors.navy, fontSize: 18, fontWeight: '900', marginBottom: 14},

  // Meta grid
  metaGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16,
  },
  metaItem: {
    flexBasis: '45%', flexGrow: 1,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  metaIcon: {fontSize: 16},
  metaTag: {
    color: colors.inkSoft, fontSize: 10, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  metaVal: {color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 1},

  // Actions
  cardActions: {flexDirection: 'row', gap: 10},
  applyBtn: {
    flex: 1, backgroundColor: colors.navy, borderRadius: radius.md,
    minHeight: 48, justifyContent: 'center', alignItems: 'center',
  },
  applyBtnText: {color: colors.card, fontSize: 15, fontWeight: '900'},
  detailsBtn: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 20, minHeight: 48, justifyContent: 'center', alignItems: 'center',
  },
  detailsBtnText: {color: colors.navy, fontSize: 15, fontWeight: '800'},

  // Document Gate
  gateWrap: {
    flex: 1, padding: spacing.xl, paddingTop: 40, alignItems: 'center',
  },
  gateIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF3D5', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  gateIcon: {fontSize: 34},
  gateTitle: {color: colors.navy, fontSize: 22, fontWeight: '900', marginBottom: 10, textAlign: 'center'},
  gateSubtitle: {
    color: colors.inkSoft, fontSize: 14, lineHeight: 21,
    textAlign: 'center', marginBottom: 28, maxWidth: 300,
  },
  gateSteps: {alignSelf: 'stretch', gap: 14, marginBottom: 28},
  gateStep: {flexDirection: 'row', alignItems: 'center', gap: 14},
  gateStepNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#D1D9E6', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  gateStepActive: {backgroundColor: colors.accent},
  gateStepNumText: {color: '#fff', fontSize: 14, fontWeight: '900'},
  gateStepText: {color: colors.inkSoft, fontSize: 14, flex: 1},
  gateStepTextActive: {color: colors.ink, fontWeight: '700'},
  gateBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    minHeight: 56, paddingHorizontal: 32,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch',
  },
  gateBtnText: {color: '#fff', fontSize: 16, fontWeight: '800'},

  // Empty state
  emptyWrap: {alignItems: 'center', marginTop: 60, paddingHorizontal: spacing.xl},
  emptyIcon: {fontSize: 56, marginBottom: 16},
  emptyTitle: {fontSize: 20, fontWeight: '900', color: colors.navy, marginBottom: 8},
  emptySubtitle: {fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20},
});

export default JobDiscoveryScreen;
