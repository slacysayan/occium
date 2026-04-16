import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const Section = ({ title, children }) => (
  <section className="space-y-4">
    <h2 className="text-2xl font-semibold text-white">{title}</h2>
    {children}
  </section>
);

const TermsOfService = () => (
  <div className="relative min-h-screen overflow-x-clip text-white bg-[#071119]">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-gradient-to-b from-[#071119]/55 via-[#071119]/25 to-transparent" />
    <div className="pointer-events-none absolute left-1/2 top-[10rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/5 blur-[130px]" />

    <header className="sticky top-0 z-30 px-4 pt-4 md:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-[#091521]/52 px-4 py-3 shadow-[0_18px_55px_rgba(2,8,13,0.22)] backdrop-blur-2xl md:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
            <img src="/branding/occium-mark.webp" alt="Occium" className="h-7 w-7 object-contain" />
          </div>
          <span className="text-xl font-semibold tracking-[-0.055em]">Occium</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/24 hover:text-white">
          <ArrowLeft size={16} /> Back
        </Link>
      </nav>
    </header>

    <main className="relative z-10 mx-auto max-w-4xl px-6 py-20 md:py-32">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center gap-4 mb-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-amber-100/65">Legal</p>
            <h1 className="text-4xl font-semibold tracking-[-0.05em]">Terms of Service</h1>
          </div>
        </div>

        <div className="space-y-12 text-white/70 leading-relaxed">
          <section>
            <p className="text-lg text-white/90">Last updated: April 16, 2026</p>
            <p className="mt-4">These Terms of Service ("Terms") govern your access to and use of Occium ("Service"), operated by Antigravity AI. By using the Service you agree to these Terms. If you do not agree, do not use the Service.</p>
          </section>

          <Section title="1. Eligibility">
            <p>You must be at least 13 years old to use Occium. By using the Service you confirm you meet this requirement and have the legal capacity to enter into these Terms.</p>
          </Section>

          <Section title="2. Account Responsibilities">
            <p>You are responsible for maintaining the confidentiality of your credentials, all activity under your account, and notifying us immediately of any unauthorized use at <a href="mailto:support@occium.app" className="text-amber-200 hover:underline">support@occium.app</a>.</p>
          </Section>

          <Section title="3. Google and YouTube API Services">
            <p>Occium uses the YouTube Data API v3 and Google OAuth 2.0 to connect your YouTube channel and enable video uploads, metadata management, and scheduling. By connecting your Google account you agree to the <a href="https://www.youtube.com/t/terms" className="text-amber-200 hover:underline" target="_blank" rel="noopener noreferrer">YouTube Terms of Service</a> and <a href="https://policies.google.com/privacy" className="text-amber-200 hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>.</p>
            <p className="mt-3">Occium stores your OAuth tokens securely solely to perform actions you explicitly authorize. You can revoke access at any time via <a href="https://myaccount.google.com/permissions" className="text-amber-200 hover:underline" target="_blank" rel="noopener noreferrer">Google Account Permissions</a>.</p>
          </Section>

          <Section title="4. LinkedIn API">
            <p>Occium uses the LinkedIn API to post content to your LinkedIn profile on your behalf. By connecting your LinkedIn account you agree to the <a href="https://www.linkedin.com/legal/user-agreement" className="text-amber-200 hover:underline" target="_blank" rel="noopener noreferrer">LinkedIn User Agreement</a> and <a href="https://www.linkedin.com/legal/privacy-policy" className="text-amber-200 hover:underline" target="_blank" rel="noopener noreferrer">LinkedIn Privacy Policy</a>. You are solely responsible for all content posted through Occium.</p>
          </Section>

          <Section title="5. Acceptable Use">
            <p>You agree not to use Occium to upload content that infringes third-party intellectual property rights, violate YouTube's or LinkedIn's platform policies, reverse engineer or circumvent security measures, spam or harass others, or upload content you do not own or have rights to distribute.</p>
          </Section>

          <Section title="6. Content Ownership">
            <p>You retain full ownership of all content you create or upload through Occium. You grant us a limited, non-exclusive license to process and transmit your content solely to provide the features you request.</p>
          </Section>

          <Section title="7. Service Availability">
            <p>The Service is provided "as is" without warranties of any kind. We are not liable for downtime, data loss, or third-party API failures including YouTube or LinkedIn outages.</p>
          </Section>

          <Section title="8. Termination">
            <p>We may suspend or terminate your account for Terms violations. You may delete your account from Settings at any time, which removes your data from our systems within 30 days.</p>
          </Section>

          <Section title="9. Changes to Terms">
            <p>We may update these Terms from time to time. We will notify you of material changes via the platform. Continued use after changes constitutes acceptance.</p>
          </Section>

          <Section title="10. Contact">
            <p>Questions? Contact us at <a href="mailto:support@occium.app" className="text-amber-200 hover:underline">support@occium.app</a>.</p>
          </Section>
        </div>
      </motion.div>
    </main>

    <footer className="border-t border-white/5 bg-black/20 py-12">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-white/40">© 2026 Occium / Antigravity AI. All rights reserved.</p>
        <div className="flex gap-6 text-sm text-white/40">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <a href="mailto:support@occium.app" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  </div>
);

export default TermsOfService;
