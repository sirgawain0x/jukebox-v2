"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useImageGenerationPrice } from "@/app/hooks/useImageGenerationPrice";
import { cn } from "@/lib/utils";

interface ImageGenerationPriceDisplayProps {
  className?: string;
}

const ImageGenerationPriceDisplay = React.forwardRef<
  HTMLDivElement,
  ImageGenerationPriceDisplayProps
>(({ className, ...props }, ref) => {
  const priceData = useImageGenerationPrice();

  const containerVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 28,
      },
    },
  };

  const priceVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 25,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={cn("w-full max-w-md mx-auto", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      {...props}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-xl">
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"
          animate={{
            background: [
              "linear-gradient(45deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)",
              "linear-gradient(45deg, rgba(236, 72, 153, 0.1) 0%, rgba(59, 130, 246, 0.1) 50%, rgba(147, 51, 234, 0.1) 100%)",
              "linear-gradient(45deg, rgba(147, 51, 234, 0.1) 0%, rgba(236, 72, 153, 0.1) 50%, rgba(59, 130, 246, 0.1) 100%)",
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        <div className="relative p-6 lg:p-8">
          {/* Header */}
          <motion.div
            className="flex items-center justify-between mb-6"
            variants={itemVariants}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
                animate={priceData.isLoading ? { rotate: [0, 360] } : {}}
                transition={{
                  type: "spring" as const,
                  stiffness: 400,
                  damping: 25,
                  rotate: { duration: 1, ease: "easeInOut" },
                }}
              >
                <Zap className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  AI Image Generation
                </h2>
                <p className="text-sm text-slate-300">Current Price</p>
              </div>
            </div>
          </motion.div>

          {/* Price Display */}
          <motion.div className="space-y-4" variants={itemVariants}>
            {/* USD Price */}
            <div className="text-center">
              <motion.div
                className="text-sm text-slate-400 mb-2"
                variants={itemVariants}
              >
                Cost per image
              </motion.div>
              <motion.div
                className="text-4xl lg:text-5xl font-extrabold text-white mb-2"
                variants={priceVariants}
                key={priceData.usdPrice}
              >
                ${priceData.usdPrice.toFixed(2)}
              </motion.div>
            </div>

            {/* ETH Equivalent */}
            <motion.div
              className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              transition={{
                type: "spring" as const,
                stiffness: 400,
                damping: 25,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⟠</span>
                  <span className="font-semibold text-white">ETH</span>
                </div>
                <div className="text-right">
                  <motion.div
                    className="text-xl font-bold text-white"
                    variants={priceVariants}
                    key={priceData.ethPrice}
                  >
                    {priceData.ethPrice}
                  </motion.div>
                  <div className="text-sm text-slate-400">From contract</div>
                </div>
              </div>
            </motion.div>

            {/* Additional Info */}
            <motion.div
              className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/30"
              variants={itemVariants}
            >
              <div className="text-center">
                <div className="text-sm text-slate-400">Network</div>
                <div className="font-semibold text-white">Base</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-400">Last Updated</div>
                <div className="font-semibold text-white">
                  {priceData.lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </motion.div>

            {/* Loading Indicator */}
            <AnimatePresence>
              {priceData.isLoading && (
                <motion.div
                  className="flex items-center justify-center gap-2 py-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <motion.div
                    className="w-2 h-2 bg-blue-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-purple-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-pink-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                  <span className="text-sm text-slate-400 ml-2">
                    Updating price...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Display */}
            {priceData.error && (
              <motion.div
                className="text-sm text-red-400 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {priceData.error}
              </motion.div>
            )}
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
});

ImageGenerationPriceDisplay.displayName = "ImageGenerationPriceDisplay";

export { ImageGenerationPriceDisplay };
