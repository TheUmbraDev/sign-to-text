"use client";

// Import React and necessary hooks
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import "./login.css";
import { initFirebase, signInWithGooglePopup, signInEmailPassword, isFirebaseConfigured } from "../../lib/firebaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const firebaseAvailable = isFirebaseConfigured();
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (firebaseAvailable) {
        const { idToken } = await signInEmailPassword(email, password);
        const res = await fetch("/api/auth/firebase-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Authentication failed");
        if (data.user?.name) {
          localStorage.setItem("userName", data.user.name);
        }
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Authentication failed");
        if (data.user?.name) {
          localStorage.setItem("userName", data.user.name);
        }
      }
      setIsSuccess(true);
      setTimeout(() => {
        setEmail("");
        setPassword("");
        router.replace("/home");
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || "Login error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      initFirebase();
    } catch (e) {
      // ignore initialization errors client-side
    }
  }, []);

  return (
    <div className="login-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="login-card"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="login-header"
        >
          <motion.div
            animate={{ rotate: isSuccess ? 360 : 0 }}
            transition={{ duration: 0.6 }}
            className="login-icon-wrapper"
          >
            <motion.div
              animate={{ scale: isSuccess ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              {isSuccess ? (
                <Check className="login-icon" size={32} />
              ) : (
                <Lock className="login-icon" size={32} />
              )}
            </motion.div>
          </motion.div>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              style={{
                color: "#d10",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginTop: "0.5rem",
                textAlign: "center",
                lineHeight: 1.3,
                maxWidth: "320px"
              }}
            >
              {errorMessage}
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="login-title"
          >
            Welcome Back
          </motion.h1>

          <p className="login-subtitle">Sign in to continue</p>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <div className="input-wrapper">
              <div className="input-icon">
                <Mail size={20} />
              </div>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-wrapper">
              <div className="input-icon">
                <Lock size={20} />
              </div>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="form-input input-with-button"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="input-toggle-button"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" className="checkbox-input" />
              <span>Remember me</span>
            </label>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || isSuccess}
            className="submit-button"
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div className="loading-spinner" />
                  <span>Processing...</span>
                </motion.div>
              ) : isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Check size={20} />
                  <span>Success!</span>
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>Sign In</span>
                  <ArrowRight size={20} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </form>

        {/* Divider */}
        <div className="divider">
          <div className="divider-line"></div>
          <div className="divider-text">
            <span>Or continue with</span>
          </div>
        </div>

        {/* Social Login */}
        <div className="social-buttons">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            className="social-button google"
            onClick={async () => {
              setIsLoading(true);
              try {
                const { result, idToken } = await signInWithGooglePopup();
                // Send ID token to backend so it can verify and upsert MongoDB
                const res = await fetch("/api/auth/firebase-login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ idToken }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Server login failed");
                if (data.user?.name) {
                  localStorage.setItem("userName", data.user.name);
                } else if (result.user?.displayName) {
                  localStorage.setItem("userName", result.user.displayName);
                }
                setIsSuccess(true);
                setTimeout(() => {
                  router.replace("/home");
                }, 800);
              } catch (err: any) {
                console.error(err);
                setErrorMessage(err.message || "Google sign-in failed");
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <svg
              className="social-icon"
              viewBox="0 0 533.5 544.3"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
            >
              <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.4-34.1-4-50.4H272v95.3h147.4c-6.3 34-24.3 62.8-51.9 82v68.2h83.8c49-45.1 77.2-111.8 77.2-195.1z" />
              <path fill="#34A853" d="M272 544.3c69.6 0 128-22.8 170.7-62.1l-83.8-68.2c-23.3 15.6-53 24.8-86.9 24.8-66.7 0-123.2-45-143.5-105.3H41.7v66.3C84.1 487.9 169 544.3 272 544.3z" />
              <path fill="#FBBC05" d="M128.5 328.5c-10.3-30.6-10.3-63.6 0-94.2V168H41.7C15.2 207.7 0 244.9 0 278.4s15.2 70.7 41.7 110.4l86.8-60.3z" />
              <path fill="#EA4335" d="M272 109.7c36.7 0 69.6 12.6 95.5 37.4l71.7-71.7C401.6 34.4 344.6 10 272 10 169 10 84.1 66.5 41.7 160.9l86.8 66.3C148.8 154.7 205.3 109.7 272 109.7z" />
            </svg>
            <span>Continue with Google</span>
          </motion.button>
        </div>

        {/* Sign-up context */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="signup-context"
        >
            <div className="temp">
                <span className="toggle-text">Don't have an account?</span>{" "}
                <Link href="/sign-up" className="toggle-button">
                    Sign-up
                </Link>
            </div>
          
        </motion.div>
      </motion.div>

      {/* Decorative elements */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="decorative-blob decorative-blob-1"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="decorative-blob decorative-blob-2"
      />
    </div>
  );
}
