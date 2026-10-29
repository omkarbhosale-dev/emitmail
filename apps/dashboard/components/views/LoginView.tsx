"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PaperPlaneTilt,
  User,
  Lock,
  Eye,
  EyeSlash,
  WarningCircle,
  ArrowRight,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";

export function LoginView() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await api.auth.login({
        username: username.trim(),
        password: password.trim(),
      });

      // Redirect to home dashboard
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Login failure:", err);
      const msg = err instanceof Error ? err.message : "Invalid credentials provided";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col lg:flex-row bg-kumo-canvas select-none">
      {/* Global CSS for Animations */}
      <style>{`
        @keyframes pulseMatrix {
          0%, 100% {
            transform: scale(0.92) translateY(0);
            filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.45));
          }
          50% {
            transform: scale(1.08) translateY(-6px);
            filter: drop-shadow(0 0 24px rgba(255, 255, 255, 0.85));
          }
        }
        @keyframes floatHorizon {
          0%, 100% {
            opacity: 0.65;
            transform: scaleX(1);
          }
          50% {
            opacity: 0.95;
            transform: scaleX(1.1);
          }
        }
      `}</style>

      {/* Left Column: Clean Administrator Login Form */}
      <div className="w-full lg:w-[45%] xl:w-[40%] h-full flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-kumo-canvas border-r border-kumo-hairline z-20 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cf-orange flex items-center justify-center text-white shadow-md shadow-cf-orange/20">
            <PaperPlaneTilt size={20} weight="fill" />
          </div>
          <span className="font-bricolage text-xl font-bold tracking-tight text-kumo-strong">
            EmitMail
          </span>
        </div>

        {/* Central Login Card */}
        <div className="my-auto py-8 max-w-sm w-full mx-auto">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-kumo-strong">
              Welcome
            </h1>
            <p className="text-xs sm:text-sm text-kumo-subtle mt-1.5 leading-relaxed">
              Sign in with your administrator credentials to access your email routing control plane.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-5 p-3 rounded-xl bg-kumo-danger-tint border border-kumo-danger/30 text-kumo-danger text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
              <WarningCircle size={16} weight="fill" className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Username / Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-kumo-default">
                Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="off"
                  disabled={isLoading}
                  className="w-full bg-kumo-base border border-kumo-hairline hover:border-kumo-line focus:border-cf-orange text-kumo-strong rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-cf-orange transition-all placeholder:text-kumo-muted"
                />
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-kumo-muted pointer-events-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-kumo-default">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="w-full bg-kumo-base border border-kumo-hairline hover:border-kumo-line focus:border-cf-orange text-kumo-strong rounded-xl pl-9 pr-10 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-cf-orange transition-all placeholder:text-kumo-muted"
                />
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-kumo-muted pointer-events-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-kumo-muted hover:text-kumo-default transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-kumo-base border-kumo-hairline text-cf-orange focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cf-orange"
                />
                <span className="text-xs text-kumo-subtle font-medium">
                  Remember me
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-cf-orange hover:bg-cf-orange-hover text-white text-xs font-semibold shadow-md shadow-cf-orange/20 hover:shadow-cf-orange/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={14} weight="bold" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Empty bottom space for balanced centering */}
        <div className="h-4" />
      </div>

      {/* Right Column: Radiant Cloudflare Orange Canvas with Luminous Dot-Matrix Animation */}
      <div className="hidden lg:flex flex-1 h-full relative overflow-hidden bg-gradient-to-br from-[#FA8B38] via-[#F38020] to-[#E55A00] items-center justify-center select-none">
        {/* 1. Subtle Background Dot-Matrix Overlay Grid Pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255, 255, 255, 0.14) 1.2px, transparent 1.2px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* 2. Bottom Radiant Horizon Illumination Flare */}
        <div
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[130%] h-84 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 100%, rgba(255, 248, 220, 0.95) 0%, rgba(255, 220, 150, 0.45) 45%, transparent 75%)",
            animation: "floatHorizon 5s ease-in-out infinite",
          }}
        />

        {/* 3. High-Brightness Dot-Matrix Email Logo Scaling Up and Down Animation */}
        <div
          className="relative z-10 flex items-center justify-center pointer-events-none"
          style={{
            animation: "pulseMatrix 6s ease-in-out infinite",
          }}
        >
          <svg
            width="640"
            height="460"
            viewBox="0 0 640 460"
            fill="none"
            className="w-[88%] max-w-[660px]"
          >
            <defs>
              {/* Radial glow filter for high-brightness dots */}
              <filter id="brightGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <g filter="url(#brightGlow)">
              {/* Outer Envelope Border: Crisp Bright White Dots */}
              {Array.from({ length: 30 }).map((_, col) => (
                <React.Fragment key={`border-tb-${col}`}>
                  {/* Top Edge */}
                  <circle cx={60 + col * 18} cy={60} r="3.2" fill="#FFFFFF" opacity="0.95" />
                  {/* Bottom Edge */}
                  <circle cx={60 + col * 18} cy={380} r="3.2" fill="#FFFFFF" opacity="0.95" />
                </React.Fragment>
              ))}

              {Array.from({ length: 19 }).map((_, row) => (
                <React.Fragment key={`border-lr-${row}`}>
                  {/* Left Edge */}
                  <circle cx={60} cy={76 + row * 16} r="3.2" fill="#FFFFFF" opacity="0.95" />
                  {/* Right Edge */}
                  <circle cx={582} cy={76 + row * 16} r="3.2" fill="#FFFFFF" opacity="0.95" />
                </React.Fragment>
              ))}

              {/* Envelope V-Flap Folding Diagonals (Brilliant Pure White Dots) */}
              {Array.from({ length: 18 }).map((_, i) => (
                <React.Fragment key={`v-flap-${i}`}>
                  {/* Left down to center */}
                  <circle cx={60 + i * 14.5} cy={60 + i * 10} r="3.6" fill="#FFFFFF" opacity="1" />
                  {/* Right down to center */}
                  <circle cx={582 - i * 14.5} cy={60 + i * 10} r="3.6" fill="#FFFFFF" opacity="1" />
                </React.Fragment>
              ))}

              {/* Lower Flap Inner Diagonals */}
              {Array.from({ length: 15 }).map((_, i) => (
                <React.Fragment key={`lower-flap-${i}`}>
                  {/* Bottom left towards center */}
                  <circle cx={60 + i * 13} cy={380 - i * 9} r="2.8" fill="#FFFFFF" opacity="0.8" />
                  {/* Bottom right towards center */}
                  <circle cx={582 - i * 13} cy={380 - i * 9} r="2.8" fill="#FFFFFF" opacity="0.8" />
                </React.Fragment>
              ))}

              {/* Center Seal Luminous Multi-Ring Core */}
              <circle cx={321} cy={240} r="7" fill="#FFFFFF" opacity="1" />
              <circle cx={321} cy={240} r="14" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.75" />
              <circle cx={321} cy={240} r="22" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.5" />

              {/* Interior Sub-matrix ambient constellation dots */}
              {Array.from({ length: 7 }).map((_, r) => (
                <React.Fragment key={`inner-col-${r}`}>
                  <circle cx={140 + r * 20} cy={280} r="2" fill="#FFFFFF" opacity="0.6" />
                  <circle cx={360 + r * 20} cy={280} r="2" fill="#FFFFFF" opacity="0.6" />
                  <circle cx={180 + r * 18} cy={320} r="2" fill="#FFFFFF" opacity="0.5" />
                  <circle cx={320 + r * 18} cy={320} r="2" fill="#FFFFFF" opacity="0.5" />
                </React.Fragment>
              ))}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
