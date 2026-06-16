import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing, shadow} from '../../theme';

interface TermsAndConditionsScreenProps {
  onBack?: () => void;
}

const Section: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Body: React.FC<{children: React.ReactNode}> = ({children}) => (
  <Text style={styles.body}>{children}</Text>
);

const SubSection: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
  <View style={styles.subSection}>
    <Text style={styles.subSectionTitle}>{title}</Text>
    {children}
  </View>
);

const Bullet: React.FC<{children: React.ReactNode}> = ({children}) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bulletDot}>•</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

const TermsAndConditionsScreen: React.FC<TermsAndConditionsScreenProps> = ({onBack}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      ) : null}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.tag}>LOGISTICS · RESCHEDULED</Text>
        <Text style={styles.title}>Terms and Conditions of Use</Text>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLine}>Version 3.0  •  Effective: May 2026</Text>
          <Text style={styles.metaLine}>Applies in: United Kingdom • Norway • Sweden</Text>
          <Text style={styles.metaLine}>Available in Norwegian and Swedish on request</Text>
          <Text style={styles.metaLine}>Tilgjengelig på norsk på forespørsel</Text>
          <Text style={styles.metaLine}>Tillgänglig på svenska på begäran</Text>
        </View>
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>
            By registering or using the Platform in any capacity, you agree to be legally bound by these Terms. If you do not agree, you must not use the Platform.
          </Text>
        </View>
      </View>

      {/* 1. Definitions */}
      <Section title="1. Definitions">
        <Body>Key terms used in these Terms have the following meanings:</Body>
        <View style={styles.definitionList}>
          {[
            ['"FlexiShift", "we", "us", "our"', 'FlexiShift Ltd, operator of the Platform.'],
            ['"Platform"', 'The FlexiShift logistics marketplace, including the Haulier web app, Driver mobile app, Firm portal, and all supporting software and infrastructure.'],
            ['"User"', 'Any Haulier, Driver, or Firm accessing or using the Platform.'],
            ['"Haulier"', 'A business or individual posting freight jobs on the Platform.'],
            ['"Driver"', 'An individual who executes jobs via the Driver mobile application.'],
            ['"Firm"', 'A transport business managing fleets and Drivers on the Platform.'],
            ['"Supplier"', 'Any verified Driver or Firm eligible to accept jobs.'],
            ['"Job"', 'A freight task posted by a Haulier, assigned a unique Job Reference ID.'],
            ['"Job Contract"', 'The binding agreement formed between Haulier and Supplier on booking confirmation, incorporating Section 5 below.'],
            ['"Escrow Vault"', 'The secure payment holding facility managed by the Third-Party Payment Processor.'],
            ['"Third-Party Payment Processor"', 'The specialist payment provider engaged by FlexiShift to handle all financial transactions.'],
            ['"Compliance Track"', 'The mandatory three-stage workflow: Load Code Confirmation, Dual Sign-off Handover, and Delivery Proof.'],
            ['"Prohibited Goods"', 'Goods listed in Section 6 that may not be carried via the Platform.'],
            ['"Applicable Law"', 'The law of the jurisdiction in which the User is established or the Job is performed, as relevant.'],
          ].map(([term, def]) => (
            <View key={term} style={styles.definitionRow}>
              <Text style={styles.definitionTerm}>{term}</Text>
              <Text style={styles.definitionDesc}>{def}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* 2. Acceptance */}
      <Section title="2. Acceptance, Eligibility, and Account Security">
        <Body>
          By using the Platform you confirm you are at least 18 years old, have legal capacity to contract, and (if acting on behalf of a company) have authority to bind that entity. You must comply with all Applicable Laws and keep your account credentials confidential. Notify us immediately of any suspected unauthorised access.
        </Body>
      </Section>

      {/* 3. FlexiShift's Role */}
      <Section title="3. FlexiShift's Role – Marketplace Only">
        <Body>
          FlexiShift is a technology marketplace intermediary only. We are not a haulage company, carrier, transport operator, or employer of any Driver or Supplier. The Job Contract is formed directly between the Haulier and Supplier. FlexiShift is not a party to it, does not direct how Jobs are performed, and makes no guarantee that Jobs will be matched, accepted, or completed.
        </Body>
      </Section>

      {/* 4. Verification */}
      <Section title="4. Verification, Identity Checks, and Fraud Prevention">
        <Body>All Suppliers must complete mandatory verification before accepting any Job. Required documents include:</Body>
        <Bullet>Driving Licence (Drivers); Vehicle Registration; current Insurance Document.</Bullet>
        <Bullet>Company Registration and Fleet Insurance policy (Firms).</Bullet>
        <Bullet>Any other documentation required by locality.</Bullet>
        <Body>
          {'\n'}FlexiShift may at any time conduct KYC (identity), KYB (business), sanctions screening, anti-fraud, and anti-money-laundering checks. We reserve the right to suspend or terminate accounts without prior notice where a User fails verification, appears on a sanctions list, or where we have reasonable grounds to suspect fraudulent, money-laundering, or criminal activity. We may refer concerns to relevant authorities without notifying the User. Duplicate email registrations are automatically blocked.
        </Body>
      </Section>

      {/* 5. Job Contract Terms */}
      <Section title="5. Job Contract Terms (Incorporated into Every Booking)">
        <Body>
          These terms apply between Haulier and Supplier for every Job unless expressly varied in writing. FlexiShift is not a party to any Job Contract.
        </Body>

        <SubSection title="5.1 Loading, Unloading and Goods Verification">
          <Body>
            Unless otherwise agreed: the Haulier's consignor is responsible for loading; the Driver is responsible for unloading. Special equipment requirements (tail-lift, pallet truck, etc.) must be declared at job creation. On collection, the Driver must verify and record quantity, external packaging condition, and any declared special handling. Drivers are not required to open sealed packaging and bear no liability for undeclared contents. Any discrepancy must be recorded in the app at the time of handover.
          </Body>
        </SubSection>

        <SubSection title="5.2 Risk Transfer">
          <Body>
            Risk in the goods passes to the Supplier on successful Load Code Confirmation and reverts to the Haulier on Haulier approval of Delivery Proof.
          </Body>
        </SubSection>

        <SubSection title="5.3 Rescheduling and Incomplete Jobs">
          <Body>
            Rescheduling requires mutual written agreement via the Platform. If a Supplier commences but cannot complete a Job, they must immediately notify the Haulier via the Platform. Payment is determined by the dispute outcome under Section 10. FlexiShift accepts no financial liability for incomplete jobs.
          </Body>
        </SubSection>

        <SubSection title="5.4 Proof of Delivery and Dispute Evidence">
          <Body>
            Valid Delivery Proof requires: a clear photograph of goods at the delivery point; recipient digital signature; and Platform-recorded timestamp and geo-location. In any dispute, evidence is assessed in this priority order:
          </Body>
          <Bullet>(1) Compliance Track records</Bullet>
          <Bullet>(2) GPS/telematics data</Bullet>
          <Bullet>(3) Timestamped app photographs and signatures</Bullet>
          <Bullet>(4) Platform messaging logs</Bullet>
          <Bullet>(5) Third-party documents</Bullet>
          <Bullet>(6) Witness statements</Bullet>
          <Body>{'\n'}FlexiShift may share Platform data with insurers, legal representatives, law enforcement, or arbitrators on request.</Body>
        </SubSection>
      </Section>

      {/* 6. Prohibited Goods */}
      <Section title="6. Prohibited and Restricted Goods">
        <Body>
          Posting or transporting Prohibited Goods may result in immediate account suspension and referral to authorities. Suppliers may refuse any load they reasonably suspect to be prohibited, without penalty.
        </Body>

        <SubSection title="6.1 Absolutely Prohibited (no exceptions)">
          <Bullet>Illegal goods, stolen property, or goods involved in any criminal activity.</Bullet>
          <Bullet>Firearms, weapons, ammunition, or explosives (licensed or otherwise).</Bullet>
          <Bullet>Controlled drugs and controlled substances.</Bullet>
          <Bullet>Cash, bearer instruments, or high-value negotiables.</Bullet>
          <Bullet>Goods subject to international sanctions or embargoes.</Bullet>
          <Bullet>Category A/B infectious substances; unauthorised human remains or biological material.</Bullet>
        </SubSection>

        <SubSection title="6.2 Restricted – Requires Full Pre-Declaration and Supplier Acceptance">
          <Bullet>Hazardous materials (ADR / applicable national regulations): flammable, corrosive, toxic, oxidising, or radioactive.</Bullet>
          <Bullet>Temperature-controlled or cold-chain goods.</Bullet>
          <Bullet>Livestock or live animals.</Bullet>
          <Bullet>Alcohol and tobacco subject to licensing or duty requirements.</Bullet>
          <Bullet>Oversized or overweight loads requiring permits or escort vehicles.</Bullet>
          <Bullet>Waste or environmentally regulated materials.</Bullet>
          <Bullet>High-value or fragile goods with declared value exceeding £10,000 / NOK 130,000 / SEK 140,000 per consignment.</Bullet>
          <Bullet>Pharmaceutical products, controlled-temperature medicines, or medical devices.</Bullet>
        </SubSection>

        <Body>
          {'\n'}The Haulier is solely responsible for accurate goods declaration. FlexiShift does not inspect goods and accepts no liability for any loss, regulatory action, or criminal proceedings arising from undeclared or misdescribed loads.
        </Body>
      </Section>

      {/* 7. Liability */}
      <Section title="7. Liability Exclusions – Vehicles, Goods, Theft, and Cybersecurity">
        <SubSection title="7.1 Vehicle Damage">
          <Body>
            FlexiShift excludes all liability for loss, damage, or destruction of any vehicle used in connection with a Job, howsoever caused. Every Driver and Firm must maintain valid commercial motor insurance (covering third-party liability, goods in transit, and vehicle damage) at all times. Every Haulier must maintain adequate commercial insurance for their freight activities. FlexiShift may request evidence of insurance at any time; failure to provide it is a material breach of these Terms.
          </Body>
        </SubSection>

        <SubSection title="7.2 Theft, Product Loss, and Driver Misconduct">
          <Body>
            FlexiShift excludes all liability for theft, misappropriation, conversion, or misdelivery of goods by any Driver, Firm employee, or sub-contractor. Drivers and Firms are independent contractors; FlexiShift bears no vicarious liability for their conduct. Claims must be directed to the relevant Supplier or their insurer. Hauliers are responsible for maintaining adequate goods-in-transit insurance before handing over any goods.
          </Body>
        </SubSection>

        <SubSection title="7.3 Cybersecurity and Force Majeure">
          <Body>
            FlexiShift implements proportionate security measures but does not guarantee the Platform will be free from cyber-attacks, hacking, malware, or data breaches. FlexiShift is not liable for losses arising from third-party cyber-attacks, network failures, or force majeure events (including acts of God, natural disasters, or government action). Because payment data is handled exclusively by the Third-Party Payment Processor, FlexiShift accepts no liability for any compromise of payment information at that level. Users are responsible for securing their own devices and credentials.
          </Body>
        </SubSection>

        <SubSection title="7.4 ETA, Maps, and Route Data">
          <Body>
            ETA calculations, GPS tracking, route suggestions, and deviation alerts are tools and estimates only — not guarantees. Map data is sourced from third-party providers. FlexiShift accepts no liability for inaccuracies in matching results, ETA estimates, GPS data, or navigation information. Drivers must comply with road signs and traffic law regardless of any in-app route suggestion.
          </Body>
        </SubSection>
      </Section>

      {/* 8. Payments */}
      <Section title="8. Payments, Fees, Tax, and Invoicing">
        <Body>
          All transactions are processed exclusively by the Third-Party Payment Processor. FlexiShift does not store or handle payment card or banking credentials. Accepted payment channels include those published on the Platform (including UPI, credit card, and bank transfer where available). Escrow funds are locked on booking and released to the Supplier upon Haulier approval of Delivery Proof.
        </Body>
        <Body>
          {'\n'}Platform commission and service fees are as published in the Platform fee schedule (updated from time to time with reasonable notice) and are quoted exclusive of applicable sales tax.
        </Body>
        <Body>
          {'\n'}Platform fees are payable, and non-refundable, as soon as a trip or shift has started, regardless of any disputes or the outcome.
        </Body>
        <Body>
          {'\n'}Sales tax applies as follows: VAT (UK), MVA/merverdiavgift (Norway), and MOMS/mervärdesskatt (Sweden), each at the prevailing rate in the applicable jurisdiction.
        </Body>
        <Body>
          {'\n'}Each User is solely responsible for their own tax compliance, including registration, reporting, and payment of applicable taxes on income earned or services received through the Platform.
        </Body>
        <Body>
          {'\n'}Automated invoices generated by the Platform are provided for informational convenience only. FlexiShift does not act as a VAT agent, tax agent, or fiscal representative for any User.
        </Body>
        <Body>
          {'\n'}Platform commission is non-refundable on cancellations once transit has commenced and on disputed jobs where FlexiShift is not at fault.
        </Body>
        <Body>
          {'\n'}Chargebacks or payment reversals initiated by a Haulier (other than those caused by FlexiShift error) are the Haulier's sole responsibility. FlexiShift may recover chargeback amounts via set-off against future escrow releases. Abuse of the chargeback process may result in account suspension.
        </Body>
        <Body>
          {'\n'}FreightFlex fees are invoiced exclusive of Norwegian VAT and users are responsible for their own VAT obligations under local law.
        </Body>
      </Section>

      {/* 9. Disputes */}
      <Section title="9. Disputes and Payment Release">
        <Body>
          FlexiShift does not bear responsibility for handling disputes. This must be addressed through appropriate legal channels. A corresponding rating of the experience must be given via the platform.
        </Body>
        <Body>
          {'\n'}FlexiShift may deduct outstanding platform fees, commission, or cancellation charges from escrow before release where applicable.
        </Body>
        <Body>
          {'\n'}FlexiShift accepts no financial liability in connection with any dispute or errors between Users. FlexiShift's involvement is an administrative convenience only and does not constitute a legal or arbitral award.
        </Body>
        <Body>
          {'\n'}Unresolved disputes may be referred to court, independent arbitration, the relevant insurer, or the Third-Party Payment Processor's own procedure. FlexiShift will provide access to Platform evidence records on receipt of a valid legal request.
        </Body>
      </Section>

      {/* 10. Privacy */}
      <Section title="10. Privacy, GPS Tracking, and Data Processing">
        <Body>
          FlexiShift processes personal data in accordance with its Privacy Policy (available on the Platform and incorporated by reference). By using the Platform, Users consent to data processing as described therein. Key points:
        </Body>
        <Bullet>Drivers consent to real-time GPS location tracking (polling every 10–15 seconds) during active Jobs. Location data is shared with the relevant Haulier and Firm in real time and can be retained for up to 24 months for dispute and compliance purposes.</Bullet>
        <Bullet>GPS data may be shared with insurers, law enforcement, or arbitrators on request.</Bullet>
        <Bullet>Verification documents, delivery photographs, digital signatures, and compliance data are stored securely and can be retained for up to 24 months.</Bullet>
        <Bullet>Job data may be shared with the Third-Party Payment Processor (fraud prevention), insurers (claims handling), regulatory authorities (legal requirement), and in anonymised form for Platform analytics.</Bullet>
        <Bullet>Drivers must not disable GPS or location services during an active Job. Deliberate disabling may result in account action.</Bullet>
        <Bullet>Users may exercise their data rights (access, correction, deletion, portability, objection) as set out in the Privacy Policy and in accordance with Applicable Law.</Bullet>
      </Section>

      {/* 11. Platform Rules */}
      <Section title="11. Platform Rules – Ratings, Reviews, and the Driver App">
        <SubSection title="11.1 Ratings and Reviews">
          <Bullet>One rating per completed Job per counterparty. Ratings must be honest and based on genuine experience of that specific Job.</Bullet>
          <Bullet>Reviews must not be defamatory, abusive, discriminatory, fake, manipulated, or incentivised.</Bullet>
          <Bullet>FlexiShift may remove or decline to publish any review at its discretion and accepts no liability for inaccurate reviews.</Bullet>
          <Bullet>Ratings feed the Smart Matching Engine and affect Supplier visibility, job eligibility, and continued Platform access. Accounts falling below acceptable rating thresholds may be suspended.</Bullet>
        </SubSection>

        <SubSection title="11.2 Driver App – Device and Safe Use">
          <Body>The Driver app requires: GPS/location (always-on during active Jobs); camera; push notifications; and storage. Disabling required permissions during a Job may impair functionality and constitute a breach.</Body>
          <Bullet>Drivers must not interact with the app in a manner that is unsafe or unlawful while driving. All active in-app interactions during transit must be completed only when the vehicle is safely stationary.</Bullet>
          <Bullet>Drivers are responsible for ensuring their device is charged and connected throughout a Job. FlexiShift accepts no liability for failures caused by device issues, battery, or poor connectivity.</Bullet>
          <Bullet>Software updates must be installed promptly. FlexiShift accepts no liability for errors arising from outdated app versions.</Bullet>
          <Bullet>Where the app is distributed through an app store, that store's terms apply in addition to these Terms and take precedence in respect of app distribution only.</Bullet>
        </SubSection>
      </Section>

      {/* 12. Platform Changes */}
      <Section title="12. Platform Changes and Service Providers">
        <Body>
          FlexiShift reserves the right at any time to modify, enhance, discontinue, or replace any feature or functionality; change or terminate any third-party service provider (including the Third-Party Payment Processor); and update pricing or commission structures with reasonable notice. FlexiShift shall not be liable for any loss arising from such changes. Material changes to these Terms will be notified by email or in-platform notification; continued use constitutes acceptance.
        </Body>
      </Section>

      {/* 13. Intellectual Property */}
      <Section title="13. Intellectual Property">
        <Body>
          All intellectual property in the Platform (software, design, algorithms, branding, trademarks, and content) is owned by or licensed to AI Planning Ltd UK. Users receive a limited, non-exclusive, non-transferable licence to use the Platform for its intended purpose only. Users may not copy, reverse-engineer, modify, or distribute any Platform element without prior written consent.
        </Body>
      </Section>

      {/* 14. Limitation of Liability */}
      <Section title="14. Limitation of Liability, Indemnity, and Termination">
        <SubSection title="14.1 Limitation of Liability">
          <Body>
            To the fullest extent permitted by Applicable Law, FlexiShift's aggregate liability to any User is capped at the total platform fees paid by that User in the three months preceding the relevant claim. FlexiShift is not liable for indirect, consequential, incidental, special, or punitive loss, including loss of profit, revenue, data, or goodwill. Nothing herein limits liability for death or personal injury caused by FlexiShift's negligence, fraud, or any other head of liability that cannot be excluded under Applicable Law.
          </Body>
        </SubSection>

        <SubSection title="14.2 User Indemnity">
          <Body>Each User indemnifies FlexiShift, its directors, officers, and affiliates against all claims, losses, penalties, and costs (including legal fees) arising from:</Body>
          <Bullet>Breach of these Terms</Bullet>
          <Bullet>Violation of Applicable Law</Bullet>
          <Bullet>Acts or omissions in connection with any Job</Bullet>
          <Bullet>Third-party claims for goods lost, stolen, or damaged in connection with a Job</Bullet>
          <Bullet>Failure to maintain adequate insurance</Bullet>
          <Bullet>Posting or transporting Prohibited Goods</Bullet>
        </SubSection>

        <SubSection title="14.3 Suspension and Termination">
          <Body>FlexiShift may suspend or terminate any account without prior notice for:</Body>
          <Bullet>Breach of these Terms</Bullet>
          <Bullet>False or misleading information</Bullet>
          <Bullet>Unlawful or harmful conduct</Bullet>
          <Bullet>Lapsed insurance or verification documents</Bullet>
          <Bullet>Failure to satisfy KYC/KYB/sanctions checks</Bullet>
          <Bullet>As required by law or court order</Bullet>
          <Body>{'\n'}Outstanding escrow funds will be handled in accordance with the relevant Job status and the Third-Party Payment Processor's procedures.</Body>
        </SubSection>
      </Section>

      {/* 16. General */}
      <Section title="16. General">
        {[
          ['Entire Agreement', 'These Terms constitute the entire agreement between FlexiShift and each User regarding use of the Platform.'],
          ['Severability', 'Invalid or unenforceable provisions will be modified to the minimum extent necessary; remaining provisions remain in full force.'],
          ['Waiver', 'Failure to enforce any provision is not a waiver of the right to enforce it in future.'],
          ['Assignment', 'FlexiShift may assign its rights and obligations to any successor entity. Users may not assign without prior written consent.'],
          ['Language', 'These Terms are issued in English. Norwegian and Swedish translations are available on request. In the event of conflict, the English version prevails except where Applicable Law requires otherwise.'],
          ['Notices', 'Formal notices to FlexiShift should be sent to the contact address published on the Platform.'],
        ].map(([heading, text]) => (
          <View key={heading} style={styles.generalRow}>
            <Text style={styles.generalHeading}>{heading}:</Text>
            <Text style={styles.generalText}>{text}</Text>
          </View>
        ))}
      </Section>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerAgreement}>
          By registering for or continuing to use the FlexiShift Platform, you confirm that you have read, understood, and agree to be bound by these Terms and Conditions in their entirety.
        </Text>
        <Text style={styles.footerCompany}>FlexiShift Ltd • Registered in England and Wales</Text>
        <Text style={styles.footerVersion}>Version 3.0 — May 2026  •  UK • Norway • Sweden</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: spacing.xl, paddingBottom: 60},

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
  tag: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: colors.navy,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 14,
    lineHeight: 32,
  },
  metaBlock: {
    backgroundColor: '#EAF3FD',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
    gap: 3,
  },
  metaLine: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  noticeBanner: {
    backgroundColor: '#FEF9C3',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FDE047',
    padding: 12,
  },
  noticeText: {
    color: '#854D0E',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: shadow.color,
    shadowOffset: shadow.offset,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    elevation: 2,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  body: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20,
  },

  subSection: {marginTop: 14},
  subSectionTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 5,
  },
  bulletDot: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 1,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
  },

  definitionList: {marginTop: 10, gap: 8},
  definitionRow: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: 10,
    paddingVertical: 2,
  },
  definitionTerm: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  definitionDesc: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 18,
  },

  generalRow: {marginTop: 10},
  generalHeading: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  generalText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
  },

  footer: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  footerAgreement: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  footerCompany: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '800',
  },
  footerVersion: {
    color: colors.inkSoft,
    fontSize: 11,
  },
});

export default TermsAndConditionsScreen;
