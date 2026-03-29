import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const PrivacyPolicy = () => {
  return (
    <div className="relative min-h-screen overflow-x-clip text-white bg-[#071119]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-gradient-to-b from-[#071119]/55 via-[#071119]/25 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-[10rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/5 blur-[130px]" />

      <header className="sticky top-0 z-30 px-4 pt-4 md:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-[#091521]/52 px-4 py-3 shadow-[0_18px_55px_rgba(2,8,13,0.22)] backdrop-blur-2xl md:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
              <img src="/branding/occium-mark.webp" alt="" className="h-7 w-7 object-contain" />
            </div>
            <span className="text-xl font-semibold tracking-[-0.055em]">Occium</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/24 hover:text-white"
          >
            <ArrowLeft size={16} /> Back to landing
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-20 md:py-32">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white">
              <Shield size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-amber-100/65">Legal</p>
              <h1 className="text-4xl font-semibold tracking-[-0.05em]">Privacy Policy</h1>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-12 text-white/70 leading-relaxed">
            <section>
              <p className="text-xl text-white/90">
                Last updated: March 29, 2026
              </p>
              <p className="mt-6">
                At Occium, we value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">1. Information We Collect</h2>
              <p>
                We collect information that you provide directly to us when you create an account, connect your social media profiles (YouTube, LinkedIn), and use our features. This includes:
              </p>
              <ul className="list-disc pl-6 space-y-3">
                <li>Account Information: Name, email address, and authentication credentials.</li>
                <li>Connected Account Data: Metadata from your YouTube and LinkedIn accounts required for post scheduling and analytics.</li>
                <li>Content Data: Drafts, notes, and media uploaded to the platform for processing.</li>
              </ul>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">2. How We Use Your Information</h2>
              <p>
                We use the collected data to provide, maintain, and improve our services, specifically:
              </p>
              <ul className="list-disc pl-6 space-y-3">
                <li>To enable content scheduling and publishing to authorized platforms.</li>
                <li>To provide AI-assisted drafting and content refinement through our AI Studio.</li>
                <li>To analyze performance metrics and provide channel momentum insights.</li>
                <li>To communicate with you about updates, security alerts, and support.</li>
              </ul>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">3. Data Sharing and Integration</h2>
              <p>
                Occium integrates with third-party APIs (Google/YouTube API Services, LinkedIn API). Your use of these integrations is subject to their respective privacy policies:
              </p>
              <ul className="list-disc pl-6 space-y-3">
                <li>Google Privacy Policy: <a href="http://www.google.com/policies/privacy" className="text-amber-200 hover:underline" target="_blank" rel="noopener noreferrer">http://www.google.com/policies/privacy</a></li>
                <li>LinkedIn Privacy Policy: <a href="https://www.linkedin.com/legal/privacy-policy" className="text-amber-200 hover:underline" target="_blank" rel="noopener noreferrer">https://www.linkedin.com/legal/privacy-policy</a></li>
              </ul>
              <p>
                We do not sell your personal data to third parties.
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">4. Your Rights</h2>
              <p>
                Depending on your location, you may have rights regarding your personal data, including the right to access, correct, or delete your information. You can manage your connected accounts and data through the Occium Settings panel at any time.
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">5. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at support@occium.com.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-white/5 bg-black/20 py-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-white/40">© 2026 Occium. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
