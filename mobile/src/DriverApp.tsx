import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {setApiAccessToken} from './api/client';
import {driverApi} from './api/driverApi';
import {bottomTabs, drawerItems} from './navigation/driverNavigation';
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
  email: 'john@example.com',
  password: 'Driver@1234',
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
  const [session, setSession] = useState<DriverSession | null>(null);
  const [activeTab, setActiveTab] = useState<DriverTabKey>('home');
  const [activeRoute, setActiveRoute] = useState<DrawerRouteKey>('home');
  const [drawerVisible, setDrawerVisible] = useState(false);
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
    phone: '',
    vehicleModel: '',
    vehicleNumber: '',
    vehicleType: '',
    vehicleYear: '',
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
    const jobs = (availableData.jobs as Array<Record<string, unknown>>) ?? [];
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
      phone: String(nextProfile.phone ?? ''),
      vehicleModel: String(nextProfile.profileData?.vehicleModel ?? ''),
      vehicleNumber: String(nextProfile.profileData?.vehicleNumber ?? ''),
      vehicleType: String(nextProfile.profileData?.vehicleType ?? ''),
      vehicleYear: String(nextProfile.profileData?.vehicleYear ?? ''),
    });
    setRatings(ratingData ? cast<RatingSummary>(ratingData) : null);
    setNotifications(
      ((notificationData.notifications ?? []) as NotificationSummary[]) || [],
    );
  }, [session?.userId]);

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
        await loadJobs();
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

  const homeCards = useMemo(
    () => [
      {
        label: 'Today Earnings',
        value:
          dashboard?.todaySummary?.currency === 'INR'
            ? `Rs ${dashboard?.todaySummary?.todayEarnings ?? 0}`
            : String(dashboard?.todaySummary?.todayEarnings ?? 0),
      },
      {
        label: 'Jobs Completed',
        value: String(dashboard?.todaySummary?.jobsCompleted ?? 0),
      },
      {
        label: 'Upcoming Jobs',
        value: String(dashboard?.upcomingJobs ?? 0),
      },
      {
        label: 'Unread Alerts',
        value: String(dashboard?.unreadNotifications ?? 0),
      },
    ],
    [dashboard],
  );

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
    setDrawerVisible(false);
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
      setDrawerVisible(false);
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
      await driverApi.profile.update(profileForm);
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
        <View style={styles.authCard}>
          <Text style={styles.brandOverline}>FreightFlex Driver</Text>
          <Text style={styles.authTitle}>{modeTitle}</Text>
          <Text style={styles.authSubtitle}>
            Mobile driver access to jobs, compliance, tracking, earnings,
            documents, and profile operations.
          </Text>
          {authInfo ? <Text style={styles.successText}>{authInfo}</Text> : null}
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

          {authMode === 'login' ? (
            <>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={email =>
                  setLoginForm(current => ({...current, email}))
                }
                placeholder="Email"
                placeholderTextColor="#8A94A0"
                style={styles.input}
                value={loginForm.email}
              />
              <TextInput
                onChangeText={password =>
                  setLoginForm(current => ({...current, password}))
                }
                placeholder="Password"
                placeholderTextColor="#8A94A0"
                secureTextEntry
                style={styles.input}
                value={loginForm.password}
              />
              <Pressable onPress={handleLogin} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {authLoading ? 'Signing In...' : 'Sign In'}
                </Text>
              </Pressable>
            </>
          ) : null}

          {authMode === 'register' ? (
            <>
              <TextInput
                onChangeText={name =>
                  setRegisterForm(current => ({...current, name}))
                }
                placeholder="Full name"
                placeholderTextColor="#8A94A0"
                style={styles.input}
                value={registerForm.name}
              />
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={email =>
                  setRegisterForm(current => ({...current, email}))
                }
                placeholder="Email"
                placeholderTextColor="#8A94A0"
                style={styles.input}
                value={registerForm.email}
              />
              <TextInput
                keyboardType="phone-pad"
                onChangeText={phone =>
                  setRegisterForm(current => ({...current, phone}))
                }
                placeholder="Phone"
                placeholderTextColor="#8A94A0"
                style={styles.input}
                value={registerForm.phone}
              />
              <TextInput
                onChangeText={password =>
                  setRegisterForm(current => ({...current, password}))
                }
                placeholder="Password"
                placeholderTextColor="#8A94A0"
                secureTextEntry
                style={styles.input}
                value={registerForm.password}
              />
              <Pressable onPress={handleRegister} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {authLoading ? 'Registering...' : 'Register'}
                </Text>
              </Pressable>
            </>
          ) : null}

          {authMode === 'verify' ? (
            <>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={email =>
                  setVerifyForm(current => ({...current, email}))
                }
                placeholder="Email"
                placeholderTextColor="#8A94A0"
                style={styles.input}
                value={verifyForm.email}
              />
              <TextInput
                keyboardType="number-pad"
                onChangeText={otp =>
                  setVerifyForm(current => ({...current, otp}))
                }
                placeholder="OTP"
                placeholderTextColor="#8A94A0"
                style={styles.input}
                value={verifyForm.otp}
              />
              <Pressable onPress={handleVerify} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {authLoading ? 'Verifying...' : 'Verify Email'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleResendOtp}
                style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Resend OTP</Text>
              </Pressable>
            </>
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
        <>
          <HeroCard
            title={`Hello, ${dashboard?.name ?? session?.name ?? 'Driver'}`}
            subtitle={
              dashboard?.activeJob
                ? `Active trip ${dashboard.activeJob.jobReference}`
                : 'No active trip assigned right now'
            }
            rightLabel={
              dashboard?.isVerified ? 'Verified Driver' : 'Pending Verification'
            }
          />
          <View style={styles.metricGrid}>
            {homeCards.map(card => (
              <MetricCard
                key={card.label}
                label={card.label}
                value={card.value}
              />
            ))}
          </View>
          <SectionCard title="Active Job">
            {dashboard?.activeJob ? (
              <>
                <Text style={styles.sectionValue}>
                  {dashboard.activeJob.jobReference}
                </Text>
                <Text style={styles.sectionText}>
                  {dashboard.activeJob.pickupLocation} to{' '}
                  {dashboard.activeJob.dropLocation}
                </Text>
                <Text style={styles.sectionHint}>
                  Compliance step:{' '}
                  {dashboard.activeJob.currentComplianceStep ?? 'n/a'}
                </Text>
              </>
            ) : (
              <EmptyState title="No active job" />
            )}
          </SectionCard>
          <SectionCard title="Quick Actions">
            {(
              dashboard?.activeJob?.quickActions ?? [
                'start_navigation',
                'upload_delivery_proof',
                'update_status',
              ]
            ).map(action => (
              <Chip key={action} label={formatLabel(action)} />
            ))}
          </SectionCard>
        </>
      );
    }

    if (activeTab === 'jobs' || activeRoute.startsWith('jobs.')) {
      return (
        <>
          <SectionCard title="Available Jobs">
            {renderList(availableJobs, 'No available jobs right now', true)}
          </SectionCard>
          <SectionCard title="Job Detail">
            {selectedJobDetails ? (
              <>
                <Text style={styles.sectionValue}>
                  {String(selectedJobDetails.jobReference ?? 'Unknown job')}
                </Text>
                <Text style={styles.sectionText}>
                  {toAddress(selectedJobDetails.pickupLocation)} to{' '}
                  {toAddress(selectedJobDetails.dropLocation)}
                </Text>
                <Text style={styles.sectionText}>
                  Goods: {String(selectedJobDetails.goodsType ?? 'N/A')}
                </Text>
                <Text style={styles.sectionHint}>
                  Date: {String(selectedJobDetails.jobDate ?? 'N/A')} | Vehicle:{' '}
                  {String(selectedJobDetails.vehicleTypeRequired ?? 'N/A')}
                </Text>
              </>
            ) : (
              <EmptyState title="Select a job to view details." />
            )}
          </SectionCard>
          <SectionCard title="Submit Quote">
            <TextInput
              keyboardType="numeric"
              onChangeText={quoteAmount =>
                setQuoteForm(current => ({...current, quoteAmount}))
              }
              placeholder="Quote amount"
              placeholderTextColor="#8A94A0"
              style={styles.input}
              value={quoteForm.quoteAmount}
            />
            <TextInput
              autoCapitalize="characters"
              onChangeText={currency =>
                setQuoteForm(current => ({...current, currency}))
              }
              placeholder="Currency"
              placeholderTextColor="#8A94A0"
              style={styles.input}
              value={quoteForm.currency}
            />
            <TextInput
              multiline
              onChangeText={notes =>
                setQuoteForm(current => ({...current, notes}))
              }
              placeholder="Notes"
              placeholderTextColor="#8A94A0"
              style={[styles.input, styles.textArea]}
              value={quoteForm.notes}
            />
            <Pressable onPress={handleQuoteSubmit} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {actionLoading ? 'Submitting...' : 'Submit Quote'}
              </Text>
            </Pressable>
          </SectionCard>
          <SectionCard title="Upcoming Jobs">
            {renderList(upcomingJobs, 'No upcoming jobs')}
          </SectionCard>
          <SectionCard title="Job History">
            {renderList(jobHistory, 'No completed jobs found')}
          </SectionCard>
        </>
      );
    }

    if (activeTab === 'tracking' || activeRoute.startsWith('tracking.')) {
      return (
        <>
          <HeroCard
            title="Active Trip Map"
            subtitle={
              dashboard?.activeJob
                ? `${dashboard.activeJob.pickupLocation} to ${dashboard.activeJob.dropLocation}`
                : 'No live trip'
            }
            rightLabel={dashboard?.activeJob?.status ?? 'Idle'}
          />
          <SectionCard title="ETA & Route">
            {trackingEta ? (
              <>
                <Text style={styles.sectionValue}>
                  {String(trackingEta.estimatedDuration ?? 'Unknown duration')}
                </Text>
                <Text style={styles.sectionText}>
                  ETA: {String(trackingEta.estimatedArrival ?? 'Unknown')}
                </Text>
                <Text style={styles.sectionHint}>
                  Distance remaining:{' '}
                  {String(trackingEta.distanceRemaining ?? 'N/A')}
                </Text>
              </>
            ) : (
              <EmptyState title="Tracking starts once an active trip is live." />
            )}
          </SectionCard>
          <SectionCard title="Compliance Status">
            {complianceStatus ? (
              <>
                <Text style={styles.sectionValue}>
                  {String(complianceStatus.overallStatus ?? 'in_progress')}
                </Text>
                <Text style={styles.sectionText}>
                  Trip status: {String(complianceStatus.tripStatus ?? 'N/A')}
                </Text>
                <Text style={styles.sectionHint}>
                  Job: {String(complianceStatus.jobReference ?? 'Active')}
                </Text>
              </>
            ) : (
              <EmptyState title="Open a live job to view compliance steps." />
            )}
          </SectionCard>
        </>
      );
    }

    if (activeTab === 'profile' && activeRoute === 'profile.edit') {
      return (
        <>
          <HeroCard
            title={profile?.name ?? session?.name ?? 'Driver'}
            subtitle={profile?.email ?? session?.email ?? ''}
            rightLabel={profile?.role ?? 'driver'}
          />
          <SectionCard title="Edit Profile">
            <TextInput
              keyboardType="phone-pad"
              onChangeText={phone =>
                setProfileForm(current => ({...current, phone}))
              }
              placeholder="Phone"
              placeholderTextColor="#8A94A0"
              style={styles.input}
              value={profileForm.phone}
            />
            <TextInput
              onChangeText={vehicleType =>
                setProfileForm(current => ({...current, vehicleType}))
              }
              placeholder="Vehicle type"
              placeholderTextColor="#8A94A0"
              style={styles.input}
              value={profileForm.vehicleType}
            />
            <TextInput
              onChangeText={vehicleNumber =>
                setProfileForm(current => ({...current, vehicleNumber}))
              }
              placeholder="Vehicle number"
              placeholderTextColor="#8A94A0"
              style={styles.input}
              value={profileForm.vehicleNumber}
            />
            <TextInput
              onChangeText={vehicleModel =>
                setProfileForm(current => ({...current, vehicleModel}))
              }
              placeholder="Vehicle model"
              placeholderTextColor="#8A94A0"
              style={styles.input}
              value={profileForm.vehicleModel}
            />
            <TextInput
              keyboardType="number-pad"
              onChangeText={vehicleYear =>
                setProfileForm(current => ({...current, vehicleYear}))
              }
              placeholder="Vehicle year"
              placeholderTextColor="#8A94A0"
              style={styles.input}
              value={profileForm.vehicleYear}
            />
            <Pressable onPress={handleProfileSave} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {actionLoading ? 'Saving...' : 'Save Profile'}
              </Text>
            </Pressable>
          </SectionCard>
          <SectionCard title="Notifications">
            {renderNotifications(notifications)}
          </SectionCard>
        </>
      );
    }

    switch (activeRoute) {
      case 'documents.upload':
      case 'documents.status':
        return (
          <>
            <SectionCard title="My Documents">
              {documents.length ? (
                documents.map(doc => (
                  <View key={doc.documentId} style={styles.listCard}>
                    <Text style={styles.cardEyebrow}>{doc.status}</Text>
                    <Text style={styles.listTitle}>
                      {formatLabel(doc.documentType)}
                    </Text>
                    <Text style={styles.listMeta}>
                      Expiry: {doc.expiryDate ?? 'N/A'}
                    </Text>
                    {doc.rejectionReason ? (
                      <Text style={styles.errorText}>
                        {doc.rejectionReason}
                      </Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <EmptyState title="No documents uploaded yet" />
              )}
            </SectionCard>
            <SectionCard title="Verification Status">
              <Text style={styles.sectionText}>
                {verificationStatus?.message
                  ? String(verificationStatus.message)
                  : 'Document verification data loaded from API.'}
              </Text>
            </SectionCard>
          </>
        );
      case 'availability.set':
      case 'availability.toggle':
        return (
          <>
            <SectionCard title="Availability Schedule">
              <Text style={styles.sectionHint}>Select working days</Text>
              <View style={styles.chipWrap}>
                {availabilityDays.map(day => (
                  <Pressable
                    key={day}
                    onPress={() => toggleAvailabilityDay(day)}
                    style={[
                      styles.chip,
                      availabilityForm.availableDays.includes(day)
                        ? styles.chipActive
                        : null,
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        availabilityForm.availableDays.includes(day)
                          ? styles.chipTextActive
                          : null,
                      ]}>
                      {formatLabel(day)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                onChangeText={startTime =>
                  setAvailabilityForm(current => ({...current, startTime}))
                }
                placeholder="Start time"
                placeholderTextColor="#8A94A0"
                style={styles.input}
                value={availabilityForm.startTime}
              />
              <TextInput
                onChangeText={endTime =>
                  setAvailabilityForm(current => ({...current, endTime}))
                }
                placeholder="End time"
                placeholderTextColor="#8A94A0"
                style={styles.input}
                value={availabilityForm.endTime}
              />
              <TextInput
                onChangeText={timezone =>
                  setAvailabilityForm(current => ({...current, timezone}))
                }
                placeholder="Timezone"
                placeholderTextColor="#8A94A0"
                style={styles.input}
                value={availabilityForm.timezone}
              />
              <Pressable
                onPress={handleAvailabilitySave}
                style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {actionLoading ? 'Saving...' : 'Save Availability'}
                </Text>
              </Pressable>
            </SectionCard>
            <SectionCard title="Toggle Availability">
              <View style={styles.switchRow}>
                <Text style={styles.sectionText}>Available for jobs</Text>
                <Switch
                  onValueChange={isAvailable =>
                    setAvailabilityForm(current => ({...current, isAvailable}))
                  }
                  thumbColor={palette.card}
                  trackColor={{false: '#C9C0AE', true: palette.success}}
                  value={availabilityForm.isAvailable}
                />
              </View>
              {!availabilityForm.isAvailable ? (
                <TextInput
                  onChangeText={reason =>
                    setAvailabilityForm(current => ({...current, reason}))
                  }
                  placeholder="Reason"
                  placeholderTextColor="#8A94A0"
                  style={styles.input}
                  value={availabilityForm.reason}
                />
              ) : null}
              <Pressable
                onPress={handleAvailabilityToggle}
                style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {actionLoading ? 'Updating...' : 'Update Availability Status'}
                </Text>
              </Pressable>
            </SectionCard>
          </>
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
        return (
          <SectionCard title="My Invoices">
            {renderList(invoices, 'No invoices available')}
          </SectionCard>
        );
      case 'notifications.all':
        return (
          <SectionCard title="All Notifications">
            <Pressable
              onPress={handleMarkAllNotificationsRead}
              style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Mark All Read</Text>
            </Pressable>
            {renderNotifications(notifications)}
          </SectionCard>
        );
      case 'ratings.received':
      case 'ratings.given':
        return (
          <SectionCard title="Ratings and Reviews">
            {ratings ? (
              <>
                <Text style={styles.sectionValue}>
                  {String(ratings.averageRating ?? 0)} stars
                </Text>
                <Text style={styles.sectionText}>
                  Total ratings: {String(ratings.totalRatings ?? 0)}
                </Text>
                <Text style={styles.sectionHint}>
                  Trend: {ratings.recentTrend ?? 'stable'}
                </Text>
              </>
            ) : (
              <EmptyState title="No ratings found." />
            )}
          </SectionCard>
        );
      case 'profile.password':
        return (
          <SectionCard title="Change Password">
            <TextInput
              onChangeText={currentPassword =>
                setPasswordForm(current => ({...current, currentPassword}))
              }
              placeholder="Current password"
              placeholderTextColor="#8A94A0"
              secureTextEntry
              style={styles.input}
              value={passwordForm.currentPassword}
            />
            <TextInput
              onChangeText={newPassword =>
                setPasswordForm(current => ({...current, newPassword}))
              }
              placeholder="New password"
              placeholderTextColor="#8A94A0"
              secureTextEntry
              style={styles.input}
              value={passwordForm.newPassword}
            />
            <TextInput
              onChangeText={confirmPassword =>
                setPasswordForm(current => ({...current, confirmPassword}))
              }
              placeholder="Confirm password"
              placeholderTextColor="#8A94A0"
              secureTextEntry
              style={styles.input}
              value={passwordForm.confirmPassword}
            />
            <Pressable
              onPress={handlePasswordChange}
              style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {actionLoading ? 'Saving...' : 'Change Password'}
              </Text>
            </Pressable>
          </SectionCard>
        );
      case 'profile.preferences':
        return (
          <SectionCard title="Notification Preferences">
            {Object.entries(notificationPrefs.pushNotifications).map(
              ([key, value]) => (
                <View key={`push-${key}`} style={styles.switchRow}>
                  <Text style={styles.sectionText}>
                    Push {formatLabel(key)}
                  </Text>
                  <Switch
                    onValueChange={nextValue =>
                      updateNotificationPreference(
                        'pushNotifications',
                        key,
                        nextValue,
                      )
                    }
                    thumbColor={palette.card}
                    trackColor={{false: '#C9C0AE', true: palette.success}}
                    value={Boolean(value)}
                  />
                </View>
              ),
            )}
            {Object.entries(notificationPrefs.smsNotifications).map(
              ([key, value]) => (
                <View key={`sms-${key}`} style={styles.switchRow}>
                  <Text style={styles.sectionText}>SMS {formatLabel(key)}</Text>
                  <Switch
                    onValueChange={nextValue =>
                      updateNotificationPreference(
                        'smsNotifications',
                        key,
                        nextValue,
                      )
                    }
                    thumbColor={palette.card}
                    trackColor={{false: '#C9C0AE', true: palette.success}}
                    value={Boolean(value)}
                  />
                </View>
              ),
            )}
            <Pressable
              onPress={handleNotificationPreferencesSave}
              style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {actionLoading ? 'Saving...' : 'Save Preferences'}
              </Text>
            </Pressable>
          </SectionCard>
        );
      case 'support.faq':
      case 'support.contact':
        return (
          <SectionCard title="Help and Support">
            <Text style={styles.sectionText}>
              FAQ and support routes are ready. Connect static help content or
              support ticket flows here.
            </Text>
          </SectionCard>
        );
      default:
        return (
          <EmptyState title="Screen scaffolded. Connect the next driver workflow here." />
        );
    }
  };

  if (!session) {
    return renderAuthCard();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={palette.nav} />
      <View style={styles.header}>
        <Pressable
          onPress={() => setDrawerVisible(true)}
          style={styles.headerIconWrap}>
          <Text style={styles.headerIcon}>Menu</Text>
        </Pressable>
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
          <Text style={styles.headerRefreshText}>Refresh</Text>
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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {renderCurrentView()}
      </ScrollView>

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

      <Modal
        animationType="slide"
        transparent
        visible={drawerVisible}
        onRequestClose={() => setDrawerVisible(false)}>
        <Pressable
          onPress={() => setDrawerVisible(false)}
          style={styles.drawerBackdrop}
        />
        <View style={styles.drawerPanel}>
          <View style={styles.drawerProfile}>
            <Text style={styles.drawerName}>{session.name}</Text>
            <Text style={styles.drawerMeta}>
              {String(profile?.rating ?? dashboard?.rating ?? 0)} rating |{' '}
              {String(profile?.totalJobs ?? 0)} jobs completed
            </Text>
            <Text style={styles.drawerBadge}>
              {availabilityForm.isAvailable ? 'Available' : 'Unavailable'}
            </Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {drawerItems.map(item => (
              <View key={item.key} style={styles.drawerSection}>
                <Pressable
                  onPress={() => {
                    if (item.key === 'logout') {
                      handleLogout().catch(() => undefined);
                      return;
                    }
                    onSelectDrawerRoute(item.key as DrawerRouteKey);
                  }}
                  style={styles.drawerItem}>
                  <Text style={styles.drawerItemLabel}>{item.label}</Text>
                </Pressable>
                {item.children?.map(child => (
                  <Pressable
                    key={child.key}
                    onPress={() => onSelectDrawerRoute(child.key)}
                    style={styles.drawerChild}>
                    <Text style={styles.drawerChildText}>{child.label}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
  bottomTabBar: {
    backgroundColor: palette.card,
    borderTopColor: palette.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingBottom: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  bottomTabButton: {
    alignItems: 'center',
    flex: 1,
  },
  bottomTabLabel: {
    color: palette.inkSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  bottomTabLabelActive: {
    color: palette.accent,
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
  drawerBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    flex: 1,
  },
  drawerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.success,
    borderRadius: 999,
    color: palette.card,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  drawerChild: {
    paddingBottom: 12,
    paddingLeft: 14,
  },
  drawerChildText: {
    color: palette.inkSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  drawerItem: {
    paddingBottom: 10,
  },
  drawerItemLabel: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  drawerMeta: {
    color: palette.inkSoft,
    fontSize: 13,
    marginBottom: 12,
  },
  drawerName: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  drawerPanel: {
    backgroundColor: palette.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '78%',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  drawerProfile: {
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    marginBottom: 16,
    paddingBottom: 18,
  },
  drawerSection: {
    borderBottomColor: '#EEE6D6',
    borderBottomWidth: 1,
    marginBottom: 12,
    paddingBottom: 8,
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
  headerIcon: {
    color: palette.card,
    fontSize: 13,
    fontWeight: '800',
  },
  headerIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  screen: {
    backgroundColor: palette.bg,
    flex: 1,
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
