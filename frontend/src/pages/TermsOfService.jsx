import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const TermsOfService = () => {
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
              <FileText size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-amber-100/65">Legal</p>
              <h1 className="text-4xl font-semibold tracking-[-0.05em]">Terms of Service</h1>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-12 text-white/70 leading-relaxed">
            <section>
              <p className="text-xl text-white/90">
                Last updated: March 29, 2026
              </p>
              <p className="mt-6">
                By using Occium ("we," "us," or "our"), you agree to follow these Terms of Service. If you do not agree to these terms, please stop using our platform immediately.
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">1. Account Use</h2>
              <p>
                You are responsible for keeping your account information secure. You must also follow our community rules and not use Occium for any illegal or harmful activities.
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">2. Third-Party Integrations</h2>
              <p>
                Occium uses third-party services like Google/YouTube APIs to provide integration features. By using these features, you also agree to be bound by the Google Terms of Service:
              </p>
              <ul className="list-disc pl-6 space-y-3">
                <li>YouTube Terms of Service: <a href="https://www.youtube.com/t/terms" className="text-amber-200 hover:underline" target="_blank" rel="noopener noreferrer">https://www.youtube.com/t/terms</a></li>
              </ul>
              <p>
                You must comply with all requirements and policies of the third-party platforms you connect to Occium.
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">3. Platform Rules</h2>
              <p>
                You may not attempt to reverse engineer, disrupt, or bypass security features on Occium. Content uploaded to the platform should only belong to you or be authorized for use by you.
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">4. Changes and Termination</h2>
              <p>
                We reserve the right to modify these Terms of Service at any time. If we make significant changes, we will notify you through the platform. We also reserve the right to suspend or terminate accounts that violate these terms.
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">5. Governing Law</h2>
              <p>
                These terms are governed by the laws of your jurisdiction. If you have any questions, please reach out to us.
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

export default TermsOfService;
