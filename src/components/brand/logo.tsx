"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function LogoMark({ size = 40, animated = true }: { size?: number; animated?: boolean }) {
  const img = (
    <Image
      src="/logo.svg"
      alt="ScholarDesk"
      width={size}
      height={size}
      className="rounded-xl"
      priority
    />
  );

  if (!animated) return img;

  return (
    <motion.div
      animate={{ rotate: [0, 2, -2, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      whileHover={{ scale: 1.05, rotate: 0 }}
    >
      {img}
    </motion.div>
  );
}
