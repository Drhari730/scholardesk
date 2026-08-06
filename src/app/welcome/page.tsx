"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDailyQuote, getGreeting, formatWelcomeDate } from "@/lib/quotes";

export default function WelcomePage() {
  const [mounted, setMounted] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const t1 = setTimeout(() => setShowQuote(true), 1200);
    const t2 = setTimeout(() => setShowCta(true), 2200);
    const clock = setInterval(() => setNow(new Date()), 60000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(clock);
    };
  }, []);

  if (!mounted) return null;

  const quote = getDailyQuote(now);
  const greeting = getGreeting(now);
  const dateStr = formatWelcomeDate(now);
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-teal-950 via-[#0c4a4e] to-slate-950 px-4 py-12">
      <motion.div
        className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1], x: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="relative z-10 w-full max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto mb-6"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image src="/logo.svg" alt="ScholarDesk" width={88} height={88} className="mx-auto rounded-2xl shadow-2xl" priority />
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-sm font-medium uppercase tracking-[0.3em] text-amber-300/80"
        >
          ScholarDesk
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="mt-4 font-serif text-4xl font-semibold text-white sm:text-5xl"
        >
          {greeting}, Dr. Hari Prakash
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-2 text-lg text-teal-200/80"
        >
          Assistant Professor, Public Health · MSRUAS
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-8 inline-flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-8 py-4 backdrop-blur"
        >
          <p className="text-xl font-medium text-white">{dateStr}</p>
          <p className="mt-1 text-3xl font-light tabular-nums text-amber-300">{timeStr}</p>
          <p className="mt-1 text-xs text-teal-300/60">IST · Bengaluru</p>
        </motion.div>

        <AnimatePresence>
          {showQuote && (
            <motion.blockquote
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="mt-10 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 to-transparent px-6 py-5"
            >
              <Sparkles className="mx-auto mb-3 h-5 w-5 text-amber-400" />
              <p className="font-serif text-lg italic leading-relaxed text-teal-50">
                &ldquo;{quote.text}&rdquo;
              </p>
              <footer className="mt-3 text-sm text-amber-300/70">— {quote.author}</footer>
            </motion.blockquote>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCta && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-10 flex flex-col items-center gap-3"
            >
              <Link href="/login">
                <Button size="lg" className="gap-2 bg-amber-500 px-8 text-teal-950 hover:bg-amber-400">
                  Continue to Sign In
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-xs text-teal-400/50">Private academic suite · Authorized access only</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
