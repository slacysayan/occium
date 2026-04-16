import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const Section = ({ title, children }) => (
  <section className="space-y-4">
    <h2 className="text-2xl font-semibold text-white">{title}</h2>
    {children}
  </section>
);

const PrivacyPolicy = () => (
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
            <Shield size={24} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-amber-100/65">Legal</p>
            <h1 className="text-4xl font-semibold tracking-[-0.05em]">Privacy Policy</h1>
          </div>
        </div>

        <div className="space-y-12 text-white/70 leading-relaxed">
          <section>
            <p className="text-lg text-white/90">Last updated: April 16, 2026</p>
            <p className="mt-4">Occium, operated by Antigravity AI, is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights.</p>
          </section>

          <Section title="1. Information We Collect">
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Account data</strong>: Name, email, and profile picture from Google or LinkedIn OAuth login.</li>
              <li><strong className="text-white">OAuth tokens</strong>: Access and refresh tokens for YouTube and LinkedIn, stored in our database, used solely to perform actions you authorize.</li>
              <li><strong className="text-white">Content data</strong>: Post titles, descriptions, tags, and scheduled dates you create in Occium.</li>
              <li><strong className="text-white">Usage data</strong>: Anonymous analytics via Vercel Analytics (no PII).</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Data">
            <ul className="list-disc pl-6 space-y-2">
              <li>Authenticate you and maintain your session</li>
              <li>Upload videos to your YouTube channel on your behalf</li>
              <li>Post content to your LinkedIn profile on your behalf</li>
              <li>Fetch YouTube video metadata for the Composer</li>
              <li>Generate AI-assisted LinkedIn post drafts via Google Gemini</li>
            </ul>
            <p className="mt-3">We do not use your data for advertising, profiling, or any purpose beyond providing the Service.</p>
          </Section>

          <Section title="3. Google and YouTube API Data">
            <p>Occium's use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-amber-200 hover:underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements. We only request scopes necessary to upload videos and read channel metadata. We do not share Google data with third parties except as required to provide the Service. You can revoke access at any time via <a href="https://myaccount.google.com/permissions" className="text-amber-200 hover:underline" target="_blank" rel="noopener noreferrer">Google Account Permissions</a>.</p>
          </Section>

          <Section title="4. LinkedIn API Data">
            <p>We use the LinkedIn API solely to post content you create in Occium to your LinkedIn profile. We store your LinkedIn access token and profile URN only to perform these actions. We do not access your connections, messages, or any other LinkedIn data.</p>
          </Section>

          <Section title="5. Data Storage and Security">
            <p>Your data is stored in a Neon PostgreSQL database (US East region). All data in transit uses HTTPS. We do not store video files — they are streamed directly to YouTube during upload.</p>
          </Section>

          <Section title="6. Data Sharing">
            <p>We do not sell your data. We share data only with: Google/YouTube (to upload and fetch metadata), LinkedIn (to post content), Google Gemini (only video title/description for AI drafts), Vercel (frontend hosting + anonymous analytics), and Railway/DigitalOcean (backend hosting).</p>
          </Section>

          <Section title="7. Your Rights">
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Access</strong>: Request a copy of your data</li>
              <li><strong className="text-white">Deletion</strong>: Delete your account from Settings — all data removed within 30 days</li>
              <li><strong className="text-white">Revoke OAuth</strong>: Disconnect YouTube or LinkedIn from the Accounts page at any time</li>
            </ul>
          </Section>

          <Section title="8. Cookies">
            <p>Occium uses a single session cookie (<code className="text-amber-200">occium.sid</code>) to maintain your login state. We do not use third-party tracking cookies.</p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>Occium is not directed at children under 13. We do not knowingly collect data from children under 13. Contact <a href="mailto:support@occium.app" className="text-amber-200 hover:underline">support@occium.app</a> if you believe a child has provided us data.</p>
          </Section>

          <Section title="10. Contact">
            <p>For privacy questions or data requests: <a href="mailto:support@occium.app" className="text-amber-200 hover:underline">support@occium.app</a></p>
          </Section>
        </div>
      </motion.div>
    </main>

    <footer className="border-t border-white/5 bg-black/20 py-12">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-white/40">© 2026 Occium / Antigravity AI. All rights reserved.</p>
        <div className="flex gap-6 text-sm text-white/40">
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <a href="mailto:support@occium.app" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  </div>
);

export default PrivacyPolicy;
