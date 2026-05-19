import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../../theme';
import Icon, {IconName} from '../../components/common/Icon';

function formatDriverRequirement(value?: string | null): {label: string; icon: IconName} {
  switch ((value ?? '').toUpperCase()) {
    case 'DRIVER_ONLY':      return {label: 'Driver Only',       icon: 'user'};
    case 'TRUCK_ONLY':       return {label: 'Truck Only',        icon: 'truck'};
    case 'DRIVER_WITH_TRUCK':
    default:                 return {label: 'Driver with Truck', icon: 'briefcase'};
  }
}

interface JobDiscoveryScreenProps {
  availableJobs: any[];
  appliedJobIds?: string[];
  docStatus: 'approved' | 'pending' | 'none';
  onSelectJob: (job: any) => void;
  onGoToDocuments: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const PICKUP_DATE_OPTIONS = ['All', 'Today', 'Tomorrow', 'This Week'];
const RADIUS_OPTIONS = ['All', '10 km', '25 km', '50 km', '100 km', '200 km'];

function addr(val: unknown): string {
  if (!val) {return '';}
  if (typeof val === 'string') {return val;}
  if (typeof val === 'object' && val !== null && 'address' in val) {
    return String((val as {address?: string}).address ?? '');
  }
  return String(val);
}

function matchesDateFilter(jobDate: string | undefined, filter: string): boolean {
  if (!jobDate) {return true;}
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const jd = new Date(jobDate);
  jd.setHours(0, 0, 0, 0);
  if (filter === 'Today') {
    return jd.getTime() === today.getTime();
  }
  if (filter === 'Tomorrow') {
    const tom = new Date(today);
    tom.setDate(today.getDate() + 1);
    return jd.getTime() === tom.getTime();
  }
  if (filter === 'This Week') {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    return jd >= today && jd <= weekEnd;
  }
  return true;
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
  const [cargoFilter, setCargoFilter]   = useState<string | null>(null);
  const [dateFilter, setDateFilter]     = useState<string | null>(null);
  const [radiusFilter, setRadiusFilter] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<'cargo' | 'date' | 'radius' | null>(null);

  const canApply = docStatus === 'approved';
  const appliedSet = new Set(appliedJobIds.filter(Boolean));

  // Derive unique cargo types from loaded jobs
  const cargoTypes = useMemo(() => {
    const types = new Set<string>();
    availableJobs.forEach(j => {
      const g = String(j.goodsType ?? '').trim();
      if (g) {types.add(g);}
    });
    return ['All', ...Array.from(types)];
  }, [availableJobs]);

  const filtered = availableJobs.filter(j => {
    if (cargoFilter) {
      if (String(j.goodsType ?? '').trim() !== cargoFilter) {return false;}
    }
    if (dateFilter) {
      if (!matchesDateFilter(j.jobDate, dateFilter)) {return false;}
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        String(j.jobReference ?? '').toLowerCase().includes(q) ||
        addr(j.pickupLocation).toLowerCase().includes(q) ||
        addr(j.dropLocation).toLowerCase().includes(q) ||
        String(j.goodsType ?? '').toLowerCase().includes(q) ||
        String(j.vehicleTypeRequired ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const renderJobItem = ({item}: {item: any}) => {
    const pickup = addr(item.pickupLocation) || '—';
    const drop = addr(item.dropLocation) || '—';
    const amount = item.agreedAmount ?? item.amount ?? null;
    const isUrgent =
      String(item.status ?? '').toLowerCase() === 'urgent' ||
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
          <Text style={styles.jobRef}>REF: {String(item.jobReference ?? item.jobId ?? '')}</Text>
          {amount ? (
            <Text style={styles.jobAmount}>₹{Number(amount).toLocaleString('en-IN')}</Text>
          ) : (
            <View style={styles.openBadge}>
              <Text style={styles.openBadgeText}>OPEN</Text>
            </View>
          )}
        </View>

        <Text style={styles.routeText}>{pickup}  →  {drop}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Icon name="package" size={20} color="#000000" strokeWidth={2} />
            <View>
              <Text style={styles.metaTag}>CARGO</Text>
              <Text style={styles.metaVal}>{item.goodsType || 'General Goods'}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Icon name="scale" size={20} color="#000000" strokeWidth={2} />
            <View>
              <Text style={styles.metaTag}>WEIGHT</Text>
              <Text style={styles.metaVal}>{item.weightKg ? `${item.weightKg} kg` : '—'}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Icon name="calendar" size={20} color="#000000" strokeWidth={2} />
            <View>
              <Text style={styles.metaTag}>PICKUP</Text>
              <Text style={styles.metaVal}>{item.jobDate || 'Today'}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Icon name="ruler" size={20} color="#000000" strokeWidth={2} />
            <View>
              <Text style={styles.metaTag}>DISTANCE</Text>
              <Text style={styles.metaVal}>
                {item.distanceKm ? `${item.distanceKm} km` : item.distance || '—'}
              </Text>
            </View>
          </View>
          {(() => {
            const req = formatDriverRequirement(item.driverRequirement);
            return (
              <View style={styles.metaItem}>
                <Icon name={req.icon} size={20} color="#1066B1" strokeWidth={2} />
                <View>
                  <Text style={styles.metaTag}>REQUIREMENT</Text>
                  <Text style={[styles.metaVal, styles.metaValReq]}>{req.label}</Text>
                </View>
              </View>
            );
          })()}
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

  const renderModal = (
    title: string,
    options: string[],
    selected: string | null,
    onSelect: (v: string | null) => void,
  ) => (
    <Modal
      visible={activeModal !== null}
      transparent
      animationType="slide"
      onRequestClose={() => setActiveModal(null)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setActiveModal(null)} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{title}</Text>
        {options.map(opt => {
          const isSelected = opt === 'All' ? !selected : selected === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => {
                onSelect(opt === 'All' ? null : opt);
                setActiveModal(null);
              }}
              style={[styles.modalOption, isSelected && styles.modalOptionSelected]}>
              <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                {opt}
              </Text>
              {isSelected && <Text style={styles.modalTick}>✓</Text>}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
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

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>

          {/* Cargo Type */}
          <Pressable
            onPress={() => setActiveModal('cargo')}
            style={[styles.chip, cargoFilter ? styles.chipActive : styles.chipInactive]}>
            <Icon name="package" size={14} color={cargoFilter ? '#FFFFFF' : '#1A1A1A'} strokeWidth={2} />
            <Text style={[styles.chipText, cargoFilter && styles.chipTextActive]}>
              {cargoFilter ?? 'Cargo Type'}
            </Text>
            <Text style={[styles.chipCaret, cargoFilter && styles.chipCaretActive]}>▾</Text>
          </Pressable>

          {/* Pickup Date */}
          <Pressable
            onPress={() => setActiveModal('date')}
            style={[styles.chip, dateFilter ? styles.chipActive : styles.chipInactive]}>
            <Icon name="calendar" size={14} color={dateFilter ? '#FFFFFF' : '#1A1A1A'} strokeWidth={2} />
            <Text style={[styles.chipText, dateFilter && styles.chipTextActive]}>
              {dateFilter ?? 'Pickup Date'}
            </Text>
            <Text style={[styles.chipCaret, dateFilter && styles.chipCaretActive]}>▾</Text>
          </Pressable>

          {/* Distance / Radius */}
          <Pressable
            onPress={() => setActiveModal('radius')}
            style={[styles.chip, radiusFilter ? styles.chipActive : styles.chipInactive]}>
            <Icon name="map" size={14} color={radiusFilter ? '#FFFFFF' : '#1A1A1A'} strokeWidth={2} />
            <Text style={[styles.chipText, radiusFilter && styles.chipTextActive]}>
              {radiusFilter ?? 'Distance'}
            </Text>
            <Text style={[styles.chipCaret, radiusFilter && styles.chipCaretActive]}>▾</Text>
          </Pressable>

        </ScrollView>
      </View>

      {/* ── Doc banners ─────────────────────────────────────────────────── */}
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

      {/* ── Jobs list ───────────────────────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.jobId ?? item.jobReference ?? Math.random())}
        renderItem={renderJobItem}
        contentContainerStyle={styles.listContent}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>Available Jobs</Text>
            <Text style={styles.listHeaderCount}>
              {filtered.length} {filtered.length === 1 ? 'Load' : 'Loads'} nearby
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🚛</Text>
            <Text style={styles.emptyTitle}>
              {search.trim() || cargoFilter || dateFilter ? 'No matches found' : 'No Jobs Available'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search.trim() || cargoFilter || dateFilter
                ? 'Try changing your filters.'
                : 'Check back later for new opportunities.'}
            </Text>
          </View>
        }
      />

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {activeModal === 'cargo' &&
        renderModal('Cargo Type', cargoTypes, cargoFilter, setCargoFilter)}
      {activeModal === 'date' &&
        renderModal('Pickup Date', PICKUP_DATE_OPTIONS, dateFilter, setDateFilter)}
      {activeModal === 'radius' &&
        renderModal('Distance / Radius', RADIUS_OPTIONS, radiusFilter, setRadiusFilter)}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},

  header: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EEF5FB', borderRadius: radius.lg,
    paddingHorizontal: spacing.md, minHeight: 50,
    borderWidth: 1, borderColor: '#D6E5F1',
  },
  searchIcon: {marginRight: spacing.sm, fontSize: 16},
  searchInput: {flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 8},
  clearSearch: {color: colors.inkSoft, fontSize: 16, paddingLeft: 8},

  filterRow: {gap: 8},
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1,
  },
  chipActive:   {backgroundColor: '#1066B1', borderColor: '#1066B1'},
  chipInactive: {backgroundColor: '#FFFFFF', borderColor: '#D1D9E6'},
  chipText: {color: '#374151', fontSize: 13, fontWeight: '600'},
  chipTextActive: {color: '#FFFFFF'},
  chipCaret: {color: '#6B7280', fontSize: 11},
  chipCaretActive: {color: '#FFFFFF'},

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
  docBannerBtnText: {color: colors.card, fontSize: 12, fontWeight: '900'},

  listContent: {padding: spacing.lg, paddingBottom: 110, gap: 14},
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  listHeaderTitle: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  listHeaderCount: {color: colors.inkSoft, fontSize: 13, fontWeight: '600'},

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
  jobRef: {color: colors.inkSoft, fontSize: 11, fontWeight: '700'},
  jobAmount: {color: '#1066B1', fontSize: 18, fontWeight: '900'},
  openBadge: {
    backgroundColor: '#EAF3FD', borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  openBadgeText: {color: colors.accent, fontSize: 11, fontWeight: '900'},
  routeText: {color: colors.navy, fontSize: 18, fontWeight: '900', marginBottom: 14},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16},
  metaItem: {flexBasis: '45%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8},
  metaTag: {
    color: colors.inkSoft, fontSize: 10, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  metaVal: {color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 1},
  metaValReq: {color: '#1066B1'},
  cardActions: {flexDirection: 'row', gap: 10},
  applyBtn: {
    flex: 1, backgroundColor: '#1066B1', borderRadius: radius.md,
    minHeight: 48, justifyContent: 'center', alignItems: 'center',
  },
  applyBtnLocked: {backgroundColor: '#D1D9E6'},
  applyBtnApplied: {backgroundColor: '#EBF4FF'},
  applyBtnText: {color: colors.card, fontSize: 15, fontWeight: '900'},
  applyBtnLockedText: {color: '#64748B', fontSize: 14, fontWeight: '700'},
  applyBtnAppliedText: {color: '#1066B1', fontSize: 14, fontWeight: '800'},
  detailsBtn: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 20, minHeight: 48, justifyContent: 'center', alignItems: 'center',
  },
  detailsBtnText: {color: colors.navy, fontSize: 15, fontWeight: '800'},
  emptyWrap: {alignItems: 'center', marginTop: 60, paddingHorizontal: spacing.xl},
  emptyIcon: {fontSize: 56, marginBottom: 16},
  emptyTitle: {fontSize: 20, fontWeight: '900', color: colors.navy, marginBottom: 8},
  emptySubtitle: {fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20},

  modalBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)'},
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl, paddingBottom: 40, paddingTop: 16, gap: 4,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: {color: colors.navy, fontSize: 17, fontWeight: '900', marginBottom: 12},
  modalOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, marginBottom: 2,
  },
  modalOptionSelected: {backgroundColor: '#EFF8FF'},
  modalOptionText: {color: colors.ink, fontSize: 15, fontWeight: '600'},
  modalOptionTextSelected: {color: '#1066B1', fontWeight: '800'},
  modalTick: {color: '#1066B1', fontSize: 16, fontWeight: '900'},
});

export default JobDiscoveryScreen;
