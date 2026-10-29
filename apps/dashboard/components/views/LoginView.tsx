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
            transform: scale(0.93) translateY(0);
            opacity: 0.45;
          }
          50% {
            transform: scale(1.07) translateY(-6px);
            opacity: 0.85;
          }
        }
        @keyframes floatHorizon {
          0%, 100% {
            opacity: 0.7;
            transform: scaleX(1);
          }
          50% {
            opacity: 0.95;
            transform: scaleX(1.08);
          }
        }
      `}</style>

      {/* Left Column: Clean Administrator Login Form */}
      <div className="w-full lg:w-[45%] xl:w-[42%] h-full flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-kumo-canvas border-r border-kumo-hairline z-20 overflow-y-auto">
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

        {/* Empty bottom space */}
        <div className="h-4" />
      </div>

      {/* Right Column: Screenshot Inspired Cloudflare Orange Showcase with Dot Matrix Animation */}
      <div className="hidden lg:flex flex-1 h-full relative overflow-hidden bg-gradient-to-br from-[#FA8B38] via-[#F38020] to-[#E55A00] items-center justify-center p-12 xl:p-16 text-center select-none">
        {/* 1. Fine Dot-Matrix Overlay Grid Pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255, 255, 255, 0.22) 1.5px, transparent 1.5px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* 2. Bottom Radiant Horizon Illumination Flare (Matching the screenshot glow) */}
        <div
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[120%] h-80 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 100%, rgba(255, 248, 220, 0.95) 0%, rgba(255, 220, 150, 0.45) 45%, transparent 75%)",
            animation: "floatHorizon 5s ease-in-out infinite",
          }}
        />

        {/* 3. Dot-Matrix Email Icon Scaling Up and Down in the Background */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{
            animation: "pulseMatrix 7s ease-in-out infinite",
          }}
        >
          <svg
            width="560"
            height="420"
            viewBox="0 0 560 420"
            fill="none"
            className="w-[85%] max-w-[580px] text-white"
          >
            {/* Grid of matrix dots defining the envelope body and flap */}
            <g fill="currentColor">
              {/* Outer Envelope Border Dots */}
              {Array.from({ length: 28 }).map((_, col) => (
                <React.Fragment key={`border-top-bottom-${col}`}>
                  <circle cx={40 + col * 17} cy={40} r="3" opacity="0.8" />
                  <circle cx={40 + col * 17} cy={360} r="3" opacity="0.8" />
                </React.Fragment>
              ))}

              {Array.from({ length: 19 }).map((_, row) => (
                <React.Fragment key={`border-left-right-${row}`}>
                  <circle cx={40} cy={57 + row * 16} r="3" opacity="0.8" />
                  <circle cx={499} cy={57 + row * 16} r="3" opacity="0.8" />
                </React.Fragment>
              ))}

              {/* Envelope V Flap Folding Diagonals */}
              {Array.from({ length: 16 }).map((_, i) => (
                <React.Fragment key={`flap-diag-${i}`}>
                  {/* Left down to center */}
                  <circle cx={40 + i * 15} cy={40 + i * 11} r="3.5" opacity="0.95" />
                  {/* Right down to center */}
                  <circle cx={499 - i * 15} cy={40 + i * 11} r="3.5" opacity="0.95" />
                </React.Fragment>
              ))}

              {/* Lower Inner Folding Diagonals */}
              {Array.from({ length: 14 }).map((_, i) => (
                <React.Fragment key={`lower-diag-${i}`}>
                  <circle cx={40 + i * 13} cy={360 - i * 9} r="2.8" opacity="0.65" />
                  <circle cx={499 - i * 13} cy={360 - i * 9} r="2.8" opacity="0.65" />
                </React.Fragment>
              ))}

              {/* Center Seal Pulse Dot */}
              <circle cx={270} cy={215} r="6.5" opacity="1" />
              <circle cx={270} cy={215} r="13" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            </g>
          </svg>
        </div>

        {/* 4. Showcase Text & CTA Content (Matching Screenshot Content & Typography) */}
        <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
          {/* Main Headline */}
          <h2 className="text-3xl xl:text-[42px] font-bold text-white tracking-tight leading-[1.14] font-sans drop-shadow-sm">
            Everything we learned from powering 20% of the Internet—yours by default
          </h2>

          {/* Subtitle */}
          <p className="text-white/90 text-sm xl:text-[15px] max-w-md mt-4 sm:mt-5 leading-relaxed font-normal">
            One platform for your apps, agents, and workforce.
            <br />
            Build, secure, and scale without managing infrastructure.
          </p>

          {/* White Pill Button */}
          <button
            type="button"
            onClick={() => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement;
              if (input) input.focus();
            }}
            className="mt-8 px-7 py-3 rounded-full bg-white text-gray-950 font-semibold text-xs xl:text-sm hover:bg-white/95 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 cursor-pointer"
          >
            Start building for free
          </button>
        </div>
      </div>
    </div>
  );
}
