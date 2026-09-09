import React, { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  FileImage,
  SlidersHorizontal,
  Images,
  History,
  Menu,
  X,
  Layers,
  Cpu,
} from 'lucide-react';

interface HeaderProps {
  currentPage?: 'checker' | 'tools';
  onNavigate?: (page: 'checker' | 'tools') => void;
  checkerMode?: 'single' | 'batch';
  onSwitchMode?: (mode: 'single' | 'batch') => void;
  onJumpToHistory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage = 'checker',
  onNavigate,
  checkerMode = 'single',
  onSwitchMode,
  onJumpToHistory,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSelectChecker = () => {
    onNavigate?.('checker');
    onSwitchMode?.('single');
    setIsMobileMenuOpen(false);
  };

  const handleSelectBatch = () => {
    onNavigate?.('checker');
    onSwitchMode?.('batch');
    setIsMobileMenuOpen(false);
  };

  const handleSelectTools = () => {
    onNavigate?.('tools');
    setIsMobileMenuOpen(false);
  };

  const handleSelectHistory = () => {
    if (currentPage !== 'checker') {
      onNavigate?.('checker');
    }
    if (onJumpToHistory) {
      onJumpToHistory();
    } else {
      const el = document.getElementById('analysis-history-section');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      id="app-header"
      className="w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 transition-colors shadow-xs"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          className="flex items-center space-x-3.5 cursor-pointer group"
          onClick={handleSelectChecker}
        >
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
            <ShieldCheck className="w-5 h-5 text-white transition-transform duration-300 group-hover:scale-105" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 id="app-title" className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                <span>Smart Image</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                  Quality Checker
                </span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
                <Sparkles className="w-2.5 h-2.5 mr-1 text-blue-600" />
                Verified
              </span>
            </div>
            <p id="app-subtitle" className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Image clarity, lighting, exposure &amp; multi-page PDF document verification
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-2">
          {onNavigate && (
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                id="nav-quality-checker-btn"
                onClick={handleSelectChecker}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  currentPage === 'checker' && checkerMode === 'single'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Single / PDF</span>
              </button>

              <button
                type="button"
                id="nav-batch-analysis-btn"
                onClick={handleSelectBatch}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  currentPage === 'checker' && checkerMode === 'batch'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Images className="w-3.5 h-3.5 text-indigo-600" />
                <span>Batch Analysis</span>
              </button>

              <button
                type="button"
                id="nav-image-tools-btn"
                onClick={handleSelectTools}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  currentPage === 'tools'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Image Tools</span>
              </button>
            </div>
          )}

          <button
            type="button"
            id="nav-history-btn"
            onClick={handleSelectHistory}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer shadow-2xs"
            title="Jump to Analysis History"
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>History</span>
          </button>
        </div>

        {/* Mobile menu hamburger button */}
        <div className="flex md:hidden items-center space-x-2">
          <button
            type="button"
            id="mobile-nav-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-lg"
        >
          <button
            type="button"
            onClick={handleSelectChecker}
            className={`w-full flex items-center space-x-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              currentPage === 'checker' && checkerMode === 'single'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Smart Quality Checker (Single / PDF)</span>
          </button>

          <button
            type="button"
            onClick={handleSelectBatch}
            className={`w-full flex items-center space-x-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              currentPage === 'checker' && checkerMode === 'batch'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Images className="w-4 h-4 text-indigo-600" />
            <span>Batch Analysis (Up to 20 Images)</span>
          </button>

          <button
            type="button"
            onClick={handleSelectTools}
            className={`w-full flex items-center space-x-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              currentPage === 'tools'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>Image Tools (Resize, Convert, Compress)</span>
          </button>

          <button
            type="button"
            onClick={handleSelectHistory}
            className="w-full flex items-center space-x-2.5 px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <History className="w-4 h-4 text-blue-600" />
            <span>Analysis History</span>
          </button>
        </div>
      )}
    </header>
  );
};


