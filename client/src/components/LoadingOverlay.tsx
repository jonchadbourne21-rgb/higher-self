import { motion } from "framer-motion";

interface LoadingOverlayProps {
  visible: boolean;
}

export default function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      style={{ backgroundColor: "#0B0B0F" }}
    >
      <motion.img
        src="https://d2xsxph8kpxj0f.cloudfront.net/310519663398434536/LQwmD5t86EFFZjkEDkXbgz/mentrove-icon-transparent-XGQUfu4fN7im4fQNKmSvzr.webp"
        alt="Loading"
        className="w-20 h-20 rounded-full object-cover"
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.92, 1.08, 0.92] }}
        transition={{ repeat: Infinity, duration: 2.4 }}
        style={{ filter: "drop-shadow(0 0 24px oklch(0.55 0.18 295 / 0.6))" }}
      />
    </motion.div>
  );
}
