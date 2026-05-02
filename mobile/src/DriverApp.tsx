import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {setApiAccessToken} from './api/client';
import {driverApi} from './api/driverApi';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import VerifyScreen from './screens/auth/VerifyScreen';
import DashboardScreen from './screens/dashboard/DashboardScreen';
import JobDiscoveryScreen from './screens/jobs/JobDiscoveryScreen';
import JobDetailScreen from './screens/jobs/JobDetailScreen';
import MyQuotesScreen from './screens/jobs/MyQuotesScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import LoadCodeScreen from './screens/compliance/LoadCodeScreen';
import HandoverScreen from './screens/compliance/HandoverScreen';
import DeliveryScreen from './screens/compliance/DeliveryScreen';
import DocumentStatusScreen from './screens/profile/DocumentStatusScreen';
import AvailabilityScreen from './screens/profile/AvailabilityScreen';
import DocumentUploadScreen from './screens/profile/DocumentUploadScreen';
import EarningsHistoryScreen from './screens/earnings/EarningsHistoryScreen';
import RatingsListScreen from './screens/ratings/RatingsListScreen';
import RatingSubmissionScreen from './screens/ratings/RatingSubmissionScreen';
import LiveTrackingScreen from './screens/tracking/LiveTrackingScreen';
import NotificationsScreen from './screens/notifications/NotificationsScreen';
import InvoicesScreen from './screens/invoices/InvoicesScreen';
import PasswordScreen from './screens/profile/PasswordScreen';
import NotificationPreferencesScreen from './screens/profile/NotificationPreferencesScreen';
import SupportScreen from './screens/support/SupportScreen';
import {bottomTabs} from './navigation/driverNavigation';
import type {
  AvailabilityResponse,
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

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const palette = {
  accent: '#DFA622',
  accentSoft: '#FFF3D5',
  bg: '#F4F1E8',
  border: '#E4DED0',
  card: '#FFFFFF',
  danger: '#A53A32',
  ink: '#18232F',
  inkSoft: '#5B6671',
  nav: '#102235',
  success: '#18794E',
};

const defaultLogin = {
  email: '',
  password: '',
};

const defaultRegister = {
  email: 'john@example.com',
  name: 'John Doe',
  password: 'Driver@1234',
  phone: '9876543210',
};

const defaultVerify = {
  email: 'john@example.com',
  otp: '',
};

const defaultReset = {
  confirmPassword: '',
  newPassword: '',
  resetToken: '',
};

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
  smsNotifications: {
    enabled: true,
    job_updates: true,
    payment_updates: true,
  },
};

const availabilityDays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const cast = <T,>(value: unknown) => value as T;

function DriverApp(): React.JSX.Element {
  const [showSplash, setShowSplash] = useState(true);
  const [session, setSession] = useState<DriverSession | null>(null);

  const [activeTab, setActiveTab] = useState<DriverTabKey>('home');
  const [activeRoute, setActiveRoute] = useState<DrawerRouteKey>('home');
  const [complianceJobId, setComplianceJobId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loginForm, setLoginForm] = useState(defaultLogin);
  const [registerForm, setRegisterForm] = useState(defaultRegister);
  const [verifyForm, setVerifyForm] = useState(defaultVerify);
  const [forgotEmail, setForgotEmail] = useState(defaultLogin.email);
  const [resetForm, setResetForm] = useState(defaultReset);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [availableJobs, setAvailableJobs] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [upcomingJobs, setUpcomingJobs] = useState<
    Array<Record<string, unknown>>
  >([]);
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
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    licenceNumber: '',
    vehicleType: '',
    vehicleRegistration: '',
  });
  const [passwordForm, setPasswordForm] = useState(defaultPasswordForm);
  const [notificationPrefs, setNotificationPrefs] = useState(
    defaultNotificationPrefs,
  );
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<Record<
    string,
    unknown
  > | null>(null);
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
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [invoices, setInvoices] = useState<Array<Record<string, unknown>>>([]);
  const [myQuotes, setMyQuotes] = useState<Array<Record<string, unknown>>>([]);
  const [ratings, setRatings] = useState<RatingSummary | null>(null);
  const [trackingEta, setTrackingEta] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [complianceStatus, setComplianceStatus] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    const [overviewData, earningsData, notificationData] = await Promise.all([
      driverApi.dashboard.getOverview(),
      driverApi.dashboard.getEarnings({period: 'monthly'}),
      driverApi.notifications.list({limit: 5, page: 1}),
    ]);
    setDashboard(cast<DashboardOverview>(overviewData));
    setEarnings(cast<EarningsResponse>(earningsData));
    setNotifications(
      ((notificationData.notifications ?? []) as NotificationSummary[]) || [],
    );
  }, []);

  const loadJobs = useCallback(async () => {
    const [availableData, upcomingData, historyData] = await Promise.all([
      driverApi.jobs.listAvailable({limit: 10, page: 1, status: 'open'}),
      driverApi.dashboard.getUpcomingJobs({limit: 10, page: 1}),
      driverApi.dashboard.getJobHistory({limit: 10, page: 1}),
    ]);
    const jobs = (availableData.items as Array<Record<string, unknown>>) ?? [];
    setAvailableJobs(jobs);
    setUpcomingJobs(
      (upcomingData.jobs as Array<Record<string, unknown>>) ?? [],
    );
    setJobHistory((historyData.jobs as Array<Record<string, unknown>>) ?? []);

    if (!selectedJob && jobs.length > 0) {
      const firstJob = jobs[0];
      setSelectedJob(firstJob);
      setQuoteForm(current => ({
        ...current,
        jobId: String(firstJob.jobId ?? ''),
      }));
    }
  }, [selectedJob]);

  const loadTracking = useCallback(async () => {
    const overview =
      dashboard ??
      cast<DashboardOverview>(await driverApi.dashboard.getOverview());
    setDashboard(overview);
    if (overview.activeJob?.jobId) {
      const [eta, compliance] = await Promise.all([
        driverApi.tracking.getEta(overview.activeJob.jobId),
        driverApi.compliance.getFullStatus(overview.activeJob.jobId),
      ]);
      setTrackingEta(eta);
      setComplianceStatus(compliance);
    } else {
      setTrackingEta(null);
      setComplianceStatus(null);
    }
  }, [dashboard]);

  const loadProfile = useCallback(async () => {
    const [profileData, ratingData, notificationData] = await Promise.all([
      driverApi.profile.getMe(),
      session?.userId
        ? driverApi.ratings.getSummary(session.userId)
        : Promise.resolve(null),
      driverApi.notifications.list({limit: 10, page: 1}),
    ]);
    const nextProfile = cast<ProfileResponse>(profileData);
    setProfile(nextProfile);
    setProfileForm({
      name: String(nextProfile.name ?? ''),
      phone: String(nextProfile.phone ?? ''),
      licenceNumber: String(nextProfile.profile?.licenceNumber ?? ''),
      vehicleType: String(nextProfile.profile?.vehicleType ?? ''),
      vehicleRegistration: String(nextProfile.profile?.vehicleRegistration ?? ''),
    });
    setRatings(ratingData ? cast<RatingSummary>(ratingData) : null);
    setNotifications(
      ((notificationData.notifications ?? []) as NotificationSummary[]) || [],
    );
  }, [session?.userId]);

  const handleVerifyLoadCode = async (code: string) => {
    const jobId = dashboard?.activeJob?.jobId;
    if (!jobId) return;
    setActionLoading(true);
    setErrorBanner(null);
    try {
      await driverApi.compliance.verifyLoadCode({jobId, loadCode: code});
      setSuccessBanner('Load code verified successfully!');
      setActiveRoute('compliance.handover');
      await refreshActiveView();
    } catch (err) {
      setErrorBanner('Invalid load code. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitHandover = async (checklist: any, photos: any[]) => {
    const jobId = dashboard?.activeJob?.jobId;
    if (!jobId) return;
    setActionLoading(true);
    setErrorBanner(null);
    try {
      await driverApi.compliance.submitVehicleChecklist({jobId, checklist});
      // In a real app, we would upload photos here
      await driverApi.compliance.signDriverHandover({jobId, signature: 'driver_signed'});
      setSuccessBanner('Handover completed! You can now start the trip.');
      setActiveRoute('tracking.active');
      await refreshActiveView();
    } catch (err) {
      setErrorBanner('Failed to submit handover. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitDelivery = async (proofData: any, photos: any[]) => {
    const jobId = dashboard?.activeJob?.jobId;
    if (!jobId) return;
    setActionLoading(true);
    setErrorBanner(null);
    try {
      await driverApi.compliance.submitDeliveryProof({jobId, ...proofData});
      // In a real app, we would upload photos here
      setSuccessBanner('Delivery completed successfully!');
      setActiveRoute('home');
      setActiveTab('home');
      await refreshActiveView();
    } catch (err) {
      setErrorBanner('Failed to submit delivery proof. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocumentUpload = async (documentType: string, expiryDate: string, file: any) => {
    setActionLoading(true);
    setErrorBanner(null);
    try {
      // In a real app, we would create a FormData object with the file
      const formData = new FormData();
      formData.append('documentType', documentType);
      formData.append('expiryDate', expiryDate);
      // formData.append('file', file);
      
      await driverApi.documents.upload(formData);
      setSuccessBanner('Document uploaded successfully and is under review.');
      setActiveRoute('documents.status');
      await refreshActiveView();
    } catch (err) {
      setErrorBanner('Failed to upload document. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRatingSubmit = async (rating: number, comment: string) => {
    const jobId = dashboard?.activeJob?.jobId;
    if (!jobId) return;
    setActionLoading(true);
    setErrorBanner(null);
    try {
      await driverApi.ratings.submit({
        jobId,
        rating,
        comment,
      });
      setSuccessBanner('Rating submitted! Thank you for your feedback.');
      setActiveRoute('ratings.received');
      await refreshActiveView();
    } catch (err) {
      setErrorBanner('Failed to submit rating. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateLocation = async (location: any) => {
    try {
      await driverApi.tracking.updateLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Silent error for background updates
    }
  };

  const handleStopTracking = async () => {
    const jobId = dashboard?.activeJob?.jobId;
    if (!jobId) return;
    setActionLoading(true);
    try {
      await driverApi.tracking.stop(jobId, {reason: 'trip_completed'});
      setSuccessBanner('Tracking stopped. Job completed!');
      setActiveRoute('compliance.delivery');
      await refreshActiveView();
    } catch (err) {
      setErrorBanner('Failed to stop tracking.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawQuote = async (quoteId: string) => {
    setActionLoading(true);
    try {
      await driverApi.quotes.withdraw(quoteId);
      setSuccessBanner('Quote withdrawn successfully.');
      await refreshActiveView();
    } catch (err) {
      setErrorBanner('Failed to withdraw quote.');
    } finally {
      setActionLoading(false);
    }
  };

  const loadDrawerRoute = useCallback(
    async (route: DrawerRouteKey) => {
      switch (route) {
        case 'documents.upload':
        case 'documents.status': {
          const [docs, status] = await Promise.all([
            driverApi.documents.list(),
            driverApi.documents.getStatus(),
          ]);
          setDocuments(((docs.documents ?? []) as DocumentSummary[]) || []);
          setVerificationStatus(status);
          break;
        }
        case 'availability.set':
        case 'availability.toggle': {
          const availabilityData = cast<AvailabilityResponse>(
            await driverApi.availability.getMine(),
          );
          setAvailability(availabilityData);
          setAvailabilityForm({
            availableDays: availabilityData.availableDays?.length
              ? availabilityData.availableDays
              : ['monday', 'tuesday', 'wednesday', 'friday', 'saturday'],
            endTime: String(
              availabilityData.timeSlots?.[0]?.endTime ?? '18:00',
            ),
            isAvailable: availabilityData.isAvailable ?? true,
            reason: String(availabilityData.reason ?? ''),
            startTime: String(
              availabilityData.timeSlots?.[0]?.startTime ?? '08:00',
            ),
            timezone: availabilityData.timezone ?? 'Asia/Kolkata',
          });
          break;
        }
        case 'earnings.total':
        case 'earnings.monthly': {
          const earningsData = await driverApi.dashboard.getEarnings({
            period: 'monthly',
          });
          setEarnings(cast<EarningsResponse>(earningsData));
          break;
        }
        case 'earnings.history': {
          const history = await driverApi.payments.getHistory({
            limit: 10,
            page: 1,
          });
          setPayments(
            (history.payments as Array<Record<string, unknown>>) ?? [],
          );
          break;
        }
        case 'invoices.list': {
          const invoiceData = await driverApi.invoices.list({
            limit: 10,
            page: 1,
          });
          setInvoices(
            (invoiceData.invoices as Array<Record<string, unknown>>) ?? [],
          );
          break;
        }
        case 'notifications.all': {
          const notificationData = await driverApi.notifications.list({
            limit: 20,
            page: 1,
          });
          setNotifications(
            ((notificationData.notifications ?? []) as NotificationSummary[]) ||
              [],
          );
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
        case 'jobs.myQuotes': {
          const quotesData = await driverApi.quotes.listMine();
          setMyQuotes((quotesData.quotes as Array<Record<string, unknown>>) ?? []);
          break;
        }
        case 'compliance.loadCode':
        case 'compliance.handover':
        case 'compliance.delivery': {
          const jobId = dashboard?.activeJob?.jobId;
          if (jobId) {
            setComplianceStatus(
              await driverApi.compliance.getFullStatus(jobId),
            );
          } else {
            setComplianceStatus(null);
          }
          break;
        }
        case 'profile.edit': {
          await loadProfile();
          break;
        }
        case 'profile.password':
          setPasswordForm(defaultPasswordForm);
          break;
        case 'profile.preferences':
          break;
        default:
          break;
      }
    },
    [dashboard?.activeJob?.jobId, loadProfile, session?.userId],
  );

  const refreshActiveView = useCallback(async () => {
    if (!session) {
      return;
    }
    setContentLoading(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      if (activeTab === 'home' && activeRoute === 'home') {
        await loadHome();
      } else if (activeTab === 'jobs' || activeRoute.startsWith('jobs.')) {
        if (activeRoute === 'jobs.myQuotes') {
          await loadDrawerRoute('jobs.myQuotes');
        } else {
          await loadJobs();
        }
      } else if (
        activeTab === 'tracking' ||
        activeRoute.startsWith('tracking.') ||
        activeRoute.startsWith('compliance.')
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
        error instanceof Error ? error.message : 'Failed to load mobile data.',
      );
    } finally {
      setContentLoading(false);
    }
  }, [
    activeRoute,
    activeTab,
    loadDrawerRoute,
    loadHome,
    loadJobs,
    loadProfile,
    loadTracking,
    session,
  ]);

  useEffect(() => {
    setApiAccessToken(session?.accessToken ?? null);
  }, [session]);

  useEffect(() => {
    if (session) {
      refreshActiveView().catch(() => undefined);
    }
  }, [refreshActiveView, session]);

  useEffect(() => {
    if (selectedJob?.jobId) {
      driverApi.jobs
        .getDetails(String(selectedJob.jobId))
        .then(data => {
          setSelectedJobDetails(data);
          setQuoteForm(current => ({
            ...current,
            jobId: String(selectedJob.jobId),
          }));
        })
        .catch(() => undefined);
    } else {
      setSelectedJobDetails(null);
    }
  }, [selectedJob]);

  const runAction = async (task: () => Promise<void>) => {
    setActionLoading(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await task();
    } catch (error) {
      setErrorBanner(
        error instanceof Error ? error.message : 'Action failed on mobile app.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthInfo(null);
    try {
      const payload = await driverApi.auth.login(loginForm);
      setSession(cast<DriverSession>(payload));
      setActiveTab('home');
      setActiveRoute('home');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthInfo(null);
    try {
      await driverApi.auth.register(registerForm);
      setVerifyForm({email: registerForm.email, otp: ''});
      setLoginForm(current => ({
        ...current,
        email: registerForm.email,
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
      await driverApi.auth.verifyEmail(verifyForm);
      setAuthInfo('Email verified. You can now sign in.');
      setAuthMode('login');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Email verification failed.',
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthInfo(null);
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

  const handleForgotPassword = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthInfo(null);
    try {
      await driverApi.auth.forgotPassword(forgotEmail);
      setResetForm(current => ({...current}));
      setAuthInfo('Reset link requested. Use the reset token from email.');
      setAuthMode('reset');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Forgot password failed.',
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthInfo(null);
    try {
      await driverApi.auth.resetPassword(resetForm);
      setAuthInfo('Password reset complete. Sign in with the new password.');
      setLoginForm(current => ({
        ...current,
        email: forgotEmail || current.email,
        password: resetForm.newPassword,
      }));
      setAuthMode('login');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Reset password failed.',
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const onSelectDrawerRoute = (route: DrawerRouteKey) => {
    setActiveRoute(route);
    setSuccessBanner(null);
    if (route === 'home') {
      setActiveTab('home');
    } else if (route.startsWith('jobs.')) {
      setActiveTab('jobs');
    } else if (
      route.startsWith('tracking.') ||
      route.startsWith('compliance.')
    ) {
      setActiveTab('tracking');
    } else if (route.startsWith('profile.')) {
      setActiveTab('profile');
    }
  };

  const handleLogout = async () => {
    try {
      if (session?.refreshToken) {
        await driverApi.auth.logout(session.refreshToken);
      }
    } catch {
      // ignore logout failure and clear local session
    } finally {
      setSession(null);
      setApiAccessToken(null);
      setAuthMode('login');
      setSuccessBanner(null);
      setErrorBanner(null);
    }
  };

  const handleQuoteSubmit = async () => {
    await runAction(async () => {
      await driverApi.quotes.submit({
        currency: quoteForm.currency,
        jobId: quoteForm.jobId,
        notes: quoteForm.notes,
        quoteAmount: Number(quoteForm.quoteAmount),
      });
      setSuccessBanner('Quote submitted successfully.');
      setQuoteForm(current => ({...current, notes: '', quoteAmount: ''}));
      await loadJobs();
    });
  };

  const handleProfileSave = async () => {
    await runAction(async () => {
      await driverApi.profile.update({
        name: profileForm.name,
        phone: profileForm.phone,
        licenceNumber: profileForm.licenceNumber,
        vehicleType: profileForm.vehicleType,
        vehicleRegistration: profileForm.vehicleRegistration,
      });
      setSuccessBanner('Profile updated successfully.');
      await loadProfile();
    });
  };

  const handlePasswordChange = async () => {
    await runAction(async () => {
      await driverApi.auth.changePassword(passwordForm);
      setPasswordForm(defaultPasswordForm);
      setSuccessBanner('Password changed successfully.');
    });
  };

  const handleNotificationPreferencesSave = async () => {
    await runAction(async () => {
      await driverApi.notifications.updatePreferences(notificationPrefs);
      setSuccessBanner('Notification preferences updated.');
    });
  };

  const handleAvailabilitySave = async () => {
    const payload = {
      availableDays: availabilityForm.availableDays,
      timeSlots: availabilityForm.availableDays.map(day => ({
        day,
        endTime: availabilityForm.endTime,
        startTime: availabilityForm.startTime,
      })),
      timezone: availabilityForm.timezone,
    };

    await runAction(async () => {
      if (availability?.availabilityId) {
        await driverApi.availability.update(payload);
      } else {
        await driverApi.availability.set(payload);
      }
      setSuccessBanner('Availability saved successfully.');
      await loadDrawerRoute('availability.set');
    });
  };

  const handleAvailabilityToggle = async () => {
    await runAction(async () => {
      await driverApi.availability.toggle({
        isAvailable: availabilityForm.isAvailable,
        reason: availabilityForm.reason,
      });
      setSuccessBanner(
        availabilityForm.isAvailable
          ? 'Driver marked as available.'
          : 'Driver marked as unavailable.',
      );
      await loadDrawerRoute('availability.toggle');
    });
  };

  const handleMarkAllNotificationsRead = async () => {
    await runAction(async () => {
      await driverApi.notifications.markAllRead();
      setSuccessBanner('All notifications marked as read.');
      await loadDrawerRoute('notifications.all');
    });
  };

  const toggleAvailabilityDay = (day: string) => {
    setAvailabilityForm(current => {
      const exists = current.availableDays.includes(day);
      return {
        ...current,
        availableDays: exists
          ? current.availableDays.filter(item => item !== day)
          : [...current.availableDays, day],
      };
    });
  };

  const updateNotificationPreference = (
    channel: 'pushNotifications' | 'smsNotifications',
    key: string,
    value: boolean,
  ) => {
    setNotificationPrefs(current => ({
      ...current,
      [channel]: {
        ...current[channel],
        [key]: value,
      },
    }));
  };

  const renderList = (
    items: Array<Record<string, unknown>>,
    emptyLabel: string,
    selectable?: boolean,
  ) => {
    if (!items.length) {
      return <EmptyState title={emptyLabel} />;
    }

    return items.map(item => {
      const pickup = toAddress(item.pickupLocation);
      const drop = toAddress(item.dropLocation);
      const id = String(
        item.jobId ?? item.quoteId ?? item.paymentId ?? item.invoiceId ?? '',
      );
      const selected = selectable && selectedJob?.jobId === item.jobId;

      return (
        <Pressable
          key={id}
          onPress={() => {
            if (selectable) {
              setSelectedJob(item);
            }
          }}
          style={[styles.listCard, selected ? styles.listCardSelected : null]}>
          <Text style={styles.cardEyebrow}>
            {String(
              item.status ?? item.jobReference ?? item.paymentStatus ?? 'Item',
            )}
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
              ? `${pickup} to ${drop}`
              : String(
                  item.createdAt ?? item.jobDate ?? item.generatedAt ?? '',
                )}
          </Text>
          {item.agreedAmount || item.amount || item.totalAmount ? (
            <Text style={styles.amountText}>
              Rs {String(item.agreedAmount ?? item.amount ?? item.totalAmount)}
            </Text>
          ) : null}
        </Pressable>
      );
    });
  };

  const renderAuthCard = () => {
    const modeTitle = {
      forgot: 'Forgot Password',
      login: 'Mobile Control Center',
      register: 'Register Driver',
      reset: 'Reset Password',
      verify: 'Verify Email',
    }[authMode];

    return (
      <SafeAreaView style={styles.authShell}>
        <StatusBar barStyle="light-content" backgroundColor={palette.nav} />
        {authMode === 'login' ? (
          <LoginScreen
            loginForm={loginForm}
            setLoginForm={setLoginForm}
            handleLogin={handleLogin}
            authLoading={authLoading}
            authError={authError}
            setAuthMode={setAuthMode}
          />
        ) : (
          <View style={styles.authCard}>
            <Text style={styles.brandOverline}>FreightFlex Driver</Text>
            <Text style={styles.authTitle}>{modeTitle}</Text>
            <Text style={styles.authSubtitle}>
              Mobile driver access to jobs, compliance, tracking, earnings,
              documents, and profile operations.
            </Text>
            {authInfo ? <Text style={styles.successText}>{authInfo}</Text> : null}
            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

            {authMode === 'register' ? (
              <RegisterScreen
                registerForm={registerForm}
                setRegisterForm={setRegisterForm}
                handleRegister={handleRegister}
                authLoading={authLoading}
                authError={authError}
                setAuthMode={setAuthMode}
              />
            ) : null}

            {authMode === 'verify' ? (
              <VerifyScreen
                verifyForm={verifyForm}
                setVerifyForm={setVerifyForm}
                handleVerify={handleVerify}
                handleResendOtp={handleResendOtp}
                authLoading={authLoading}
                authError={authError}
                setAuthMode={setAuthMode}
              />
            ) : null}

            {authMode === 'forgot' ? (
            <>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setForgotEmail}
                placeholder="Email"
                placeholderTextColor="#8A94A0"
                style={styles.input}
                value={forgotEmail}
              />
              <Pressable
                onPress={handleForgotPassword}
                style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {authLoading ? 'Requesting...' : 'Send Reset Link'}
                </Text>
              </Pressable>
            </>
          ) : null}

          {authMode === 'reset' ? (
            <>
              <TextInput
                autoCapitalize="none"
                onChangeText={resetToken =>
                  setResetForm(current => ({...current, resetToken}))
                }
                placeholder="Reset token"
                placeholderTextColor="#8A94A0"
                style={styles.input}
                value={resetForm.resetToken}
              />
              <TextInput
                onChangeText={newPassword =>
                  setResetForm(current => ({...current, newPassword}))
                }
                placeholder="New password"
                placeholderTextColor="#8A94A0"
                secureTextEntry
                style={styles.input}
                value={resetForm.newPassword}
              />
              <TextInput
                onChangeText={confirmPassword =>
                  setResetForm(current => ({...current, confirmPassword}))
                }
                placeholder="Confirm password"
                placeholderTextColor="#8A94A0"
                secureTextEntry
                style={styles.input}
                value={resetForm.confirmPassword}
              />
              <Pressable
                onPress={handleResetPassword}
                style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {authLoading ? 'Resetting...' : 'Reset Password'}
                </Text>
              </Pressable>
            </>
          ) : null}

          <View style={styles.authSwitchRow}>
            <Pressable onPress={() => setAuthMode('login')}>
              <Text style={styles.linkText}>Sign In</Text>
            </Pressable>
            <Pressable onPress={() => setAuthMode('register')}>
              <Text style={styles.linkText}>Register</Text>
            </Pressable>
            <Pressable onPress={() => setAuthMode('verify')}>
              <Text style={styles.linkText}>Verify</Text>
            </Pressable>
            <Pressable onPress={() => setAuthMode('forgot')}>
              <Text style={styles.linkText}>Forgot</Text>
            </Pressable>
          </View>

          <Text style={styles.hintText}>
            API base: the mobile app appends /api/v1 automatically. Update
            src/config/env.ts with your backend domain before release.
          </Text>
          </View>
        )}
      </SafeAreaView>
    );
  };

  const renderCurrentView = () => {
    if (contentLoading) {
      return (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={palette.accent} size="large" />
          <Text style={styles.loaderText}>Loading driver mobile data...</Text>
        </View>
      );
    }

    if (activeTab === 'home' && activeRoute === 'home') {
      return (
        <DashboardScreen
          dashboard={dashboard}
          driverName={session?.name}
          earnings={earnings}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refreshActiveView();
            setRefreshing(false);
          }}
          onViewJob={(job: any) => {
            setSelectedJob(job);
            setActiveTab('jobs');
            setActiveRoute('jobs.available');
          }}
          onQuickAction={(action: string) => {
            if (action === 'find_jobs') {
              setActiveTab('jobs');
              setActiveRoute('jobs.available');
            } else if (action === 'tracking') {
              setActiveTab('tracking');
              setActiveRoute('tracking.active');
            } else if (action === 'payouts') {
              setActiveRoute('earnings.history');
            }
          }}
        />
      );
    }

    if (activeTab === 'jobs' || activeRoute.startsWith('jobs.')) {
      if (activeRoute === 'jobs.myQuotes') {
        return (
          <MyQuotesScreen
            quotes={myQuotes}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadDrawerRoute('jobs.myQuotes');
              setRefreshing(false);
            }}
            onProceedToCompliance={(jobId: string) => {
              setComplianceJobId(jobId);
              setActiveTab('tracking');
              setActiveRoute('compliance.loadCode');
            }}
            onWithdrawQuote={handleWithdrawQuote}
          />
        );
      }
      if (activeRoute === 'jobs.available' && !selectedJob) {
        return (
          <JobDiscoveryScreen
            availableJobs={availableJobs}
            onSelectJob={(job: any) => {
              setSelectedJob(job);
              setSelectedJobDetails(job);
            }}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refreshActiveView();
              setRefreshing(false);
            }}
          />
        );
      }
      return (
        <JobDetailScreen
          job={selectedJobDetails ?? selectedJob}
          onSubmitQuote={async (amount, notes) => {
            await runAction(async () => {
              await driverApi.quotes.submit({
                currency: 'INR',
                jobId: String((selectedJobDetails ?? selectedJob)?.jobId ?? ''),
                notes,
                quoteAmount: Number(amount),
              });
              setSuccessBanner('Quote submitted successfully.');
              setSelectedJob(null);
              setSelectedJobDetails(null);
              setActiveRoute('jobs.available');
              await loadJobs();
            });
          }}
          onBack={() => {
            setSelectedJob(null);
            setSelectedJobDetails(null);
            setActiveRoute('jobs.available');
          }}
          loading={actionLoading}
          error={errorBanner}
        />
      );
    }

    if (activeTab === 'tracking' || activeRoute.startsWith('tracking.')) {
      return (
        <LiveTrackingScreen
          activeJob={dashboard?.activeJob}
          trackingEta={trackingEta}
          onUpdateLocation={handleUpdateLocation}
          onStopTracking={handleStopTracking}
        />
      );
    }

    if (activeTab === 'profile' && activeRoute === 'profile.edit') {
      return (
        <ProfileScreen
          profile={profile}
          session={session}
          profileForm={profileForm}
          onChange={patch => setProfileForm(current => ({...current, ...patch}))}
          onSave={handleProfileSave}
          loading={actionLoading}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadProfile();
            setRefreshing(false);
          }}
        />
      );
    }

    switch (activeRoute) {
      case 'documents.status':
        return (
          <DocumentStatusScreen
            documents={documents}
            verificationStatus={verificationStatus}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadDrawerRoute('documents.status');
              setRefreshing(false);
            }}
            onUploadNew={() => setActiveRoute('documents.upload')}
          />
        );
      case 'documents.upload':
        return (
          <DocumentUploadScreen
            onUpload={handleDocumentUpload}
            loading={actionLoading}
            error={errorBanner}
            onCancel={() => setActiveRoute('documents.status')}
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
            onViewInvoice={async (id) => {
              try {
                const result = await driverApi.invoices.download(id);
                // In a real app, 'result' would contain a signed URL or file data
                return (result as any).downloadUrl || 'https://example.com/invoice.pdf';
              } catch (err) {
                setErrorBanner('Failed to get invoice link.');
              }
            }}
          />
        );
      case 'availability.set':
      case 'availability.toggle':
        return (
          <AvailabilityScreen
            availabilityForm={availabilityForm}
            onToggleDay={toggleAvailabilityDay}
            onChangeForm={patch =>
              setAvailabilityForm(current => ({...current, ...patch}))
            }
            onSave={handleAvailabilitySave}
            onToggleAvailability={handleAvailabilityToggle}
            loading={actionLoading}
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
              Average per job: Rs{' '}
              {String(earnings?.summary?.averagePerJob ?? 0)}
            </Text>
          </SectionCard>
        );
      case 'earnings.history':
        return (
          <SectionCard title="Payment History">
            {renderList(payments, 'No payment history yet')}
          </SectionCard>
        );
      case 'invoices.list':
        return <InvoicesScreen invoices={invoices} />;
      case 'notifications.all':
        return (
          <NotificationsScreen
            notifications={notifications}
            onMarkAllRead={handleMarkAllNotificationsRead}
          />
        );
      case 'ratings.received':
      case 'ratings.given':
        if (activeRoute === 'ratings.given' && dashboard?.activeJob) {
          return (
            <RatingSubmissionScreen
              jobId={dashboard.activeJob.jobId}
              jobReference={dashboard.activeJob.jobReference}
              onSubmit={handleRatingSubmit}
              loading={actionLoading}
              error={errorBanner}
              onCancel={() => setActiveRoute('ratings.received')}
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
            onChange={patch =>
              setPasswordForm(current => ({...current, ...patch}))
            }
            onSave={handlePasswordChange}
            loading={actionLoading}
          />
        );
      case 'profile.preferences':
        return (
          <NotificationPreferencesScreen
            notificationPrefs={notificationPrefs}
            onToggle={(group, key, value) =>
              updateNotificationPreference(group, key, value)
            }
            onSave={handleNotificationPreferencesSave}
            loading={actionLoading}
          />
        );
      case 'compliance.loadCode':
        return (
          <LoadCodeScreen
            jobId={complianceJobId ?? dashboard?.activeJob?.jobId ?? ''}
            jobReference={dashboard?.activeJob?.jobReference ?? complianceJobId ?? ''}
            onVerify={handleVerifyLoadCode}
            loading={actionLoading}
            error={errorBanner}
          />
        );
      case 'compliance.handover':
        return (
          <HandoverScreen
            jobId={dashboard?.activeJob?.jobId ?? ''}
            jobReference={dashboard?.activeJob?.jobReference ?? ''}
            onSubmit={handleSubmitHandover}
            loading={actionLoading}
            error={errorBanner}
          />
        );
      case 'compliance.delivery':
        return (
          <DeliveryScreen
            jobId={dashboard?.activeJob?.jobId ?? ''}
            jobReference={dashboard?.activeJob?.jobReference ?? ''}
            onSubmit={handleSubmitDelivery}
            loading={actionLoading}
            error={errorBanner}
          />
        );
      case 'support.faq':
      case 'support.contact':
        return <SupportScreen mode={activeRoute === 'support.contact' ? 'contact' : 'faq'} />;
      default:
        return (
          <EmptyState title="Open the drawer to continue." />
        );
    }
  };

  if (showSplash) {
    return <SplashScreen onGetStarted={() => setShowSplash(false)} />;
  }

  if (!session) {
    return renderAuthCard();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={palette.nav} />
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>
            {bottomTabs.find(tab => tab.key === activeTab)?.label ?? 'Driver'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {session.name} | {session.role}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            refreshActiveView().catch(() => undefined);
          }}
          style={styles.headerRefresh}>
          <Text style={styles.headerRefreshText}>{'\u21BB'}</Text>
        </Pressable>
      </View>

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

      {/* Jobs sub-nav: Find Jobs | My Bids */}
      {activeTab === 'jobs' && !selectedJob && (
        <View style={styles.jobsSubNav}>
          <Pressable
            onPress={() => {
              setActiveRoute('jobs.available');
            }}
            style={[
              styles.jobsSubTab,
              activeRoute !== 'jobs.myQuotes' && styles.jobsSubTabActive,
            ]}>
            <Text style={[
              styles.jobsSubTabText,
              activeRoute !== 'jobs.myQuotes' && styles.jobsSubTabTextActive,
            ]}>Find Jobs</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setActiveRoute('jobs.myQuotes');
            }}
            style={[
              styles.jobsSubTab,
              activeRoute === 'jobs.myQuotes' && styles.jobsSubTabActive,
            ]}>
            <Text style={[
              styles.jobsSubTabText,
              activeRoute === 'jobs.myQuotes' && styles.jobsSubTabTextActive,
            ]}>My Bids</Text>
          </Pressable>
        </View>
      )}

      {(activeRoute === 'jobs.available' && !selectedJob) ||
      activeRoute === 'jobs.myQuotes' ||
      activeRoute === 'home' ||
      (activeTab === 'profile' && activeRoute === 'profile.edit') ||
      (activeTab === 'jobs' && !!selectedJob) ? (
        <View style={[styles.contentContainer, {flex: 1}]}>
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

      <View style={styles.bottomTabBar}>
        {bottomTabs.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => {
              setActiveTab(tab.key);
              if (tab.key === 'home') {
                setActiveRoute('home');
              }
              if (tab.key === 'jobs') {
                setActiveRoute('jobs.available');
              }
              if (tab.key === 'tracking') {
                setActiveRoute('tracking.active');
              }
              if (tab.key === 'profile') {
                setActiveRoute('profile.edit');
              }
            }}
            style={styles.bottomTabButton}>
            <Text style={styles.bottomTabIcon}>{tab.icon}</Text>
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

    </SafeAreaView>
  );
}

function EmptyState({title}: {title: string}) {
  return <Text style={styles.emptyText}>{title}</Text>;
}

function HeroCard({
  rightLabel,
  subtitle,
  title,
}: {
  rightLabel: string;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.heroPill}>
        <Text style={styles.heroPillText}>{rightLabel}</Text>
      </View>
    </View>
  );
}

function MetricCard({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
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

function Chip({label}: {label: string}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function renderNotifications(notifications: NotificationSummary[]) {
  if (!notifications.length) {
    return <EmptyState title="No notifications found." />;
  }

  return notifications.map(notification => (
    <View key={notification.notificationId} style={styles.listCard}>
      <Text style={styles.cardEyebrow}>{formatLabel(notification.type)}</Text>
      <Text style={styles.listTitle}>{notification.title}</Text>
      <Text style={styles.listMeta}>{notification.message}</Text>
    </View>
  ));
}

function toAddress(value: unknown) {
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
  return value
    .replace(/[_.]/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

const styles = StyleSheet.create({
  amountText: {
    color: palette.accent,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  authCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 20,
    padding: 24,
  },
  authShell: {
    backgroundColor: palette.nav,
    flex: 1,
    justifyContent: 'center',
  },
  authSubtitle: {
    color: '#C4CDD6',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  authSwitchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  authTitle: {
    color: palette.ink,
    fontSize: 28,
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
  bannerText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
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
  chip: {
    backgroundColor: palette.accentSoft,
    borderRadius: 999,
    marginBottom: 10,
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: palette.nav,
  },
  chipText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: palette.card,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 36,
  },
  emptyText: {
    color: palette.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  header: {
    alignItems: 'center',
    backgroundColor: palette.nav,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerRefresh: {
    backgroundColor: palette.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerRefreshText: {
    color: palette.nav,
    fontSize: 12,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#C4CDD6',
    fontSize: 12,
    marginTop: 2,
  },
  headerTextWrap: {
    flex: 1,
    paddingHorizontal: 14,
  },
  headerTitle: {
    color: palette.card,
    fontSize: 18,
    fontWeight: '900',
  },
  heroCard: {
    backgroundColor: palette.nav,
    borderRadius: 24,
    minHeight: 140,
    overflow: 'hidden',
    padding: 20,
  },
  heroCopy: {
    marginBottom: 18,
  },
  heroPill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPillText: {
    color: palette.nav,
    fontSize: 12,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#C4CDD6',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  heroTitle: {
    color: palette.card,
    fontSize: 26,
    fontWeight: '900',
  },
  hintText: {
    color: palette.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
  },
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
  linkText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  listCard: {
    backgroundColor: '#FCFBF7',
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  listCardSelected: {
    borderColor: palette.accent,
    borderWidth: 2,
  },
  listMeta: {
    color: palette.inkSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  listTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  loaderText: {
    color: palette.inkSoft,
    marginTop: 12,
  },
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  metricCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    minWidth: '47%',
    padding: 16,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricLabel: {
    color: palette.inkSoft,
    fontSize: 12,
    marginTop: 6,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: palette.nav,
    fontSize: 14,
    fontWeight: '900',
  },
  bottomTabBar: {
    backgroundColor: palette.nav,
    flexDirection: 'row',
    height: 70,
    paddingBottom: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
  },
  bottomTabButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  bottomTabLabel: {
    color: '#8A94A0',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  bottomTabLabelActive: {
    color: palette.accent,
  },
  bottomTabIcon: {
    fontSize: 20,
  },
  screen: {
    backgroundColor: palette.bg,
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 80,
  },
  jobsSubNav: {
    flexDirection: 'row',
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  jobsSubTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  jobsSubTabActive: {
    backgroundColor: palette.nav,
  },
  jobsSubTabText: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobsSubTabTextActive: {
    color: palette.accent,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  sectionHint: {
    color: palette.inkSoft,
    fontSize: 13,
    lineHeight: 19,
  },
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
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});

export default DriverApp;
