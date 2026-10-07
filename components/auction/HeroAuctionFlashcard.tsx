'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gavel,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  Sparkles,
  Award,
  BookOpen,
  Headphones,
  Laptop,
  UserCheck,
  CheckCircle2,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { AuctionItem, INITIAL_AUCTION_ITEMS } from './AuctionSection';

interface HeroAuctionFlashcardProps {
  userBalance: number;
  onOpenBidItem?: (item: AuctionItem) => void;
  items?: AuctionItem[];
}

export const HeroAuctionFlashcard: React.FC<HeroAuctionFlashcardProps> = ({
  userBalance,
  onOpenBidItem,
  items: propItems,
}) => {
  const [items, setItems] = useState<AuctionItem[]>(propItems || INITIAL_AUCTION_ITEMS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!propItems) {
      fetch('/api/auction')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
            setItems(data.items);
          }
        })
        .catch(() => {});
    }
  }, [propItems]);

  const durationMs = 5500;
  const stepMs = 50;
  const currentItem = items[currentIndex] || items[0];

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setDirection('next');
          setCurrentIndex((idx) => (idx + 1) % items.length);
          return 0;
        }
        return prev + (stepMs / durationMs) * 100;
      });
    }, stepMs);

    return () => clearInterval(interval);
  }, [isPaused, items.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection('prev');
    setProgress(0);
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection('next');
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handleGoTo = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(index > currentIndex ? 'next' : 'prev');
    setProgress(0);
    setCurrentIndex(index);
  };

  const handleActionClick = () => {
    if (onOpenBidItem) {
      onOpenBidItem(currentItem);
    } else {
      const el = document.getElementById('auction-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const getItemIcon = (iconType: string) => {
    switch (iconType) {
      case 'keyboard':
        return <Laptop className="w-5 h-5 text-amber-400" />;
      case 'mentorship':
        return <UserCheck className="w-5 h-5 text-amber-400" />;
      case 'swag':
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'cert':
        return <Award className="w-5 h-5 text-amber-400" />;
      case 'book':
        return <BookOpen className="w-5 h-5 text-amber-400" />;
      case 'headphone':
        return <Headphones className="w-5 h-5 text-amber-400" />;
      default:
        return <Gavel className="w-5 h-5 text-amber-400" />;
    }
  };

  const canAfford = userBalance >= currentItem.minNextBid;
  const coinsNeeded = currentItem.minNextBid - userBalance;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative flex flex-col justify-between w-full lg:w-80 xl:w-[340px] shrink-0 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-950/95 p-4 shadow-xl backdrop-blur-md transition-all hover:border-amber-400/50 group overflow-hidden"
    >
      {/* Top subtle timer progress line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800/80 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pt-1 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
            Flashcard Leilão
          </span>
          {isPaused && (
            <span className="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-1 rounded">
              Pausado
            </span>
          )}
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-slate-400 mr-1">
            {currentIndex + 1}/{items.length}
          </span>
          <button
            onClick={handlePrev}
            aria-label="Item anterior"
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition-colors border border-slate-700/60"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Próximo item"
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition-colors border border-slate-700/60"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Flashcard Content with Animation */}
      <div className="relative min-h-[148px] flex flex-col justify-between overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, x: direction === 'next' ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction === 'next' ? -24 : 24 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="space-y-2.5"
          >
            {/* Tag & Value */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <Tag className="w-2.5 h-2.5" />
                {currentItem.category}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {currentItem.marketValue}
              </span>
            </div>

            {/* Title & Icon */}
            <div className="flex items-start gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-inner">
                {getItemIcon(currentItem.iconType)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2">
                  {currentItem.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {currentItem.description}
                </p>
              </div>
            </div>

            {/* Bid Pricing & Availability Badge */}
            <div className="flex items-center justify-between rounded-xl bg-slate-950/70 border border-slate-800/80 px-2.5 py-1.5 text-xs">
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">
                  Lance Atual
                </span>
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {currentItem.currentBid} Coins
                </span>
              </div>

              <div className="text-right">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">
                  Próximo Lance
                </span>
                <span className="font-mono font-bold text-white text-xs">
                  {currentItem.minNextBid} Coins
                </span>
              </div>
            </div>

            {/* Student Condition Indicator */}
            <div>
              {currentItem.isMyHighestBid ? (
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Você está liderando este lote!</span>
                </div>
              ) : canAfford ? (
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Você tem saldo! (Saldo: {userBalance} Coins)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-300 bg-slate-800/50 border border-slate-700/50 px-2 py-1 rounded-lg">
                  <Flame className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Faltam {coinsNeeded} Coins &bull; Ganhe em aula e presença!</span>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer CTA & Dots */}
      <div className="pt-3 mt-1 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {/* Dots */}
        <div className="flex items-center gap-1">
          {items.map((it, idx) => (
            <button
              key={it.id}
              onClick={(e) => handleGoTo(idx, e)}
              aria-label={`Ir para item ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-4 bg-amber-400'
                  : 'w-1.5 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleActionClick}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 px-3 py-1.5 text-[11px] font-black text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <Gavel className="w-3.5 h-3.5" />
          <span>{currentItem.isMyHighestBid ? 'Ver Disputa' : 'Dar Lance'}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
