import React, {useMemo, useState} from 'react';
import {fmtMoney, currencySymbol} from '../../utils/currency';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

import {colors, spacing, radius, shadow} from '../../theme';
import Icon from '../../components/common/Icon';
import JobSearchLockedScreen, {AvailabilityGateInfo} from '../jobs/JobSearchLockedScreen';

type TabKey = 'available' | 'quotes' | 'mine' | 'history';

interface StopItem {
  address: string;
  order?: number;
  deliveryTime?: string;
  isFinalDestination?: boolean;
}

interface ShiftItem {
  shiftId: string;
  shiftRef: string;
  requirementType: string;
  startDate: string;
  hoursPerDay: number;
  pickupAddress?: string;
  dropAddress?: string;
  location?: string;
  goodsType?: string;
  reportingLocation?: string;
  stops?: StopItem[];
  accessCode?: string;
  loadCode?: string;
  jobTime?: string;
  specialInstructions?: string;
  distanceKm?: number;
  durationMin?: number;
  notes?: string;
  dailyRate?: number;
  status: string;
  daysCompleted?: number;
  selectedDriverId?: string;
  pickupLat?: number;
  pickupLng?: number;
  currentDayEscrowed?: boolean;
  handoverSubmitted?: boolean;
  handoverHaulierSigned?: boolean;
}

interface ShiftQuoteItem {
  quoteId: string;
  shiftId: string;
  amountPerDay: number;
  totalAmount: number;
  status: string;
  notes?: string;
  createdAt?: string;
  shiftRef?: string;
  startDate?: string;
  hoursPerDay?: number;
  reportingLocation?: string;
  pickupAddress?: string;
  dropAddress?: string;
  location?: string;
  shiftStatus?: string;
}

interface ShiftsScreenProps {
  availableShifts: ShiftItem[];
  myShifts: ShiftItem[];
  myShiftQuotes: ShiftQuoteItem[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  currency?: string;
  onSubmitQuote: (shiftId: string, amountPerDay: number, notes: string) => Promise<void>;
  onEditShiftQuote: (shiftId: string, amountPerDay: number, notes: string) => Promise<void>;
  onWithdrawQuote: (shiftId: string) => Promise<void>;
  onCancelShift: (shiftId: string) => Promise<void>;
  onStartDay?: (shiftId: string) => Promise<void>;
  canBrowse?: boolean;
  gateInfo?: AvailabilityGateInfo & {canAccess?: boolean};
  onGoToDocuments?: () => void;
  onGoToProfile?: () => void;
  onGoToAvailability?: () => void;
  paymentSetupComplete?: boolean;
  onGoToPaymentSetup?: () => void;
}

const REQ_LABELS: Record<string, string> = {
  DRIVER_ONLY:      'Driver Only',
  TRUCK_WITH_DRIVER:'Truck + Driver',
  TRUCK_ONLY:       'Truck Only',
};

const QUOTE_STATUS: Record<string, {label: string; bg: string; text: string; border: string}> = {
  PENDING:   {label: 'Quote Submitted', bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE'},
  ACCEPTED:  {label: 'Accepted',        bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC'},
  REJECTED:  {label: 'Not Selected',    bg: '#FEE2E2', text: '#DC2626', border: '#FECACA'},
  WITHDRAWN: {label: 'Withdrawn',       bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0'},
};

const RADIUS_OPTIONS   = ['All', '10 km', '25 km', '50 km', '100 km', '200 km'];
const DATE_OPTIONS     = ['All', 'This Week', 'Next Week', 'This Month'];
const REQ_FILTER_OPTS  = ['All', 'Driver Only', 'Truck + Driver', 'Truck Only'];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchesStartDateFilter(startDate: string | undefined, filter: string): boolean {
  if (!startDate) {return true;}
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sd = new Date(startDate);
  sd.setHours(0, 0, 0, 0);
  if (filter === 'This Week') {
    const end = new Date(today);
    end.setDate(today.getDate() + 7);
    return sd >= today && sd <= end;
  }
  if (filter === 'Next Week') {
    const start = new Date(today);
    start.setDate(today.getDate() + 8);
    const end = new Date(today);
    end.setDate(today.getDate() + 14);
    return sd >= start && sd <= end;
  }
  if (filter === 'This Month') {
    return sd.getMonth() === today.getMonth() && sd.getFullYear() === today.getFullYear();
  }
  return true;
}

// ─── Available Shift Card (job-style) ─────────────────────────────────────────

function AvailableShiftCard({
  shift,
  myQuote,
  driverLocation,
  onQuote,
  onWithdraw,
  onEdit,
  onResubmit,
}: {
  shift: ShiftItem;
  myQuote?: ShiftQuoteItem;
  driverLocation: {latitude: number; longitude: number} | null;
  onQuote: (shift: ShiftItem) => void;
  onWithdraw: (shiftId: string) => void;
  onEdit?: (quote: ShiftQuoteItem) => void;
  onResubmit?: (quote: ShiftQuoteItem) => void;
}) {
  const sym = currencySymbol(shift.currency);
  const [expanded, setExpanded] = useState(false);

  const qStatus = myQuote?.status?.toUpperCase();
  const qCfg = qStatus ? QUOTE_STATUS[qStatus] : null;
  const canQuote = shift.status === 'OPEN' && !qStatus;
  const isPending = qStatus === 'PENDING';
  const isWithdrawn = qStatus === 'WITHDRAWN';

  const distFromDriver =
    driverLocation && shift.pickupLat != null && shift.pickupLng != null
      ? haversineKm(driverLocation.latitude, driverLocation.longitude, shift.pickupLat, shift.pickupLng)
      : null;

  const QuoteAction = () => (
    canQuote ? (
      <Pressable onPress={() => onQuote(shift)} style={styles.applyBtn}>
        <Text style={styles.applyBtnText}>Submit Quote</Text>
      </Pressable>
    ) : isPending ? (
      <View style={styles.quoteActionsRow}>
        <Pressable onPress={() => myQuote && onEdit && onEdit(myQuote)} style={[styles.applyBtn, styles.applyBtnEdit]}>
          <Text style={styles.applyBtnEditText}>✏  Edit Quote</Text>
        </Pressable>
        <Pressable onPress={() => onWithdraw(shift.shiftId)} style={[styles.applyBtn, styles.applyBtnWithdraw]}>
          <Text style={styles.applyBtnWithdrawText}>Withdraw</Text>
        </Pressable>
      </View>
    ) : isWithdrawn ? (
      <Pressable onPress={() => myQuote && onResubmit && onResubmit(myQuote)} style={[styles.applyBtn, styles.applyBtnReapply]}>
        <Text style={styles.applyBtnReapplyText}>↩  Reapply</Text>
      </Pressable>
    ) : (
      <View style={[styles.applyBtn, styles.applyBtnLocked]}>
        <Text style={styles.applyBtnLockedText}>
          {qStatus === 'ACCEPTED' ? '✓  Accepted' : '✓  Already Quoted'}
        </Text>
      </View>
    )
  );

  return (
    <View style={styles.jobCard}>
      {/* Top row */}
      <View style={styles.jobCardTop}>
        <View>
          <Text style={styles.jobRef}>REF: {shift.shiftRef}</Text>
          {distFromDriver !== null && (
            <Text style={styles.distFromDriver}>
              📍 {distFromDriver < 1
                ? `${Math.round(distFromDriver * 1000)} m away`
                : `${distFromDriver.toFixed(1)} km away`}
            </Text>
          )}
        </View>
        {shift.dailyRate ? (
          <Text style={styles.jobAmount}>
            ${Number(shift.dailyRate).toLocaleString('en-US')}
          </Text>
        ) : qCfg ? (
          <View style={[styles.statusPill, {backgroundColor: qCfg.bg, borderColor: qCfg.border}]}>
            <Text style={[styles.statusPillText, {color: qCfg.text}]}>{qCfg.label}</Text>
          </View>
        ) : (
          <View style={styles.openBadge}>
            <Text style={styles.openBadgeText}>OPEN</Text>
          </View>
        )}
      </View>

      {/* Reporting Location */}
      {shift.reportingLocation ? (
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText} numberOfLines={2}>{shift.reportingLocation}</Text>
        </View>
      ) : null}

      {/* Goods Type */}
      {shift.goodsType ? (
        <View style={styles.goodsRow}>
          <Text style={styles.goodsLabel}>Goods: </Text>
          <Text style={styles.goodsValue}>{shift.goodsType}</Text>
        </View>
      ) : null}

      {/* Meta grid */}
      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Icon name="calendar" size={20} color="#000000" strokeWidth={2} />
          <View>
            <Text style={styles.metaTag}>DATE</Text>
            <Text style={styles.metaVal}>{shift.startDate}</Text>
          </View>
        </View>
        <View style={styles.metaItem}>
          <Icon name="clock" size={20} color="#000000" strokeWidth={2} />
          <View>
            <Text style={styles.metaTag}>HOURS</Text>
            <Text style={styles.metaVal}>{shift.hoursPerDay}h</Text>
          </View>
        </View>
        {shift.jobTime ? (
          <View style={styles.metaItem}>
            <Icon name="alarm" size={20} color="#000000" strokeWidth={2} />
            <View>
              <Text style={styles.metaTag}>DELIVER BY</Text>
              <Text style={styles.metaVal}>{shift.jobTime}</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <Icon name="briefcase" size={20} color="#1066B1" strokeWidth={2} />
          <View>
            <Text style={styles.metaTag}>REQUIREMENT</Text>
            <Text style={[styles.metaVal, styles.metaValReq]}>
              {REQ_LABELS[shift.requirementType] ?? shift.requirementType}
            </Text>
          </View>
        </View>
      </View>

      {/* Quote submitted box */}
      {myQuote && (
        <View style={styles.quoteAmountBox}>
          <Text style={styles.quoteAmountLabel}>Your quote</Text>
          <View style={styles.quoteAmountRow}>
            <Text style={styles.quoteAmountVal}>{sym}{myQuote.amountPerDay.toLocaleString()}</Text>
          </View>
        </View>
      )}

      {shift.notes ? <Text style={styles.notesText}>{shift.notes}</Text> : null}

      {/* Actions row: Submit Quote + View Details */}
      <View style={styles.cardActions}>
        <QuoteAction />
        <Pressable
          onPress={() => setExpanded(p => !p)}
          style={styles.detailsToggleBtn}>
          <Text style={styles.detailsToggleBtnText}>
            {expanded ? 'Hide Details' : 'View Details'}
          </Text>
        </Pressable>
      </View>

      {/* ── Expanded details panel ── */}
      {expanded && (
        <View style={styles.expandedPanel}>

          {/* Location */}
          {shift.reportingLocation ? (
            <>
              <Text style={styles.expandedSectionLabel}>Location</Text>
              <View style={styles.expandedInfoRow}>
                <Text style={styles.expandedInfoLabel}>Reporting Location</Text>
                <Text style={styles.expandedInfoValue}>{shift.reportingLocation}</Text>
              </View>
              <View style={styles.expandedDivider} />
            </>
          ) : null}

          {/* Schedule */}
          <Text style={styles.expandedSectionLabel}>Schedule</Text>
          <View style={styles.expandedInfoRow}>
            <Text style={styles.expandedInfoLabel}>Date</Text>
            <Text style={styles.expandedInfoValue}>{shift.startDate}</Text>
          </View>
          <View style={styles.expandedInfoRow}>
            <Text style={styles.expandedInfoLabel}>Hours</Text>
            <Text style={styles.expandedInfoValue}>{shift.hoursPerDay}h</Text>
          </View>
          {shift.jobTime ? (
            <View style={styles.expandedInfoRow}>
              <Text style={styles.expandedInfoLabel}>Deliver By</Text>
              <Text style={styles.expandedInfoValue}>{shift.jobTime}</Text>
            </View>
          ) : null}

          {/* Divider */}
          <View style={styles.expandedDivider} />

          {/* Job Details */}
          <Text style={styles.expandedSectionLabel}>Job Details</Text>
          <View style={styles.expandedInfoRow}>
            <Text style={styles.expandedInfoLabel}>Requirement</Text>
            <Text style={styles.expandedInfoValue}>{REQ_LABELS[shift.requirementType] ?? shift.requirementType}</Text>
          </View>
          {shift.goodsType ? (
            <View style={styles.expandedInfoRow}>
              <Text style={styles.expandedInfoLabel}>Goods Type</Text>
              <Text style={styles.expandedInfoValue}>{shift.goodsType}</Text>
            </View>
          ) : null}
          {(shift.distanceKm != null || shift.durationMin != null) ? (
            <View style={styles.expandedInfoRow}>
              <Text style={styles.expandedInfoLabel}>Distance</Text>
              <Text style={styles.expandedInfoValue}>
                {[
                  shift.distanceKm != null ? `${shift.distanceKm} km` : null,
                  shift.durationMin != null ? `${Math.round(shift.durationMin / 60 * 10) / 10} hrs` : null,
                ].filter(Boolean).join('  ·  ')}
              </Text>
            </View>
          ) : null}
          {shift.specialInstructions ? (
            <>
              <View style={styles.expandedDivider} />
              <Text style={styles.expandedSectionLabel}>Special Instructions</Text>
              <Text style={styles.expandedInstructions}>{shift.specialInstructions}</Text>
            </>
          ) : null}
          {shift.notes ? (
            <>
              <View style={styles.expandedDivider} />
              <Text style={styles.expandedSectionLabel}>Notes</Text>
              <Text style={styles.expandedInstructions}>{shift.notes}</Text>
            </>
          ) : null}

          {/* Submit Quote repeated at bottom */}
          <View style={[styles.cardActions, {marginTop: 6}]}>
            <QuoteAction />
          </View>
        </View>
      )}
    </View>
  );
}

// ─── QuoteCard (My Quotes tab) ────────────────────────────────────────────────

function QuoteCard({
  quote,
  onWithdraw,
  onGoToBooked,
  onEdit,
  onResubmit,
}: {
  quote: ShiftQuoteItem;
  onWithdraw: (shiftId: string) => void;
  onGoToBooked?: () => void;
  onEdit?: (quote: ShiftQuoteItem) => void;
  onResubmit?: (quote: ShiftQuoteItem) => void;
}) {
  const sym = currencySymbol(quote.currency);
  const statusUpper = (quote.status ?? '').toUpperCase();
  const isAccepted = statusUpper === 'ACCEPTED';
  const isPending  = statusUpper === 'PENDING';
  const isDeclined = statusUpper === 'REJECTED' || statusUpper === 'WITHDRAWN';

  // Disable Withdraw when the shift's start date has passed
  const shiftDatePassed = (() => {
    const sd: string | null = quote.startDate ?? null;
    if (!sd) {return false;}
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(String(sd).slice(0, 10) + 'T00:00:00');
    return d < today;
  })();

  const statusLabel =
    isPending  ? 'Pending'   :
    isAccepted ? 'Accepted'  :
    statusUpper === 'REJECTED' ? 'Declined' :
                                  'Withdrawn';

  const reportingLoc = quote.reportingLocation || quote.location || null;

  return (
    <View style={[styles.qCard, isAccepted && styles.qCardAccepted]}>

      {/* Top row: ref + status badge */}
      <View style={styles.qCardHeader}>
        <View style={styles.qHeaderLeft}>
          <Text style={styles.qRef} numberOfLines={1}>
            {quote.shiftRef ?? `Shift #${quote.shiftId.slice(-6)}`}
          </Text>
          {quote.createdAt ? (
            <Text style={styles.qSubmittedAt}>
              {new Date(quote.createdAt).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
        <View style={[
          styles.qStatusBadge,
          isAccepted ? styles.qBadgeBlue :
          isDeclined ? styles.qBadgeRed  :
                       styles.qBadgeGrey,
        ]}>
          <Text style={[
            styles.qStatusText,
            isAccepted ? styles.qStatusBlue :
            isDeclined ? styles.qStatusRed  :
                         styles.qStatusGrey,
          ]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Reporting Location */}
      {reportingLoc ? (
        <View style={styles.qRouteRow}>
          <View style={[styles.qDot, styles.qDotBlue]} />
          <Text style={styles.qRouteText} numberOfLines={1}>{reportingLoc}</Text>
        </View>
      ) : null}

      {/* Stats */}
      <View style={styles.qStatsRow}>
        <View style={styles.qStatBox}>
          <Text style={styles.qStatLabel}>Rate</Text>
          <Text style={styles.qStatValue}>{sym}{quote.amountPerDay.toLocaleString()}</Text>
        </View>
      </View>

      {quote.notes ? (
        <Text style={styles.qNotesText} numberOfLines={2}>"{quote.notes}"</Text>
      ) : null}

      {/* Accepted */}
      {isAccepted && (
        <>
          <View style={styles.qAcceptedBanner}>
            <Text style={styles.qAcceptedIcon}>🎉</Text>
            <View style={{flex: 1}}>
              <Text style={styles.qAcceptedTitle}>Your quote was accepted!</Text>
              <Text style={styles.qAcceptedSub}>Shift is booked! Tap below to view it and start each day once the haulier pays.</Text>
            </View>
          </View>
          {onGoToBooked && (
            <Pressable
              onPress={onGoToBooked}
              style={styles.startShiftBtn}>
              <Text style={styles.startShiftBtnText}>🚛  View Booked Shift</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Pending — Edit + Withdraw */}
      {isPending && (
        <View style={{gap: 8}}>
          {onEdit && !shiftDatePassed && (
            <Pressable
              onPress={() => onEdit(quote)}
              style={styles.qEditBtn}>
              <Text style={styles.qEditText}>✏️  Edit Quote</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => { if (!shiftDatePassed) { onWithdraw(quote.shiftId); } }}
            disabled={shiftDatePassed}
            style={[styles.qWithdrawBtn, shiftDatePassed && styles.qWithdrawBtnDisabled]}>
            <Text style={[styles.qWithdrawText, shiftDatePassed && styles.qWithdrawTextDisabled]}>
              {shiftDatePassed ? '⏰  Shift Date Passed' : 'Withdraw Quote'}
            </Text>
          </Pressable>
          {shiftDatePassed && (
            <Text style={styles.qExpiredNote}>
              This shift's start date has passed — withdrawal is no longer available.
            </Text>
          )}
        </View>
      )}

      {/* Withdrawn — Re-submit */}
      {isDeclined && statusUpper === 'WITHDRAWN' && onResubmit && !shiftDatePassed && (
        <Pressable
          onPress={() => onResubmit(quote)}
          style={styles.qResubmitBtn}>
          <Text style={styles.qResubmitText}>↩  Re-submit Quote</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Booked Shift Card (My Shifts tab) ────────────────────────────────────────

function BookedShiftCard({
  shift,
  onCancel,
  isOngoing = false,
  onStartDay,
}: {
  shift: ShiftItem;
  onCancel: (shiftId: string) => void;
  isOngoing?: boolean;
  onStartDay?: (shiftId: string) => void;
}) {
  const sym = currencySymbol(shift.currency);
  const [expanded, setExpanded] = useState(false);
  const canCancel = !['COMPLETED', 'CANCELLED'].includes(shift.status);
  const isInProgress = shift.status === 'IN_PROGRESS';
  const isBooked     = shift.status === 'BOOKED';
  const locationLine = shift.reportingLocation
    || shift.location
    || '—';

  const badgeLabel = isInProgress ? 'IN PROGRESS' : isBooked ? 'BOOKED' : shift.status.replace(/_/g, ' ');
  const badgeBg    = isInProgress ? '#D97706' : isBooked ? '#1066B1' : '#6B7280';

  return (
    <View style={[styles.listCard, styles.upcomingCard]}>
      <View style={styles.cardTopRow}>
        <View style={{flex: 1}}>
          <Text style={styles.listTitle}>{shift.shiftRef}</Text>
          <Text style={styles.listMeta}>{locationLine}</Text>
          <Text style={styles.listMetaSub}>{shift.startDate} · {shift.hoursPerDay}h</Text>
        </View>
        <Text style={[styles.upcomingBadge, {backgroundColor: badgeBg}]}>
          {badgeLabel}
        </Text>
      </View>

      {shift.dailyRate ? (
        <Text style={styles.amountText}>
          ${shift.dailyRate.toLocaleString()}
        </Text>
      ) : null}

      {/* ── Day-start panel (shown for all active shifts) ── */}
      {isOngoing && (
        (shift.handoverSubmitted && shift.handoverHaulierSigned) ? (
          <Pressable
            onPress={() => onStartDay && onStartDay(shift.shiftId)}
            style={styles.startDayBtn}>
            <Text style={styles.startDayBtnText}>▶  Continue Shift Trip</Text>
          </Pressable>
        ) : (shift.handoverSubmitted && !shift.handoverHaulierSigned) ? (
          <View style={styles.awaitingPayBanner}>
            <Text style={styles.awaitingPayText}>
              🔏  Handover submitted — awaiting haulier signature
            </Text>
          </View>
        ) : shift.currentDayEscrowed ? (
          <Pressable
            onPress={() => onStartDay && onStartDay(shift.shiftId)}
            style={styles.startDayBtn}>
            <Text style={styles.startDayBtnText}>🚛  Start Shift</Text>
          </Pressable>
        ) : (
          <View style={styles.awaitingPayBanner}>
            <Text style={styles.awaitingPayText}>
              ⏳  Waiting for haulier to release payment before you can begin
            </Text>
          </View>
        )
      )}

      <View style={styles.listActionRow}>
        <Pressable
          onPress={() => setExpanded(p => !p)}
          style={styles.listActionSecondary}>
          <Text style={styles.listActionSecondaryText}>
            {expanded ? 'Hide Details' : 'View Details'}
          </Text>
        </Pressable>
        {canCancel && (
          <Pressable
            onPress={() => onCancel(shift.shiftId)}
            style={styles.listActionCancel}>
            <Text style={styles.listActionCancelText}>Cancel Shift</Text>
          </Pressable>
        )}
      </View>

      {expanded && (
        <View style={styles.detailsBox}>

          {/* ── Location ── */}
          {shift.reportingLocation ? (
            <>
              <Text style={styles.detailSection}>Location</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Reporting Location</Text>
                <Text style={styles.detailValue}>{shift.reportingLocation}</Text>
              </View>
            </>
          ) : null}
          {(shift.distanceKm != null || shift.durationMin != null) && (
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Distance / Time</Text>
              <Text style={styles.detailValue}>
                {[
                  shift.distanceKm != null ? `${shift.distanceKm} km` : null,
                  shift.durationMin != null ? `${Math.round(shift.durationMin / 60 * 10) / 10} hrs` : null,
                ].filter(Boolean).join('  ·  ')}
              </Text>
            </View>
          )}

          {/* Intermediate stops */}
          {(shift.stops ?? []).filter(s => !s.isFinalDestination).length > 0 && (
            <>
              <Text style={[styles.detailSection, {marginTop: 10}]}>Stops</Text>
              {(shift.stops ?? []).filter(s => !s.isFinalDestination).map((s, i) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailKey}>Stop {i + 1}</Text>
                  <Text style={styles.detailValue}>
                    {s.address}{s.deliveryTime ? `\nEst. ${s.deliveryTime}` : ''}
                  </Text>
                </View>
              ))}
            </>
          )}

          {/* ── Schedule ── */}
          <Text style={[styles.detailSection, {marginTop: 10}]}>Schedule</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Date</Text>
            <Text style={styles.detailValue}>{shift.startDate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Hours</Text>
            <Text style={styles.detailValue}>{shift.hoursPerDay}h</Text>
          </View>
          {shift.jobTime ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Deliver By</Text>
              <Text style={styles.detailValue}>{shift.jobTime}</Text>
            </View>
          ) : null}

          {/* ── Requirement ── */}
          <Text style={[styles.detailSection, {marginTop: 10}]}>Requirement</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Type</Text>
            <Text style={styles.detailValue}>{REQ_LABELS[shift.requirementType] ?? shift.requirementType}</Text>
          </View>

          {/* ── Cargo ── */}
          {shift.goodsType ? (
            <>
              <Text style={[styles.detailSection, {marginTop: 10}]}>Cargo</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Goods Type</Text>
                <Text style={styles.detailValue}>{shift.goodsType}</Text>
              </View>
            </>
          ) : null}

          {/* ── Codes ── */}
          {false && (shift.accessCode || shift.loadCode) && (
            <>
              <Text style={[styles.detailSection, {marginTop: 10}]}>Codes</Text>
              {shift.accessCode ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Access Code</Text>
                  <Text style={[styles.detailValue, styles.codeText]}>{shift.accessCode}</Text>
                </View>
              ) : null}
              {shift.loadCode ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Load Code</Text>
                  <Text style={[styles.detailValue, styles.codeText]}>{shift.loadCode}</Text>
                </View>
              ) : null}
            </>
          )}

          {/* ── Pay ── */}
          {shift.dailyRate ? (
            <>
              <Text style={[styles.detailSection, {marginTop: 10}]}>Payment</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Rate</Text>
                <Text style={styles.detailValue}>{sym}{shift.dailyRate.toLocaleString()}</Text>
              </View>
            </>
          ) : null}

          {/* ── Special Instructions ── */}
          {shift.specialInstructions ? (
            <>
              <Text style={[styles.detailSection, {marginTop: 10}]}>Special Instructions</Text>
              <Text style={styles.specialInstructionsText}>{shift.specialInstructions}</Text>
            </>
          ) : null}

          {/* ── Notes ── */}
          {shift.notes ? (
            <>
              <Text style={[styles.detailSection, {marginTop: 10}]}>Notes</Text>
              <Text style={styles.detailValue}>{shift.notes}</Text>
            </>
          ) : null}

        </View>
      )}
    </View>
  );
}

// ─── History Shift Card ───────────────────────────────────────────────────────

function HistoryShiftCard({shift, onPress}: {shift: ShiftItem; onPress: () => void}) {
  const isCompleted = shift.status === 'COMPLETED';
  const isCancelled = shift.status === 'CANCELLED';

  const locationLine = shift.reportingLocation
    || shift.location
    || '—';

  const eyebrowColor = isCompleted ? '#1066B1' : isCancelled ? '#DC2626' : '#44474C';

  return (
    <Pressable style={styles.listCard} onPress={onPress}>
      <Text style={[styles.cardEyebrow, {color: eyebrowColor}]}>
        {shift.status.replace(/_/g, ' ')}
      </Text>
      <Text style={styles.listTitle}>{shift.shiftRef}</Text>
      <Text style={styles.listMeta}>{locationLine}</Text>
      <Text style={styles.listMetaSub}>
        {shift.startDate} · {shift.hoursPerDay}h
      </Text>
      {shift.dailyRate ? (
        <Text style={[styles.amountText, {color: isCancelled ? '#6B7280' : '#1066B1'}]}>
          {isCancelled ? 'Cancelled' : `✓ Earned: ${sym}${shift.dailyRate.toLocaleString()}`}
        </Text>
      ) : null}
      <Text style={styles.historyTapHint}>Tap to view details →</Text>
    </Pressable>
  );
}

// ─── ShiftHistoryDetailModal ──────────────────────────────────────────────────

function ShiftHistoryDetailModal({
  shift,
  currency,
  onClose,
}: {
  shift: ShiftItem;
  currency: string;
  onClose: () => void;
}) {
  const isCompleted = shift.status === 'COMPLETED';
  const isCancelled = shift.status === 'CANCELLED';
  const stops = (shift.stops ?? []).filter(s => !s.isFinalDestination);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.detailSafe}>
        <View style={styles.detailBar}>
          <Pressable onPress={onClose} style={styles.detailBackBtn}>
            <Text style={styles.detailBackText}>← Back</Text>
          </Pressable>
          <Text style={styles.detailBarTitle}>Shift Details</Text>
          <View style={{width: 60}} />
        </View>

        <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
          {/* Status + ref */}
          <View style={styles.detailStatusRow}>
            <View style={[styles.detailStatusBadge, isCancelled && styles.detailStatusBadgeRed]}>
              <Text style={[styles.detailStatusText, isCancelled && styles.detailStatusTextRed]}>
                {shift.status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
          <Text style={styles.detailTitle}>{shift.shiftRef}</Text>

          {/* Location card */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Location</Text>
            {shift.reportingLocation ? (
              <View style={styles.detailRouteRow}>
                <View style={[styles.detailDot, {backgroundColor: '#2563EB'}]} />
                <View style={{flex: 1}}>
                  <Text style={styles.detailRouteLabel}>REPORTING LOCATION</Text>
                  <Text style={styles.detailRouteValue}>{shift.reportingLocation}</Text>
                </View>
              </View>
            ) : null}
            {stops.map((s, idx) => (
              <View key={idx} style={styles.detailRouteRow}>
                <View style={[styles.detailDot, {backgroundColor: '#D97706'}]} />
                <View style={{flex: 1}}>
                  <Text style={styles.detailRouteLabel}>STOP {idx + 1}</Text>
                  <Text style={styles.detailRouteValue}>{s.address}</Text>
                </View>
              </View>
            ))}
            {!shift.reportingLocation && !shift.pickupAddress && shift.location ? (
              <Text style={styles.detailRouteValue}>{shift.location}</Text>
            ) : null}
          </View>

          {/* Shift info */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Shift Info</Text>
            {[
              {label: 'DATE',               value: shift.startDate},
              {label: 'HOURS',              value: `${shift.hoursPerDay}h`},
              {label: 'GOODS TYPE',         value: shift.goodsType ?? '—'},
              {label: 'REPORTING LOCATION', value: shift.reportingLocation ?? '—'},
              {label: 'TYPE',               value: shift.requirementType ?? '—'},
            ].map(r => (
              <View key={r.label} style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>{r.label}</Text>
                <Text style={styles.detailInfoValue}>{r.value}</Text>
              </View>
            ))}
          </View>

          {/* Payment card */}
          <View style={[styles.detailCard, styles.detailPayCard, isCancelled && styles.detailPayCardGrey]}>
            <View style={[styles.detailPayIconWrap, isCancelled && styles.detailPayIconWrapGrey]}>
              <Text style={styles.detailPayIconEmoji}>💰</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={[styles.detailPayLabel, isCancelled && styles.detailPayLabelGrey]}>
                Your Payment
              </Text>
              {shift.dailyRate ? (
                <Text style={[styles.detailPayAmount, isCancelled && styles.detailPayAmountGrey]}>
                  {fmtMoney(shift.dailyRate, currency)}
                </Text>
              ) : (
                <Text style={styles.detailPayAmount}>—</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── QuoteModal ───────────────────────────────────────────────────────────────

function QuoteModal({
  shift,
  loading,
  onSubmit,
  onClose,
  currency,
  paymentSetupComplete = true,
  onGoToPaymentSetup,
  initialAmount = '',
  initialNotes = '',
  mode = 'submit',
}: {
  shift: ShiftItem;
  loading: boolean;
  onSubmit: (amountPerDay: number, notes: string) => void;
  onClose: () => void;
  currency?: string;
  paymentSetupComplete?: boolean;
  onGoToPaymentSetup?: () => void;
  initialAmount?: string;
  initialNotes?: string;
  mode?: 'submit' | 'edit';
}) {
  const [amount, setAmount] = useState(initialAmount);
  const [notes, setNotes] = useState(initialNotes);
  const [driverOnlyConfirmed, setDriverOnlyConfirmed] = useState(false);
  const isDriverOnly = shift.requirementType === 'DRIVER_ONLY';
  const sym = currencySymbol(currency || shift.currency);
  const total = amount ? Number(amount).toLocaleString() : '—';
  const canSubmit = paymentSetupComplete && !!amount && Number(amount) > 0 && !loading && (!isDriverOnly || driverOnlyConfirmed);

  return (
    <View style={styles.modalOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={{width: '100%', alignItems: 'center'}}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{mode === 'edit' ? 'Edit Quote' : 'Submit Quote'}</Text>
          <Text style={styles.modalSub}>{shift.shiftRef} · {shift.startDate} · {shift.hoursPerDay}h</Text>

          {/* Payment setup required banner */}
          {!paymentSetupComplete && (
            <View style={styles.shiftPaymentSetupBanner}>
              <Text style={styles.shiftPaymentSetupIcon}>💳</Text>
              <View style={{flex: 1}}>
                <Text style={styles.shiftPaymentSetupTitle}>Payment Setup Required</Text>
                <Text style={styles.shiftPaymentSetupSub}>
                  Complete your payment account setup before submitting quotes.
                </Text>
              </View>
              {onGoToPaymentSetup && (
                <Pressable onPress={() => { onClose(); onGoToPaymentSetup(); }} style={styles.shiftPaymentSetupBtn}>
                  <Text style={styles.shiftPaymentSetupBtnText}>Set Up →</Text>
                </Pressable>
              )}
            </View>
          )}

          {paymentSetupComplete && (
            <>
              <Text style={styles.inputLabel}>Rate ({sym || 'amount'})</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="Enter your rate"
                placeholderTextColor={colors.inkSoft}
                autoFocus
              />
              {amount && Number(amount) > 0 ? (
                <Text style={styles.totalPreview}>{sym}{total} for {shift.hoursPerDay} hrs</Text>
              ) : null}

              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, {height: 72, textAlignVertical: 'top'}]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any availability details…"
                placeholderTextColor={colors.inkSoft}
                multiline
              />

              {/* Driver-only confirmation checkbox */}
              {isDriverOnly && (
                <Pressable
                  onPress={() => setDriverOnlyConfirmed(v => !v)}
                  style={styles.driverOnlyToggleRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: driverOnlyConfirmed}}>
                  <View style={[styles.shiftCheckbox, driverOnlyConfirmed && styles.shiftCheckboxChecked]}>
                    {driverOnlyConfirmed && <Text style={styles.shiftCheckboxTick}>✓</Text>}
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.driverOnlyToggleTitle}>I am available as Driver Only</Text>
                    <Text style={styles.driverOnlyToggleSub}>
                      This shift requires a driver without a truck. Confirm you are bidding without your vehicle.
                    </Text>
                  </View>
                </Pressable>
              )}
            </>
          )}

          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            {paymentSetupComplete && (
              <Pressable
                onPress={() => {
                  const amt = Number(amount);
                  if (!amt || amt <= 0) {
                    Alert.alert('Required', 'Please enter a valid rate');
                    return;
                  }
                  onSubmit(amt, notes.trim());
                }}
                disabled={!canSubmit}
                style={[styles.primaryBtn, {flex: 2, height: 52}, !canSubmit && {opacity: 0.5}]}>
                <Text style={styles.primaryBtnText}>{loading ? 'Saving…' : mode === 'edit' ? 'Update Quote' : 'Submit Quote'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ShiftsScreen: React.FC<ShiftsScreenProps> = ({
  availableShifts,
  myShifts,
  myShiftQuotes,
  loading,
  actionLoading,
  error,
  refreshing,
  onRefresh,
  onSubmitQuote,
  onWithdrawQuote,
  onCancelShift,
  onStartDay,
  canBrowse = true,
  gateInfo,
  onGoToDocuments,
  onGoToProfile,
  onGoToAvailability,
  currency = '',
  paymentSetupComplete = true,
  onGoToPaymentSetup,
  onEditShiftQuote,
}) => {
  const [tab, setTab] = useState<TabKey>('available');
  const [quotingShift, setQuotingShift] = useState<ShiftItem | null>(null);
  const [editingQuote, setEditingQuote] = useState<ShiftQuoteItem | null>(null);
  const [resubmittingQuote, setResubmittingQuote] = useState<ShiftQuoteItem | null>(null);
  const [selectedHistoryShift, setSelectedHistoryShift] = useState<ShiftItem | null>(null);

  // ── Search / filter state ──────────────────────────────────────────────────
  const [search, setSearch]         = useState('');
  const [reqFilter, setReqFilter]   = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [radiusFilter, setRadiusFilter] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'req' | 'date' | 'radius' | null>(null);

  // ── Geo location state ────────────────────────────────────────────────────
  const [driverLocation, setDriverLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'FlexiShift needs your location to find nearby shifts.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
            buttonNeutral: 'Ask Me Later',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocationError('Location permission denied');
          setLocationLoading(false);
          return;
        }
      }
      Geolocation.getCurrentPosition(
        pos => {
          setDriverLocation({latitude: pos.coords.latitude, longitude: pos.coords.longitude});
          if (!radiusFilter) {setRadiusFilter('25 km');}
          setLocationLoading(false);
        },
        err => {
          setLocationError(err.code === 1 ? 'Permission denied' : 'Unable to get location');
          setLocationLoading(false);
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 60000},
      );
    } catch {
      setLocationError('Location unavailable');
      setLocationLoading(false);
    }
  };

  const clearLocation = () => {
    setDriverLocation(null);
    setRadiusFilter(null);
    setLocationError(null);
  };

  // ── Quote map ─────────────────────────────────────────────────────────────
  const quoteByShiftId = useMemo(() => {
    const map: Record<string, ShiftQuoteItem> = {};
    for (const q of myShiftQuotes) {map[q.shiftId] = q;}
    return map;
  }, [myShiftQuotes]);

  // ── Filtered & sorted available shifts ───────────────────────────────────
  const filteredShifts = useMemo(() => {
    const radiusKm = radiusFilter ? parseInt(radiusFilter, 10) : null;

    const reqKey = reqFilter
      ? Object.keys(REQ_LABELS).find(k => REQ_LABELS[k] === reqFilter) ?? reqFilter
      : null;

    const items = availableShifts.filter(s => {
      if (reqKey && s.requirementType !== reqKey) {return false;}
      if (dateFilter && !matchesStartDateFilter(s.startDate, dateFilter)) {return false;}

      if (driverLocation && radiusKm && s.pickupLat != null && s.pickupLng != null) {
        const dist = haversineKm(driverLocation.latitude, driverLocation.longitude, s.pickupLat, s.pickupLng);
        if (dist > radiusKm) {return false;}
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (s.shiftRef ?? '').toLowerCase().includes(q) ||
          (s.pickupAddress ?? '').toLowerCase().includes(q) ||
          (s.location ?? '').toLowerCase().includes(q) ||
          (REQ_LABELS[s.requirementType] ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (driverLocation) {
      items.sort((a, b) => {
        const distA = a.pickupLat != null && a.pickupLng != null
          ? haversineKm(driverLocation.latitude, driverLocation.longitude, a.pickupLat, a.pickupLng)
          : Infinity;
        const distB = b.pickupLat != null && b.pickupLng != null
          ? haversineKm(driverLocation.latitude, driverLocation.longitude, b.pickupLat, b.pickupLng)
          : Infinity;
        return distA - distB;
      });
    }

    return items;
  }, [availableShifts, reqFilter, dateFilter, radiusFilter, driverLocation, search]);

  const renderFilterModal = (
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
      <View style={styles.filterModalSheet}>
        <View style={styles.filterModalHandle} />
        <Text style={styles.filterModalTitle}>{title}</Text>
        {options.map(opt => {
          const isSelected = opt === 'All' ? !selected : selected === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => {
                onSelect(opt === 'All' ? null : opt);
                setActiveModal(null);
              }}
              style={[styles.filterModalOpt, isSelected && styles.filterModalOptSelected]}>
              <Text style={[styles.filterModalOptText, isSelected && styles.filterModalOptTextSel]}>
                {opt}
              </Text>
              {isSelected && <Text style={styles.filterModalTick}>✓</Text>}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );

  const handleSubmitQuote = async (amountPerDay: number, notes: string) => {
    if (editingQuote) {
      await onEditShiftQuote(editingQuote.shiftId, amountPerDay, notes);
      setEditingQuote(null);
    } else if (resubmittingQuote) {
      await onSubmitQuote(resubmittingQuote.shiftId, amountPerDay, notes);
      setResubmittingQuote(null);
    } else if (quotingShift) {
      await onSubmitQuote(quotingShift.shiftId, amountPerDay, notes);
      setQuotingShift(null);
    }
  };

  const handleOpenEditModal = (quote: ShiftQuoteItem) => {
    setEditingQuote(quote);
  };

  const handleOpenResubmitModal = (quote: ShiftQuoteItem) => {
    setResubmittingQuote(quote);
  };

  const handleWithdraw = (shiftId: string) => {
    Alert.alert(
      'Withdraw Quote',
      'Are you sure you want to withdraw your quote for this shift?',
      [
        {text: 'Keep It', style: 'cancel'},
        {text: 'Withdraw', style: 'destructive', onPress: () => onWithdrawQuote(shiftId)},
      ],
    );
  };

  const handleCancelShift = (shiftId: string) => {
    const shift = activeShifts.find(s => s.shiftId === shiftId);
    const message = 'Are you sure you want to cancel this shift booking?';
    Alert.alert(
      'Cancel Shift',
      message,
      [
        {text: 'Keep It', style: 'cancel'},
        {text: 'Cancel Shift', style: 'destructive', onPress: () => onCancelShift(shiftId)},
      ],
    );
  };

  // Sort quotes newest-first
  const sortedQuotes = useMemo(
    () => [...myShiftQuotes].sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    ),
    [myShiftQuotes],
  );

  const pendingQuotes  = myShiftQuotes.filter(q => q.status?.toUpperCase() === 'PENDING');
  // Combine BOOKED and IN_PROGRESS — driver sees all active shifts together
  const activeShifts   = myShifts.filter(s => ['BOOKED', 'IN_PROGRESS'].includes(s.status));
  const historyShifts  = myShifts.filter(s => ['COMPLETED', 'CANCELLED'].includes(s.status));
  const isFiltering = !!(search.trim() || reqFilter || dateFilter || radiusFilter);

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}>
        <Pressable
          onPress={() => setTab('available')}
          style={[styles.tabBtn, tab === 'available' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'available' && styles.tabTextActive]}>
            Available
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('quotes')}
          style={[styles.tabBtn, tab === 'quotes' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'quotes' && styles.tabTextActive]}>
            My Quotes{pendingQuotes.length > 0 ? ` (${pendingQuotes.length})` : ''}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('mine')}
          style={[styles.tabBtn, tab === 'mine' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>
            My Shifts{activeShifts.length > 0 ? ` (${activeShifts.length})` : ''}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('history')}
          style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            History{historyShifts.length > 0 ? ` (${historyShifts.length})` : ''}
          </Text>
        </Pressable>
      </ScrollView>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (

        <>
          {/* ── Available Tab ─────────────────────────────────────────────── */}
          {tab === 'available' && (
            <View style={styles.flex}>
              {/* Search + filter header */}
              <View style={styles.searchHeader}>
                <View style={styles.searchBar}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by location or shift ref..."
                    placeholderTextColor="#7A8699"
                    style={styles.searchInput}
                  />
                  {search.length > 0 && (
                    <Pressable onPress={() => setSearch('')} style={styles.searchAction}>
                      <Text style={styles.clearSearch}>✕</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={driverLocation ? clearLocation : requestLocation}
                    disabled={locationLoading}
                    style={[styles.nearMeBtn, driverLocation && styles.nearMeBtnActive]}>
                    {locationLoading ? (
                      <ActivityIndicator size="small" color={driverLocation ? '#fff' : '#1066B1'} />
                    ) : (
                      <Text style={styles.nearMeBtnIcon}>📍</Text>
                    )}
                  </Pressable>
                </View>

                {locationError ? (
                  <Text style={styles.locationErrorText}>{locationError}</Text>
                ) : driverLocation ? (
                  <Text style={styles.locationActiveText}>
                    Showing shifts near your location · tap the icon to clear
                  </Text>
                ) : null}

                {/* Filter chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}>

                  <Pressable
                    onPress={() => setActiveModal('req')}
                    style={[styles.chip, reqFilter ? styles.chipActive : styles.chipInactive]}>
                    <Icon name="briefcase" size={14} color={reqFilter ? '#FFFFFF' : '#1A1A1A'} strokeWidth={2} />
                    <Text style={[styles.chipText, reqFilter ? styles.chipTextActive : undefined]}>
                      {reqFilter ?? 'Requirement'}
                    </Text>
                    <Text style={[styles.chipCaret, reqFilter ? styles.chipCaretActive : undefined]}>▾</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setActiveModal('date')}
                    style={[styles.chip, dateFilter ? styles.chipActive : styles.chipInactive]}>
                    <Icon name="calendar" size={14} color={dateFilter ? '#FFFFFF' : '#1A1A1A'} strokeWidth={2} />
                    <Text style={[styles.chipText, dateFilter ? styles.chipTextActive : undefined]}>
                      {dateFilter ?? 'Start Date'}
                    </Text>
                    <Text style={[styles.chipCaret, dateFilter ? styles.chipCaretActive : undefined]}>▾</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setActiveModal('radius')}
                    style={[styles.chip, radiusFilter ? styles.chipActive : styles.chipInactive]}>
                    <Icon name="map" size={14} color={radiusFilter ? '#FFFFFF' : '#1A1A1A'} strokeWidth={2} />
                    <Text style={[styles.chipText, radiusFilter ? styles.chipTextActive : undefined]}>
                      {radiusFilter ?? 'Distance'}
                    </Text>
                    <Text style={[styles.chipCaret, radiusFilter ? styles.chipCaretActive : undefined]}>▾</Text>
                  </Pressable>

                </ScrollView>
              </View>

              {/* Locked state or shift list */}
              {!canBrowse && gateInfo ? (
                <JobSearchLockedScreen
                  gateInfo={gateInfo}
                  onGoToProfile={onGoToProfile ?? (() => undefined)}
                  onGoToDocuments={onGoToDocuments ?? (() => undefined)}
                  onGoToAvailability={onGoToAvailability ?? (() => undefined)}
                  context="shifts"
                />
              ) : (
                <FlatList
                  data={filteredShifts}
                  keyExtractor={item => item.shiftId}
                  renderItem={({item}) => (
                    <AvailableShiftCard
                      shift={item}
                      myQuote={quoteByShiftId[item.shiftId]}
                      driverLocation={driverLocation}
                      onQuote={setQuotingShift}
                      onWithdraw={handleWithdraw}
                      onEdit={handleOpenEditModal}
                      onResubmit={handleOpenResubmitModal}
                    />
                  )}
                  contentContainerStyle={styles.listContent}
                  onRefresh={onRefresh}
                  refreshing={refreshing}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <View style={styles.listHeader}>
                      <Text style={styles.listHeaderTitle}>Available Shifts</Text>
                      <Text style={styles.listHeaderCount}>
                        {filteredShifts.length} {filteredShifts.length === 1 ? 'Shift' : 'Shifts'}
                      </Text>
                    </View>
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                      <Text style={styles.emptyIcon}>📋</Text>
                      <Text style={styles.emptyTitle}>
                        {isFiltering ? 'No matches found' : 'No shifts available'}
                      </Text>
                      <Text style={styles.emptyBody}>
                        {isFiltering
                          ? driverLocation && radiusFilter
                            ? `No shifts within ${radiusFilter} of your location. Try a larger radius.`
                            : 'Try changing your filters.'
                          : 'Hauliers post shifts here. Pull down to refresh.'}
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          )}

          {/* ── My Quotes Tab ─────────────────────────────────────────────── */}
          {tab === 'quotes' && (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
              showsVerticalScrollIndicator={false}>
              <Text style={styles.screenTitle}>My Shift Quotes</Text>
              {sortedQuotes.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyIcon}>✏️</Text>
                  <Text style={styles.emptyTitle}>No quotes submitted yet</Text>
                  <Text style={styles.emptyBody}>
                    Browse Available Shifts and submit a quote. It will appear here once submitted.
                  </Text>
                </View>
              ) : (
                sortedQuotes.map(quote => (
                  <QuoteCard
                    key={quote.quoteId}
                    quote={quote}
                    onWithdraw={handleWithdraw}
                    onGoToBooked={
                      (quote.status ?? '').toUpperCase() === 'ACCEPTED'
                        ? () => setTab('mine')
                        : undefined
                    }
                    onEdit={handleOpenEditModal}
                    onResubmit={handleOpenResubmitModal}
                  />
                ))
              )}
            </ScrollView>
          )}

          {/* ── My Shifts Tab (BOOKED + IN_PROGRESS) ─────────────────────── */}
          {tab === 'mine' && (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
              showsVerticalScrollIndicator={false}>
              <Text style={styles.screenTitle}>My Shifts</Text>
              {activeShifts.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyTitle}>No active shifts</Text>
                  <Text style={styles.emptyBody}>
                    When a haulier accepts your quote the shift will appear here. You can start each day once the haulier releases payment.
                  </Text>
                </View>
              ) : (
                activeShifts.map(shift => (
                  <BookedShiftCard
                    key={shift.shiftId}
                    shift={shift}
                    onCancel={handleCancelShift}
                    isOngoing
                    onStartDay={onStartDay
                      ? (id) => { void onStartDay(id); }
                      : undefined
                    }
                  />
                ))
              )}
            </ScrollView>
          )}

          {/* ── History Tab ───────────────────────────────────────────────── */}
          {tab === 'history' && (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
              showsVerticalScrollIndicator={false}>
              <Text style={styles.screenTitle}>Shift History</Text>
              {historyShifts.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyIcon}>🗂️</Text>
                  <Text style={styles.emptyTitle}>No history yet</Text>
                  <Text style={styles.emptyBody}>
                    Completed and cancelled shifts will appear here.
                  </Text>
                </View>
              ) : (
                historyShifts.map(shift => (
                  <HistoryShiftCard
                    key={shift.shiftId}
                    shift={shift}
                    onPress={() => setSelectedHistoryShift(shift)}
                  />
                ))
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* ── Filter modals ────────────────────────────────────────────────── */}
      {activeModal === 'req' &&
        renderFilterModal('Requirement Type', REQ_FILTER_OPTS, reqFilter, setReqFilter)}
      {activeModal === 'date' &&
        renderFilterModal('Start Date', DATE_OPTIONS, dateFilter, setDateFilter)}
      {activeModal === 'radius' &&
        renderFilterModal('Distance / Radius', RADIUS_OPTIONS, radiusFilter, setRadiusFilter)}

      {/* ── Quote modal (new / edit / resubmit) ─────────────────────────── */}
      {(quotingShift || editingQuote || resubmittingQuote) && (() => {
        const quoteItem = editingQuote || resubmittingQuote;
        const shiftForModal: ShiftItem = quotingShift ?? {
          shiftId: quoteItem!.shiftId,
          shiftRef: quoteItem!.shiftRef ?? `Shift #${quoteItem!.shiftId.slice(-6)}`,
          hoursPerDay: quoteItem!.hoursPerDay ?? 0,
          startDate: quoteItem!.startDate ?? '',
          pickupAddress: quoteItem!.reportingLocation ?? quoteItem!.location ?? '',
          location: quoteItem!.location ?? '',
          requirementType: 'DRIVER_VEHICLE',
          status: 'OPEN',
          currency: undefined as any,
        } as unknown as ShiftItem;
        const isEdit = !!editingQuote;
        return (
          <QuoteModal
            shift={shiftForModal}
            loading={actionLoading}
            onSubmit={handleSubmitQuote}
            onClose={() => { setQuotingShift(null); setEditingQuote(null); setResubmittingQuote(null); }}
            currency={currency}
            paymentSetupComplete={paymentSetupComplete}
            onGoToPaymentSetup={onGoToPaymentSetup}
            initialAmount={quoteItem ? String(quoteItem.amountPerDay) : ''}
            initialNotes={quoteItem?.notes ?? ''}
            mode={isEdit ? 'edit' : 'submit'}
          />
        );
      })()}

      {/* ── History shift detail modal ────────────────────────────────── */}
      {selectedHistoryShift && (
        <ShiftHistoryDetailModal
          shift={selectedHistoryShift}
          currency={currency}
          onClose={() => setSelectedHistoryShift(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  flex: {flex: 1},

  // ── Tab bar ───────────────────────────────────────────────────────────────
  tabBar: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexGrow: 0,
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 4,
  },
  tabBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    alignItems: 'center', borderRadius: 10,
    backgroundColor: 'transparent',
    minWidth: 80,
  },
  tabBtnActive: {backgroundColor: '#1066B1'},
  tabText: {color: colors.inkSoft, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5},
  tabTextActive: {color: '#FFFFFF'},

  errorBanner: {
    backgroundColor: '#FEE2E2', borderRadius: radius.md,
    margin: spacing.md, padding: spacing.md,
  },
  errorText: {color: colors.danger, fontWeight: '700', fontSize: 13},
  loaderWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  // ── Search header ─────────────────────────────────────────────────────────
  searchHeader: {
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
  searchAction: {paddingHorizontal: 8},
  clearSearch: {color: colors.inkSoft, fontSize: 16},
  nearMeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EAF3FD',
    justifyContent: 'center', alignItems: 'center', marginLeft: 6,
  },
  nearMeBtnActive: {backgroundColor: '#1066B1'},
  nearMeBtnIcon: {fontSize: 16},
  locationActiveText: {fontSize: 11, color: '#1066B1', fontWeight: '600', marginTop: -4},
  locationErrorText:  {fontSize: 11, color: colors.danger, fontWeight: '600', marginTop: -4},

  filterRow: {gap: 8},
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1,
  },
  chipActive:       {backgroundColor: '#1066B1', borderColor: '#1066B1'},
  chipInactive:     {backgroundColor: '#FFFFFF', borderColor: '#D1D9E6'},
  chipText:         {color: '#374151', fontSize: 13, fontWeight: '600'},
  chipTextActive:   {color: '#FFFFFF'},
  chipCaret:        {color: '#6B7280', fontSize: 11},
  chipCaretActive:  {color: '#FFFFFF'},

  // ── List / headers ────────────────────────────────────────────────────────
  list: {flex: 1},
  listContent: {padding: spacing.lg, paddingBottom: 110, gap: 14},
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  listHeaderTitle: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  listHeaderCount: {color: colors.inkSoft, fontSize: 13, fontWeight: '600'},

  screenTitle: {fontSize: 22, fontWeight: '900', color: colors.navy, marginBottom: spacing.sm},

  // ── Job-style shift card ──────────────────────────────────────────────────
  jobCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl, overflow: 'hidden',
  },
  jobCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 6,
  },
  jobRef: {color: colors.inkSoft, fontSize: 11, fontWeight: '700'},
  distFromDriver: {fontSize: 11, color: '#059669', fontWeight: '700', marginTop: 2},
  jobAmount: {color: '#1066B1', fontSize: 18, fontWeight: '900'},
  openBadge: {
    backgroundColor: '#EAF3FD', borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  openBadgeText: {color: colors.accent, fontSize: 11, fontWeight: '900'},
  locationRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6},
  locationIcon: {fontSize: 14, marginTop: 1},
  locationText: {flex: 1, color: colors.navy, fontSize: 14, fontWeight: '700'},
  goodsRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  goodsLabel: {fontSize: 12, color: colors.inkSoft, fontWeight: '700'},
  goodsValue: {fontSize: 12, color: colors.navy, fontWeight: '800'},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16, marginTop: 10},
  metaItem: {flexBasis: '45%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8},
  metaTag: {
    color: colors.inkSoft, fontSize: 10, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  metaVal:    {color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 1},
  metaValReq: {color: '#1066B1'},
  cardActions: {flexDirection: 'row', gap: 10},
  applyBtn: {
    flex: 1, backgroundColor: '#1066B1', borderRadius: radius.md,
    minHeight: 48, justifyContent: 'center', alignItems: 'center',
  },
  applyBtnLocked:   {backgroundColor: '#D1D9E6'},
  applyBtnApplied:  {backgroundColor: '#EBF4FF'},
  applyBtnEdit:     {backgroundColor: '#EBF4FF', flex: 1},
  applyBtnWithdraw: {backgroundColor: '#FEF2F2', flex: 0, paddingHorizontal: 16},
  applyBtnReapply:  {backgroundColor: '#F0FDF4'},
  applyBtnText:         {color: colors.card,  fontSize: 15, fontWeight: '900'},
  applyBtnLockedText:   {color: '#64748B',    fontSize: 14, fontWeight: '700'},
  applyBtnAppliedText:  {color: '#1066B1',    fontSize: 14, fontWeight: '800'},
  applyBtnEditText:     {color: '#1066B1',    fontSize: 14, fontWeight: '800'},
  applyBtnWithdrawText: {color: '#DC2626',    fontSize: 13, fontWeight: '700'},
  applyBtnReapplyText:  {color: '#16A34A',    fontSize: 14, fontWeight: '800'},
  quoteActionsRow:      {flex: 1, flexDirection: 'row', gap: 8},
  detailsToggleBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#1066B1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsToggleBtnText: {
    color: '#1066B1',
    fontSize: 14,
    fontWeight: '800',
  },

  quoteAmountBox: {
    backgroundColor: '#EFF6FF', borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 8,
  },
  quoteAmountLabel: {color: '#1D4ED8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2},
  quoteAmountRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  quoteAmountVal: {color: '#1D4ED8', fontSize: 15, fontWeight: '900'},
  quoteDivider: {color: '#93C5FD', fontWeight: '700'},
  quoteTotal: {color: '#1E40AF', fontSize: 13, fontWeight: '700'},

  // ── Booked shift card ─────────────────────────────────────────────────────
  listCard: {
    backgroundColor: '#FCFBF7',
    borderColor: '#E4DED0',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  upcomingCard: {backgroundColor: '#F8FAFF'},
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    justifyContent: 'space-between',
  },
  listTitle: {color: '#041627', fontSize: 16, fontWeight: '800', marginBottom: 6},
  listMeta: {color: '#44474C', fontSize: 13, lineHeight: 18},
  listMetaSub: {color: '#44474C', fontSize: 12, marginTop: 2},
  upcomingBadge: {
    color: '#FFFFFF',
    backgroundColor: '#1066B1',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  amountText: {color: '#DFA622', fontSize: 16, fontWeight: '800', marginTop: 8},
  historyTapHint: {color: colors.accent, fontSize: 11, fontWeight: '700', marginTop: 6},

  // History detail modal
  detailSafe: {flex: 1, backgroundColor: colors.bg},
  detailBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailBackBtn: {width: 60},
  detailBackText: {color: colors.navy, fontSize: 15, fontWeight: '800'},
  detailBarTitle: {color: colors.navy, fontSize: 16, fontWeight: '900'},
  detailScroll: {padding: 20, paddingBottom: 60, gap: 14},
  detailStatusRow: {flexDirection: 'row', marginBottom: 4},
  detailStatusBadge: {
    backgroundColor: '#DBEAFE', borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  detailStatusBadgeRed: {backgroundColor: '#FEE2E2'},
  detailStatusText: {color: '#1066B1', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5},
  detailStatusTextRed: {color: '#B91C1C'},
  detailTitle: {color: colors.navy, fontSize: 22, fontWeight: '900', marginBottom: 4},
  detailCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10,
  },
  detailCardTitle: {
    color: colors.navy, fontSize: 13, fontWeight: '900',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  detailRouteRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  detailDot: {width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0},
  detailRouteLabel: {color: colors.inkSoft, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5},
  detailRouteValue: {color: colors.ink, fontSize: 14, fontWeight: '700', marginTop: 2},
  detailInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  detailInfoLabel: {color: colors.inkSoft, fontSize: 11, fontWeight: '800', letterSpacing: 0.5},
  detailInfoValue: {color: colors.navy, fontSize: 13, fontWeight: '800'},
  detailPayCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F0FDF4', borderColor: '#BBF7D0',
  },
  detailPayCardGrey: {backgroundColor: '#F8FAFD', borderColor: colors.border},
  detailPayIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#166534', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  detailPayIconWrapGrey: {backgroundColor: '#94A3B8'},
  detailPayIconEmoji: {fontSize: 22},
  detailPayLabel: {color: '#166534', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5},
  detailPayLabelGrey: {color: colors.inkSoft},
  detailPayAmount: {color: '#15803D', fontSize: 26, fontWeight: '900', marginTop: 2},
  detailPayAmountGrey: {color: colors.ink},
  detailPayNote: {color: '#16A34A', fontSize: 11, marginTop: 4, lineHeight: 16},
  detailPayNoteGrey: {color: colors.inkSoft},
  cardEyebrow: {
    color: '#DFA622',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  listActionRow: {flexDirection: 'row', gap: 10, marginTop: 12},
  listActionPrimary: {
    alignItems: 'center',
    backgroundColor: '#1066B1',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  listActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  listActionSecondary: {
    alignItems: 'center',
    backgroundColor: '#1066B1',
    borderColor: '#1066B1',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  listActionSecondaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  listActionCancel: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: colors.accent,
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  listActionCancelText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailsBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DED0',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
    gap: 8,
  },
  detailSection: {
    color: '#1066B1',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 12},
  detailKey: {
    color: '#44474C',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#041627',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  compartmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  compartmentBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EAF3FD',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  compartmentBadgeText: {color: '#1066B1', fontSize: 11, fontWeight: '900'},
  compartmentContents: {color: '#041627', fontSize: 13, fontWeight: '700'},
  compartmentMeta: {color: '#64748B', fontSize: 11, fontWeight: '600', marginTop: 1},
  codeText: {
    fontFamily: 'monospace' as const,
    fontWeight: '900',
    color: '#1066B1',
    letterSpacing: 1,
    textAlign: 'right',
  },
  specialInstructionsText: {
    color: '#44474C',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EAF3FD',
    borderColor: '#1066B1',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  infoBannerIcon: {fontSize: 18, marginTop: 1, color: '#1066B1'},
  infoBannerTitle: {fontSize: 13, fontWeight: '900', color: '#1066B1', marginBottom: 3},
  infoBannerBody: {fontSize: 12, color: '#1F4B79', lineHeight: 17},
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  warningBannerIcon: {fontSize: 18, marginTop: 1, color: '#DC2626'},
  warningBannerTitle: {fontSize: 13, fontWeight: '900', color: '#DC2626', marginBottom: 3},
  warningBannerBody: {fontSize: 12, color: '#7F1D1D', lineHeight: 17},
  progressWrap: {gap: 4, marginTop: 8},
  progressLabel: {color: '#44474C', fontSize: 11, fontWeight: '700'},
  progressTrack: {height: 6, backgroundColor: '#E5E9F0', borderRadius: 999, overflow: 'hidden'},
  progressFill: {height: '100%', backgroundColor: '#1066B1', borderRadius: 999},
  notesText: {color: '#44474C', fontSize: 12, fontStyle: 'italic', lineHeight: 17},

  // ── Quote card (mirrors MyQuotesScreen) ───────────────────────────────────────
  qCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  qCardAccepted: {borderColor: '#1066B1', borderWidth: 2},
  qCardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  qHeaderLeft: {flex: 1, marginRight: spacing.md},
  qRef: {color: colors.navy, fontSize: 16, fontWeight: '900'},
  qSubmittedAt: {color: colors.inkSoft, fontSize: 11, marginTop: 2},
  qStatusBadge: {borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4},
  qBadgeBlue: {backgroundColor: '#DBEAFE'},
  qBadgeRed:  {backgroundColor: '#FEE2E2'},
  qBadgeGrey: {backgroundColor: '#F1F5F9'},
  qStatusText: {fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5},
  qStatusBlue: {color: '#1066B1'},
  qStatusRed:  {color: '#B91C1C'},
  qStatusGrey: {color: '#64748B'},
  qRouteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F8FAFD', borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  qDot: {width: 8, height: 8, borderRadius: 4, flexShrink: 0},
  qDotBlue:  {backgroundColor: '#1066B1'},
  qDotAmber: {backgroundColor: colors.accent},
  qRouteText: {flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700'},
  qRouteArrow: {color: colors.inkSoft, fontSize: 12, flexShrink: 0},
  qStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFD',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  qStatBox: {flex: 1},
  qStatDivider: {width: 1, backgroundColor: colors.border, marginHorizontal: spacing.md},
  qStatLabel: {
    color: colors.inkSoft, fontSize: 10, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2,
  },
  qStatValue: {color: colors.navy, fontSize: 15, fontWeight: '900'},
  qNotesText: {color: colors.inkSoft, fontSize: 13, fontStyle: 'italic'},
  qAcceptedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: '#EFF6FF', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: '#BFDBFE',
  },
  qAcceptedIcon: {fontSize: 24},
  qAcceptedTitle: {color: '#1066B1', fontSize: 14, fontWeight: '900'},
  qAcceptedSub: {color: '#166534', fontSize: 12, marginTop: 2},
  qDeclinedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: '#FEF2F2', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: '#FECACA',
  },
  qDeclinedIcon: {fontSize: 20},
  qDeclinedTitle: {color: '#B91C1C', fontSize: 13, fontWeight: '900'},
  qDeclinedSub: {color: '#7F1D1D', fontSize: 11, marginTop: 2},
  qWithdrawBtn: {
    borderWidth: 1, borderColor: colors.danger,
    borderRadius: radius.md, minHeight: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  qWithdrawBtnDisabled: {borderColor: '#CBD5E1', backgroundColor: '#F1F5F9'},
  qWithdrawText: {color: colors.danger, fontSize: 13, fontWeight: '800'},
  qWithdrawTextDisabled: {color: '#94A3B8'},
  qExpiredNote: {
    color: '#94A3B8', fontSize: 11, fontWeight: '600',
    textAlign: 'center', marginTop: 6,
  },
  qEditBtn: {
    borderWidth: 1, borderColor: '#1066B1',
    borderRadius: radius.md, minHeight: 44,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  qEditText: {color: '#1066B1', fontSize: 13, fontWeight: '800'},
  qResubmitBtn: {
    borderWidth: 1, borderColor: colors.success,
    borderRadius: radius.md, minHeight: 44,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F0FBF4',
  },
  qResubmitText: {color: colors.success, fontSize: 13, fontWeight: '800'},

  statusPill: {
    borderRadius: radius.pill, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', flexShrink: 0,
  },
  statusPillText: {fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3},

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyWrap: {alignItems: 'center', marginTop: 60, paddingHorizontal: spacing.xl},
  emptyIcon: {fontSize: 56, marginBottom: 16},
  emptyTitle: {fontSize: 20, fontWeight: '900', color: colors.navy, marginBottom: 8, textAlign: 'center'},
  emptyBody: {fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20},

  // ── Filter modal ──────────────────────────────────────────────────────────
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)'},
  filterModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl, paddingBottom: 40, paddingTop: 16, gap: 4,
  },
  filterModalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB',
    alignSelf: 'center', marginBottom: 16,
  },
  filterModalTitle: {color: colors.navy, fontSize: 17, fontWeight: '900', marginBottom: 12},
  filterModalOpt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, marginBottom: 2,
  },
  filterModalOptSelected: {backgroundColor: '#EFF8FF'},
  filterModalOptText: {color: colors.ink, fontSize: 15, fontWeight: '600'},
  filterModalOptTextSel: {color: '#1066B1', fontWeight: '800'},
  filterModalTick: {color: '#1066B1', fontSize: 16, fontWeight: '900'},

  // ── Quote modal ───────────────────────────────────────────────────────────
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 22, 39, 0.7)',
    alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modal: {
    width: '100%', backgroundColor: colors.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: spacing.sm,
  },
  modalTitle: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  modalSub: {color: colors.inkSoft, fontSize: 13, fontWeight: '700'},
  inputLabel: {color: colors.navy, fontSize: 13, fontWeight: '800', marginTop: spacing.xs},
  input: {
    backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.navy, fontWeight: '700',
  },
  totalPreview: {color: '#1066B1', fontWeight: '900', fontSize: 13, marginTop: -spacing.xs},
  shiftPaymentSetupBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FEF3C7', borderWidth: 1.5, borderColor: '#FCD34D',
    borderRadius: radius.md, padding: 12, marginTop: spacing.xs,
  },
  shiftPaymentSetupIcon: {fontSize: 20, lineHeight: 24},
  shiftPaymentSetupTitle: {fontSize: 13, fontWeight: '900', color: '#92400E', marginBottom: 2},
  shiftPaymentSetupSub: {fontSize: 11, fontWeight: '500', color: '#B45309', lineHeight: 15},
  shiftPaymentSetupBtn: {
    backgroundColor: '#D97706', borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start',
  },
  shiftPaymentSetupBtnText: {color: '#fff', fontSize: 11, fontWeight: '900'},
  driverOnlyToggleRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#FED7AA',
    borderRadius: radius.md, padding: 14, marginTop: spacing.xs,
  },
  shiftCheckbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D97706',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  shiftCheckboxChecked: {backgroundColor: '#D97706', borderColor: '#D97706'},
  shiftCheckboxTick: {color: '#fff', fontSize: 13, fontWeight: '900'},
  driverOnlyToggleTitle: {fontSize: 14, fontWeight: '800', color: '#92400E', marginBottom: 3},
  driverOnlyToggleSub: {fontSize: 12, fontWeight: '500', color: '#B45309', lineHeight: 17},
  modalActions: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm},
  cancelBtn: {
    flex: 1, height: 52, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: {color: colors.inkSoft, fontWeight: '800', fontSize: 14},
  primaryBtn: {
    flex: 1, backgroundColor: '#1066B1', borderRadius: radius.lg,
    height: 44, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: {color: '#fff', fontWeight: '900', fontSize: 13},

  outlineBtn: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg,
    height: 44, alignItems: 'center', justifyContent: 'center',
  },
  outlineBtnText: {color: colors.inkSoft, fontWeight: '800', fontSize: 13},

  // ── Expanded detail panel (available shift "View Details") ───────────────
  expandedPanel: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  expandedSectionLabel: {
    fontSize: 10, fontWeight: '900', color: '#1066B1',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 4, marginBottom: 6,
  },
  expandedDivider: {
    height: 1, backgroundColor: '#F1F5F9', marginVertical: 10,
  },
  // Route
  expandedRouteWrap: {gap: 0},
  expandedRouteRow: {flexDirection: 'row', alignItems: 'flex-start'},
  expandedRouteLeft: {
    width: 24, alignItems: 'center', paddingTop: 3, flexShrink: 0,
  },
  expandedDot: {
    width: 10, height: 10, borderRadius: 5,
    justifyContent: 'center', alignItems: 'center',
  },
  expandedDotBlue:  {backgroundColor: '#1066B1'},
  expandedDotAmber: {backgroundColor: '#F59E0B', width: 14, height: 14, borderRadius: 7},
  expandedDotRed:   {backgroundColor: '#EF4444'},
  expandedDotNum:   {color: '#fff', fontSize: 7, fontWeight: '900'},
  expandedRouteLine: {
    width: 1.5, height: 18, backgroundColor: '#D1D9E6', marginLeft: 11,
  },
  expandedRouteText: {flex: 1, paddingBottom: 2, paddingLeft: 8},
  expandedRouteTag: {
    fontSize: 10, fontWeight: '800', color: colors.inkSoft,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  expandedRouteAddr: {fontSize: 13, fontWeight: '700', color: colors.navy, marginTop: 1},
  expandedRouteEta:  {fontSize: 11, fontWeight: '600', color: '#F59E0B', marginTop: 1},
  // Info rows
  expandedInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 6,
  },
  expandedInfoLabel: {fontSize: 13, fontWeight: '700', color: colors.inkSoft},
  expandedInfoValue: {
    fontSize: 13, fontWeight: '800', color: colors.navy,
    textAlign: 'right', flex: 1, marginLeft: spacing.md,
  },
  // Instructions / notes
  expandedInstructions: {
    fontSize: 12, fontWeight: '600', color: '#44474C',
    lineHeight: 18, backgroundColor: '#FAFBFC',
    borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#EDEEF2',
  },
  expandedCompartmentRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },

  // ── Start Shift / Start Day ───────────────────────────────────────────────
  startShiftBtn: {
    marginTop: 10,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  startShiftBtnText: {color: '#FFFFFF', fontWeight: '900', fontSize: 14},

  startDayBtn: {
    marginTop: 16,
    marginBottom: 10,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  startDayBtnText: {color: '#FFFFFF', fontWeight: '900', fontSize: 14},

  awaitingPayBanner: {
    marginTop: 16,
    marginBottom: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  awaitingPayText: {color: '#92400E', fontSize: 13, fontWeight: '700', textAlign: 'center'},
});

export default ShiftsScreen;
