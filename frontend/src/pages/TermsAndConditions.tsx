import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  { id: '1',   label: '1. Definitions' },
  { id: '2',   label: '2. Acceptance, Eligibility, and Account Security' },
  { id: '3',   label: '3. FlexiShift\'s Role – Marketplace Only' },
  { id: '4',   label: '4. Verification, Identity Checks, and Fraud Prevention' },
  { id: '4.1', label: '4.1 Driver Fitness and Legal Eligibility to Drive' },
  { id: '4.2', label: '4.2 Haulier Obligation to Physically Verify Driver Credentials' },
  { id: '5',   label: '5. Job Contract Terms' },
  { id: '5.1', label: '5.1 Loading, Unloading and Goods Verification' },
  { id: '5.2', label: '5.2 Risk Transfer' },
  { id: '5.3', label: '5.3 Rescheduling and Incomplete Jobs' },
  { id: '5.4', label: '5.4 Proof of Delivery and Dispute Evidence' },
  { id: '6',   label: '6. Prohibited and Restricted Goods' },
  { id: '7',   label: '7. Liability Exclusions' },
  { id: '8',   label: '8. Payments, Fees, Tax, and Invoicing' },
  { id: '9',   label: '9. Disputes and Escrow Release' },
  { id: '10',  label: '10. Privacy, GPS Tracking, and Data Processing' },
  { id: '11',  label: '11. Platform Rules' },
  { id: '12',  label: '12. Platform Changes and Service Providers' },
  { id: '13',  label: '13. Intellectual Property' },
  { id: '14',  label: '14. Limitation of Liability, Indemnity, and Termination' },
  { id: '16',  label: '16. General' },
];

const H2: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h2 id={`s-${id}`} className="text-lg font-black text-[#041627] mt-10 mb-3 scroll-mt-24">
    {children}
  </h2>
);

const H3: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h3 id={`s-${id}`} className="text-base font-black text-[#1066b1] mt-7 mb-2 scroll-mt-24">
    {children}
  </h3>
);

const P: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={`text-sm text-slate-600 leading-relaxed mb-3 ${className ?? ''}`}>{children}</p>
);

const Ul: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="list-disc list-outside ml-5 space-y-1.5 mb-4 text-sm text-slate-600 leading-relaxed">
    {children}
  </ul>
);

const Ol: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ol className="list-decimal list-outside ml-5 space-y-1.5 mb-4 text-sm text-slate-600 leading-relaxed">
    {children}
  </ol>
);

const TermsAndConditions: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(`s-${id}`)?.scrollIntoView({ behavior: 'smooth' });
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── Top banner ── */}
      <div className="bg-[#041627] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[#1066b1] text-2xl">local_shipping</span>
              <span className="text-xl font-black tracking-tight">FlexiShift</span>
              <span className="ml-2 rounded-full bg-[#1066b1]/30 border border-[#1066b1]/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#60a5fa]">
                LOGISTICS · RESCHEDULED
              </span>
            </div>
            <p className="text-xs text-slate-400">Terms and Conditions of Use — Version 3.0 · Effective May 2026</p>
            <p className="text-xs text-slate-500 mt-0.5">Applies in: United Kingdom · Norway · Sweden</p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1066b1] px-4 py-2 text-xs font-black text-white hover:bg-[#0e57a0] transition"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to App
          </Link>
        </div>
      </div>

      {/* ── Language note ── */}
      <div className="bg-[#1066b1]/10 border-b border-[#1066b1]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2 flex-wrap">
          <span className="material-symbols-outlined text-[#1066b1] text-base">translate</span>
          <span className="text-xs text-[#1066b1] font-bold">
            Available in Norwegian and Swedish on request &nbsp;·&nbsp; Tilgjengelig på norsk på forespørsel &nbsp;·&nbsp; Tillgänglig på svenska på begäran
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">

        {/* ── Sidebar nav (desktop) ── */}
        <nav className="hidden lg:block w-64 shrink-0 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto">
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">Contents</p>
            <ul className="space-y-0.5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => scrollTo(s.id)}
                    className="w-full text-left rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-[#1066b1]/8 hover:text-[#1066b1] transition-colors"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* ── Mobile nav toggle ── */}
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setMobileNavOpen(p => !p)}
            className="flex items-center gap-1.5 rounded-xl bg-[#041627] px-4 py-2.5 text-xs font-black text-white shadow-xl"
          >
            <span className="material-symbols-outlined text-sm">menu_book</span>
            Contents
          </button>
          {mobileNavOpen && (
            <div className="absolute bottom-12 right-0 w-72 rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 max-h-[60vh] overflow-y-auto">
              <ul className="space-y-0.5">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => scrollTo(s.id)}
                      className="w-full text-left rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-[#1066b1]/8 hover:text-[#1066b1] transition-colors"
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0">

          {/* Preamble */}
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-6 py-4 mb-8">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-xl mt-0.5 shrink-0">gavel</span>
              <p className="text-sm text-amber-800 font-bold leading-relaxed">
                By registering or using the Platform in any capacity, you agree to be legally bound by these Terms. If you do not agree, you must not use the Platform.
              </p>
            </div>
          </div>

          {/* ── Section 1 ── */}
          <H2 id="1">1. Definitions</H2>
          <P>Key terms used in these Terms have the following meanings:</P>
          <Ul>
            <li><strong>"FlexiShift", "we", "us", "our"</strong> – FlexiShift Ltd, operator of the Platform.</li>
            <li><strong>"Platform"</strong> – the FlexiShift logistics marketplace, including the Haulier web app, Driver mobile app, Firm portal, and all supporting software and infrastructure.</li>
            <li><strong>"User"</strong> – any Haulier, Driver, or Firm accessing or using the Platform.</li>
            <li><strong>"Haulier"</strong> – a business or individual posting freight jobs on the Platform.</li>
            <li><strong>"Driver"</strong> – an individual who executes jobs via the Driver mobile application.</li>
            <li><strong>"Firm"</strong> – a transport business managing fleets and Drivers on the Platform.</li>
            <li><strong>"Supplier"</strong> – any verified Driver or Firm eligible to accept jobs.</li>
            <li><strong>"Job"</strong> – a freight task posted by a Haulier, assigned a unique Job Reference ID.</li>
            <li><strong>"Job Contract"</strong> – the binding agreement formed between Haulier and Supplier on booking confirmation, incorporating Section 5 below.</li>
            <li><strong>"Escrow Vault / Payment Facilitation Services"</strong> – the secure payment holding facility managed by the Third-Party Payment Processor.</li>
            <li><strong>"Third-Party Payment Processor"</strong> – the specialist payment provider engaged by FlexiShift to handle all financial transactions.</li>
            <li><strong>"Compliance Track"</strong> – the mandatory three-stage workflow: Load Code Confirmation, Dual Sign-off Handover, and Delivery Proof.</li>
            <li><strong>"Prohibited Goods"</strong> – goods listed in Section 6 that may not be carried via the Platform.</li>
            <li><strong>"Applicable Law"</strong> – the law of the jurisdiction in which the User is established or the Job is performed, as relevant.</li>
            <li><strong>"Carrier"</strong> means any person who contracts to transport goods and assumes responsibility for such transportation.</li>
            <li><strong>"Independent Contractor"</strong> means a Driver, Firm or Haulier acting on their own behalf and not as an employee, worker, agent or representative of FlexiShift.</li>
            <li><strong>"Law Enforcement Authority"</strong> means any police force, customs authority, regulator, transport authority, tax authority, court, tribunal, sanctions authority or governmental agency.</li>
            <li><strong>"Platform Data"</strong> means all GPS records, audit logs, messages, ratings, verification records, photographs, videos, job history and any or all related data.</li>
          </Ul>

          {/* ── Section 2 ── */}
          <H2 id="2">2. Acceptance, Eligibility, and Account Security</H2>
          <P>
            By using the Platform you confirm you are at least 18 years old, have legal capacity to contract, and (if acting on behalf of a company) have authority to bind that entity. You must comply with all Applicable Laws and keep your account credentials confidential. Notify us immediately of any suspected unauthorised access.
          </P>

          {/* ── Section 3 ── */}
          <H2 id="3">3. FlexiShift's Role – Marketplace Only</H2>
          <P>
            FlexiShift is a technology marketplace intermediary only. We are not a haulage company, carrier, transport operator, or employer of any Driver or Supplier. The Job Contract is formed directly between the Haulier and Supplier. FlexiShift is not a party to it, does not direct how Jobs are performed, and makes no guarantee that Jobs will be matched, accepted, or completed.
          </P>
          <P>
            FlexiShift operates a digital marketplace and technology platform only. FlexiShift is not a haulage company, carrier, freight forwarder, transport operator, logistics provider, warehouse operator, custodian of goods, employment business, recruitment agency, worker engager or supplier of transport services.
          </P>
          <P>
            FlexiShift does not employ, engage, supervise, direct, control, manage or monitor Drivers, Firms or Hauliers and exercises no operational control over the performance of any Job.
          </P>
          <P>Drivers, Firms and Hauliers act as independent contractors at all times.</P>
          <P>
            Nothing in these Terms creates any employment relationship, worker relationship, partnership, joint venture, agency relationship, fiduciary relationship or representative relationship between FlexiShift and any User.
          </P>
          <P>
            The Job Contract is formed solely between the Haulier and the Supplier. FlexiShift is not a party to that agreement and assumes no responsibility for its performance.
          </P>

          {/* ── Section 4 ── */}
          <H2 id="4">4. Verification, Identity Checks, and Fraud Prevention</H2>
          <P>All Suppliers must complete mandatory verification before accepting any Job. Required documents include:</P>
          <Ul>
            <li>Driving Licence (Drivers); Vehicle Registration; current Insurance Document.</li>
            <li>Company Registration and Fleet Insurance policy (Firms).</li>
            <li>Any other documentation required by locality.</li>
          </Ul>
          <P>
            FlexiShift may at any time conduct KYC (identity), KYB (business), sanctions screening, anti-fraud, and anti-money-laundering checks. We reserve the right to suspend or terminate accounts without prior notice where a User fails verification, appears on a sanctions list, or where we have reasonable grounds to suspect fraudulent, money-laundering, or criminal activity. We may refer concerns to relevant authorities without notifying the User. Duplicate email registrations are automatically blocked.
          </P>
          <P>
            Verification checks are conducted solely for administrative and fraud-prevention purposes. Verification does not constitute any representation, warranty or certification by FlexiShift regarding a User's identity, competence, fitness, legality, qualifications, experience, insurance coverage, suitability or ongoing compliance. Users must conduct their own independent due diligence and must not rely on any verification conducted by FlexiShift.
          </P>

          <H3 id="4.1">4.1 Driver Fitness and Legal Eligibility to Drive</H3>
          <P>By accepting any Job on the Platform, a Driver confirms, represents and warrants that, at the time of acceptance and throughout the performance of the Job, they:</P>
          <Ol>
            <li>hold a valid driving licence of the correct category for the vehicle, jurisdiction and load type required;</li>
            <li>are not subject to any driving ban, licence revocation, or court order restricting their right to drive;</li>
            <li>have not accumulated penalty points or endorsements or other sanctions that render them legally ineligible or unsuitable to drive under Applicable Law;</li>
            <li>are not disqualified from driving by any regulatory, administrative, or judicial authority in any jurisdiction in which they operate;</li>
            <li>are physically, medically and mentally fit to safely perform the Job and operate the relevant vehicle and equipment;</li>
            <li>possess the experience, skills, qualifications, training, certifications and competence reasonably required to undertake the specific Job accepted;</li>
            <li>hold all specialist licences, certificates, permits and accreditations required for the Job, including but not limited to ADR certification, Driver CPC, forklift, lifting equipment, tanker, abnormal load or any other industry-specific qualification required by law, the Customer or the Haulier; and</li>
            <li>are otherwise suitable and capable of undertaking the Job safely, competently and in compliance with all Applicable Laws, regulations, industry standards and site-specific requirements.</li>
          </Ol>
          <P>
            The Driver acknowledges that they are solely responsible for determining whether they are fit, competent and legally entitled to undertake any Job before accepting it. Acceptance of a Job constitutes the Driver's confirmation that they satisfy all requirements applicable to that Job.
          </P>
          <P>
            The Driver further represents and warrants that they are not under the influence of alcohol, drugs, medication, fatigue, illness or any other condition which may impair their ability to safely perform the Job.
          </P>
          <P>FlexiShift & Haulier reserves the right to suspend any Driver where impairment, safety concerns or regulatory concerns are reasonably suspected.</P>
          <P>
            If at any time a Driver receives penalty points, becomes subject to a driving ban, has their licence revoked, suspended, or impeded in any way, or becomes aware of any legal restriction on their ability to drive, or becomes medically unfit or impaired to perform their job safely, they must:
          </P>
          <Ol>
            <li>immediately notify FlexiShift by contacting support through the Platform;</li>
            <li>update their profile to reflect their unavailability;</li>
            <li>decline any Job or shift offer until their legal eligibility to drive is fully restored; and</li>
            <li>cease performing any affected job.</li>
          </Ol>
          <P>
            A Driver who accepts or continues a Job whilst legally prohibited from driving is in material breach of these Terms and may be immediately suspended, reported to relevant authorities, and held liable for all resulting losses.
          </P>
          <P>
            FlexiShift conducts online verification checks on Driver documents at the point of registration only. Such checks are carried out in good faith using the information and documents submitted by the Driver and do not constitute a guarantee of the Driver's ongoing legal eligibility to drive. The Driver bears sole responsibility for ensuring their continued compliance with all applicable requirements for the selected job whilst using the Platform.
          </P>

          <H3 id="4.2">4.2 Haulier Obligation to Physically Verify Driver Credentials</H3>
          <P>
            FlexiShift performs online document verification at the point of Driver registration only. Such checks are conducted in good faith based on information and documentation provided by the Driver and is not a substitute for physical inspection of a Driver's credentials at the point of engagement. Before permitting any Driver to commence a job, access a site, operate any equipment, take custody of goods or a vehicle, the Haulier (or their authorised representative) is solely responsible for physically inspecting and verifying:
          </P>
          <Ol>
            <li>the Driver's original driving licence, confirming it is valid, in date, and of the correct category for the vehicle and load;</li>
            <li>any specialist certifications required for the specific job (including but not limited to ADR certification for hazardous goods, CPC qualification, forklift or specialist equipment certificates, and any locally required permits);</li>
            <li>the Driver's identity against the licence and Platform profile;</li>
            <li>assessing whether the Driver possesses the experience, competence, training and capability reasonably required to undertake the specific Job safely and effectively;</li>
            <li>satisfying itself that the Driver appears fit for duty and is not visibly impaired, fatigued, intoxicated or otherwise unsuitable to undertake the Job;</li>
            <li>ensuring that all applicable legal, regulatory, contractual, insurance, customer, site and health and safety requirements have been met prior to the commencement of the Job;</li>
            <li>providing any site induction, safety briefing, operating instructions, risk assessments, method statements, personal checks and instructions; and</li>
            <li>refusing access to any Driver whom the Haulier reasonably believes does not meet the requirements of the Job or presents a safety, legal, operational or compliance risk.</li>
          </Ol>
          <P>
            The Haulier acknowledges and agrees that it retains sole responsibility for the operational management, supervision and control of all Drivers engaged through the Platform once they attend the Job location and throughout the performance of the Job.
          </P>
          <P>
            FlexiShift acts solely as a technology platform facilitating introductions between Drivers and Hauliers. FlexiShift does not employ, supervise, direct, manage, assess, monitor or control Drivers during the performance of any Job and has no ability to verify a Driver's ongoing legal entitlement, competence, qualifications, fitness, suitability or conduct at the point of engagement or thereafter.
          </P>
          <P>Accordingly, FlexiShift shall have no liability whatsoever for any loss, damage, injury, delay, regulatory breach, compliance failure, vehicle damage, cargo loss, personal injury, death, fines, penalties, claims or costs arising from:</P>
          <Ol>
            <li>the Haulier's failure to conduct appropriate verification, inspection or suitability assessments;</li>
            <li>the Haulier's decision to engage, permit or continue using a Driver;</li>
            <li>any inaccurate, incomplete or fraudulent information provided by a Driver; or</li>
            <li>any act, omission, negligence, misconduct or breach of law by a Driver.</li>
          </Ol>
          <P>
            The Haulier assumes all risks associated with permitting a Driver to undertake a Job and shall indemnify, defend and hold harmless FlexiShift, its officers, directors, employees and affiliates from and against any claims, actions, losses, liabilities, damages, penalties, costs and expenses (including reasonable legal fees) arising out of or connected with the Haulier's failure to comply with its obligations under this Clause or its engagement of a Driver whom it knew, or ought reasonably to have known, was not suitable for the Job.
          </P>
          <P>
            If a Haulier has any doubt regarding a Driver's identity, qualifications, competence, fitness, legal entitlement or suitability for a Job, the Haulier must refuse the engagement and immediately report its concerns through the Platform before the Job commences.
          </P>
          <P>
            FlexiShift is an introduction and technology platform only. We cannot and do not enforce physical compliance at the point of job handover. FlexiShift accepts no liability whatsoever arising from a Haulier's failure to carry out physical verification of a Driver's credentials before permitting that Driver to operate. The Haulier assumes all risk and liability in respect of any Job commenced without conducting such physical checks.
          </P>
          <P>
            The Haulier shall be deemed the transport operator in operational control of the Job. The Haulier is solely responsible for compliance with all applicable transport legislation, driver hours requirements, tachograph requirements, working time requirements, health and safety obligations, vehicle compliance requirements and customer contractual obligations.
          </P>
          <P className="text-xs italic text-slate-400">
            Verification status displayed on the Platform is for administrative purposes only and should not be relied upon as evidence of competence, fitness, legality, insurance validity, suitability or trustworthiness.
          </P>

          {/* ── Section 5 ── */}
          <H2 id="5">5. Job Contract Terms (Incorporated into Every Booking)</H2>
          <P>
            These terms apply between Haulier and Supplier for every Job unless expressly varied in writing. FlexiShift is not a party to any Job Contract.
          </P>
          <P>
            The Job Contract exists exclusively between the Haulier and Supplier. FlexiShift is not a party to, beneficiary of, guarantor of or administrator of any Job Contract. FlexiShift shall not be responsible for interpreting, enforcing or adjudicating any rights or obligations arising under any Job Contract.
          </P>

          <H3 id="5.1">5.1 Loading, Unloading and Goods Verification</H3>
          <P>
            Unless otherwise agreed: the Haulier's consignor is responsible for loading; the Driver is responsible for unloading. Special equipment requirements (tail-lift, pallet truck, etc.) must be declared at job creation. On collection, the Driver must verify and record quantity, external packaging condition, and any declared special handling. Drivers are not required to open sealed packaging and bear no liability for undeclared contents. Any discrepancy must be recorded in the app at the time of handover.
          </P>

          <H3 id="5.2">5.2 Risk Transfer</H3>
          <P>
            FlexiShift is not responsible for determining, allocating, monitoring or enforcing risk in any goods transported through the Platform. Risk allocation shall be a matter solely between the Haulier and Supplier. Risk in the goods passes to the Supplier on successful Load Code Confirmation and reverts to the Haulier on Haulier approval of Delivery Proof.
          </P>

          <H3 id="5.3">5.3 Rescheduling and Incomplete Jobs</H3>
          <P>
            Rescheduling requires mutual written agreement via the Platform. If a Supplier commences but cannot complete a Job, they must immediately notify the Haulier via the Platform. Payment is determined by the dispute outcome under Section 10. FlexiShift accepts no financial liability for incomplete jobs.
          </P>

          <H3 id="5.4">5.4 Proof of Delivery and Dispute Evidence</H3>
          <P>
            Valid Delivery Proof requires: a clear photograph of goods at the delivery point; recipient digital signature; and Platform-recorded timestamp and geo-location. In any dispute, evidence is assessed in this priority order:
          </P>
          <Ol>
            <li>Compliance Track records;</li>
            <li>GPS/telematics data;</li>
            <li>timestamped app photographs and signatures;</li>
            <li>Platform messaging logs;</li>
            <li>third-party documents;</li>
            <li>witness statements.</li>
          </Ol>
          <P>FlexiShift may share Platform data with insurers, legal representatives, law enforcement, or arbitrators on request.</P>

          {/* ── Section 6 ── */}
          <H2 id="6">6. Prohibited and Restricted Goods</H2>
          <P>
            Posting or transporting Prohibited Goods may result in immediate account suspension and referral to authorities. Suppliers may refuse any load they reasonably suspect to be prohibited, without penalty.
          </P>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 mb-5">
            <p className="text-[11px] font-black uppercase tracking-widest text-red-600 mb-3">6.1 Absolutely Prohibited — No Exceptions</p>
            <Ul>
              <li>Illegal goods, stolen property, or goods involved in any criminal activity.</li>
              <li>Firearms, weapons, ammunition, or explosives (licensed or otherwise).</li>
              <li>Controlled drugs and controlled substances.</li>
              <li>Cash, bearer instruments, or high-value negotiables.</li>
              <li>Goods subject to international sanctions or embargoes.</li>
              <li>Category A/B infectious substances; unauthorised human remains or biological material.</li>
            </Ul>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-5">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-3">6.2 Restricted – Requires Full Pre-Declaration and Supplier Acceptance</p>
            <Ul>
              <li>Hazardous materials (ADR / applicable national regulations): flammable, corrosive, toxic, oxidising, or radioactive.</li>
              <li>Temperature-controlled or cold-chain goods.</li>
              <li>Livestock or live animals.</li>
              <li>Alcohol and tobacco subject to licensing or duty requirements.</li>
              <li>Oversized or overweight loads requiring permits or escort vehicles.</li>
              <li>Waste or environmentally regulated materials.</li>
              <li>High-value or fragile goods with declared value exceeding £10,000 / NOK 130,000 / SEK 140,000 per consignment.</li>
              <li>Pharmaceutical products, controlled-temperature medicines, or medical devices.</li>
            </Ul>
          </div>

          <P>
            The Haulier is solely responsible for accurate goods declaration. FlexiShift does not inspect goods and accepts no liability for any loss, regulatory action, or criminal proceedings arising from undeclared or misdescribed loads.
          </P>
          <P>
            Each User represents and warrants that neither it, its beneficial owners, its employees nor any shipment posted through the Platform is subject to sanctions imposed by the United Kingdom, EEA, European Union, the United States, the United Nations or any applicable sanctions authority.
          </P>

          {/* ── Section 7 ── */}
          <H2 id="7">7. Liability Exclusions – Vehicles, Goods, Theft, and Cybersecurity</H2>

          <H3 id="7.1">7.1 Vehicle Damage</H3>
          <P>
            FlexiShift excludes all liability for loss, damage, or destruction of any vehicle used in connection with a Job, howsoever caused. Every Driver and Firm must maintain valid commercial motor insurance (covering third-party liability, goods in transit, and vehicle damage) at all times. Every Haulier must maintain adequate commercial insurance for their freight activities. FlexiShift may request evidence of insurance at any time; failure to provide it is a material breach of these Terms.
          </P>

          <H3 id="7.2">7.2 Theft, Product Loss, and Driver Misconduct</H3>
          <P>
            FlexiShift excludes all liability for theft, misappropriation, conversion, or misdelivery of goods by any Driver, Firm employee, or sub-contractor. Drivers and Firms are independent contractors; FlexiShift bears no vicarious liability for their conduct. Claims must be directed to the relevant Supplier or their insurer. Hauliers are responsible for maintaining adequate goods-in-transit insurance before handing over any goods.
          </P>
          <P>For the avoidance of doubt, FlexiShift excludes all liability for:</P>
          <Ol>
            <li>theft of, from, or in connection with any consignment, cargo, load, or goods carried in the course of a Job, whether by a Driver, a third party, or otherwise;</li>
            <li>theft of or from any vehicle used in connection with a Job;</li>
            <li>damage to any consignment, cargo, load, or goods, whether caused by mishandling, accident, unsuitable vehicle, inadequate packaging, or any other cause; and</li>
            <li>damage to any vehicle, equipment, or property arising in the course of or in connection with a Job.</li>
          </Ol>
          <P>
            Any claim arising from theft, loss, or damage must be made directly against the Driver, Firm, or their respective insurers.
          </P>

          <H3 id="7.3">7.3 Cybersecurity and Force Majeure</H3>
          <P>
            FlexiShift implements proportionate security measures but does not guarantee the Platform will be free from cyber-attacks, hacking, malware, or data breaches. FlexiShift is not liable for losses arising from third-party cyber-attacks, network failures, or force majeure events (including acts of God, natural disasters, or government action). Because payment data is handled exclusively by the Third-Party Payment Processor, FlexiShift accepts no liability for any compromise of payment information at that level. Users are responsible for securing their own devices and credentials.
          </P>

          <H3 id="7.4">7.4 ETA, Maps, and Route Data</H3>
          <P>
            ETA calculations, GPS tracking, route suggestions, and deviation alerts are tools and estimates only — not guarantees. Map data is sourced from third-party providers. FlexiShift accepts no liability for inaccuracies in matching results, ETA estimates, GPS data, or navigation information. Drivers must comply with road signs and traffic law regardless of any in-app route suggestion.
          </P>

          <H3 id="7.5">7.5 Consequential Losses</H3>
          <P>
            FlexiShift shall not be liable for any loss of profit, loss of revenue, loss of business opportunity, loss of contract, loss of goodwill, loss of anticipated savings, supply chain disruption, business interruption, reputational damage or consequential loss. FlexiShift shall have no obligation to investigate theft, recover goods, locate individuals, enforce claims or participate in any recovery actions.
          </P>

          {/* ── Section 8 ── */}
          <H2 id="8">8. Payments, Fees, Tax, and Invoicing</H2>
          <P>
            All transactions are processed exclusively by the Third-Party Payment Processor. FlexiShift does not store or handle payment card or banking credentials. Payment Facilitation Services are locked on booking and released to the Supplier upon Haulier approval of Delivery Proof.
          </P>
          <P>
            Platform commission and service fees are as published in the Platform fee schedule (updated from time to time with reasonable notice) and are quoted exclusive of applicable sales tax.
          </P>
          <P>
            <strong>Platform fees are payable, and non-refundable, as soon as a trip or shift has started</strong>, regardless of any disputes or the outcome.
          </P>
          <P>
            Sales tax applies as follows: VAT (UK), MVA/merverdiavgift (Norway), and MOMS/mervärdesskatt (Sweden), each at the prevailing rate in the applicable jurisdiction.
          </P>
          <P>
            Each User is solely responsible for their own tax compliance, including registration, reporting, and payment of applicable taxes on income earned or services received through the Platform.
          </P>
          <P>
            Automated invoices generated by the Platform are provided for informational convenience only. FlexiShift does not act as a VAT agent, tax agent, or fiscal representative for any User.
          </P>
          <P>
            Platform commission is non-refundable on cancellations once transit has commenced and on disputed jobs where FlexiShift is not at fault.
          </P>
          <P>
            Chargebacks or payment reversals initiated by a Haulier (other than those caused by FlexiShift error) are the Haulier's sole responsibility. FlexiShift may recover chargeback amounts via set-off against future escrow releases. Abuse of the chargeback process may result in account suspension.
          </P>
          <P>
            Each Driver and Haulier is solely responsible for registering for, collecting, reporting, and remitting VAT (or equivalent sales tax, including MVA in Norway and MOMS in Sweden) in their applicable jurisdiction. FlexiShift does not collect, remit, or account for VAT on behalf of any Driver or Haulier, and makes no representation as to any User's VAT obligations. Users must take independent tax advice if they are uncertain of their VAT registration or reporting requirements.
          </P>
          <P>
            All Drivers and Hauliers must be legally registered to operate as required by the laws and regulations of their applicable jurisdiction. Drivers operating in Sweden must hold a valid F-skatt certificate if self-employed.
          </P>
          <P>
            All payment services are provided by the Third-Party Payment Processor. FlexiShift does not provide regulated payment services, escrow services, banking services or money transmission services. FlexiShift shall have no liability for processor failure, processor insolvency, delayed payments, chargebacks, fraud, payment reversals or processor errors.
          </P>

          {/* ── Section 9 ── */}
          <H2 id="9">9. Disputes and Escrow Release</H2>
          <P>
            FlexiShift has no obligation to investigate, mediate, arbitrate, adjudicate or resolve disputes between Users. Any assistance provided by FlexiShift is voluntary, discretionary and provided solely as a customer service convenience. FlexiShift does not bear responsibility for handling disputes. This must be addressed through appropriate legal channels. A corresponding rating of the experience must be given via the platform.
          </P>
          <P>FlexiShift may deduct outstanding platform fees, commission, or cancellation charges from escrow before release where applicable.</P>
          <P>FlexiShift accepts no financial liability in connection with any dispute between Users. FlexiShift's involvement is an administrative convenience only and does not constitute a legal or arbitral award.</P>
          <P>Unresolved disputes may be referred to court, independent arbitration, the relevant insurer, or the Third-Party Payment Processor's own procedure. FlexiShift will provide access to Platform evidence records on receipt of a valid legal request.</P>

          {/* ── Section 10 ── */}
          <H2 id="10">10. Privacy, GPS Tracking, and Data Processing</H2>
          <P>
            FlexiShift processes personal data in accordance with its Privacy Policy (available on the Platform and incorporated by reference). By using the Platform, Users consent to data processing as described therein.
          </P>

          <H3 id="10.1">10.1 Data Controller Status</H3>
          <P>FlexiShift, Drivers, Firms and Hauliers act as independent data controllers in relation to personal data processed for their own business purposes unless otherwise required by law.</P>

          <H3 id="10.2">10.2 Driver Data Sharing</H3>
          <P>Drivers expressly authorise FlexiShift to share relevant information with the relevant Haulier, including identity information, licence status, qualifications, certifications, vehicle information, ratings, GPS location and compliance records necessary for performance of the Job.</P>

          <H3 id="10.3">10.3 Law Enforcement and Fraud Prevention</H3>
          <P>FlexiShift may monitor, preserve, use and disclose any User information, Platform Data, identity records, communications, GPS records, verification documents, transaction records, photographs, videos and compliance information where FlexiShift reasonably considers such disclosure necessary to:</P>
          <Ol>
            <li>comply with legal obligations;</li>
            <li>respond to requests from courts, regulators or law enforcement authorities;</li>
            <li>investigate suspected fraud, theft, criminal activity, money laundering, sanctions breaches or threats to safety;</li>
            <li>protect FlexiShift, Users or third parties;</li>
            <li>establish, exercise or defend legal claims.</li>
          </Ol>
          <P>FlexiShift may disclose information to police, customs authorities, transport regulators, insurers, tax authorities, courts, legal advisers, affected Users and other relevant third parties. FlexiShift shall have no liability for disclosures made in good faith pursuant to this clause.</P>

          <H3 id="10.4">10.4 Retention</H3>
          <P>Data may be retained for as long as reasonably necessary for legal, regulatory, operational, fraud-prevention, insurance, dispute resolution and compliance purposes, at the sole discretion of FlexiShift.</P>

          <H3 id="10.5">10.5 Live & Other Data</H3>
          <P>Drivers consent to real-time GPS location tracking (polling every 10–15 seconds) during active Jobs. Location data is essential and mandatory to be shared with the relevant Haulier and Firm in real time and may be retained as per section 10.4 for dispute and compliance purposes.</P>
          <P>GPS data may be shared with insurers, law enforcement, or arbitrators on request.</P>
          <P>Verification documents, delivery photographs, digital signatures, and compliance data are stored securely and retained as per section 10.4.</P>
          <P>Job data may be shared with the Third-Party Payment Processor (fraud prevention), insurers (claims handling), regulatory authorities (legal requirement), and in anonymised form for Platform analytics.</P>
          <P>Drivers must not disable GPS or location services during an active Job. Deliberate disabling may result in account action.</P>
          <P>Users may exercise their data rights (access, correction, deletion, portability, objection) as set out in the Privacy Policy and in accordance with Applicable Law.</P>
          <P>Driver and GPS data is required to function the platform and do necessary pre-checks to authorise drivers and make them available for work.</P>

          {/* ── Section 11 ── */}
          <H2 id="11">11. Platform Rules – Ratings, Reviews, and the Driver App</H2>

          <H3 id="11.1">11.1 Ratings and Reviews</H3>
          <P>One rating per completed Job per counterparty. Ratings must be honest and based on genuine experience of that specific Job.</P>
          <P>Reviews must not be defamatory, abusive, discriminatory, fake, manipulated, or incentivised.</P>
          <P>FlexiShift may remove or decline to publish any review at its discretion and accepts no liability for inaccurate reviews.</P>
          <P>Ratings feed the Smart Matching Engine and affect Supplier visibility, job eligibility, and continued Platform access. Accounts falling below acceptable rating thresholds may be suspended.</P>
          <P>Reviews, ratings and user-generated content remain the responsibility of the author. Users grant FlexiShift a worldwide, royalty-free, perpetual licence to use, display, analyse and publish ratings, reviews and feedback.</P>

          <H3 id="11.2">11.2 Driver App – Device and Safe Use</H3>
          <P>The Driver app requires: GPS/location (always-on during active Jobs); camera; push notifications; and storage. Disabling required permissions during a Job may impair functionality and constitute a breach.</P>
          <P>Drivers must not interact with the app in a manner that is unsafe or unlawful while driving. All active in-app interactions during transit must be completed only when the vehicle is safely stationary.</P>
          <P>Drivers are responsible for ensuring their device is charged and connected throughout a Job. FlexiShift accepts no liability for failures caused by device issues, battery, or poor connectivity.</P>
          <P>Software updates must be installed promptly. FlexiShift accepts no liability for errors arising from outdated app versions.</P>
          <P>Where the app is distributed through an app store, that store's terms apply in addition to these Terms and take precedence in respect of app distribution only.</P>

          <H3 id="11.3">11.3 Direct Engagement and Circumvention</H3>
          <P>FlexiShift operates as a marketplace platform and derives revenue from introducing Drivers, Firms and Hauliers and facilitating Job Contracts between them.</P>
          <P>Nothing in these Terms restricts any Driver, Firm or Haulier from providing or receiving services through other platforms, customers or business relationships. Drivers and Firms remain free to determine when, where and for whom they provide services and may use competing platforms at any time.</P>
          <P>
            However, where a Driver or Firm is introduced to a Haulier through the Platform, the Haulier shall not knowingly circumvent the Platform by directly engaging that Driver or Firm for substantially similar services outside the Platform for a period of <strong>twelve (12) weeks</strong> following the most recent Job, unless the Haulier has obtained FlexiShift's prior written consent or paid any applicable Direct Engagement Fee.
          </P>
          <P>FlexiShift may monitor Platform activity to identify suspected fee avoidance or circumvention and may suspend accounts, recover unpaid fees or take reasonable action to protect its legitimate business interests.</P>
          <P>Drivers or Firms are free to determine whether, when, where and how often they accept Jobs and may provide services through competing platforms or directly to customers.</P>

          {/* ── Section 12 ── */}
          <H2 id="12">12. Platform Changes and Service Providers</H2>
          <P>
            FlexiShift reserves the right at any time to modify, enhance, discontinue, or replace any feature or functionality; change or terminate any third-party service provider (including the Third-Party Payment Processor); and update pricing or commission structures with reasonable notice. FlexiShift shall not be liable for any loss arising from such changes. Material changes to these Terms will be notified by email or in-platform notification; continued use constitutes acceptance.
          </P>
          <P>FlexiShift may suspend, restrict or discontinue the Platform or any feature at any time and for any reason without liability.</P>

          {/* ── Section 13 ── */}
          <H2 id="13">13. Intellectual Property</H2>
          <P>
            All intellectual property in the Platform (software, design, algorithms, branding, trademarks, and content) is owned by or licensed to AI Planning Ltd UK. Users receive a limited, non-exclusive, non-transferable licence to use the Platform for its intended purpose only. Users may not copy, reverse-engineer, modify, or distribute any Platform element without prior written consent.
          </P>
          <P>All platform algorithms, machine learning models, scoring systems, analytics outputs, performance metrics, derived data and platform intelligence belong exclusively to FlexiShift.</P>

          {/* ── Section 14 ── */}
          <H2 id="14">14. Limitation of Liability, Indemnity, and Termination</H2>

          <H3 id="14.1">14.1 Limitation of Liability</H3>
          <P>
            To the fullest extent permitted by Applicable Law, FlexiShift's aggregate liability to any User is capped to the lesser of the total platform fees paid by that User in the three months preceding the relevant claim or <strong>£1,000 (One thousand GBP only)</strong>. FlexiShift is not liable for indirect, consequential, incidental, special, or punitive loss, including loss of profit, revenue, data, or goodwill. This limitation applies regardless of the cause of action whether in contract, tort (including negligence), statutory duty, misrepresentation or otherwise. Nothing herein limits liability for death or personal injury caused by FlexiShift's negligence, fraud, or any other head of liability that cannot be excluded under Applicable Law.
          </P>

          <H3 id="14.2">14.2 User Indemnity</H3>
          <P>Each User indemnifies FlexiShift, its directors, officers, and affiliates against all claims, losses, penalties, and costs (including legal fees) arising from:</P>
          <Ul>
            <li>breach of these Terms;</li>
            <li>violation of Applicable Law;</li>
            <li>acts or omissions in connection with any Job;</li>
            <li>third-party claims for goods lost, stolen, or damaged in connection with a Job;</li>
            <li>failure to maintain adequate insurance;</li>
            <li>posting or transporting Prohibited Goods;</li>
            <li>employment claims; worker status claims; tax claims; VAT claims; customs claims; sanctions claims; regulatory claims; cargo claims; data protection claims; and third-party claims arising from use of the Platform.</li>
          </Ul>

          <H3 id="14.3">14.3 Suspension and Termination</H3>
          <P>FlexiShift may suspend or terminate any account without prior notice for: breach of these Terms; false or misleading information; unlawful or harmful conduct; lapsed insurance or verification documents; failure to satisfy KYC/KYB/sanctions checks; or as required by law or court order. Outstanding escrow funds will be handled in accordance with the relevant Job status and the Third-Party Payment Processor's procedures.</P>

          <H3 id="14.4">14.4 Disclaimer of Warranties</H3>
          <P>To the fullest extent permitted by Applicable Law, the Platform and all services are provided on an <strong>"as is"</strong>, <strong>"as available"</strong> and <strong>"with all faults"</strong> basis.</P>
          <P>FlexiShift makes no representation, warranty, undertaking or guarantee regarding:</P>
          <Ol>
            <li>the availability, accessibility, uninterrupted operation, security, reliability, performance or error-free operation of the Platform;</li>
            <li>the suitability, competence, qualifications, experience, identity, fitness, legality, trustworthiness, insurance coverage, financial standing, creditworthiness, licensing status or regulatory compliance of any Driver, Firm, Haulier or other User;</li>
            <li>the completion, performance, quality, legality, safety, timeliness or outcome of any Job;</li>
            <li>the availability, quantity, frequency or value of Jobs available through the Platform;</li>
            <li>any earnings, income, revenue, utilisation levels, business opportunities or commercial benefits that may be generated through use of the Platform;</li>
            <li>the accuracy, completeness, reliability or suitability of any ratings, reviews, recommendations, matching results, rankings, scores, compliance indicators, verification status, GPS data, route information, ETA estimates, photographs, communications or other information displayed through the Platform;</li>
            <li>the validity, adequacy, scope, enforceability or continuing effectiveness of any licence, certification, permit, qualification, registration, insurance policy or other document uploaded by any User;</li>
            <li>the legality, condition, quality, ownership, description, packaging, suitability or fitness for purpose of any goods transported through the platform;</li>
            <li>the compatibility of the Platform with any hardware, software, mobile device, operating system or third-party service;</li>
            <li>the absence of viruses, malware, cyber-attacks, unauthorised access attempts or other harmful components; or</li>
            <li>the actions, omissions, negligence, misconduct, fraud, criminal conduct or breach of law by any User.</li>
          </Ol>
          <P>
            Each User acknowledges and agrees that they are solely responsible for conducting their own due diligence and independent assessment before entering into any Job Contract, engaging with another User, releasing goods, accepting goods, making payments or relying upon any information obtained through the Platform.
          </P>

          {/* ── Section 16 ── */}
          <H2 id="16">16. General</H2>
          <div className="space-y-3">
            {[
              { label: 'Entire Agreement', text: 'These Terms constitute the entire agreement between FlexiShift and each User regarding use of the Platform.' },
              { label: 'Severability', text: 'Invalid or unenforceable provisions will be modified to the minimum extent necessary; remaining provisions remain in full force.' },
              { label: 'Waiver', text: 'Failure to enforce any provision is not a waiver of the right to enforce it in future.' },
              { label: 'Assignment', text: 'FlexiShift may assign its rights and obligations to any successor entity. Users may not assign without prior written consent.' },
              { label: 'Language', text: 'These Terms are issued in English. Norwegian and Swedish translations are available on request. In the event of conflict, the English version prevails except where Applicable Law requires otherwise.' },
              { label: 'Notices', text: 'Formal notices to FlexiShift should be sent to the contact address published on the Platform.' },
              { label: 'Class Action Waiver', text: 'Users agree to bring claims solely in their individual capacity and not as part of any class action, representative action, collective action or similar proceeding to the fullest extent permitted by law.' },
              { label: 'Insurance', text: 'Drivers, Firms and Hauliers shall maintain all insurance required by law and industry practice, including motor insurance, goods-in-transit insurance, public liability insurance and any other insurance required for the services provided. FlexiShift does not verify the adequacy of insurance and accepts no liability arising from inadequate or lapsed insurance coverage.' },
              { label: 'Cooperation with Authorities', text: 'Users acknowledge that FlexiShift may cooperate fully with police, customs authorities, regulators, transport authorities, tax authorities, courts and governmental agencies and may provide information without prior notice where permitted or required by law. FlexiShift has no obligation to investigate criminal conduct, recover assets, locate individuals or participate in legal proceedings.' },
              { label: 'Governing Law', text: 'These Terms shall be governed by and construed in accordance with the laws of England and Wales. The courts of England and Wales shall have exclusive jurisdiction over all disputes arising out of or relating to these Terms, the Platform or any Job.' },
            ].map(({ label, text }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-xs font-black text-[#041627] mb-1">{label}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          {/* ── Footer agreement ── */}
          <div className="mt-12 rounded-2xl bg-[#041627] px-6 py-6 text-center">
            <span className="material-symbols-outlined text-[#1066b1] text-3xl mb-2 block">verified</span>
            <p className="text-sm font-bold text-white leading-relaxed mb-1">
              By registering for or continuing to use the FlexiShift Platform, you confirm that you have read, understood, and agree to be bound by these Terms and Conditions in their entirety.
            </p>
            <p className="text-xs text-slate-400 mt-3">FlexiShift Ltd · Registered in England and Wales</p>
            <p className="text-xs text-slate-500">Version 3.0 — May 2026 · UK · Norway · Sweden</p>
          </div>

        </main>
      </div>
    </div>
  );
};

export default TermsAndConditions;
