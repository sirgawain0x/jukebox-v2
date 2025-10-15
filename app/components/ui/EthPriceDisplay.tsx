"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Zap, TrendingUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface PriceData {
  usdPrice: number;
  ethPrice: string;
  lastUpdated: Date;
  change24h: number;
}

interface EthPriceDisplayProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onPriceUpdate?: (price: PriceData) => void;
}

const EthPriceDisplay = React.forwardRef<HTMLDivElement, EthPriceDisplayProps>(
  (
    { className, autoRefresh = true, refreshInterval = 30000, onPriceUpdate },
    ref
  ) => {
    const [priceData, setPriceData] = useState<PriceData>({
      usdPrice: 0.05,
      ethPrice: "0.000008547",
      lastUpdated: new Date(),
      change24h: 2.4,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    // Simulate fetching ETH price from contract
    const fetchEthPrice = useCallback(async () => {
      setIsLoading(true);
      setIsAnimating(true);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock price calculation: 2 cents / current ETH price
      const mockEthPrice = 2340 + (Math.random() - 0.5) * 100; // Simulate ETH price fluctuation
      const ethAmount = (0.05 / mockEthPrice).toFixed(9);
      const change = (Math.random() - 0.5) * 10; // Random change between -5% and +5%

      const newPriceData: PriceData = {
        usdPrice: 0.05,
        ethPrice: ethAmount,
        lastUpdated: new Date(),
        change24h: change,
      };

      setPriceData(newPriceData);
      if (onPriceUpdate) {
        onPriceUpdate(newPriceData);
      }

      setIsLoading(false);
      setTimeout(() => setIsAnimating(false), 500);
    }, [onPriceUpdate]);

    // Auto-refresh functionality
    useEffect(() => {
      fetchEthPrice();

      if (autoRefresh) {
        const interval = setInterval(fetchEthPrice, refreshInterval);
        return () => clearInterval(interval);
      }
    }, [autoRefresh, refreshInterval, fetchEthPrice]);

    const containerVariants: Variants = {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 30,
          staggerChildren: 0.1,
        },
      },
    };

    const itemVariants: Variants = {
      hidden: { opacity: 0, x: -20 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 28,
        },
      },
    };

    const priceVariants: Variants = {
      hidden: { scale: 0.8, opacity: 0 },
      visible: {
        scale: 1,
        opacity: 1,
        transition: {
          type: "spring",
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

          <div className="relative p-4 lg:p-6">
            {/* Header */}
            <motion.div
              className="flex items-center justify-between mb-4"
              variants={itemVariants}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  animate={isAnimating ? { rotate: [0, 360] } : {}}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    rotate: { duration: 1, ease: "easeInOut" },
                  }}
                >
                  <Zap className="w-4 h-4 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    AI Image Generation
                  </h2>
                  <p className="text-xs text-slate-300">Current ETH Price</p>
                </div>
              </div>

              <motion.button
                className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchEthPrice}
                disabled={isLoading}
              >
                <RefreshCw
                  className={cn(
                    "w-5 h-5 text-slate-300",
                    isLoading && "animate-spin"
                  )}
                />
              </motion.button>
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
                  className="text-3xl lg:text-4xl font-extrabold text-white mb-2"
                  variants={priceVariants}
                  key={priceData.usdPrice}
                >
                  ${priceData.usdPrice.toFixed(2)}
                </motion.div>
                <Badge
                  variant={priceData.change24h >= 0 ? "default" : "destructive"}
                  className="text-xs"
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {priceData.change24h >= 0 ? "+" : ""}
                  {priceData.change24h.toFixed(1)}%
                </Badge>
              </div>

              {/* ETH Equivalent */}
              <motion.div
                className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30"
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⟠</span>
                    <span className="font-semibold text-white">ETH</span>
                  </div>
                  <div className="text-right">
                    <motion.div
                      className="text-lg font-bold text-white"
                      variants={priceVariants}
                      key={priceData.ethPrice}
                    >
                      {priceData.ethPrice}
                    </motion.div>
                    <div className="text-xs text-slate-400">From contract</div>
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
                {isLoading && (
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
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0.2,
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-pink-500 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0.4,
                      }}
                    />
                    <span className="text-sm text-slate-400 ml-2">
                      Updating price...
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    );
  }
);

EthPriceDisplay.displayName = "EthPriceDisplay";

export default EthPriceDisplay;
