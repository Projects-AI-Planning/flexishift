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
  appliedJobIds?: string[];
  docStatus: 'approved' | 'pending' | 'none';
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
  appliedJobIds = [],
  docStatus,
  onSelectJob,
  onGoToDocuments,
  onRefresh,
  refreshing,
}) => {
  const [search, setSearch] = useState('');
  const canApply = docStatus === 'approved' || docStatus === 'none';
  const appliedSet = new Set(appliedJobIds.filter(Boolean));

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
    const isApplied = appliedSet.has(String(item.jobId ?? ''));

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
              <Text style={styles.metaVal}>{item.weightKg ? `${item.weightKg} kg` : item.weight || '—'}</Text>
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
              <Text style={styles.metaTag}>DISTANCE</Text>
              <Text style={styles.metaVal}>
                {item.distanceKm ? `${item.distanceKm} km` : item.distance || '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          {isApplied ? (
            <View style={[styles.applyBtn, styles.applyBtnApplied]}>
              <Text style={styles.applyBtnAppliedText}>✓  Already Applied</Text>
            </View>
          ) : canApply ? (
            <Pressable onPress={() => onSelectJob(item)} style={styles.applyBtn}>
              <Text style={styles.applyBtnText}>Apply Now</Text>
            </Pressable>
          ) : (
            <Pressable onPress={onGoToDocuments} style={[styles.applyBtn, styles.applyBtnLocked]}>
              <Text style={styles.applyBtnLockedText}>🔒  Pending Approval</Text>
            </Pressable>
          )}
          <Pressable onPress={() => onSelectJob(item)} style={styles.detailsBtn}>
            <Text style={styles.detailsBtnText}>Details</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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

      {docStatus === 'pending' && (
        <View style={styles.docBanner}>
          <Text style={styles.docBannerIcon}>⏳</Text>
          <View style={{flex: 1}}>
            <Text style={styles.docBannerTitle}>Documents under review</Text>
            <Text style={styles.docBannerBody}>
              Admin is reviewing your documents. You can browse jobs now — Apply will unlock once approved.
            </Text>
          </View>
          <Pressable onPress={onGoToDocuments} style={styles.docBannerBtn}>
            <Text style={styles.docBannerBtnText}>View</Text>
          </Pressable>
        </View>
      )}

      {docStatus === 'none' && (
        <View style={[styles.docBanner, styles.docBannerWarn]}>
          <Text style={styles.docBannerIcon}>📋</Text>
          <View style={{flex: 1}}>
            <Text style={styles.docBannerTitle}>Documents not uploaded</Text>
            <Text style={styles.docBannerBody}>
              Upload your driving licence and vehicle docs to start applying for jobs.
            </Text>
          </View>
          <Pressable onPress={onGoToDocuments} style={styles.docBannerBtn}>
            <Text style={styles.docBannerBtnText}>Upload</Text>
          </Pressable>
        </View>
      )}

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
              {filtered.length} {filtered.length === 1 ? 'job' : 'jobs'} available
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},

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

  docBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EFF8FF', borderBottomWidth: 1, borderBottomColor: '#BAD9F5',
    paddingHorizontal: spacing.xl, paddingVertical: 12,
  },
  docBannerWarn: {backgroundColor: '#FFFBEB', borderBottomColor: '#FCD34D'},
  docBannerIcon: {fontSize: 20, marginTop: 1},
  docBannerTitle: {fontSize: 13, fontWeight: '900', color: colors.navy, marginBottom: 2},
  docBannerBody: {fontSize: 12, color: colors.inkSoft, lineHeight: 17},
  docBannerBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'center',
  },
  docBannerBtnText: {color: colors.navy, fontSize: 12, fontWeight: '900'},

  listContent: {padding: spacing.xl, paddingBottom: 110, gap: 14},
  countLabel: {
    color: colors.inkSoft, fontSize: 13, fontWeight: '700',
    marginBottom: 4, letterSpacing: 0.3,
  },

  jobCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl, overflow: 'hidden',
  },
  jobCardUrgent: {borderColor: '#F59E0B', borderWidth: 2},
  urgentBadge: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10},
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

  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16},
  metaItem: {flexBasis: '45%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8},
  metaIcon: {fontSize: 16},
  metaTag: {
    color: colors.inkSoft, fontSize: 10, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  metaVal: {color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 1},

  cardActions: {flexDirection: 'row', gap: 10},
  applyBtn: {
    flex: 1, backgroundColor: '#1066B1', borderRadius: radius.md,
    minHeight: 48, justifyContent: 'center', alignItems: 'center',
  },
  applyBtnLocked: {backgroundColor: '#D1D9E6'},
  applyBtnApplied: {backgroundColor: '#E8F5E9'},
  applyBtnText: {color: colors.card, fontSize: 15, fontWeight: '900'},
  applyBtnLockedText: {color: '#64748B', fontSize: 14, fontWeight: '700'},
  applyBtnAppliedText: {color: '#2E7D32', fontSize: 14, fontWeight: '800'},
  detailsBtn: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 20, minHeight: 48, justifyContent: 'center', alignItems: 'center',
  },
  detailsBtnText: {color: colors.navy, fontSize: 15, fontWeight: '800'},

  emptyWrap: {alignItems: 'center', marginTop: 60, paddingHorizontal: spacing.xl},
  emptyIcon: {fontSize: 56, marginBottom: 16},
  emptyTitle: {fontSize: 20, fontWeight: '900', color: colors.navy, marginBottom: 8},
  emptySubtitle: {fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20},
});

export default JobDiscoveryScreen;
