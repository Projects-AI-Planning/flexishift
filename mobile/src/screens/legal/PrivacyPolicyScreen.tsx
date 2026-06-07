import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing, shadow} from '../../theme';

interface PrivacyPolicyScreenProps {
  onBack?: () => void;
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({onBack}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.operator}>FlexiShift — operated by AI Planning Ltd</Text>
        <Text style={styles.updated}>Last updated: 2 June 2026 · Version 1.0</Text>
        <Text style={styles.intro}>
          This Privacy Policy explains how AI Planning Ltd ("we", "us", "our"), operating the FlexiShift platform, collects, uses, shares, and protects your personal data. It applies to all users of the FlexiShift mobile app, web platform, and associated services, including drivers and hauliers.{'\n\n'}
          AI Planning Ltd is the data controller for all personal data processed through the FlexiShift platform. We are registered in England and Wales. Our contact details are set out in Section 13 of this policy.{'\n\n'}
          We process personal data in accordance with the UK General Data Protection Regulation (UK GDPR), the Data Protection Act 2018, and — for users in Sweden and Norway — the EU General Data Protection Regulation (EU GDPR) as applied in those jurisdictions. For Swedish users, we also comply with the requirements of the Swedish Authority for Privacy Protection (IMY).
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>1. Who This Policy Applies To</Text>
        <Text style={styles.body}>This policy applies to:</Text>
        <Bullet>Drivers who register on the FlexiShift platform to offer their services</Bullet>
        <Bullet>Hauliers who register to post jobs and hire drivers through the platform</Bullet>
        <Bullet>Visitors to our website and anyone who contacts us</Bullet>
        <Bullet>Users in all jurisdictions in which FlexiShift operates, including the United Kingdom, Sweden, and Norway</Bullet>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. What Personal Data We Collect</Text>

        <Text style={styles.subTitle}>2.1 Drivers</Text>
        <Text style={styles.body}>When you register and use FlexiShift as a driver, we collect:</Text>
        <Bullet>Identity data: full name, date of birth, profile photograph</Bullet>
        <Bullet>Contact data: email address, phone number</Bullet>
        <Bullet>Driving licence data: licence number, licence category, expiry date, country of issue</Bullet>
        <Bullet>Vehicle data: registration number, vehicle type, make and model</Bullet>
        <Bullet>Right to work and identity verification documents as required for KYC compliance</Bullet>
        <Bullet>Location data: real-time GPS location during active jobs</Bullet>
        <Bullet>Job data: jobs accepted, completed, and declined; delivery confirmations; proof of delivery images</Bullet>
        <Bullet>Earnings data: amounts earned, payout history, bank account details (held by Stripe on our behalf)</Bullet>
        <Bullet>Ratings and review data: ratings received from hauliers</Bullet>
        <Bullet>Device and technical data: device type, operating system, app version, IP address</Bullet>
        <Bullet>Communications: messages sent through the platform, incident reports submitted</Bullet>

        <Text style={styles.subTitle}>2.2 Hauliers</Text>
        <Text style={styles.body}>When you register and use FlexiShift as a haulier, we collect:</Text>
        <Bullet>Business identity data: company name, company registration number, VAT number</Bullet>
        <Bullet>Contact data: name of account holder, email address, phone number, business address</Bullet>
        <Bullet>Job data: jobs posted, driver preferences, delivery locations, cargo details</Bullet>
        <Bullet>Payment data: card details and billing information (held securely by Stripe)</Bullet>
        <Bullet>Transaction history: payments made, escrow status, invoices</Bullet>
        <Bullet>Ratings and review data: ratings given to and received from drivers</Bullet>
        <Bullet>Device and technical data: browser type, IP address, session data</Bullet>

        <Text style={styles.subTitle}>2.3 Data We Collect Automatically</Text>
        <Text style={styles.body}>
          We automatically collect certain technical data when you use the platform, including log data, usage patterns, crash reports, and cookies or similar tracking technologies as described in our Cookie Policy.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>3. How We Use Your Personal Data</Text>

        <Text style={styles.subTitle}>3.1 To provide and manage the FlexiShift platform</Text>
        <Text style={styles.legalBasis}>Legal basis: Performance of a contract (UK/EU GDPR Article 6(1)(b))</Text>
        <Bullet>Creating and managing your account</Bullet>
        <Bullet>Matching drivers to jobs using our smart matching algorithm</Bullet>
        <Bullet>Processing payments, managing escrow, and releasing funds to drivers</Bullet>
        <Bullet>Enabling in-app communications between drivers and hauliers</Bullet>
        <Bullet>Tracking active jobs and providing delivery confirmation</Bullet>

        <Text style={styles.subTitle}>3.2 To verify your identity and comply with legal obligations</Text>
        <Text style={styles.legalBasis}>Legal basis: Legal obligation (UK/EU GDPR Article 6(1)(c)) and legitimate interests (Article 6(1)(f))</Text>
        <Bullet>Conducting Know Your Customer (KYC) checks via Stripe</Bullet>
        <Bullet>Verifying driving licences and right to work documentation</Bullet>
        <Bullet>Complying with anti-money laundering (AML) obligations</Bullet>
        <Bullet>Complying with tax reporting obligations in the UK, Sweden, and Norway</Bullet>
        <Bullet>Responding to lawful requests from regulatory authorities</Bullet>

        <Text style={styles.subTitle}>3.3 To improve and develop the platform</Text>
        <Text style={styles.legalBasis}>Legal basis: Legitimate interests (UK/EU GDPR Article 6(1)(f))</Text>
        <Bullet>Analysing usage patterns to improve platform performance</Bullet>
        <Bullet>Developing new features based on user behaviour</Bullet>
        <Bullet>Conducting internal research and analytics</Bullet>

        <Text style={styles.subTitle}>3.4 To send you communications</Text>
        <Text style={styles.legalBasis}>Legal basis: Contract performance for service communications; consent or legitimate interests for marketing</Text>
        <Bullet>Job alerts, shift notifications, and payout confirmations</Bullet>
        <Bullet>Platform updates, policy changes, and security alerts</Bullet>
        <Bullet>Promotional communications where you have opted in</Bullet>

        <Text style={styles.subTitle}>3.5 To maintain platform safety and resolve disputes</Text>
        <Text style={styles.legalBasis}>Legal basis: Legitimate interests (UK/EU GDPR Article 6(1)(f))</Text>
        <Bullet>Investigating incidents, complaints, and disputes</Bullet>
        <Bullet>Preventing fraud and misuse of the platform</Bullet>
        <Bullet>Maintaining ratings and review integrity</Bullet>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>4. Location Data</Text>
        <Text style={styles.body}>
          FlexiShift collects real-time GPS location data from drivers during active jobs. This data is used to:
        </Text>
        <Bullet>Display the driver's location to the assigned haulier during an active job</Bullet>
        <Bullet>Verify that pickup and delivery have occurred at the correct locations</Bullet>
        <Bullet>Provide route information and estimated arrival times</Bullet>
        <Bullet>Investigate incidents or disputes relating to a specific job</Bullet>
        <Text style={styles.body}>
          {'\n'}Location tracking is active only when you have an active job assignment. You will be notified in the app when location tracking is active. You may not be able to complete active jobs if you disable location access, as this is necessary for the safe operation of the platform.{'\n\n'}
          We do not track your location outside of active job periods.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>5. Sharing Your Personal Data</Text>
        <Text style={styles.body}>We share personal data only where necessary and with appropriate safeguards in place:</Text>

        <Text style={styles.subTitle}>5.1 With other platform users</Text>
        <Bullet>Drivers' first name, profile photograph, vehicle type, and rating are shared with hauliers when a job match is made</Bullet>
        <Bullet>Hauliers' business name, job details, and rating are shared with drivers when a job is offered</Bullet>

        <Text style={styles.subTitle}>5.2 With service providers</Text>
        <Bullet>Stripe Inc: payment processing, escrow management, and driver KYC verification. Stripe acts as a data processor on our behalf and processes data in accordance with its own privacy policy and applicable data protection law</Bullet>
        <Bullet>Google Maps: for route display and address validation within the app</Bullet>
        <Bullet>Cloud infrastructure providers: for hosting and data storage</Bullet>
        <Bullet>Analytics providers: for platform performance monitoring</Bullet>

        <Text style={styles.subTitle}>5.3 With regulatory and legal authorities</Text>
        <Text style={styles.body}>
          We may share personal data with tax authorities (including HMRC, Skatteverket in Sweden, and Skatteetaten in Norway), law enforcement, or other regulatory bodies where we are legally required to do so.
        </Text>

        <Text style={styles.subTitle}>5.4 In the event of a business transfer</Text>
        <Text style={styles.body}>
          If AI Planning Ltd is acquired, merged, or transfers its business, personal data held on the platform may be transferred as part of that transaction. We will notify affected users in advance where required by law.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>6. International Data Transfers</Text>
        <Text style={styles.body}>
          AI Planning Ltd is based in the United Kingdom. Where we transfer personal data outside the UK or the European Economic Area (EEA), we ensure appropriate safeguards are in place, including:
        </Text>
        <Bullet>UK International Data Transfer Agreements (IDTAs) for transfers from the UK</Bullet>
        <Bullet>EU Standard Contractual Clauses (SCCs) for transfers from Sweden or Norway under EU GDPR</Bullet>
        <Bullet>Reliance on adequacy decisions where applicable</Bullet>
        <Text style={styles.body}>
          {'\n'}Stripe processes data in the United States and maintains appropriate transfer mechanisms including SCCs. Further details are available in Stripe's privacy policy.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>7. Data Retention</Text>
        <Text style={styles.body}>We retain personal data for as long as is necessary for the purposes for which it was collected, subject to the following:</Text>
        <Bullet>Active account data: retained for the duration of your account</Bullet>
        <Bullet>Job and transaction records: retained for 7 years following the transaction to comply with tax and accounting obligations in the UK, Sweden, and Norway</Bullet>
        <Bullet>KYC and identity verification documents: retained for 5 years following the end of the business relationship, in accordance with AML obligations</Bullet>
        <Bullet>Location data from completed jobs: retained for 12 months then deleted</Bullet>
        <Bullet>Incident reports and dispute records: retained for 3 years</Bullet>
        <Bullet>Marketing preferences and consent records: retained until withdrawn plus 2 years</Bullet>
        <Text style={styles.body}>{'\n'}When data is no longer required, it is securely deleted or anonymised.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>8. Your Rights</Text>
        <Text style={styles.body}>Depending on your location and the applicable data protection law, you have the following rights in relation to your personal data:</Text>
        <Bullet>Right of access: to receive a copy of the personal data we hold about you</Bullet>
        <Bullet>Right to rectification: to have inaccurate personal data corrected</Bullet>
        <Bullet>Right to erasure: to request deletion of your personal data in certain circumstances</Bullet>
        <Bullet>Right to restriction: to restrict how we process your data in certain circumstances</Bullet>
        <Bullet>Right to data portability: to receive your data in a structured, machine-readable format</Bullet>
        <Bullet>Right to object: to object to processing based on legitimate interests</Bullet>
        <Bullet>Rights related to automated decision-making: our matching algorithm uses automated processing to suggest job matches; you have the right to request human review of any decision that significantly affects you</Bullet>
        <Text style={styles.body}>
          {'\n'}To exercise any of these rights, please contact us at the details in Section 13. We will respond within one month. We may need to verify your identity before processing your request.{'\n\n'}
          If you are located in Sweden, you may also lodge a complaint with the Swedish Authority for Privacy Protection (IMY) at www.imy.se. If you are located in Norway, you may complain to Datatilsynet at www.datatilsynet.no. UK users may complain to the Information Commissioner's Office (ICO) at www.ico.org.uk.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>9. Automated Decision-Making and Profiling</Text>
        <Text style={styles.body}>
          FlexiShift uses an automated matching algorithm to connect drivers with jobs based on location, vehicle type, availability, and ratings. This automated processing affects which jobs are offered to you and how prominently you appear to hauliers.{'\n\n'}
          We consider this processing to be necessary for the performance of our contract with you. You have the right to request a human review of any matching decision that significantly affects your access to work on the platform. Please contact us to make such a request.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>10. Cookies and Tracking Technologies</Text>
        <Text style={styles.body}>
          The FlexiShift web platform and mobile app use cookies and similar technologies for authentication, security, and analytics purposes. A full description of the cookies we use and how to manage your preferences is available in our Cookie Policy, which forms part of this Privacy Policy.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>11. Children</Text>
        <Text style={styles.body}>
          FlexiShift is not directed at or intended for use by persons under the age of 18. We do not knowingly collect personal data from anyone under 18. If you believe we have inadvertently collected data from a minor, please contact us immediately and we will delete it.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>12. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or for other operational reasons. Where we make material changes, we will notify you by email or through a prominent notice in the app at least 14 days before the changes take effect.{'\n\n'}
          The date at the top of this policy indicates when it was last updated. We encourage you to review this policy periodically.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>13. Contact Us</Text>
        <Text style={styles.body}>
          If you have any questions about this Privacy Policy, wish to exercise your rights, or have a concern about how we handle your data, please contact us:
        </Text>
        <View style={styles.contactBlock}>
          <Text style={styles.contactLine}>AI Planning Ltd</Text>
          <Text style={styles.contactLine}>Trading as: FlexiShift</Text>
          <Text style={styles.contactLine}>Registered in England and Wales</Text>
          <Text style={styles.contactLine}>Email: privacy@flexishift.com</Text>
        </View>
        <Text style={styles.body}>
          {'\n'}For urgent data protection matters, please mark your email: URGENT — DATA PROTECTION{'\n\n'}
          We aim to respond to all privacy enquiries within 5 working days and will action requests within one calendar month as required by UK/EU GDPR.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2026 AI Planning Ltd. All rights reserved.{'\n'}
          FlexiShift is a trading name of AI Planning Ltd.
        </Text>
      </View>
    </ScrollView>
  );
};

const Bullet: React.FC<{children: string}> = ({children}) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bulletDot}>•</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: spacing.xl, paddingBottom: 48},
  backBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingBottom: spacing.sm,
    paddingTop: spacing.lg,
  },
  backArrow: {color: colors.navy, fontSize: 20, fontWeight: '900'},
  backText: {color: colors.navy, fontSize: 15, fontWeight: '800'},
  header: {marginBottom: spacing.xl},
  title: {color: colors.navy, fontSize: 30, fontWeight: '900', marginBottom: 4},
  operator: {color: colors.inkSoft, fontSize: 14, fontWeight: '700', marginBottom: 2},
  updated: {color: colors.inkSoft, fontSize: 12, fontWeight: '600', marginBottom: spacing.md},
  intro: {color: colors.ink, fontSize: 14, lineHeight: 22},
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 3,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  subTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 14,
  },
  legalBasis: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#1066b1',
    borderLeftWidth: 3,
    borderRadius: 4,
    color: '#1e40af',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  body: {color: colors.ink, fontSize: 14, lineHeight: 22},
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletDot: {color: colors.navy, fontSize: 14, lineHeight: 22, fontWeight: '900'},
  bulletText: {color: colors.ink, flex: 1, fontSize: 14, lineHeight: 22},
  contactBlock: {
    backgroundColor: '#F8FAFC',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 12,
    padding: spacing.lg,
  },
  contactLine: {color: colors.ink, fontSize: 14, fontWeight: '700', lineHeight: 24},
  footer: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: spacing.xl,
  },
  footerText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default PrivacyPolicyScreen;
