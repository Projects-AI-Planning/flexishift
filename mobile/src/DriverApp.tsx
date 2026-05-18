import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {setApiAccessToken, setApiSessionRefresher} from './api/client';
import {driverApi} from './api/driverApi';
import {BellIcon} from './components/common/FieldIcon';
import Icon from './components/common/Icon';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import VerifyScreen from './screens/auth/VerifyScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import ProfileSetupScreen from './screens/auth/ProfileSetupScreen';
import ResetPasswordScreen from './screens/auth/ResetPasswordScreen';
import DashboardScreen from './screens/dashboard/DashboardScreen';
import JobDiscoveryScreen from './screens/jobs/JobDiscoveryScreen';
import JobSearchLockedScreen from './screens/jobs/JobSearchLockedScreen';
import JobDetailScreen from './screens/jobs/JobDetailScreen';
import MyQuotesScreen from './screens/jobs/MyQuotesScreen';
import QuoteStatusScreen from './screens/jobs/QuoteStatusScreen';
import PaymentReleasedScreen from './screens/payments/PaymentReleasedScreen';
import PaymentEscrowScreen from './screens/payments/PaymentEscrowScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import LoadCodeScreen from './screens/compliance/LoadCodeScreen';
import ScannerInterfaceScreen from './screens/compliance/ScannerInterfaceScreen';
import HandoverScreen from './screens/compliance/HandoverScreen';
import DeliveryScreen from './screens/compliance/DeliveryScreen';
import DocumentVerificationScreen from './screens/profile/DocumentVerificationScreen';
import AvailabilityScreen from './screens/profile/AvailabilityScreen';
import EarningsHistoryScreen from './screens/earnings/EarningsHistoryScreen';
import InvoiceDetailScreen from './screens/invoices/InvoiceDetailScreen';
import RatingsListScreen from './screens/ratings/RatingsListScreen';
import RatingSubmissionScreen from './screens/ratings/RatingSubmissionScreen';
import LiveTrackingScreen from './screens/tracking/LiveTrackingScreen';
import IncidentReportScreen from './screens/tracking/IncidentReportScreen';
import NotificationsScreen from './screens/notifications/NotificationsScreen';
import TermsAndConditionsScreen from './screens/legal/TermsAndConditionsScreen';
import PrivacyPolicyScreen from './screens/legal/PrivacyPolicyScreen';
import InvoicesScreen from './screens/invoices/InvoicesScreen';
import PasswordScreen from './screens/profile/PasswordScreen';
import NotificationPreferencesScreen from './screens/profile/NotificationPreferencesScreen';
import SettingsScreen from './screens/profile/SettingsScreen';
import SupportScreen from './screens/support/SupportScreen';
import BookingAcceptanceScreen from './screens/bookings/BookingAcceptanceScreen';
import ShiftsScreen from './screens/shifts/ShiftsScreen';
import {bottomTabs} from './navigation/driverNavigation';
import type {
  AvailabilityResponse,
  BookingDetail,
  DashboardOverview,
  DocumentSummary,
  DrawerRouteKey,
  DriverSession,
  DriverTabKey,
  NotificationSummary,
  ProfileResponse,
  RatingSummary,
} from './types';

interface EarningsResponse {
  allTimeEarnings?: number;
  allTimeJobs?: number;
  breakdown?: Array<Record<string, unknown>>;
  currency?: string;
  summary?: {
    averagePerJob?: number;
    totalEarnings?: number;
    totalJobs?: number;
  };
}

interface QuoteFormState {
  currency: string;
  jobId: string;
  notes: string;
  quoteAmount: string;
}

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset' | 'terms' | 'privacy';
type SetupStep = 'profile' | 'documents' | null;

const palette = {
  accent: '#DFA622',
  accentSoft: '#FFF3D5',
  bg: '#F8F9FA',
  border: '#E4DED0',
  card: '#FFFFFF',
  danger: '#A53A32',
  ink: '#041627',
  inkSoft: '#44474C',
  nav: '#102235',
  success: '#18794E',
};

const mapDocumentItems = (payload: Record<string, unknown> | null | undefined): DocumentSummary[] => {
  return (((payload?.items as DocumentSummary[] | undefined) ?? []) || []) as DocumentSummary[];
};

const areDriverDocumentsApproved = (
  verification: Record<string, unknown> | null | undefined,
  docs: DocumentSummary[],
): boolean => {
  if (verification?.allDocumentsApproved === true) {
    return true;
  }
  return (
    docs.length > 0 &&
    docs.every(d => ['APPROVED', 'VERIFIED'].includes(String(d.status).toUpperCase()))
  );
};

const hasDriverUploadedDocuments = (
  verification: Record<string, unknown> | null | undefined,
  docs: DocumentSummary[],
): boolean => {
  const statuses = verification?.documentStatuses;
  return (
    docs.length > 0 ||
    (statuses != null &&
      typeof statuses === 'object' &&
      Object.keys(statuses as Record<string, unknown>).length > 0)
  );
};

const hasRejectedDriverDocuments = (docs: DocumentSummary[]): boolean => {
  return docs.some(d => String(d.status).toUpperCase() === 'REJECTED');
};

const isDriverProfileComplete = (profile: ProfileResponse | null): boolean => {
  return (
    profile?.profileComplete === true ||
    (profile as any)?.isProfileComplete === true ||
    Boolean(profile?.profile?.licenceNumber)
  );
};

const defaultLogin = {email: '', password: ''};
const defaultRegister = {email: '', name: '', password: '', phone: ''};
const defaultVerify = {email: '', otp: ''};
const defaultReset = {confirmPassword: '', newPassword: '', resetToken: ''};
const defaultQuoteForm = {
  currency: 'INR',
  jobId: '',
  notes: '',
  quoteAmount: '',
};
const defaultPasswordForm = {
  confirmPassword: '',
  currentPassword: '',
  newPassword: '',
};
const defaultNotificationPrefs = {
  pushNotifications: {
    compliance_alerts: true,
    enabled: true,
    job_updates: true,
    new_job_matches: true,
    payment_updates: true,
    system_alerts: false,
  },
  smsNotifications: {enabled: true, job_updates: true, payment_updates: true},
};

const SESSION_KEY = '@ff_driver_session';

function decodeJwtExp(token: string): number {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return (JSON.parse(json) as {exp?: number}).exp ?? 0;
  } catch {
    return 0;
  }
}

function isSessionValid(sess: DriverSession | null): boolean {
  if (!sess?.accessToken) {return false;}
  const exp = decodeJwtExp(sess.accessToken);
  return exp > 0 && exp * 1000 > Date.now() + 60_000;
}

const cast = <T,>(value: unknown) => value as T;

function normalizeNotificationItem(item: Record<string, unknown>): NotificationSummary {
  return {
    notificationId: String(item.notificationId ?? item.id ?? ''),
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
    data: (item.data as Record<string, unknown> | undefined) ?? undefined,
    isRead: Boolean(item.isRead ?? item.readAt ?? item.read ?? false),
    readAt: item.readAt ? String(item.readAt) : undefined,
    message: String(item.message ?? item.body ?? item.description ?? ''),
    title: String(item.title ?? 'Notification'),
    type: String(item.type ?? 'system'),
  };
}

function toAddress(value: unknown): string {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null && 'address' in value) {
    return String((value as {address?: string}).address ?? '');
  }
  return '';
}

function formatLabel(value: string) {
  return value.replace(/[_.]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function normalizeComplianceStep(
  compliance: Record<string, unknown> | null | undefined,
  activeJob: DashboardOverview['activeJob'] | null | undefined,
): 'tracking.active' | 'compliance.handover' | 'compliance.loadCode' {
  const currentStep = String(
    compliance?.currentStep ?? activeJob?.currentComplianceStep ?? '',
  ).toLowerCase();
  if (currentStep === 'tracking.active') {
    return 'tracking.active';
  }
  if (currentStep === 'compliance.handover') {
    return 'compliance.handover';
  }
  if (currentStep === 'compliance.loadcode' || currentStep === 'compliance.loadcode') {
    return 'compliance.loadCode';
  }

  const complianceJobStatus = String(
    compliance?.job_status ?? compliance?.jobStatus ?? activeJob?.status ?? '',
  ).toLowerCase();

  if (
    compliance?.step1_handover_completed === true ||
    complianceJobStatus === 'in_transit' ||
    complianceJobStatus === 'delivery_submitted' ||
    complianceJobStatus === 'completed'
  ) {
    return 'tracking.active';
  }

  if (compliance?.load_code_verified === true) {
    return 'compliance.handover';
  }

  return 'compliance.loadCode';
}

function normalizeTrackingEta(payload: Record<string, unknown> | null | undefined) {
  if (!payload) {
    return null;
  }
  return {
    ...payload,
    estimatedArrival:
      payload.estimatedArrival ??
      payload.eta ??
      payload.original_eta ??
      payload.originalEta ??
      null,
    distanceRemaining:
      payload.distanceRemaining ??
      payload.remaining_distance_km ??
      payload.remainingDistanceKm ??
      null,
    estimatedDuration:
      payload.estimatedDuration ??
      payload.remaining_duration_min ??
      payload.remainingDurationMin ??
      null,
    currentLocation:
      payload.currentLocation ??
      (payload.current_lat != null && payload.current_lng != null
        ? {
            latitude: payload.current_lat,
            longitude: payload.current_lng,
          }
        : null),
  };
}

function EmptyState({title}: {title: string}) {
  return <Text style={styles.emptyText}>{title}</Text>;
}

function SectionCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DriverApp(): React.JSX.Element {
  const [initializing, setInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [session, setSession] = useState<DriverSession | null>(null);

  // Navigation
  const [activeTab, setActiveTab] = useState<DriverTabKey>('home');
  const [activeRoute, setActiveRoute] = useState<DrawerRouteKey>('home');
  const navHistoryRef = useRef<Array<{tab: DriverTabKey; route: DrawerRouteKey}>>([]);

  // Auth
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loginForm, setLoginForm] = useState(defaultLogin);
  const [registerForm, setRegisterForm] = useState(defaultRegister);
  const [verifyForm, setVerifyForm] = useState(defaultVerify);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetForm, setResetForm] = useState(defaultReset);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Loading states
  const [contentLoading, setContentLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [availableJobs, setAvailableJobs] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [upcomingJobs, setUpcomingJobs] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [expandedUpcomingJobId, setExpandedUpcomingJobId] = useState<string | null>(null);
  const [jobHistory, setJobHistory] = useState<Array<Record<string, unknown>>>(
    [],
  );
  const [selectedJob, setSelectedJob] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [quoteForm, setQuoteForm] = useState<QuoteFormState>(defaultQuoteForm);
  const [myQuotes, setMyQuotes] = useState<Array<Record<string, unknown>>>([]);
  const [highlightedQuoteJobId, setHighlightedQuoteJobId] = useState<string | null>(null);

  // Booking
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(
    null,
  );
  const [complianceJobId, setComplianceJobId] = useState<string | null>(null);
  const [complianceJobRef, setComplianceJobRef] = useState<string | null>(null);
  const [handoverStatus, setHandoverStatus] = useState<{haulierSigned?: boolean; haulierSignedAt?: string | null} | null>(null);

  // Profile
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    licenceNumber: '',
    vehicleType: '',
    vehicleRegistration: '',
    driverAvailability: '',
    companyName: '',
    companyAddress: '',
    coverageArea: '',
  });
  const [passwordForm, setPasswordForm] = useState(defaultPasswordForm);
  const [notificationPrefs, setNotificationPrefs] = useState(
    defaultNotificationPrefs,
  );

  // Documents
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [docsChecked, setDocsChecked] = useState(false);
  // Refs so callbacks can read latest values without being in their dep arrays
  const documentsRef = useRef<DocumentSummary[]>([]);
  const verificationStatusRef = useRef<Record<string, unknown> | null>(null);
  const dashboardRef = useRef<DashboardOverview | null>(null);
  const profileRef = useRef<ProfileResponse | null>(null);
  documentsRef.current = documents;
  verificationStatusRef.current = verificationStatus;
  dashboardRef.current = dashboard;
  profileRef.current = profile;

  // Availability
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(
    null,
  );
  const [availabilityForm, setAvailabilityForm] = useState({
    availableDays: ['monday', 'tuesday', 'wednesday', 'friday', 'saturday'],
    endTime: '18:00',
    isAvailable: true,
    reason: '',
    startTime: '08:00',
    timezone: 'Asia/Kolkata',
  });

  // Notifications & other
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [invoices, setInvoices] = useState<Array<Record<string, unknown>>>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [ratings, setRatings] = useState<RatingSummary | null>(null);
  // Shifts
  const [availableShifts, setAvailableShifts] = useState<Array<Record<string, unknown>>>([]);
  const [myShifts, setMyShifts] = useState<Array<Record<string, unknown>>>([]);

  const [trackingEta, setTrackingEta] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [trackingLiveLocation, setTrackingLiveLocation] = useState<{
    lastUpdatedAt?: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);
  const [complianceStatus, setComplianceStatus] = useState<Record<
    string,
    unknown
  > | null>(null);
  const TRACKING_AUTO_REFRESH_INTERVAL_MS = 45000;

  // Banners
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Post-login setup flow
  const [setupStep, setSetupStep] = useState<SetupStep>(null);
  const [setupAvailability, setSetupAvailability] = useState<string>('');

  // Quote accepted/rejected notification
  const [quoteStatusData, setQuoteStatusData] = useState<{
    type: 'accepted' | 'rejected';
    quote: Record<string, unknown>;
  } | null>(null);

  // Payment released data
  const [paymentReleasedData, setPaymentReleasedData] = useState<{
    jobReference: string;
    amount: number;
    currency: string;
    completionDate?: string;
  } | null>(null);

  // Payment escrow data (driver notification)
  const [escrowJobId, setEscrowJobId] = useState<string | null>(null);
  const [escrowDetails, setEscrowDetails] = useState<Record<string, unknown> | null>(null);
  const [escrowLoading, setEscrowLoading] = useState(false);
  const [escrowRefreshing, setEscrowRefreshing] = useState(false);

  // ─── Data loaders ────────────────────────────────────────────────────────────

  const refreshSession = useCallback(async (): Promise<DriverSession | null> => {
    if (!session?.refreshToken) {
      return null;
    }
    try {
      setApiAccessToken(null);
      const refreshed = await driverApi.auth.refreshToken(session.refreshToken);
      const nextSession: DriverSession = {
        ...session,
        accessToken: refreshed.accessToken,
        ...(refreshed.refreshToken ? {refreshToken: refreshed.refreshToken} : {}),
      };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      return nextSession;
    } catch {
      return null;
    }
  }, [session]);

  const ensureAuthenticated = useCallback(async (): Promise<boolean> => {
    if (!session?.accessToken) {
      return false;
    }
    if (isSessionValid(session)) {
      return true;
    }
    return (await refreshSession()) !== null;
  }, [refreshSession, session]);

  const loadNotifications = useCallback(async () => {
    const [listResult, unreadResult] = await Promise.allSettled([
      driverApi.notifications.list({limit: 30, page: 1}),
      driverApi.notifications.getUnreadCount(),
    ]);
    if (listResult.status === 'fulfilled') {
      const items = ((listResult.value.notifications ?? []) as Array<Record<string, unknown>>) || [];
      setNotifications(items.map(normalizeNotificationItem));
    }
    if (unreadResult.status === 'fulfilled') {
      const unread = unreadResult.value as Record<string, unknown>;
      setNotificationUnreadCount(Number(unread.unreadCount ?? 0));
    } else if (listResult.status === 'fulfilled') {
      const unread = ((listResult.value.notifications ?? []) as Array<Record<string, unknown>>)
        .filter(item => !Boolean(item.isRead ?? item.readAt ?? item.read ?? false)).length;
      setNotificationUnreadCount(unread);
    }
  }, []);

  const loadHome = useCallback(async () => {
    let overviewFailed = false;
    await Promise.allSettled([
      driverApi.dashboard.getOverview()
        .then(d => setDashboard(cast<DashboardOverview>(d)))
        .catch(() => { overviewFailed = true; }),
      driverApi.dashboard.getEarnings({period: 'monthly'})
        .then(d => setEarnings(cast<EarningsResponse>(d)))
        .catch(() => {}),
      loadNotifications().catch(() => {}),
      driverApi.dashboard.getUpcomingJobs({limit: 10, page: 1})
        .then(d => setUpcomingJobs((d.jobs as Array<Record<string, unknown>>) ?? []))
        .catch(() => {}),
      session?.userId
        ? driverApi.ratings.getSummary(session.userId)
            .then(d => setRatings(cast<RatingSummary>(d)))
            .catch(() => {})
        : Promise.resolve(),
    ]);
    if (overviewFailed && !dashboardRef.current) {
      throw new Error('Failed to load dashboard. Pull down to retry.');
    }
  }, [session?.userId]);

  const loadJobs = useCallback(async () => {
    const [docsData, docStatusData, profileData] = await Promise.all([
      driverApi.documents.list().catch(() => null),
      driverApi.documents.getStatus().catch(() => null),
      profileRef.current === null
        ? driverApi.profile.getMe().catch(() => null)
        : Promise.resolve(null),
    ]);
    const nextDocuments = docsData
      ? mapDocumentItems(docsData as Record<string, unknown>)
      : documentsRef.current;
    const nextVerificationStatus = docStatusData
      ? cast<Record<string, unknown>>(docStatusData)
      : verificationStatusRef.current;
    if (docsData) {
      setDocuments(nextDocuments);
    }
    if (docStatusData) {
      setVerificationStatus(nextVerificationStatus);
    }
    if (profileData) {
      const p = cast<ProfileResponse>(profileData);
      setProfile(p);
      const pd = p.profile ?? null;
      setProfileForm({
        name: String(p.name ?? ''),
        phone: String(p.phone ?? ''),
        licenceNumber: String(pd?.licenceNumber ?? ''),
        vehicleType: String(pd?.vehicleType ?? ''),
        vehicleRegistration: String(pd?.vehicleRegistration ?? ''),
        driverAvailability: String(pd?.driverAvailability ?? ''),
        companyName: String(pd?.companyName ?? ''),
        companyAddress: String(pd?.companyAddress ?? ''),
        coverageArea: String(pd?.coverageArea ?? ''),
      });
    }

    setDocsChecked(true);
    const documentsApproved = areDriverDocumentsApproved(
      nextVerificationStatus,
      nextDocuments,
    );
    if (!documentsApproved) {
      setAvailableJobs([]);
      setUpcomingJobs([]);
      setJobHistory([]);
      setMyQuotes([]);
      return;
    }
    const [availableData, upcomingData, historyData, quotesData] = await Promise.all([
      driverApi.jobs.listAvailable({limit: 20, page: 1, status: 'open'}),
      driverApi.dashboard.getUpcomingJobs({limit: 20, page: 1}),
      driverApi.dashboard.getJobHistory({limit: 20, page: 1}),
      driverApi.quotes.listMine().catch(() => null),
    ]);
    const jobs = (availableData.items as Array<Record<string, unknown>>) ?? [];
    setAvailableJobs(jobs);
    setUpcomingJobs(
      (upcomingData.jobs as Array<Record<string, unknown>>) ?? [],
    );
    setJobHistory((historyData.jobs as Array<Record<string, unknown>>) ?? []);
    if (quotesData) {
      setMyQuotes((quotesData.items as Array<Record<string, unknown>>) ?? []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTracking = useCallback(async () => {
    const overview =
      dashboardRef.current ??
      cast<DashboardOverview>(await driverApi.dashboard.getOverview());
    setDashboard(overview);
    if (overview.activeJob?.jobId) {
      const [etaResult, complianceResult, liveResult] = await Promise.allSettled([
        driverApi.tracking.getEta(overview.activeJob.jobId),
        driverApi.compliance.getFullStatus(overview.activeJob.jobId),
        driverApi.tracking.getLive(overview.activeJob.jobId),
      ]);

      const eta =
        etaResult.status === 'fulfilled'
          ? normalizeTrackingEta(cast<Record<string, unknown>>(etaResult.value))
          : null;
      const compliance =
        complianceResult.status === 'fulfilled'
          ? cast<Record<string, unknown>>(complianceResult.value)
          : null;
      const live =
        liveResult.status === 'fulfilled'
          ? cast<Record<string, unknown>>(liveResult.value)
          : null;

      setTrackingEta(
        eta ?? {
          estimatedArrival: overview.activeJob.originalEta ?? overview.activeJob.eta ?? null,
          distanceRemaining:
            (overview.activeJob as any)?.distanceRemaining ??
            overview.activeJob.distanceKm ??
            (overview.activeJob as any)?.distance ??
            null,
          estimatedDuration:
            (overview.activeJob as any)?.estimatedDuration ??
            overview.activeJob.durationMin ??
            (overview.activeJob as any)?.timeLeft ??
            null,
        },
      );
      setTrackingLiveLocation(
        live?.currentLocation
          ? {
              latitude: Number((live.currentLocation as any).latitude),
              longitude: Number((live.currentLocation as any).longitude),
              lastUpdatedAt: String((live.currentLocation as any).lastUpdatedAt ?? live.lastUpdatedAt ?? ''),
            }
          : overview.activeJob.currentLocation
          ? {
              latitude: Number(overview.activeJob.currentLocation.latitude ?? 0),
              longitude: Number(overview.activeJob.currentLocation.longitude ?? 0),
              lastUpdatedAt: String(overview.activeJob.currentLocation.lastUpdatedAt ?? ''),
            }
          : null,
      );
      setComplianceStatus(
        compliance
          ? {
              ...compliance,
              currentStep: normalizeComplianceStep(compliance, overview.activeJob),
            }
          : {
              currentStep: normalizeComplianceStep(null, overview.activeJob),
            },
      );
    } else {
      setTrackingEta(null);
      setTrackingLiveLocation(null);
      setComplianceStatus(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = useCallback(async () => {
    const [profileResult, ratingResult] = await Promise.allSettled([
      driverApi.profile.getMe(),
      session?.userId
        ? driverApi.ratings.getSummary(session.userId)
        : Promise.resolve(null),
    ]);
    if (profileResult.status !== 'fulfilled') {
      throw profileResult.reason instanceof Error
        ? profileResult.reason
        : new Error('Failed to load profile.');
    }
    const nextProfile = cast<ProfileResponse>(profileResult.value);
    const nextProfileData = nextProfile.profile ?? null;
    setProfile(nextProfile);
    setProfileForm({
      name: String(nextProfile.name ?? ''),
      phone: String(nextProfile.phone ?? ''),
      licenceNumber: String(nextProfileData?.licenceNumber ?? ''),
      vehicleType: String(nextProfileData?.vehicleType ?? ''),
      vehicleRegistration: String(nextProfileData?.vehicleRegistration ?? ''),
      driverAvailability: String(nextProfileData?.driverAvailability ?? ''),
      companyName: String(nextProfileData?.companyName ?? ''),
      companyAddress: String(nextProfileData?.companyAddress ?? ''),
      coverageArea: String(nextProfileData?.coverageArea ?? ''),
    });
    setRatings(ratingResult.status === 'fulfilled' && ratingResult.value ? cast<RatingSummary>(ratingResult.value) : null);
  }, [session?.userId]);

  const loadMyQuotes = useCallback(async () => {
    const quotesData = await driverApi.quotes.listMine();
    setMyQuotes((quotesData.items as Array<Record<string, unknown>>) ?? []);
  }, []);

  const loadShifts = useCallback(async () => {
    const [available, mine] = await Promise.allSettled([
      driverApi.shifts.listAvailable(),
      driverApi.shifts.listMine(),
    ]);
    if (available.status === 'fulfilled') {
      setAvailableShifts((available.value.items as Array<Record<string, unknown>>) ?? []);
    }
    if (mine.status === 'fulfilled') {
      setMyShifts((mine.value.items as Array<Record<string, unknown>>) ?? []);
    }
  }, []);

  const loadDrawerRoute = useCallback(
    async (route: DrawerRouteKey) => {
      switch (route) {
        case 'documents.upload':
        case 'documents.status': {
          const [docs, status] = await Promise.all([
            driverApi.documents.list(),
            driverApi.documents.getStatus(),
          ]);
          setDocuments(mapDocumentItems(docs as Record<string, unknown>));
          setVerificationStatus(cast<Record<string, unknown>>(status));
          break;
        }
        case 'availability.set':
        case 'availability.toggle': {
          const avail = cast<AvailabilityResponse>(
            await driverApi.availability.getMine(),
          );
          const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const slots = Array.isArray(avail.slots) ? avail.slots : [];
          const blocks = Array.isArray(avail.blocks) ? avail.blocks : [];
          const firstSlot = slots[0] ?? avail.timeSlots?.[0] ?? {};
          const derivedDays = slots
            .map(slot => {
              const rawDay = Number(
                (slot as {day_of_week?: unknown; dayOfWeek?: unknown}).day_of_week ??
                  (slot as {day_of_week?: unknown; dayOfWeek?: unknown}).dayOfWeek,
              );
              return dayKeys[rawDay];
            })
            .filter((day): day is string => Boolean(day));
          setAvailability(avail);
          setAvailabilityForm({
            availableDays: avail.availableDays?.length
              ? avail.availableDays
              : derivedDays.length
                ? derivedDays
                : ['monday', 'tuesday', 'wednesday', 'friday', 'saturday'],
            endTime: String(
              (firstSlot as {end_time?: unknown; endTime?: unknown}).end_time ??
                (firstSlot as {end_time?: unknown; endTime?: unknown}).endTime ??
                '18:00',
            ),
            isAvailable: avail.isAvailable ?? blocks.length === 0,
            reason: String(
              avail.reason ??
                (blocks[0] as {reason?: unknown})?.reason ??
                '',
            ),
            startTime: String(
              (firstSlot as {start_time?: unknown; startTime?: unknown}).start_time ??
                (firstSlot as {start_time?: unknown; startTime?: unknown}).startTime ??
                '08:00',
            ),
            timezone: avail.timezone ?? 'Asia/Kolkata',
          });
          break;
        }
        case 'earnings.total':
        case 'earnings.monthly': {
          const ed = await driverApi.dashboard.getEarnings({period: 'monthly'});
          setEarnings(cast<EarningsResponse>(ed));
          break;
        }
        case 'earnings.history': {
          const hist = await driverApi.payments.getHistory({
            limit: 20,
            page: 1,
          });
          setPayments((hist.payments as Array<Record<string, unknown>>) ?? []);
          break;
        }
        case 'invoices.list': {
          const inv = await driverApi.invoices.list({limit: 20, page: 1});
          setInvoices((inv.invoices as Array<Record<string, unknown>>) ?? []);
          break;
        }
        case 'invoices.detail':
          break;
        case 'notifications.all': {
          await loadNotifications();
          break;
        }
        case 'ratings.received':
        case 'ratings.given': {
          if (session?.userId) {
            const summary = await driverApi.ratings.getSummary(session.userId);
            setRatings(cast<RatingSummary>(summary));
          }
          break;
        }
        case 'shifts.available':
        case 'shifts.myShifts': {
          await loadShifts();
          break;
        }
        case 'jobs.myQuotes': {
          await loadMyQuotes();
          break;
        }
        case 'jobs.upcoming': {
          const [upcomingData, quotesData] = await Promise.all([
            driverApi.dashboard.getUpcomingJobs({limit: 20, page: 1}),
            driverApi.quotes.listMine().catch(() => null),
          ]);
          setUpcomingJobs((upcomingData.jobs as Array<Record<string, unknown>>) ?? []);
          if (quotesData) {
            setMyQuotes((quotesData.items as Array<Record<string, unknown>>) ?? []);
          }
          break;
        }
        case 'jobs.history': {
          const historyData = await driverApi.dashboard.getJobHistory({
            limit: 20,
            page: 1,
          });
          setJobHistory(
            (historyData.jobs as Array<Record<string, unknown>>) ?? [],
          );
          break;
        }
        case 'compliance.loadCode':
        case 'compliance.scanner':
        case 'compliance.handover':
        case 'compliance.delivery': {
          const jobId = complianceJobId ?? dashboardRef.current?.activeJob?.jobId;
          if (jobId) {
            setComplianceStatus(
              await driverApi.compliance.getFullStatus(jobId),
            );
          } else {
            setComplianceStatus(null);
          }
          break;
        }
        case 'profile.edit':
          await loadProfile();
          break;
        case 'profile.password':
          setPasswordForm(defaultPasswordForm);
          break;
        default:
          break;
      }
    },
    [
      complianceJobId,
      loadMyQuotes,
      loadProfile,
      loadNotifications,
      loadShifts,
      session?.userId,
    ],
  );

  const refreshActiveView = useCallback(async (options?: {silent?: boolean}) => {
    if (!session) {
      return;
    }
    if (!options?.silent) {
      setContentLoading(true);
    }
    setErrorBanner(null);
    try {
      if (activeTab === 'home' && activeRoute === 'home') {
        await loadHome();
      } else if (activeTab === 'shifts' || activeRoute.startsWith('shifts.')) {
        await loadShifts();
      } else if (activeTab === 'jobs' || activeRoute.startsWith('jobs.')) {
        if (activeRoute === 'jobs.myQuotes') {
          await loadMyQuotes();
        } else if (activeRoute === 'jobs.upcoming') {
          await loadDrawerRoute('jobs.upcoming');
        } else if (activeRoute === 'jobs.history') {
          await loadDrawerRoute('jobs.history');
        } else {
          await loadJobs();
        }
      } else if (
        activeRoute.startsWith('compliance.') ||
        activeTab === 'tracking' ||
        activeRoute.startsWith('tracking.')
      ) {
        await loadTracking();
        if (activeRoute.startsWith('compliance.')) {
          await loadDrawerRoute(activeRoute);
        }
      } else if (activeTab === 'profile') {
        await loadProfile();
        if (activeRoute !== 'profile.edit') {
          await loadDrawerRoute(activeRoute);
        }
      } else {
        await loadDrawerRoute(activeRoute);
      }
    } catch (error) {
      setErrorBanner(
        error instanceof Error ? error.message : 'Failed to load data.',
      );
    } finally {
      if (!options?.silent) {
        setContentLoading(false);
      }
    }
  }, [
    activeRoute,
    activeTab,
    loadDrawerRoute,
    loadHome,
    loadJobs,
    loadMyQuotes,
    loadProfile,
    loadShifts,
    loadTracking,
    session,
  ]);

  useEffect(() => {
    setApiAccessToken(session?.accessToken ?? null);
    setApiSessionRefresher(async () => {
      if (!session?.refreshToken) {
        return null;
      }
      try {
        setApiAccessToken(null);
        const refreshed = await driverApi.auth.refreshToken(session.refreshToken);
        const nextSession: DriverSession = {
          ...session,
          accessToken: refreshed.accessToken,
          ...(refreshed.refreshToken ? {refreshToken: refreshed.refreshToken} : {}),
        };
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
        return {
          accessToken: nextSession.accessToken,
          refreshToken: nextSession.refreshToken,
        };
      } catch {
        return null;
      }
    });
    return () => {
      setApiSessionRefresher(null);
    };
  }, [session]);

  // Restore persisted session on first mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (!raw) return;

        const saved = JSON.parse(raw) as DriverSession;
        if (!saved?.accessToken || !saved?.refreshToken) return;

        if (isSessionValid(saved)) {
          // Access token still valid — resume immediately
          setSession(saved);
          setShowSplash(false);
          return;
        }

        // Access token expired — silently refresh using the stored refresh token
        setApiAccessToken(null); // clear expired token so it isn't sent in the request
        const refreshed = await driverApi.auth.refreshToken(saved.refreshToken);
        const newSession: DriverSession = {
          ...saved,
          accessToken: refreshed.accessToken,
          ...(refreshed.refreshToken ? {refreshToken: refreshed.refreshToken} : {}),
        };
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
        setSession(newSession);
        setShowSplash(false);
      } catch {
        // Refresh token also expired or network error — clear storage and show login
        await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
      }
    };

    restoreSession().finally(() => setInitializing(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (session) {
      refreshActiveView().catch(() => undefined);
    }
  }, [refreshActiveView, session]);

  useEffect(() => {
    if (!session || activeRoute !== 'notifications.all') {
      return;
    }
    loadNotifications().catch(() => undefined);
  }, [activeRoute, loadNotifications, session]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) {
        return;
      }
      socket = new WebSocket(driverApi.notifications.websocketUrl(session.accessToken));
      socket.onopen = () => {
        socket?.send('ping');
      };
      socket.onmessage = event => {
        try {
          const payload = JSON.parse(String(event.data ?? '{}')) as Record<string, unknown>;
          if (payload.event !== 'notification') {
            return;
          }
          const nextItem = normalizeNotificationItem({
            notificationId: payload.id ?? '',
            type: payload.type,
            title: payload.title,
            message: payload.body,
            data: payload.data,
            createdAt: new Date().toISOString(),
            isRead: false,
          });
          if (!nextItem.notificationId) {
            return;
          }
          setNotifications(current => {
            if (current.some(item => item.notificationId === nextItem.notificationId)) {
              return current;
            }
            return [nextItem, ...current];
          });
          setNotificationUnreadCount(count => count + 1);
          if (activeRoute === 'notifications.all') {
            loadNotifications().catch(() => undefined);
          }
        } catch {
          /* ignore malformed events */
        }
      };
      socket.onerror = () => {
        socket?.close();
      };
      socket.onclose = () => {
        if (cancelled) {
          return;
        }
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [activeRoute, loadNotifications, session?.accessToken]);

  useEffect(() => {
    if (
      !session ||
      activeRoute !== 'tracking.active'
    ) {
      return;
    }
    const interval = setInterval(() => {
      refreshActiveView({silent: true}).catch(() => undefined);
    }, TRACKING_AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeRoute, refreshActiveView, session]);

  useEffect(() => {
    if (selectedJob?.jobId) {
      driverApi.jobs
        .getDetails(String(selectedJob.jobId))
        .then(data => {
          setSelectedJobDetails(data);
          setQuoteForm(c => ({...c, jobId: String(selectedJob.jobId)}));
        })
        .catch(() => undefined);
    } else {
      setSelectedJobDetails(null);
    }
  }, [selectedJob]);

  const goBackOneStep = useCallback(() => {
    if (quoteStatusData) {
      setQuoteStatusData(null);
      setSuccessBanner(null);
      setErrorBanner(null);
      return true;
    }

    if (selectedJob) {
      const previous = navHistoryRef.current.pop();
      setSelectedJob(null);
      setSelectedJobDetails(null);
      setSuccessBanner(null);
      setErrorBanner(null);
      if (previous) {
        setActiveTab(previous.tab);
        setActiveRoute(previous.route);
      }
      return true;
    }

    const previous = navHistoryRef.current.pop();
    if (previous) {
      setActiveTab(previous.tab);
      setActiveRoute(previous.route);
      setSuccessBanner(null);
      setErrorBanner(null);
      return true;
    }

    if (activeRoute === 'home' && activeTab === 'home') {
      Alert.alert('Exit App', 'Are you sure you want to exit FlexiShift?', [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp()},
      ]);
    } else {
      setActiveRoute('home');
      setActiveTab('home');
      setSuccessBanner(null);
      setErrorBanner(null);
    }

    return true;
  }, [activeRoute, activeTab, quoteStatusData, selectedJob]);

  useEffect(() => {
    if (!session) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', goBackOneStep);
    return () => sub.remove();
  }, [session, goBackOneStep]);

  // ─── Action helpers ───────────────────────────────────────────────────────────

  const runAction = async (task: () => Promise<void>) => {
    setActionLoading(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await task();
    } catch (error) {
      setErrorBanner(error instanceof Error ? error.message : 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const navigate = (tab: DriverTabKey, route: DrawerRouteKey) => {
    if (activeTab !== tab || activeRoute !== route) {
      navHistoryRef.current.push({tab: activeTab, route: activeRoute});
    }
    setActiveTab(tab);
    setActiveRoute(route);
    setSuccessBanner(null);
    setErrorBanner(null);
    if (route !== 'jobs.myQuotes') {
      setHighlightedQuoteJobId(null);
    }
    if (tab !== 'jobs' || route !== 'jobs.available') {
      setSelectedJob(null);
      setSelectedJobDetails(null);
    }
  };

  // ─── Auth handlers ────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthInfo(null);
    try {
      const payload = await driverApi.auth.login(loginForm);
      const newSession = cast<DriverSession>(payload);
      setSession(newSession);
      AsyncStorage.setItem(SESSION_KEY, JSON.stringify(newSession)).catch(() => {});
      setSetupStep(null);
      navHistoryRef.current = [];
      setActiveTab('home');
      setActiveRoute('home');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleProfileSetup = async (data: {
    name: string;
    driverAvailability: string;
    licenceNumber: string;
    vehicleType: string;
    vehicleRegistration: string;
    photoFile?: {uri: string; fileName: string; type: string};
  }) => {
    setActionLoading(true);
    setErrorBanner(null);
    try {
      if (data.photoFile?.uri) {
        const formData = new FormData();
        formData.append('file', {
          uri: data.photoFile.uri,
          name: data.photoFile.fileName,
          type: data.photoFile.type,
        } as any);
        await driverApi.profile.uploadPhotoDirect(formData);
      }
      await driverApi.profile.update({
        name: data.name,
        driverAvailability: data.driverAvailability,
        licenceNumber: data.licenceNumber,
        vehicleType: data.vehicleType,
        vehicleRegistration: data.vehicleRegistration,
      });
      setSetupAvailability(data.driverAvailability);
      // Load existing documents and skip the documents step if already all approved
      try {
        const docs = await driverApi.documents.list();
        const docItems = mapDocumentItems(docs as Record<string, unknown>);
        setDocuments(docItems);

        const mode = (data.driverAvailability ?? '').toUpperCase();
        const requiredTypes =
          mode === 'DRIVER_ONLY'
            ? ['DRIVING_LICENCE']
            : mode === 'TRUCK_ONLY'
            ? ['VEHICLE_REG', 'VEHICLE_INSURANCE']
            : ['DRIVING_LICENCE', 'VEHICLE_REG', 'VEHICLE_INSURANCE'];

        const allApproved = requiredTypes.every(reqType =>
          docItems.some(
            d =>
              String((d as any).docType ?? d.documentType ?? '').toUpperCase() === reqType &&
              String(d.status).toUpperCase() === 'APPROVED',
          ),
        );

        if (allApproved) {
          setSetupStep(null);
          navHistoryRef.current = [];
          setActiveTab('home');
          setActiveRoute('home');
          return;
        }
      } catch {
        /* non-blocking */
      }
      setSetupStep('documents');
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Profile setup failed.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegister = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthInfo(null);
    try {
      await driverApi.auth.register(registerForm);
      const normalizedEmail = registerForm.email.trim().toLowerCase();
      setVerifyForm({email: normalizedEmail, otp: ''});
      setLoginForm(c => ({
        ...c,
        email: normalizedEmail,
        password: registerForm.password,
      }));
      setAuthInfo('Registration succeeded. Enter the OTP to verify email.');
      setAuthMode('verify');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Registration failed.',
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerify = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthInfo(null);
    try {
      const payload = await driverApi.auth.verifyEmail(verifyForm);
      const newSession = cast<DriverSession>(payload);
      setSession(newSession);
      AsyncStorage.setItem(SESSION_KEY, JSON.stringify(newSession)).catch(() => {});
      setSetupStep('profile');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Verification failed.',
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await driverApi.auth.resendVerification(verifyForm.email);
      setAuthInfo('Verification OTP sent again.');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'OTP resend failed.',
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setForgotEmail(email.trim().toLowerCase());
    setAuthLoading(true);
    setAuthError(null);
    try {
      await driverApi.auth.forgotPassword(email);
      setAuthMode('reset');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Forgot password failed.',
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (otp: string, newPassword: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await driverApi.auth.resetPassword({
        email: forgotEmail,
        otp,
        newPassword,
      });
      setAuthInfo(
        'Password reset successfully. Sign in with your new password.',
      );
      setLoginForm(c => ({...c, email: forgotEmail || c.email}));
      setAuthMode('login');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Reset failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (session?.refreshToken) {
        await driverApi.auth.logout(session.refreshToken);
      }
    } catch {
      /* ignore */
    } finally {
      AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
      navHistoryRef.current = [];
      setSession(null);
      setApiAccessToken(null);
      setSetupStep(null);
      setNotifications([]);
      setNotificationUnreadCount(0);
      setAuthMode('login');
      setSuccessBanner(null);
      setErrorBanner(null);
      setDocsChecked(false);
    }
  };

  // ─── Job & Quote handlers ────────────────────────────────────────────────────

  const handleQuoteSubmit = async (amount: string, notes: string) => {
    const jobForQuote = selectedJobDetails ?? selectedJob;
    const jobId = String(jobForQuote?.jobId ?? '');
    await runAction(async () => {
      try {
        await driverApi.quotes.submit({
          currency: 'INR',
          jobId,
          notes,
          quoteAmount: Number(amount),
        });
      } catch (err) {
        // Treat "already active quote" as success — the goal (applying) was achieved
        if (err instanceof Error && err.message.toLowerCase().includes('already have an active quote')) {
          navigate('jobs', 'jobs.myQuotes');
          setSuccessBanner('You have already applied for this job. Track your bid in My Quotes.');
          loadMyQuotes().catch(() => undefined);
          return;
        }
        throw err;
      }
      // Optimistically prepend so My Bids shows the new quote instantly
      const optimisticQuote: Record<string, unknown> = {
        quoteId: `pending-${Date.now()}`,
        jobId,
        jobReference: jobForQuote?.jobReference ?? jobForQuote?.jobRef ?? `Job #${jobId.slice(-6)}`,
        quoteAmount: Number(amount),
        currency: 'INR',
        notes,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        job: {
          jobId,
          pickupLocation: jobForQuote?.pickupLocation ?? '',
          dropLocation: jobForQuote?.dropLocation ?? '',
        },
      };
      setMyQuotes(prev => [optimisticQuote, ...prev.filter(q => String(q.jobId) !== jobId)]);
      // navigate first (it calls setSuccessBanner(null)), then set the banner so the
      // last setter wins in the React batch and the message is actually visible.
      navigate('jobs', 'jobs.myQuotes');
      setSuccessBanner('Quote submitted! We will notify you when it is reviewed.');
      // Sync real data from server in background
      loadMyQuotes().catch(() => undefined);
    });
  };

  const handleWithdrawQuote = async (quoteId: string) => {
    await runAction(async () => {
      await driverApi.quotes.withdraw(quoteId);
      setSuccessBanner('Quote withdrawn.');
      await loadMyQuotes();
    });
  };

  // ─── Booking acceptance ──────────────────────────────────────────────────────

  const resolveComplianceRoute = async (jobId: string): Promise<'compliance.loadCode' | 'compliance.handover' | 'tracking.active'> => {
    try {
      const compliance = await driverApi.compliance.getFullStatus(jobId) as Record<string, unknown>;
      const route = normalizeComplianceStep(compliance, {
        jobId,
        jobReference: String(compliance?.job_ref ?? compliance?.jobReference ?? ''),
      } as DashboardOverview['activeJob']);
      if (route === 'tracking.active' || route === 'compliance.handover' || route === 'compliance.loadCode') {
        return route;
      }
    } catch {
      /* fall through */
    }
    return 'compliance.loadCode';
  };

  const handleProceedToBooking = async (jobId: string, jobReference?: string, quoteAmount?: number, currency?: string) => {
    setComplianceJobId(jobId);
    if (jobReference) {
      setComplianceJobRef(jobReference);
    }
    try {
      // bookingId === jobId in the backend — use getDetails for the exact job
      const bookingData = await driverApi.bookings.getDetails(jobId) as Record<string, unknown>;
      if (bookingData && bookingData.bookingId) {
        // Payment row may not exist yet — inject the quote's bid amount so the screen can display it
        if (!bookingData.agreedAmount && quoteAmount) {
          bookingData.agreedAmount = quoteAmount;
        }
        if (!bookingData.currency && currency) {
          bookingData.currency = currency;
        }
        setSelectedBooking(cast<BookingDetail>(bookingData));
        navigate('jobs', 'jobs.booking');
      } else {
        const route = await resolveComplianceRoute(jobId);
        navigate('tracking', route);
      }
    } catch {
      // 404 means no booking yet — go straight to compliance
      navigate('tracking', 'compliance.loadCode');
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    await runAction(async () => {
      await driverApi.bookings.accept(bookingId);
      setSuccessBanner('Booking accepted! Proceed to pickup location.');
      await loadTracking();
    });
  };

  // ─── Poll haulier signature when driver is on handover screen ───────────────

  useEffect(() => {
    if (activeRoute !== 'compliance.handover') {
      return;
    }
    const jobId = complianceJobId ?? dashboard?.activeJob?.jobId;
    if (!jobId) {
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await driverApi.compliance.getHandoverStatus(jobId) as {haulierSigned?: boolean; haulierSignedAt?: string | null};
        if (!cancelled) {
          setHandoverStatus({
            haulierSigned: status?.haulierSigned,
            haulierSignedAt: status?.haulierSignedAt,
          });
        }
      } catch {
        /* ignore polling errors */
      }
    };
    void poll();
    const interval = setInterval(() => { void poll(); }, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeRoute, complianceJobId, dashboard?.activeJob?.jobId]);

  // ─── Compliance handlers ─────────────────────────────────────────────────────

  const handleVerifyLoadCode = async (code: string) => {
    const jobId = complianceJobId ?? dashboard?.activeJob?.jobId;
    if (!jobId) {
      return;
    }
    setActionLoading(true);
    setErrorBanner(null);
    try {
      await driverApi.compliance.verifyLoadCode({jobId, loadCode: code});
      setSuccessBanner('Load code verified! Proceed to vehicle handover.');
      navigate('tracking', 'compliance.handover');
      // Remove the load code screen from back history so the driver can't accidentally
      // return to it after a successful verification
      const last = navHistoryRef.current[navHistoryRef.current.length - 1];
      if (last?.route === 'compliance.loadCode') {
        navHistoryRef.current.pop();
      }
      await refreshActiveView();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Invalid load code.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitHandover = async (checklist: any, photos: any[]) => {
    const jobId = complianceJobId ?? dashboard?.activeJob?.jobId;
    if (!jobId) {
      return;
    }
    setActionLoading(true);
    setErrorBanner(null);
    try {
      // Upload handover photos if available
      let conditionPhotoUrls: string[] = [];
      const photoAssets = Array.isArray(photos) ? photos.filter((p: any) => p?.uri) : [];
      if (photoAssets.length > 0) {
        try {
          const formData = new FormData();
          photoAssets.forEach((asset: any, idx: number) => {
            formData.append('photos', {
              uri: asset.uri,
              name: asset.fileName ?? `handover_${idx}.jpg`,
              type: asset.type ?? 'image/jpeg',
            } as any);
          });
          const uploadResult = await driverApi.compliance.submitHandoverPhotos(formData, jobId) as any;
          const uploaded = uploadResult?.uploads ?? uploadResult?.photos ?? [];
          conditionPhotoUrls = Array.isArray(uploaded)
            ? uploaded.map((u: any) => String(u.fileUrl ?? u.url ?? u.uri ?? '')).filter(Boolean)
            : [];
        } catch {
          conditionPhotoUrls = photoAssets.map((a: any) => String(a.uri));
        }
      }

      const driverSignature = String(checklist.__driverSignature ?? 'driver_signed');
      const cleanChecklist = {...checklist};
      delete cleanChecklist.__driverSignature;

      await driverApi.compliance.submitVehicleChecklist({jobId, checklistData: cleanChecklist});
      await driverApi.compliance.signDriverHandover({
        jobId,
        signatureData: driverSignature,
      });
      // Start live tracking
      try {
        await driverApi.tracking.start(jobId, {
          startedAt: new Date().toISOString(),
        });
      } catch {
        /* tracking start may fail if already started */
      }
      setSuccessBanner(
        'Handover complete. Trip started — live tracking is active!',
      );
      navigate('tracking', 'tracking.active');
      await refreshActiveView();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Handover failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitDelivery = async (proofData: any, photos: any[]) => {
    const jobId = complianceJobId ?? dashboard?.activeJob?.jobId;
    if (!jobId) {
      return;
    }
    setActionLoading(true);
    setErrorBanner(null);
    try {
      const photoItems = Array.isArray(photos) ? photos.filter((p: any) => p?.uri) : [];
      let deliveryPhotoUrl: string | undefined;
      if (photoItems.length > 0) {
        try {
          const formData = new FormData();
          const asset = photoItems.find((p: any) => p?.type === 'delivery') ?? photoItems[0];
          formData.append('photos', {
            uri: asset.uri,
            name: asset.fileName ?? 'delivery_photo.jpg',
            type: asset.type ?? 'image/jpeg',
          } as any);
          const uploadResult = await driverApi.compliance.submitDeliveryPhotos(formData, jobId) as any;
          const uploaded = uploadResult?.uploads ?? uploadResult?.photos ?? [];
          deliveryPhotoUrl = Array.isArray(uploaded) && uploaded[0]
            ? String(uploaded[0].fileUrl ?? uploaded[0].url ?? asset.uri)
            : String(asset.uri);
        } catch {
          deliveryPhotoUrl = String(photoItems[0].uri);
        }
      }
      const recipientSignatureUrl =
        typeof proofData?.recipientSignature === 'string'
          ? proofData.recipientSignature
          : JSON.stringify(proofData?.recipientSignature ?? []);
      const payload = {
        jobId,
        deliveryPhotoUrl,
        recipientSignatureUrl,
        recipientName: proofData?.receiverName ?? proofData?.recipientName ?? '',
        deliveryNotes: proofData?.notes ?? proofData?.deliveryNotes ?? '',
      };

      try {
        await driverApi.compliance.submitDeliveryProof(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message.toLowerCase() : '';
        if (message.includes('not authenticated') || message.includes('unauthorized')) {
          const refreshed = await ensureAuthenticated();
          if (!refreshed) {
            throw err;
          }
          await driverApi.compliance.submitDeliveryProof(payload);
        } else {
          throw err;
        }
      }
      setSuccessBanner('Delivery submitted! Awaiting haulier approval.');
      setPaymentReleasedData({
        jobReference: dashboard?.activeJob?.jobReference ?? jobId,
        amount: Number((proofData as any)?.amount ?? 0),
        currency: '₹',
        completionDate: new Date().toISOString(),
      });
      navigate('jobs', 'payments.released' as any);
      await refreshActiveView();
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Delivery submission failed.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Tracking handlers ────────────────────────────────────────────────────────

  const handleUpdateLocation = async (location: any) => {
    try {
      await driverApi.tracking.updateLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
      });
    } catch {
      /* silent */
    }
  };

  const handleStopTracking = async () => {
    const jobId = complianceJobId ?? dashboard?.activeJob?.jobId;
    if (!jobId) {
      return;
    }
    setActionLoading(true);
    try {
      await driverApi.tracking.stop(jobId, {reason: 'arrived_at_destination'});
      setSuccessBanner(
        'Arrived at destination. Submit delivery proof to complete the job.',
      );
      navigate('tracking', 'compliance.delivery');
      await refreshActiveView();
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Failed to stop tracking.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleIncidentReport = async (type: string, description: string) => {
    const jobId = complianceJobId ?? dashboard?.activeJob?.jobId;
    if (!jobId) {
      return;
    }
    await runAction(async () => {
      await driverApi.incidents.report({
        jobId,
        incidentType: type,
        description,
      });
      setSuccessBanner('Haulier notified of the incident.');
      navigate('tracking', 'tracking.active');
    });
  };

  // ─── Document handlers ────────────────────────────────────────────────────────

  const handleDocumentUpload = async (
    documentType: string,
    expiryDate: string,
    file: any,
  ) => {
    setActionLoading(true);
    setErrorBanner(null);
    try {
      const formData = new FormData();
      formData.append('documentType', documentType);
      formData.append('expiryDate', expiryDate);
      if (file?.uri) {
        formData.append('file', {
          uri: file.uri,
          name: file.fileName ?? 'doc.jpg',
          type: file.type ?? 'image/jpeg',
        } as any);
      }
      await driverApi.documents.upload(formData);
      setSuccessBanner('Document submitted for verification.');
      await loadDrawerRoute('documents.status');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Profile handlers ─────────────────────────────────────────────────────────

  const handleProfileSave = async () => {
    await runAction(async () => {
      await driverApi.profile.update(profileForm);
      setSuccessBanner('Profile updated.');
      await loadProfile();
    });
  };

  const handlePasswordChange = async () => {
    await runAction(async () => {
      await driverApi.auth.changePassword(passwordForm);
      setPasswordForm(defaultPasswordForm);
      setSuccessBanner('Password changed.');
    });
  };

  const handleNotificationPreferencesSave = async () => {
    await runAction(async () => {
      await driverApi.notifications.updatePreferences(notificationPrefs);
      setSuccessBanner('Notification preferences updated.');
    });
  };

  // ─── Availability handlers ─────────────────────────────────────────────────────

  const handleAvailabilitySave = async () => {
    const dayIndex: Record<string, number> = {
      monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
      friday: 4, saturday: 5, sunday: 6,
    };
    const startTime = availabilityForm.startTime || '08:00';
    const endTime   = availabilityForm.endTime   || '18:00';
    await runAction(async () => {
      const existingSlots = Array.isArray(availability?.slots) ? availability!.slots : [];
      await Promise.all(
        availabilityForm.availableDays.map(day => {
          const dayNum = dayIndex[day] ?? 0;
          const existing = existingSlots.find(
            (s: any) => Number(s.day_of_week ?? s.dayOfWeek) === dayNum,
          );
          const slotId = existing ? String(existing.slotId ?? existing.id ?? '') : '';
          if (slotId) {
            return driverApi.availability.update(slotId, {
              day_of_week: dayNum,
              start_time: startTime,
              end_time: endTime,
            });
          }
          return driverApi.availability.set({
            day_of_week: dayNum,
            start_time: startTime,
            end_time: endTime,
          });
        }),
      );
      setSuccessBanner('Availability saved.');
      await loadDrawerRoute('availability.set');
    });
  };

  const handleAvailabilityToggle = () => {
    const nextIsAvailable = !availabilityForm.isAvailable;
    setAvailabilityForm(c => ({
      ...c,
      isAvailable: nextIsAvailable,
      reason: nextIsAvailable ? '' : c.reason,
    }));
  };

  // ─── Ratings ──────────────────────────────────────────────────────────────────

  const handleRatingSubmit = async (rating: number, comment: string) => {
    const jobId = complianceJobId ?? dashboard?.activeJob?.jobId;
    if (!jobId) {
      return;
    }
    await runAction(async () => {
      await driverApi.ratings.submit({jobId, rating, comment});
      setSuccessBanner('Rating submitted! Thank you.');
      navigate('profile', 'ratings.received');
    });
  };

  // ─── Shift handlers ──────────────────────────────────────────────────────────

  const handleShiftQuoteSubmit = async (shiftId: string, amountPerDay: number, notes: string) => {
    await runAction(async () => {
      await driverApi.shifts.submitQuote(shiftId, {amountPerDay, notes: notes || undefined});
      setSuccessBanner('Quote submitted! You will be notified if accepted.');
      await loadShifts();
    });
  };

  const handleShiftQuoteWithdraw = async (shiftId: string) => {
    await runAction(async () => {
      await driverApi.shifts.withdrawQuote(shiftId);
      setSuccessBanner('Quote withdrawn.');
      await loadShifts();
    });
  };

  const handleShiftCancel = async (shiftId: string) => {
    await runAction(async () => {
      await driverApi.shifts.cancel(shiftId);
      setSuccessBanner('Shift booking cancelled.');
      await loadShifts();
    });
  };

  // ─── Notifications ────────────────────────────────────────────────────────────

  const handleMarkAllNotificationsRead = async () => {
    await runAction(async () => {
      await driverApi.notifications.markAllRead();
      setSuccessBanner('All marked as read.');
      setNotifications(current =>
        current.map(item => ({...item, isRead: true, readAt: item.readAt ?? new Date().toISOString()})),
      );
      setNotificationUnreadCount(0);
      await loadNotifications();
    });
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    if (!notificationId) {
      return;
    }
    await runAction(async () => {
      await driverApi.notifications.markRead(notificationId);
      setNotifications(current =>
        current.map(item =>
          item.notificationId === notificationId
            ? {...item, isRead: true, readAt: item.readAt ?? new Date().toISOString()}
            : item,
        ),
      );
      setNotificationUnreadCount(count => Math.max(0, count - 1));
      await loadNotifications();
    });
  };

  const loadEscrowPayment = async (jobId: string) => {
    setEscrowLoading(true);
    try {
      const res = await driverApi.payments.getEscrowDetails(jobId);
      setEscrowDetails(res as Record<string, unknown>);
    } catch {
      setEscrowDetails(null);
    } finally {
      setEscrowLoading(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const openNotificationDestination = (notification: NotificationSummary) => {
    const type = String(notification.type ?? '').toUpperCase();
    const data = notification.data ?? {};
    const hasJobId = Boolean(data.job_id ?? data.jobId);

    if (type.includes('DOCUMENT_APPROVED') || type.includes('DOCUMENT_REJECTED')) {
      return;
    }

    if (type.includes('QUOTE') || type.includes('JOB_BOOKED')) {
      navigate('jobs', 'jobs.myQuotes');
      return;
    }

    if (type.includes('PAYMENT_ESCROWED')) {
      const jobId = String(data.job_id ?? data.jobId ?? '');
      if (jobId) {
        setEscrowJobId(jobId);
        setEscrowDetails(null);
        navigate('jobs', 'payment.escrow');
        loadEscrowPayment(jobId);
      }
      return;
    }

    if (type.includes('PAYMENT_RELEASED')) {
      navigate('profile', 'earnings.history');
      return;
    }

    if (type.includes('COMPLIANCE') || type.includes('TRACKING') || hasJobId) {
      navigate('tracking', 'tracking.active');
      return;
    }

    navigate('profile', 'notifications.all');
  };

  const handleOpenNotification = async (notification: NotificationSummary) => {
    const id = String(notification.notificationId ?? '');
    if (id) {
      await handleMarkNotificationRead(id);
    }
    openNotificationDestination(notification);
  };

  const toggleAvailabilityDay = (day: string) => {
    setAvailabilityForm(c => {
      const exists = c.availableDays.includes(day);
      return {
        ...c,
        availableDays: exists
          ? c.availableDays.filter(d => d !== day)
          : [...c.availableDays, day],
      };
    });
  };

  const updateNotificationPreference = (
    channel: 'pushNotifications' | 'smsNotifications',
    key: string,
    value: boolean,
  ) => {
    setNotificationPrefs(c => ({
      ...c,
      [channel]: {...c[channel], [key]: value},
    }));
  };

  const goBackFromLoadCode = () => {
    if (dashboard?.activeJob?.jobId) {
      navigate('tracking', 'tracking.active');
      return;
    }
    if (selectedBooking) {
      navigate('jobs', 'jobs.booking');
      return;
    }
    navigate('jobs', 'jobs.myQuotes');
  };

  const goBackFromHandover = () => {
    navigate('tracking', 'compliance.loadCode');
  };

  const goBackFromDelivery = () => {
    navigate('tracking', 'tracking.active');
  };

  const onSelectDrawerRoute = (route: DrawerRouteKey) => {
    setSuccessBanner(null);
    setErrorBanner(null);
    if (route === 'home') {
      navigate('home', 'home');
    } else if (route.startsWith('shifts.')) {
      navigate('shifts', route);
    } else if (route.startsWith('jobs.')) {
      navigate('jobs', route);
    } else if (route.startsWith('tracking.') || route.startsWith('compliance.')) {
      navigate('tracking', route);
    } else if (route.startsWith('profile.')) {
      navigate('profile', route);
    } else if (
      route.startsWith('earnings.') ||
      route.startsWith('documents.') ||
      route.startsWith('availability.') ||
      route.startsWith('notifications.') ||
      route.startsWith('invoices.') ||
      route.startsWith('ratings.') ||
      route.startsWith('support.') ||
      route.startsWith('legal.')
    ) {
      navigate('profile', route);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────────

  const getItemId = (item: Record<string, unknown>) =>
    String(
      item.jobId ??
        item.bookingId ??
        item.quoteId ??
        item.id ??
        item.jobReference ??
        Math.random(),
    );

  const goToUpcomingTrip = async (item: Record<string, unknown>) => {
    const jobId = String(item.jobId ?? '');
    if (!jobId) {
      setErrorBanner('This job is missing a job ID.');
      return;
    }

    setComplianceJobId(jobId);
    setSelectedBooking(null);
    setSelectedJob(null);
    setSelectedJobDetails(null);

    const status = String(item.status ?? '').toLowerCase();

    // Already in transit or delivery submitted — go straight to tracking
    if (status === 'in_transit' || status === 'delivery_submitted') {
      navigate('tracking', 'tracking.active');
      return;
    }

    // Check compliance progress so the driver resumes from the correct step
    try {
      const compliance = await driverApi.compliance.getFullStatus(jobId) as Record<string, unknown>;
      const route = normalizeComplianceStep(
        compliance,
        {jobId, jobReference: String(compliance?.job_ref ?? compliance?.jobReference ?? '')} as DashboardOverview['activeJob'],
      );
      navigate('tracking', route);
    } catch {
      navigate('tracking', 'compliance.loadCode');
    }
  };

  const renderUpcomingJobCard = (item: Record<string, unknown>) => {
    const id = getItemId(item);
    const pickup = toAddress(item.pickupLocation);
    const drop = toAddress(item.dropLocation);
    const expanded = expandedUpcomingJobId === id;
    const status = String(item.status ?? 'booked').toLowerCase();
    const paymentSecured = item.paymentSecured === true || status === 'payment_secured' || status === 'in_transit' || status === 'delivery_submitted' || status === 'completed';
    const canStart = !['completed', 'cancelled'].includes(status) && paymentSecured;
    const currency = String(item.currency ?? 'INR');
    const currencySymbol = currency === 'INR' ? '₹' : currency;
    const matchedQuote = myQuotes.find(q => String(q.jobId) === String(item.jobId));
    const rawAmount = item.agreedAmount ?? item.amount ?? item.totalAmount
      ?? (matchedQuote as any)?.quoteAmount ?? (matchedQuote as any)?.amount;
    const distanceKm = item.distanceKm ?? item.distance;

    const badgeLabel = status === 'payment_secured' || paymentSecured
      ? 'PAYMENT SECURED'
      : status === 'in_transit'
      ? 'IN TRANSIT'
      : 'BOOKED';

    const actionLabel = status === 'in_transit'
      ? 'Open Tracking'
      : paymentSecured
      ? 'Start Trip'
      : 'Awaiting Payment';

    return (
      <View key={id} style={[styles.listCard, styles.upcomingCard]}>
        <View style={styles.cardTopRow}>
          <View style={{flex: 1}}>
            <Text style={styles.listTitle}>
              {String(item.jobReference ?? item.jobRef ?? 'Upcoming Job')}
            </Text>
            <Text style={styles.listMeta}>
              {pickup && drop ? `${pickup} → ${drop}` : String(item.jobDate ?? 'Scheduled')}
            </Text>
            {distanceKm ? (
              <Text style={styles.listMetaSub}>{Number(distanceKm).toFixed(1)} km</Text>
            ) : null}
          </View>
          <Text style={[styles.upcomingBadge, paymentSecured && styles.upcomingBadgePaid]}>
            {badgeLabel}
          </Text>
        </View>

        {rawAmount ? (
          <Text style={styles.amountText}>
            {currencySymbol} {String(rawAmount)}
          </Text>
        ) : null}

        {!paymentSecured && (
          <View style={styles.awaitingPaymentBanner}>
            <Text style={styles.awaitingPaymentIcon}>🔒</Text>
            <View style={{flex: 1}}>
              <Text style={styles.awaitingPaymentTitle}>Waiting for payment</Text>
              <Text style={styles.awaitingPaymentBody}>
                The haulier must secure escrow payment before you can begin this trip. You will be notified once it's confirmed.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.listActionRow}>
          <Pressable
            onPress={() => setExpandedUpcomingJobId(prev => (prev === id ? null : id))}
            style={styles.listActionSecondary}>
            <Text style={styles.listActionSecondaryText}>
              {expanded ? 'Hide Details' : 'View Details'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => canStart ? goToUpcomingTrip(item) : undefined}
            disabled={!canStart}
            style={[styles.listActionPrimary, !canStart && styles.listActionDisabled]}>
            <Text style={styles.listActionPrimaryText}>
              {actionLabel}
            </Text>
          </Pressable>
        </View>

        {expanded && (
          <View style={styles.upcomingDetails}>
            <View style={styles.detailRowCompact}>
              <Text style={styles.detailKey}>Pickup</Text>
              <Text style={styles.detailValueCompact}>{pickup || 'N/A'}</Text>
            </View>
            <View style={styles.detailRowCompact}>
              <Text style={styles.detailKey}>Drop-off</Text>
              <Text style={styles.detailValueCompact}>{drop || 'N/A'}</Text>
            </View>
            <View style={styles.detailRowCompact}>
              <Text style={styles.detailKey}>Job Date</Text>
              <Text style={styles.detailValueCompact}>{String(item.jobDate ?? 'TBD')}</Text>
            </View>
            <View style={styles.detailRowCompact}>
              <Text style={styles.detailKey}>Time Slot</Text>
              <Text style={styles.detailValueCompact}>{String(item.timeSlot ?? 'TBD').replace(/_/g, ' ')}</Text>
            </View>
            <View style={styles.detailRowCompact}>
              <Text style={styles.detailKey}>Distance</Text>
              <Text style={styles.detailValueCompact}>
                {distanceKm ? `${Number(distanceKm).toFixed(2)} km` : 'N/A'}
              </Text>
            </View>
            <View style={styles.detailRowCompact}>
              <Text style={styles.detailKey}>Goods</Text>
              <Text style={styles.detailValueCompact}>{String(item.goodsType ?? 'N/A')}</Text>
            </View>
            <View style={styles.detailRowCompact}>
              <Text style={styles.detailKey}>Weight</Text>
              <Text style={styles.detailValueCompact}>{String(item.weight ?? 'N/A')}</Text>
            </View>
            <View style={styles.detailRowCompact}>
              <Text style={styles.detailKey}>Agreed Amount</Text>
              <Text style={styles.detailValueCompact}>
                {rawAmount ? Number(rawAmount).toLocaleString('en-IN') : 'N/A'}
              </Text>
            </View>
            <View style={styles.detailRowCompact}>
              <Text style={styles.detailKey}>Haulier</Text>
              <Text style={styles.detailValueCompact}>{String((item.haulier as {name?: string} | undefined)?.name ?? 'Assigned haulier')}</Text>
            </View>
            {paymentSecured ? (
              <View style={styles.detailRowCompact}>
                <Text style={styles.detailKey}>Next Step</Text>
                <Text style={[styles.detailValueCompact, styles.detailValueSuccess]}>
                  ✓ Payment secured — tap Start Trip
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  const renderJobCard = (item: Record<string, unknown>) => {
    const pickup = toAddress(item.pickupLocation);
    const drop = toAddress(item.dropLocation);
    const id = String(
      item.jobId ??
        item.quoteId ??
        item.paymentId ??
        item.invoiceId ??
        Math.random(),
    );
    const isHistoryView = activeRoute === 'jobs.history';
    return (
      <View key={id} style={styles.listCard}>
        <Text style={[styles.cardEyebrow, isHistoryView && styles.historyCardEyebrow]}>
          {String(item.status ?? item.jobReference ?? 'Job')}
        </Text>
        <Text style={styles.listTitle}>
          {String(
            item.jobReference ??
              item.invoiceNumber ??
              item.paymentId ??
              'Untitled',
          )}
        </Text>
        <Text style={styles.listMeta}>
          {pickup && drop
            ? `${pickup} → ${drop}`
            : String(item.createdAt ?? item.jobDate ?? '')}
        </Text>
        {item.agreedAmount || item.amount || item.totalAmount ? (
          <Text style={[styles.amountText, isHistoryView && styles.historyAmountText]}>
            Rs {String(item.agreedAmount ?? item.amount ?? item.totalAmount)}
          </Text>
        ) : null}
      </View>
    );
  };

  // ─── Main view router ─────────────────────────────────────────────────────────

  const renderCurrentView = () => {
    // Home tab renders immediately; other screens block until data is ready
    const isHomeDashboard = activeTab === 'home' && activeRoute === 'home';
    if (contentLoading && (!isHomeDashboard || !dashboard)) {
      return (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={palette.accent} size="large" />
          <Text style={styles.loaderText}>Loading...</Text>
        </View>
      );
    }

    // Home
    if (activeTab === 'home' && activeRoute === 'home') {
      return (
        <DashboardScreen
          dashboard={dashboard}
          driverName={profile?.name ?? session?.name}
          earnings={earnings}
          averageRating={Number(ratings?.averageRating ?? dashboard?.rating ?? 0)}
          upcomingJobs={upcomingJobs}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refreshActiveView();
            setRefreshing(false);
          }}
          onViewJob={(job: any) => {
            const jobId = String(job?.jobId ?? job?.id ?? '');
            setHighlightedQuoteJobId(jobId);
            navigate('jobs', 'jobs.myQuotes');
            loadMyQuotes().catch(() => undefined);
          }}
          onQuickAction={(action: string) => {
            if (action === 'find_jobs') {
              navigate('jobs', 'jobs.available');
            } else if (action === 'tracking') {
              navigate('tracking', 'tracking.active');
            } else if (action === 'payouts') {
              navigate('profile', 'earnings.history');
            }
          }}
        />
      );
    }

    // ── SHIFTS TAB ─────────────────────────────────────────────────────────────
    if (activeTab === 'shifts' || activeRoute.startsWith('shifts.')) {
      return (
        <ShiftsScreen
          availableShifts={availableShifts as any}
          myShifts={myShifts as any}
          loading={contentLoading}
          actionLoading={actionLoading}
          error={errorBanner}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadShifts();
            setRefreshing(false);
          }}
          onSubmitQuote={handleShiftQuoteSubmit}
          onWithdrawQuote={handleShiftQuoteWithdraw}
          onCancelShift={handleShiftCancel}
        />
      );
    }

    // ── COMPLIANCE SCREENS (must be checked BEFORE tracking tab check) ──────────
    if (activeRoute === 'compliance.loadCode') {
      const lcJobId  = complianceJobId ?? dashboard?.activeJob?.jobId ?? '';
      const lcJobRef = complianceJobRef ?? dashboard?.activeJob?.jobReference ?? lcJobId;
      return (
        <LoadCodeScreen
          jobId={lcJobId}
          jobReference={lcJobRef}
          onVerify={handleVerifyLoadCode}
          loading={actionLoading}
          error={errorBanner}
        />
      );
    }

    if (activeRoute === 'compliance.handover') {
      const hoJobId  = complianceJobId ?? dashboard?.activeJob?.jobId ?? '';
      const hoJobRef = complianceJobRef ?? dashboard?.activeJob?.jobReference ?? hoJobId;
      return (
        <HandoverScreen
          jobId={hoJobId}
          jobReference={hoJobRef}
          onSubmit={handleSubmitHandover}
          loading={actionLoading}
          error={errorBanner}
          haulierSigned={handoverStatus?.haulierSigned ?? false}
          haulierSignedAt={handoverStatus?.haulierSignedAt}
        />
      );
    }

    if (activeRoute === 'compliance.delivery') {
      const dlJobId  = complianceJobId ?? dashboard?.activeJob?.jobId ?? '';
      const dlJobRef = complianceJobRef ?? dashboard?.activeJob?.jobReference ?? dlJobId;
      return (
        <DeliveryScreen
          jobId={dlJobId}
          jobReference={dlJobRef}
          onSubmit={handleSubmitDelivery}
          loading={actionLoading}
          error={errorBanner}
        />
      );
    }

    // ── INCIDENT REPORT ────────────────────────────────────────────────────────
    if (activeRoute === 'tracking.incident') {
      return (
        <IncidentReportScreen
          jobId={complianceJobId ?? dashboard?.activeJob?.jobId ?? ''}
          jobReference={complianceJobRef ?? dashboard?.activeJob?.jobReference ?? ''}
          onSubmit={handleIncidentReport}
          onBack={() => navigate('tracking', 'tracking.active')}
          loading={actionLoading}
          error={errorBanner}
        />
      );
    }

    // ── TRACKING ───────────────────────────────────────────────────────────────
    if (activeTab === 'tracking' || activeRoute.startsWith('tracking.')) {
      return (
        <LiveTrackingScreen
          activeJob={dashboard?.activeJob}
          trackingEta={trackingEta}
          trackingLiveLocation={trackingLiveLocation}
          complianceStatus={complianceStatus}
          onUpdateLocation={handleUpdateLocation}
          onStopTracking={handleStopTracking}
          onReportIncident={() => navigate('tracking', 'tracking.incident')}
        />
      );
    }

    // ── JOBS TAB ───────────────────────────────────────────────────────────────
    if (activeTab === 'jobs' || activeRoute.startsWith('jobs.')) {
      // Booking acceptance
      if (activeRoute === 'jobs.booking') {
        return (
          <BookingAcceptanceScreen
            booking={selectedBooking}
            onAccept={handleAcceptBooking}
            onBack={() => {
              if (selectedBooking) {
                setComplianceJobId(selectedBooking.jobId);
                navigate('tracking', 'compliance.loadCode');
              } else {
                navigate('jobs', 'jobs.myQuotes');
              }
            }}
            loading={actionLoading}
            error={errorBanner}
          />
        );
      }

      // My Quotes — accessible without doc check (driver can always view their bids)
      if (activeRoute === 'jobs.myQuotes') {
        return (
          <MyQuotesScreen
            quotes={myQuotes}
            refreshing={refreshing}
            highlightedJobId={highlightedQuoteJobId}
            onRefresh={async () => {
              setRefreshing(true);
              await loadMyQuotes();
              setRefreshing(false);
            }}
            onProceedToCompliance={(jobId, jobRef, qAmt, curr) => {
              setHighlightedQuoteJobId(null);
              handleProceedToBooking(jobId, jobRef, qAmt, curr);
            }}
            onWithdrawQuote={handleWithdrawQuote}
            onViewQuoteStatus={(quote: Record<string, unknown>) => {
              setHighlightedQuoteJobId(null);
              const status = String(quote.status ?? '').toLowerCase();
              if (status === 'accepted' || status === 'selected') {
                setQuoteStatusData({type: 'accepted', quote});
              } else if (status === 'rejected' || status === 'declined') {
                setQuoteStatusData({type: 'rejected', quote});
              }
            }}
          />
        );
      }

      if (!docsChecked) {
        return (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={palette.accent} size="large" />
            <Text style={styles.loaderText}>Loading...</Text>
          </View>
        );
      }

      const profileComplete = isDriverProfileComplete(profile);
      const documentsApproved = areDriverDocumentsApproved(
        verificationStatus,
        documents,
      );
      const documentState = hasDriverUploadedDocuments(
        verificationStatus,
        documents,
      )
        ? hasRejectedDriverDocuments(documents)
          ? 'rejected'
          : 'pending'
        : 'missing';
      const isJobSearchAllowed = profileComplete && documentsApproved;

      const goToDocuments = () => {
        navigate(
          'profile',
          documentState === 'pending' ? 'documents.status' : 'documents.upload',
        );
        loadProfile().catch(() => undefined);
        driverApi.documents.getStatus().then(status => {
          setVerificationStatus(cast<Record<string, unknown>>(status));
        }).catch(() => undefined);
        driverApi.documents.list().then(d => {
          setDocuments(mapDocumentItems(d as Record<string, unknown>));
        }).catch(() => undefined);
      };

      if (!isJobSearchAllowed) {
        return (
          <JobSearchLockedScreen
            documentState={documentState}
            profileComplete={profileComplete}
            onGoToProfile={() => navigate('profile', 'profile.edit')}
            onGoToDocuments={goToDocuments}
          />
        );
      }

      // My Jobs (upcoming / booked)
      if (activeRoute === 'jobs.upcoming') {
        return (
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContentPad}>
            <Text style={styles.listScreenTitle}>My Jobs</Text>
            {upcomingJobs.length ? (
              upcomingJobs.map(renderUpcomingJobCard)
            ) : (
              <EmptyState title="No active jobs yet. Find a job below." />
            )}
          </ScrollView>
        );
      }

      // Job History
      if (activeRoute === 'jobs.history') {
        return (
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContentPad}>
            <Text style={styles.listScreenTitle}>Job History</Text>
            {jobHistory.length ? (
              jobHistory.map(renderJobCard)
            ) : (
              <EmptyState title="No completed jobs yet." />
            )}
          </ScrollView>
        );
      }

      // Job Detail
      if (selectedJob) {
        return (
          <JobDetailScreen
            job={selectedJobDetails ?? selectedJob}
            onSubmitQuote={handleQuoteSubmit}
            onBack={() => {
              setSelectedJob(null);
              setSelectedJobDetails(null);
              setActiveRoute('jobs.available');
            }}
            loading={actionLoading}
            error={errorBanner}
            isApplied={myQuotes.some(q => String(q.jobId) === String(selectedJob?.jobId ?? ''))}
          />
        );
      }

      // Quote status notification
      if (quoteStatusData) {
        return (
          <QuoteStatusScreen
            type={quoteStatusData.type}
            quote={quoteStatusData.quote}
            recommendedJobs={availableJobs.slice(0, 3)}
            onViewJob={() => {
              const q = quoteStatusData.quote;
              setQuoteStatusData(null);
              if (q.jobId) {
                handleProceedToBooking(String(q.jobId));
              } else {
                navigate('jobs', 'jobs.myQuotes');
              }
            }}
            onFindJobs={() => {
              setQuoteStatusData(null);
              navigate('jobs', 'jobs.available');
            }}
            onDismiss={() => {
              setQuoteStatusData(null);
              navigate('jobs', 'jobs.myQuotes');
            }}
          />
        );
      }

      // Payment escrow screen (driver sees Stripe handshake after notification)
      if (activeRoute === 'payment.escrow' && escrowJobId) {
        const d = escrowDetails;
        return (
          <PaymentEscrowScreen
            details={
              d
                ? {
                    paymentId: String(d.paymentId ?? ''),
                    jobId: String(d.jobId ?? escrowJobId),
                    jobRef: String(d.jobRef ?? ''),
                    pickupAddress: d.pickupAddress ? String(d.pickupAddress) : undefined,
                    dropAddress: d.dropAddress ? String(d.dropAddress) : undefined,
                    amount: Number(d.amount ?? 0),
                    currency: String(d.currency ?? 'GBP'),
                    status: String(d.status ?? ''),
                    stripeIntentId: d.stripeIntentId ? String(d.stripeIntentId) : undefined,
                    stripeStatus: d.stripeStatus ? String(d.stripeStatus) : undefined,
                    escrowedAt: d.escrowedAt ? String(d.escrowedAt) : undefined,
                  }
                : null
            }
            loading={escrowLoading}
            refreshing={escrowRefreshing}
            onRefresh={async () => {
              setEscrowRefreshing(true);
              if (escrowJobId) {
                await loadEscrowPayment(escrowJobId);
              }
              setEscrowRefreshing(false);
            }}
            onViewJob={() => {
              navigate('tracking', 'tracking.active');
            }}
            onBack={() => {
              setEscrowJobId(null);
              setEscrowDetails(null);
              navigate('jobs', 'notifications.all');
            }}
          />
        );
      }

      // Payment released screen
      if (
        (activeRoute as string) === 'payments.released' &&
        paymentReleasedData
      ) {
        return (
          <PaymentReleasedScreen
            jobReference={paymentReleasedData.jobReference}
            amount={paymentReleasedData.amount}
            currency={paymentReleasedData.currency}
            completionDate={paymentReleasedData.completionDate}
            onViewInvoice={async () => {
              try {
                const inv = await driverApi.invoices.list({limit: 1, page: 1});
                const first = (
                  (inv.invoices ?? []) as Array<Record<string, unknown>>
                )[0];
                if (first?.invoiceId) {
                  await driverApi.invoices.download(String(first.invoiceId));
                }
              } catch {
                /* silent */
              }
            }}
            onRate={() => {
              setPaymentReleasedData(null);
              navigate('profile', 'ratings.given');
            }}
            onDone={() => {
              setPaymentReleasedData(null);
              navHistoryRef.current = [];
              navigate('home', 'home');
            }}
          />
        );
      }

      // Job Discovery — gate on profile complete + admin-approved documents
      const hasApproved = documents.some(d => String(d.status).toUpperCase() === 'APPROVED');
      const hasPending = documents.some(d => String(d.status).toUpperCase() === 'PENDING');
      const docStatus: 'approved' | 'pending' | 'none' =
        hasApproved ? 'approved' : hasPending ? 'pending' : 'none';
      return (
        <JobDiscoveryScreen
          availableJobs={availableJobs}
          appliedJobIds={myQuotes.map(q => String(q.jobId ?? ''))}
          docStatus={docStatus}
          onSelectJob={(job: any) => {
            setSelectedJob(job);
            setSelectedJobDetails(job);
          }}
          onGoToDocuments={goToDocuments}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refreshActiveView();
            setRefreshing(false);
          }}
        />
      );
    }

    // ── PROFILE TAB ────────────────────────────────────────────────────────────
    if (activeTab === 'profile' && (activeRoute === 'profile.edit' || activeRoute === 'documents.upload')) {
      return (
        <ProfileScreen
          profile={profile}
          session={session}
          profileForm={profileForm}
          documents={documents}
          verificationStatus={verificationStatus}
          focusDocuments={activeRoute === 'documents.upload'}
          onChange={patch => setProfileForm(c => ({...c, ...patch}))}
          onSave={handleProfileSave}
          onLogout={handleLogout}
          onSettings={() => navigate('profile', 'profile.settings')}
          onAddVehicle={async (vehicleType, vehicleRegistration) => {
            setProfileForm(c => ({...c, vehicleType, vehicleRegistration}));
            await driverApi.profile.update({vehicleType, vehicleRegistration});
            await loadProfile();
          }}
          loading={actionLoading}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await Promise.all([
              loadProfile(),
              driverApi.documents.getStatus().then(status => {
                setVerificationStatus(cast<Record<string, unknown>>(status));
              }).catch(() => undefined),
              driverApi.documents.list().then(d => {
                setDocuments(mapDocumentItems(d as Record<string, unknown>));
              }).catch(() => undefined),
            ]);
            setRefreshing(false);
          }}
        />
      );
    }

    // ── DRAWER ROUTES ──────────────────────────────────────────────────────────
    switch (activeRoute) {
      case 'documents.status':
        return (
          <DocumentVerificationScreen
            documents={documents}
            verificationStatus={verificationStatus}
            driverAvailability={profileForm.driverAvailability}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadDrawerRoute('documents.status');
              setRefreshing(false);
            }}
            onUpload={handleDocumentUpload}
            uploadLoading={actionLoading}
            uploadError={errorBanner}
          />
        );
      case 'documents.upload':
        return (
          <ProfileScreen
            profile={profile}
            session={session}
            profileForm={profileForm}
            documents={documents}
            verificationStatus={verificationStatus}
            focusDocuments
            onChange={patch => setProfileForm(c => ({...c, ...patch}))}
            onSave={handleProfileSave}
            onLogout={handleLogout}
            onSettings={() => navigate('profile', 'profile.settings')}
            onAddVehicle={async (vehicleType, vehicleRegistration) => {
              setProfileForm(c => ({...c, vehicleType, vehicleRegistration}));
              await driverApi.profile.update({vehicleType, vehicleRegistration});
              await loadProfile();
            }}
            loading={actionLoading}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([
                loadProfile(),
                driverApi.documents.getStatus().then(status => {
                  setVerificationStatus(cast<Record<string, unknown>>(status));
                }).catch(() => undefined),
                driverApi.documents.list().then(d => {
                  setDocuments(mapDocumentItems(d as Record<string, unknown>));
                }).catch(() => undefined),
              ]);
              setRefreshing(false);
            }}
          />
        );
      case 'earnings.history':
        return (
          <EarningsHistoryScreen
            payments={payments}
            totalEarnings={earnings?.allTimeEarnings ?? 0}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadDrawerRoute('earnings.history');
              setRefreshing(false);
            }}
            onViewInvoice={async (id: string) => {
              try {
                const result = await driverApi.invoices.download(id);
                return (result as any).downloadUrl ?? '';
              } catch {
                setErrorBanner('Failed to get invoice.');
              }
            }}
          />
        );
      case 'earnings.total':
      case 'earnings.monthly':
        return (
          <SectionCard title="Earnings Summary">
            <Text style={styles.sectionValue}>
              Rs{' '}
              {String(
                earnings?.summary?.totalEarnings ??
                  earnings?.allTimeEarnings ??
                  0,
              )}
            </Text>
            <Text style={styles.sectionText}>
              Jobs:{' '}
              {String(
                earnings?.summary?.totalJobs ?? earnings?.allTimeJobs ?? 0,
              )}
            </Text>
            <Text style={styles.sectionHint}>
              Avg per job: Rs {String(earnings?.summary?.averagePerJob ?? 0)}
            </Text>
          </SectionCard>
        );
      case 'invoices.list':
        return (
          <InvoicesScreen
            invoices={invoices}
            onViewInvoice={invoice => {
              setSelectedInvoice(invoice);
              navigate('profile', 'invoices.detail');
            }}
          />
        );
      case 'invoices.detail':
        return (
          <InvoiceDetailScreen
            invoice={selectedInvoice}
            onBack={() => navigate('profile', 'invoices.list')}
            onDownload={async () => {
              const jobId = String(selectedInvoice?.jobId ?? '');
              if (!jobId) {
                return;
              }
              try {
                await driverApi.invoices.download(jobId);
              } catch {
                setErrorBanner('Failed to download invoice.');
              }
            }}
          />
        );
      case 'notifications.all':
        return (
          <NotificationsScreen
            notifications={notifications}
            unreadCount={notificationUnreadCount}
            refreshing={refreshing}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onMarkRead={handleMarkNotificationRead}
            onOpenNotification={handleOpenNotification}
            onRefresh={async () => {
              setRefreshing(true);
              await loadNotifications();
              setRefreshing(false);
            }}
          />
        );
      case 'ratings.received':
        return (
          <RatingsListScreen
            ratings={ratings}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadDrawerRoute('ratings.received');
              setRefreshing(false);
            }}
          />
        );
      case 'ratings.given':
        if (dashboard?.activeJob) {
          return (
            <RatingSubmissionScreen
              jobId={dashboard.activeJob.jobId}
              jobReference={dashboard.activeJob.jobReference}
              onSubmit={handleRatingSubmit}
              loading={actionLoading}
              error={errorBanner}
              onCancel={() => navigate('profile', 'ratings.received')}
            />
          );
        }
        return (
          <RatingsListScreen
            ratings={ratings}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadDrawerRoute('ratings.received');
              setRefreshing(false);
            }}
          />
        );
      case 'profile.password':
        return (
          <PasswordScreen
            passwordForm={passwordForm}
            onChange={patch => setPasswordForm(c => ({...c, ...patch}))}
            onSave={handlePasswordChange}
            loading={actionLoading}
          />
        );
      case 'profile.preferences':
        return (
          <NotificationPreferencesScreen
            notificationPrefs={notificationPrefs}
            onToggle={updateNotificationPreference}
            onSave={handleNotificationPreferencesSave}
            loading={actionLoading}
          />
        );
      case 'profile.settings':
        return (
          <SettingsScreen
            onChangePassword={() => navigate('profile', 'profile.password')}
            onNotificationPreferences={() => navigate('profile', 'profile.preferences')}
            onAvailability={() => navigate('profile', 'availability.set')}
            onTerms={() => navigate('profile', 'legal.terms')}
            onPrivacy={() => navigate('profile', 'legal.privacy')}
            onDeactivate={() => {
              Alert.alert(
                'Deactivate Account',
                'Are you sure you want to deactivate your account? You can reactivate by logging in again.',
                [
                  {text: 'Cancel', style: 'cancel'},
                  {
                    text: 'Deactivate',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await driverApi.profile.update({isActive: false} as any);
                        handleLogout();
                      } catch {
                        setErrorBanner('Failed to deactivate account. Please try again.');
                      }
                    },
                  },
                ],
              );
            }}
          />
        );
      case 'availability.set':
      case 'availability.toggle':
        return (
          <AvailabilityScreen
            availabilityForm={availabilityForm}
            onToggleDay={toggleAvailabilityDay}
            onChangeForm={patch => setAvailabilityForm(c => ({...c, ...patch}))}
            onSave={handleAvailabilitySave}
            onToggleAvailability={handleAvailabilityToggle}
            loading={actionLoading}
          />
        );
      case 'support.faq':
      case 'support.contact':
        return (
          <SupportScreen
            mode={activeRoute === 'support.contact' ? 'contact' : 'faq'}
          />
        );
      case 'compliance.scanner':
        return (
          <ScannerInterfaceScreen
            onClose={() => navigate('tracking', 'compliance.loadCode')}
          />
        );
      case 'legal.terms':
        return <TermsAndConditionsScreen />;
      case 'legal.privacy':
        return <PrivacyPolicyScreen />;
      default:
        return <EmptyState title="Open the drawer to navigate." />;
    }
  };

  // ─── Auth screens ─────────────────────────────────────────────────────────────

  // Show blank nav-colour screen while restoring session from storage
  if (initializing) {
    return <SafeAreaView style={{flex: 1, backgroundColor: palette.bg}} />;
  }

  if (showSplash) {
    return (
      <SplashScreen
        onGetStarted={() => {
          setAuthError(null);
          setAuthInfo(null);
          setAuthLoading(false);
          setAuthMode('register');
          setShowSplash(false);
        }}
        onLogin={() => {
          setAuthError(null);
          setAuthInfo(null);
          setAuthLoading(false);
          setAuthMode('login');
          setShowSplash(false);
        }}
      />
    );
  }

  if (!session) {
    const modeTitle: Record<string, string> = {
      forgot: 'Forgot Password',
      login: 'Sign In',
      register: 'Create Account',
      reset: 'Reset Password',
      verify: 'Verify Email',
    };
    return (
      <SafeAreaView style={styles.authShell}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={palette.bg}
        />
        {authInfo ? (
          <View style={styles.authInfoBanner}>
            <Text style={styles.authInfoText}>{authInfo}</Text>
          </View>
        ) : null}
        {authMode === 'login' ? (
          <LoginScreen
            loginForm={loginForm}
            setLoginForm={setLoginForm}
            handleLogin={handleLogin}
            authLoading={authLoading}
            authError={authError}
            setAuthMode={setAuthMode}
          />
        ) : authMode === 'register' ? (
          <RegisterScreen
            registerForm={registerForm}
            setRegisterForm={setRegisterForm}
            handleRegister={handleRegister}
            authLoading={authLoading}
            authError={authError}
            setAuthMode={setAuthMode}
            onViewTerms={() => setAuthMode('terms')}
            onViewPrivacy={() => setAuthMode('privacy')}
          />
        ) : authMode === 'terms' ? (
          <TermsAndConditionsScreen onBack={() => setAuthMode('register')} />
        ) : authMode === 'privacy' ? (
          <PrivacyPolicyScreen onBack={() => setAuthMode('register')} />
        ) : authMode === 'verify' ? (
          <VerifyScreen
            verifyForm={verifyForm}
            setVerifyForm={setVerifyForm}
            handleVerify={handleVerify}
            handleResendOtp={handleResendOtp}
            authLoading={authLoading}
            authError={authError}
            setAuthMode={setAuthMode}
          />
        ) : authMode === 'forgot' ? (
          <ForgotPasswordScreen
            authLoading={authLoading}
            authError={authError}
            onSendCode={handleForgotPassword}
            onBack={() => setAuthMode('login')}
          />
        ) : (
          <ResetPasswordScreen
            email={forgotEmail}
            authLoading={authLoading}
            authError={authError}
            onReset={handleResetPassword}
            onBack={() => setAuthMode('forgot')}
            onResend={() => handleForgotPassword(forgotEmail)}
          />
        )}
      </SafeAreaView>
    );
  }

  // ─── Post-login setup flow ────────────────────────────────────────────────────

  if (session && setupStep === 'profile') {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: palette.bg}}>
        <StatusBar barStyle="dark-content" backgroundColor={palette.bg} />
        <ProfileSetupScreen
          email={session.email}
          initialName={session.name}
          onComplete={handleProfileSetup}
          onSkip={() => {
            setSetupStep(null);
            navHistoryRef.current = [];
            setActiveTab('home');
            setActiveRoute('home');
          }}
          loading={actionLoading}
          error={errorBanner}
        />
      </SafeAreaView>
    );
  }

  if (session && setupStep === 'documents') {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: palette.bg}}>
        <StatusBar barStyle="dark-content" backgroundColor={palette.bg} />
        <DocumentVerificationScreen
          documents={documents}
          verificationStatus={verificationStatus}
          driverAvailability={setupAvailability}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadDrawerRoute('documents.status').catch(() => undefined);
            setRefreshing(false);
          }}
          onUpload={handleDocumentUpload}
          uploadLoading={actionLoading}
          uploadError={errorBanner}
          onSubmit={() => {
            setSetupStep(null);
            navHistoryRef.current = [];
            setActiveTab('home');
            setActiveRoute('home');
          }}
        />
      </SafeAreaView>
    );
  }

  // ─── Main app shell ───────────────────────────────────────────────────────────

  const showsSubNav =
    activeTab === 'jobs' && !selectedJob && activeRoute !== 'jobs.booking';

  const isFullScreen =
    activeRoute === 'jobs.available' ||
    activeRoute === 'jobs.myQuotes' ||
    activeRoute === 'jobs.upcoming' ||
    activeRoute === 'jobs.history' ||
    activeRoute === 'jobs.booking' ||
    activeRoute === 'profile.settings' ||
    activeRoute === 'profile.password' ||
    activeRoute === 'profile.preferences' ||
    activeRoute === 'availability.set' ||
    activeRoute === 'legal.terms' ||
    activeRoute === 'legal.privacy' ||
    activeRoute === 'tracking.active' ||
    activeRoute === 'tracking.incident' ||
    activeRoute === 'compliance.loadCode' ||
    activeRoute === 'compliance.scanner' ||
    activeRoute === 'compliance.handover' ||
    activeRoute === 'compliance.delivery' ||
    (activeRoute as string) === 'payments.released' ||
    activeRoute === 'payment.escrow' ||
    activeRoute === 'home' ||
    !!quoteStatusData ||
    (activeTab === 'profile' && activeRoute === 'profile.edit') ||
    (activeTab === 'jobs' && !!selectedJob) ||
    activeTab === 'shifts' ||
    activeRoute.startsWith('shifts.');

  const tabIcons: Record<DriverTabKey, ReturnType<typeof require>> = {
    home: require('./assets/icons/home.png'),
    jobs: require('./assets/icons/jobs.png'),
    shifts: require('./assets/icons/jobs.png'),
    tracking: require('./assets/icons/route.png'),
    profile: require('./assets/icons/profile.png'),
  };

  const renderBottomTabIcon = (tabKey: DriverTabKey) => {
    const isActive = activeTab === tabKey;
    return (
      <Image
        source={tabIcons[tabKey]}
        style={[
          styles.bottomTabIcon,
          {tintColor: isActive ? '#111827' : '#6B7280'},
        ]}
      />
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bg} />

      {/* Header */}
      <View style={styles.header}>
        {activeRoute !== 'home' ? (
          <Pressable
            onPress={goBackOneStep}
            style={styles.headerBack}
            hitSlop={8}>
            <Text style={styles.headerBackText}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.headerTruckWrap}>
            <Icon name="truck" size={22} color="#1066B1" strokeWidth={1.8} />
          </View>
        )}
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>
            {activeRoute.startsWith('compliance.')
              ? 'Compliance'
              : activeRoute === 'notifications.all'
              ? 'Notifications'
              : activeRoute === 'tracking.incident'
              ? 'Incident Report'
              : activeTab === 'home'
              ? (
                  <>
                    <Text style={{color: '#1A1A1A'}}>Flexi</Text>
                    <Text style={{color: '#1066B1'}}>Shift</Text>
                  </>
                )
              : bottomTabs.find(t => t.key === activeTab)?.label ?? 'Driver'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {profile?.name ?? session.name} | {session.role}
          </Text>
        </View>
        {activeTab === 'home' && activeRoute === 'home' ? (
          <Pressable
            onPress={() => navigate('profile', 'availability.set')}
            style={styles.headerScheduleBtn}>
            <Text style={styles.headerScheduleText}>Schedule</Text>
          </Pressable>
        ) : null}
        {activeRoute === 'notifications.all' ? (
          <View style={styles.headerBellSpacer} />
        ) : (
          <Pressable
            onPress={() => navigate('profile', 'notifications.all')}
            style={styles.headerBell}>
            <BellIcon size={24} color="#1A1A1A" />
            {notificationUnreadCount > 0 ? (
              <View style={styles.headerBellBadge}>
                <Text style={styles.headerBellBadgeText}>
                  {notificationUnreadCount > 99 ? '99+' : String(notificationUnreadCount)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        )}
      </View>

      {/* Banners */}
      {errorBanner ? (
        <View style={styles.bannerError}>
          <Text style={styles.bannerText}>{errorBanner}</Text>
        </View>
      ) : null}
      {successBanner ? (
        <View style={styles.bannerSuccess}>
          <Text style={styles.bannerText}>{successBanner}</Text>
        </View>
      ) : null}

      {/* Jobs sub-nav */}
      {showsSubNav && (
        <View style={styles.jobsSubNav}>
          {(
            [
              'jobs.available',
              'jobs.myQuotes',
              'jobs.upcoming',
              'jobs.history',
            ] as DrawerRouteKey[]
          ).map(route => {
            const label =
              route === 'jobs.available'
                ? 'Find Jobs'
                : route === 'jobs.myQuotes'
                ? 'My Bids'
                : route === 'jobs.upcoming'
                ? 'My Jobs'
                : 'History';
            return (
              <Pressable
                key={route}
                onPress={() => {
                  navigate('jobs', route);
                  if (route !== 'jobs.available') {
                    loadDrawerRoute(route).catch(() => undefined);
                  }
                }}
                style={[
                  styles.jobsSubTab,
                  activeRoute === route && styles.jobsSubTabActive,
                ]}>
                <Text
                  style={[
                    styles.jobsSubTabText,
                    activeRoute === route && styles.jobsSubTabTextActive,
                  ]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Content */}
      {isFullScreen ? (
        <View style={[styles.contentContainer, {flex: 1, paddingBottom: 64}]}>
          {renderCurrentView()}
        </View>
      ) : (
        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {renderCurrentView()}
        </ScrollView>
      )}

      {/* Bottom Tab Bar */}
      {(() => {
        const _profileComplete = isDriverProfileComplete(profile);
        const _docsApproved = areDriverDocumentsApproved(
          verificationStatus,
          documents,
        );
        const _jobsLocked = !(_profileComplete && _docsApproved);
        return (
      <View style={styles.bottomTabBar}>
        {bottomTabs.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (tab.key === 'home') {
                navigate('home', 'home');
              } else if (tab.key === 'jobs') {
                navigate('jobs', 'jobs.upcoming');
                loadJobs().catch(() => undefined);
              } else if (tab.key === 'shifts') {
                navigate('shifts', 'shifts.available');
                loadShifts().catch(() => undefined);
              } else if (tab.key === 'tracking') {
                navigate('tracking', 'tracking.active');
                loadTracking().catch(() => undefined);
              } else if (tab.key === 'profile') {
                navigate('profile', 'profile.edit');
                loadProfile().catch(() => undefined);
                driverApi.documents.getStatus().then(status => {
                  setVerificationStatus(cast<Record<string, unknown>>(status));
                }).catch(() => undefined);
                driverApi.documents.list().then(d => {
                  setDocuments(mapDocumentItems(d as Record<string, unknown>));
                }).catch(() => undefined);
              }
            }}
            style={({pressed}) => [
              styles.bottomTabButton,
              activeTab === tab.key ? styles.bottomTabButtonActive : null,
              pressed ? styles.bottomTabButtonPressed : null,
            ]}>
            <View style={{position: 'relative'}}>
              {renderBottomTabIcon(tab.key)}
              {tab.key === 'jobs' && _jobsLocked && (
                <View style={styles.tabLockBadge}>
                  <Text style={styles.tabLockBadgeText}>🔒</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.bottomTabLabel,
                activeTab === tab.key ? styles.bottomTabLabelActive : null,
              ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
        );
      })()}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  amountText: {
    color: palette.accent,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  historyAmountText: {
    color: '#1066B1',
  },
  authCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 20,
    padding: 24,
  },
  authShell: {backgroundColor: palette.bg, flex: 1},
  authInfoBanner: {
    backgroundColor: '#EBF4FF',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  authInfoText: {color: '#065F46', fontSize: 14, fontWeight: '700', textAlign: 'center'},
  authSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 8,
  },
  authSwitchPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  authSwitchPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  authSwitchDivider: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    fontWeight: '300',
  },
  authTitle: {
    color: palette.ink,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
  },
  bannerError: {
    backgroundColor: '#EAC9C6',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  bannerSuccess: {
    backgroundColor: '#CCE7D8',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  bannerText: {color: palette.ink, fontSize: 13, fontWeight: '700'},
  bottomTabBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    height: 64,
    paddingHorizontal: 8,
    paddingVertical: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomTabButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  bottomTabButtonActive: {
    backgroundColor: '#F1F5F9',
  },
  bottomTabButtonPressed: {
    opacity: 0.95,
    transform: [{scale: 0.96}],
  },
  bottomTabIcon: {width: 24, height: 24, resizeMode: 'contain'},
  bottomTabIconActive: {},
  bottomTabLabel: {
    color: '#374151',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  bottomTabLabelActive: {color: '#111827'},
  tabLockBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLockBadgeText: {fontSize: 9},
  brandOverline: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  cardEyebrow: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  historyCardEyebrow: {
    color: '#1066B1',
  },
  content: {gap: 16, padding: 18, paddingBottom: 64},
  contentContainer: {flex: 1, paddingBottom: 64},
  emptyText: {color: palette.inkSoft, fontSize: 14, lineHeight: 20},
  errorText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  header: {
    alignItems: 'center',
    backgroundColor: palette.card,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBack: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 4,
    width: 36,
  },
  headerBackSpacer: {
    width: 16,
  },
  headerTruckWrap: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 4,
  },
  headerBackText: {
    color: palette.nav,
    fontSize: 22,
    fontWeight: '700',
  },

  headerBell: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    minHeight: 28,
    minWidth: 28,
    position: 'relative',
  },
  headerBellSpacer: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  headerScheduleBtn: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBBFC7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerScheduleText: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '600',
  },
  headerBellBadge: {
    alignItems: 'center',
    backgroundColor: palette.danger,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -6,
    top: -6,
  },
  headerBellBadgeText: {
    color: palette.card,
    fontSize: 10,
    fontWeight: '900',
  },
  headerSubtitle: {color: palette.inkSoft, fontSize: 12, marginTop: 2},
  headerTextWrap: {flex: 1, paddingRight: 8},
  headerTitle: {color: palette.nav, fontSize: 18, fontWeight: '900'},
  input: {
    backgroundColor: '#FAF8F3',
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 15,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  jobsSubNav: {
    flexDirection: 'row',
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  jobsSubTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  jobsSubTabActive: {backgroundColor: '#1066B1'},
  jobsSubTabText: {
    fontSize: 11,
    fontWeight: '800',
    color: palette.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobsSubTabTextActive: {color: '#FFFFFF'},
  linkRow: {alignItems: 'center', marginTop: 12},
  linkText: {color: palette.accent, fontSize: 13, fontWeight: '800'},
  listCard: {
    backgroundColor: '#FCFBF7',
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  upcomingCard: {
    backgroundColor: '#F8FAFF',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    justifyContent: 'space-between',
  },
  listContainer: {flex: 1, backgroundColor: palette.bg},
  listContentPad: {padding: 18, paddingBottom: 100},
  listMeta: {color: palette.inkSoft, fontSize: 13, lineHeight: 18},
  listMetaSub: {color: palette.inkSoft, fontSize: 12, marginTop: 2},
  upcomingBadge: {
    color: '#FFFFFF',
    backgroundColor: '#1066B1',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  upcomingBadgePaid: {
    backgroundColor: '#1066B1',
    color: '#FFFFFF',
  },
  awaitingPaymentBanner: {
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
  awaitingPaymentIcon: {
    fontSize: 18,
    marginTop: 1,
    color: '#1066B1',
  },
  awaitingPaymentTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1066B1',
    marginBottom: 3,
  },
  awaitingPaymentBody: {
    fontSize: 12,
    color: '#1F4B79',
    lineHeight: 17,
  },
  detailValueSuccess: {
    color: '#18794E',
  },
  detailValueWarning: {
    color: '#C17B00',
  },
  listActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
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
  listActionDisabled: {
    opacity: 0.45,
  },
  upcomingDetails: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
    gap: 8,
  },
  detailRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailKey: {
    color: palette.inkSoft,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailValueCompact: {
    color: palette.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  listScreenTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 16,
  },
  listTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  loaderText: {color: palette.inkSoft, marginTop: 12},
  loaderWrap: {alignItems: 'center', justifyContent: 'center', minHeight: 220},
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {color: palette.nav, fontSize: 14, fontWeight: '900'},
  screen: {backgroundColor: palette.bg, flex: 1},
  sectionCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  sectionHint: {color: palette.inkSoft, fontSize: 13, lineHeight: 19},
  sectionText: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
  },
  sectionValue: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  successText: {
    color: palette.success,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
});

export default DriverApp;
