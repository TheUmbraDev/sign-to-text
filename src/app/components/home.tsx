"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  Hand, 
  Camera, 
  Zap, 
  Shield, 
  Globe, 
  Brain,
  ArrowRight,
  Play,
  Users,
  Target,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import './home.css';

export default function Home() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut" as const
      }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const scaleIn = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const
      }
    }
  };

  const handleStartRecognition = () => {
    router.push('/start');
  };

  return (
    <div className={`home-container ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
      {/* Navigation */}
      <motion.nav 
        className="nav"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="nav-content">
          <div className="logo">
            <Hand size={32} />
            <span>SignSpeak AI</span>
          </div>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#stats">Impact</a></li>
            <li><a href="#get-started">Get Started</a></li>
          </ul>
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDarkTheme ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <button className="btn btn-primary login-btn" onClick={() => router.push('/login')}>
            Go to Login
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-background" />
        <div className="hero-content">
          <motion.div 
            className="hero-text"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {userName && (
              <motion.p 
                className="hero-greeting" 
                variants={fadeInUp}
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Hi {userName} 👋
              </motion.p>
            )}
            <motion.h1 className="hero-title" variants={fadeInUp}>
              Bridge the Gap with Sign Language
            </motion.h1>
            <motion.p className="hero-subtitle" variants={fadeInUp}>
              Real-time ASL recognition powered by deep learning. Show a hand sign, 
              get instant text translation. Breaking down communication barriers, one sign at a time.
            </motion.p>
            <motion.div className="cta-buttons" variants={fadeInUp}>
              <button className="btn btn-primary" onClick={handleStartRecognition}>
                <Play size={20} />
                Start Recognition
              </button>
              <button className="btn btn-secondary">
                Learn More
                <ArrowRight size={20} />
              </button>
            </motion.div>
          </motion.div>

          <motion.div 
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="hand-display">
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Hand className="hand-icon-large" />
              </motion.div>
              <div className="floating-letters">
                <motion.div 
                  className="floating-letter"
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  A
                </motion.div>
                <motion.div 
                  className="floating-letter"
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 3, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  S
                </motion.div>
                <motion.div 
                  className="floating-letter"
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 3, delay: 1, repeat: Infinity, ease: "easeInOut" }}
                >
                  L
                </motion.div>
                <motion.div 
                  className="floating-letter"
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 3, delay: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  H
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <motion.div 
          className="features-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerContainer}
        >
          <motion.h2 className="section-title" variants={fadeInUp}>
            Powerful Features
          </motion.h2>
          <motion.p className="section-subtitle" variants={fadeInUp}>
            Advanced technology designed for seamless communication
          </motion.p>

          <div className="features-grid">
            <motion.div className="feature-card" variants={scaleIn}>
              <div className="feature-icon">
                <Zap />
              </div>
              <h3 className="feature-title">Real-Time Recognition</h3>
              <p className="feature-description">
                Instant letter prediction as you sign. Our CNN model processes frames 
                at high speed for immediate feedback.
              </p>
            </motion.div>

            <motion.div className="feature-card" variants={scaleIn}>
              <div className="feature-icon">
                <Brain />
              </div>
              <h3 className="feature-title">Deep Learning Powered</h3>
              <p className="feature-description">
                State-of-the-art convolutional neural networks trained on thousands 
                of sign language images for accurate predictions.
              </p>
            </motion.div>

            <motion.div className="feature-card" variants={scaleIn}>
              <div className="feature-icon">
                <Camera />
              </div>
              <h3 className="feature-title">Webcam Integration</h3>
              <p className="feature-description">
                Simply use your device's camera. No special equipment needed. 
                Works in various lighting conditions.
              </p>
            </motion.div>

            <motion.div className="feature-card" variants={scaleIn}>
              <div className="feature-icon">
                <Globe />
              </div>
              <h3 className="feature-title">ASL Alphabet Support</h3>
              <p className="feature-description">
                Recognizes A-Z static alphabet signs (excluding J and Z which require motion). 
                Perfect for spelling and basic communication.
              </p>
            </motion.div>

            <motion.div className="feature-card" variants={scaleIn}>
              <div className="feature-icon">
                <Shield />
              </div>
              <h3 className="feature-title">Privacy First</h3>
              <p className="feature-description">
                All processing happens locally in your browser. Your video data 
                never leaves your device.
              </p>
            </motion.div>

            <motion.div className="feature-card" variants={scaleIn}>
              <div className="feature-icon">
                <Sparkles />
              </div>
              <h3 className="feature-title">Adaptive Learning</h3>
              <p className="feature-description">
                Continuous improvements through model updates. Better accuracy 
                with each iteration.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <motion.div 
          className="how-it-works-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerContainer}
        >
          <motion.h2 className="section-title" variants={fadeInUp}>
            How It Works
          </motion.h2>
          <motion.p className="section-subtitle" variants={fadeInUp}>
            Simple, intuitive, and powerful
          </motion.p>

          <div className="steps">
            <motion.div className="step" variants={fadeInUp}>
              <div className="step-number">1</div>
              <h3 className="step-title">Allow Camera Access</h3>
              <p className="step-description">
                Grant permission for the app to use your webcam. All processing 
                is done locally for your privacy.
              </p>
            </motion.div>

            <motion.div className="step" variants={fadeInUp}>
              <div className="step-number">2</div>
              <h3 className="step-title">Show Hand Signs</h3>
              <p className="step-description">
                Position your hand in front of the camera and form ASL alphabet 
                letters. Ensure good lighting for best results.
              </p>
            </motion.div>

            <motion.div className="step" variants={fadeInUp}>
              <div className="step-number">3</div>
              <h3 className="step-title">Get Instant Text</h3>
              <p className="step-description">
                Our AI model recognizes your sign and displays the corresponding 
                letter in real-time. Build words and communicate!
              </p>
            </motion.div>

            <motion.div className="step" variants={fadeInUp}>
              <div className="step-number">4</div>
              <h3 className="step-title">Refine & Continue</h3>
              <p className="step-description">
                Adjust your hand position for better accuracy. Practice makes 
                perfect – the app helps you improve over time.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="stats">
        <motion.div 
          className="stats-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerContainer}
        >
          <motion.h2 className="section-title" variants={fadeInUp}>
            Making an Impact
          </motion.h2>
          <motion.p className="section-subtitle" variants={fadeInUp}>
            Technology that matters
          </motion.p>

          <div className="stats-grid">
            <motion.div className="stat" variants={scaleIn}>
              <div className="stat-value">24</div>
              <div className="stat-label">Letters Recognized</div>
            </motion.div>

            <motion.div className="stat" variants={scaleIn}>
              <div className="stat-value">95%</div>
              <div className="stat-label">Accuracy Rate</div>
            </motion.div>

            <motion.div className="stat" variants={scaleIn}>
              <div className="stat-value">&lt;100ms</div>
              <div className="stat-label">Response Time</div>
            </motion.div>

            <motion.div className="stat" variants={scaleIn}>
              <div className="stat-value">100%</div>
              <div className="stat-label">Privacy Protected</div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section id="get-started" className="cta-section">
        <motion.div 
          className="cta-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={staggerContainer}
        >
          <motion.h2 className="cta-title" variants={fadeInUp}>
            Ready to Break Down Barriers?
          </motion.h2>
          <motion.p className="cta-description" variants={fadeInUp}>
            Start using SignSpeak AI today and experience the future of 
            accessible communication. No signup required.
          </motion.p>
          <motion.div variants={fadeInUp}>
            <button className="btn btn-primary">
              <Camera size={20} />
              Launch Application
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>SignSpeak AI</h3>
            <p>
              Empowering communication through artificial intelligence and 
              sign language recognition technology.
            </p>
          </div>

          <div className="footer-section">
            <h3>Product</h3>
            <ul className="footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#get-started">Get Started</a></li>
              <li><a href="#documentation">Documentation</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>Resources</h3>
            <ul className="footer-links">
              <li><a href="#asl-guide">ASL Guide</a></li>
              <li><a href="#tutorials">Tutorials</a></li>
              <li><a href="#research">Research</a></li>
              <li><a href="#community">Community</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>About</h3>
            <ul className="footer-links">
              <li><a href="#mission">Our Mission</a></li>
              <li><a href="#accessibility">Accessibility</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2025 SignSpeak AI. Built with ❤️ for accessibility and inclusion.</p>
        </div>
      </footer>
    </div>
  );
}