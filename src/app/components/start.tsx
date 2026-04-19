// start.tsx
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Hand,
  Camera,
  Video,
  VideoOff,
  Sun,
  Moon,
  ArrowLeft,
  Play,
  Pause,
  X,
  CheckCircle,
  Lightbulb,
  Target,
  Zap,
  TrendingUp,
  Delete
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Hands, Results } from '@mediapipe/hands';
import './start.css';

interface StartRecognitionProps {
  onNavigateToHome?: () => void;
}

export default function StartRecognition(props: StartRecognitionProps) {
  const router = useRouter();

  const onNavigateToHome = () => {
    if (props.onNavigateToHome) props.onNavigateToHome();
    else router.push('/home');
  };

  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [predictedLetter, setPredictedLetter] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [recognizedText, setRecognizedText] = useState('');
  const [lettersRecognized, setLettersRecognized] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelLoadProgress, setModelLoadProgress] = useState('Loading MediaPipe...');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const requestLoopRef = useRef<number | null>(null);
  
  // Refs for hold-to-confirm logic
  const lastPredLetterRef = useRef<string>('');
  const predStartTimeRef = useRef<number>(0);
  const isAppendedRef = useRef<boolean>(false);
  
  // Smoothing queue
  const predictionQueueRef = useRef<string[]>([]);
  const MAX_QUEUE_SIZE = 5;

  // Mock ASL letters (excluding J and Z)
  const aslLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 
                      'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'];

  const handsRef = useRef<Hands | null>(null);
  const HandsClassRef = useRef<any>(null);
  const isMediaPipeReady = useRef<boolean>(false);
  const lastSendTimeRef = useRef<number>(0);
  const THROTTLE_MS = 100; // Send at most 10 predictions per second

  // Preload MediaPipe Hands on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setModelLoadProgress('Loading MediaPipe module...');
      
      // Preload the WASM files for faster initialization
      const preloadFiles = [
        'hands_solution_packed_assets_loader.js',
        'hands_solution_simd_wasm_bin.js',
        'hands.binarypb'
      ];
      
      // Create link preload hints for faster loading
      preloadFiles.forEach(file => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        link.as = file.endsWith('.js') ? 'script' : 'fetch';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      });
      
      import('@mediapipe/hands').then((module) => {
        console.log("MediaPipe module loaded:", module);
        setModelLoadProgress('Initializing hand detection...');
        HandsClassRef.current = module.Hands || (window as any).Hands;
        
        // Pre-initialize the Hands instance for faster camera start
        const Hands = HandsClassRef.current;
        if (Hands) {
          const hands = new Hands({
            locateFile: (file: string) => {
              return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
          });
          hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0, // Use lite model (0) for faster inference
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
            selfieMode: false
          });
          hands.onResults(() => {}); // Dummy handler to trigger model load
          
          setModelLoadProgress('Warming up model...');
          
          // Warm up the model with a proper sized image (more realistic warm-up)
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 64, 64);
          }
          
          hands.send({ image: canvas }).then(() => {
            console.log("MediaPipe Hands model pre-loaded and warmed up");
            isMediaPipeReady.current = true;
            handsRef.current = hands;
            setIsModelLoading(false);
            setModelLoadProgress('Ready!');
          }).catch((e: any) => {
            console.warn("MediaPipe warm-up failed, will load on first use:", e);
            handsRef.current = hands;
            isMediaPipeReady.current = true;
            setIsModelLoading(false);
            setModelLoadProgress('Ready (partial)');
          });
        }
      }).catch(err => {
        console.error("Failed to load MediaPipe Hands", err);
        setIsModelLoading(false);
        setModelLoadProgress('Failed to load');
        setError('Failed to load hand detection model');
      });
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  const startCamera = async () => {
    if (isModelLoading) {
      console.warn("Model still loading, please wait...");
      return;
    }
    
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      alert('Camera blocked: use HTTPS (or localhost).');
      console.warn('Insecure context: getUserMedia requires HTTPS or a localhost origin.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera API not available in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 540 },
          height: { ideal: 480 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        
        // Check if MediaPipe is ready (pre-initialized)
        if (!handsRef.current) {
          console.warn("MediaPipe Hands not ready yet, waiting...");
          // Wait for pre-initialization to complete
          const waitForMediaPipe = setInterval(() => {
            if (handsRef.current) {
              clearInterval(waitForMediaPipe);
              handsRef.current.onResults(onResults);
              setIsRecognizing(true);
              startRecognitionLoop();
            }
          }, 100);
          // Timeout after 10 seconds
          setTimeout(() => clearInterval(waitForMediaPipe), 10000);
          return;
        }
        
        // Use pre-initialized hands instance
        handsRef.current.onResults(onResults);

        // Start manual loop
        setIsRecognizing(true);
        startRecognitionLoop();
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      let message = 'Unable to access camera.';
      if (error?.name === 'NotAllowedError') {
        message = 'Camera permission denied. Check browser site settings (lock icon -> Site settings).';
      } else if (error?.name === 'NotFoundError') {
        message = 'No camera device found.';
      } else if (error?.name === 'NotReadableError') {
        message = 'Camera is busy or in use by another application.';
      }
      alert(message);
    }
  };

  const stopCamera = () => {
    // Don't close handsRef - keep it for fast restart
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsRecognizing(false);
    
    if (requestLoopRef.current) {
        cancelAnimationFrame(requestLoopRef.current);
        requestLoopRef.current = null;
    }
  };

  const grabFrameAsDataURL = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    
    // Use actual video dimensions to prevent aspect ratio distortion
    const w = video.videoWidth;
    const h = video.videoHeight;
    
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Draw the frame as-is
    ctx.drawImage(video, 0, 0, w, h);
    
    // High quality JPEG to ensure model accuracy
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const drawLandmarks = (landmarks: { x: number, y: number }[]) => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) {
      console.warn("Canvas or video ref missing");
      return;
    }

    if (landmarks.length === 0) {
      // clear
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      console.log(`Canvas resized to: ${videoWidth}x${videoHeight}`);
    }

    // console.log(`Drawing ${landmarks.length} landmarks`);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const maxX = Math.max(...landmarks.map(p => p.x));
    const maxY = Math.max(...landmarks.map(p => p.y));
    const areNormalized = maxX <= 1.5 && maxY <= 1.5;

    // Flip x-coordinate to match the mirrored video display
    const toPx = (p: { x: number; y: number }) => ({
      x: areNormalized ? (1 - p.x) * canvas.width : (canvas.width - p.x),
      y: areNormalized ? p.y * canvas.height : p.y
    });

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // Pinky & Palm
    ];

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 8;

    connections.forEach(([start, end]) => {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      if (p1 && p2) {
        const P1 = toPx(p1);
        const P2 = toPx(p2);
        ctx.beginPath();
        ctx.moveTo(P1.x, P1.y);
        ctx.lineTo(P2.x, P2.y);
        ctx.stroke();
      }
    });

    ctx.shadowBlur = 0;

    landmarks.forEach((lm, idx) => {
      const P = toPx(lm);
      const isFingertip = [4, 8, 12, 16, 20].includes(idx);
      const isWrist = idx === 0;

      ctx.beginPath();
      ctx.arc(P.x, P.y, isFingertip ? 8 : (isWrist ? 10 : 5), 0, 2 * Math.PI);

      if (isFingertip) {
        ctx.fillStyle = '#FF4444';
      } else if (isWrist) {
        ctx.fillStyle = '#44AAFF';
      } else {
        ctx.fillStyle = '#FFFF44';
      }
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  const sendLandmarksToApi = async (landmarks: any[]) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      // Convert landmarks to simple array of objects for JSON
      // Flip x-coordinate because the model expects landmarks from a flipped image (mirror mode)
      const simpleLandmarks = landmarks.map(l => ({ x: 1.0 - l.x, y: l.y, z: l.z }));

      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landmarks: simpleLandmarks })
      });

      if (!res.ok) return;

      const json = await res.json();
      
      if (typeof json?.letter === 'string') {
        let letter = json.letter;
        let conf = Math.round(json.confidence ?? 0);

        // --- SMOOTHING LOGIC ---
        const queue = predictionQueueRef.current;
        queue.push(letter);
        if (queue.length > MAX_QUEUE_SIZE) {
          queue.shift();
        }

        const counts: Record<string, number> = {};
        let maxCount = 0;
        let smoothedLetter = letter;

        for (const l of queue) {
          counts[l] = (counts[l] || 0) + 1;
          if (counts[l] > maxCount) {
            maxCount = counts[l];
            smoothedLetter = l;
          }
        }
        
        letter = smoothedLetter;
        
        setPredictedLetter(letter);
        setConfidence(conf);

        if (letter && conf > 85) {
          const now = Date.now();
          
          if (letter === lastPredLetterRef.current) {
            const duration = now - predStartTimeRef.current;
            if (duration > 1000 && !isAppendedRef.current) {
              if (letter.toLowerCase() === 'del' || letter.toLowerCase() === 'delete') {
                handleBackspace();
              } else if (letter.toLowerCase() === 'space') {
                setRecognizedText(prev => prev + ' ');
                setLettersRecognized(prev => prev + 1);
              } else {
                setRecognizedText(prev => prev + letter);
                setLettersRecognized(prev => prev + 1);
              }
              isAppendedRef.current = true;
            }
          } else {
            lastPredLetterRef.current = letter;
            predStartTimeRef.current = now;
            isAppendedRef.current = false;
          }
        } else {
           // Reset on low confidence or no letter to allow re-triggering (e.g. double letters)
           lastPredLetterRef.current = '';
           isAppendedRef.current = false;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const onResults = (results: Results) => {
    if (!isRecognizingRef.current) return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      // Draw immediately
      drawLandmarks(landmarks);
      // Send to API
      sendLandmarksToApi(landmarks);
    } else {
      const canvas = overlayCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      // Send empty to clear prediction if needed, or just let it fade
      // Maybe send empty to reset smoothing?
      // sendLandmarksToApi([]); // Or handle empty in API
    }
  };

  const requestPrediction = async () => {
    try {
      const dataUrl = grabFrameAsDataURL();
      if (!dataUrl) {
        console.log("No frame captured");
        return;
      }

      // console.log("Sending frame to API...");
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl })
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        console.error(`API Error: ${res.status} ${errText}`);
        throw new Error(`API Error: ${res.status} ${errText}`);
      }

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        console.error("API returned non-JSON response:", await res.text());
        throw new Error("API returned non-JSON response");
      }

      const json = await res.json();
      // console.log("API Response:", json);
      setError(null); // Clear error on success

      // Accept many possible landmark names (but we expect 'landmarks')
      const rawPoints =
        (json && (json.landmarks ?? json.keypoints ?? json.points ?? json.coordinates ?? json.hand_landmarks ?? json.skeleton)) || null;

      // console.log("Raw landmarks:", rawPoints);

      const normalizePoints = (pts: any): { x: number; y: number }[] => {
        if (!pts) return [];
        if (Array.isArray(pts)) {
          if (Array.isArray(pts[0])) {
            return (pts as any[]).map((p: any) => ({ x: Number(p[0]) || 0, y: Number(p[1]) || 0 }));
          }
          if (typeof pts[0] === 'object' && pts[0] !== null) {
            return (pts as any[]).map((p: any) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
          }
        }
        return [];
      };

      const points = normalizePoints(rawPoints);
      // console.log("Normalized points:", points.length);

      if (points.length > 0) {
        drawLandmarks(points);
      } else {
        const canvas = overlayCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      // Handle response, including empty letter (no hand detected)
      if (typeof json?.letter === 'string') {
        let letter = json.letter;
        let conf = Math.round(json.confidence ?? 0);

        // --- SMOOTHING LOGIC ---
        const queue = predictionQueueRef.current;
        queue.push(letter);
        if (queue.length > MAX_QUEUE_SIZE) {
          queue.shift();
        }

        // Find most frequent letter in queue
        const counts: Record<string, number> = {};
        let maxCount = 0;
        let smoothedLetter = letter;

        for (const l of queue) {
          // We count empty strings too, so if mostly empty, result is empty
          counts[l] = (counts[l] || 0) + 1;
          if (counts[l] > maxCount) {
            maxCount = counts[l];
            smoothedLetter = l;
          }
        }
        
        // Use the smoothed letter for display and logic
        letter = smoothedLetter;
        // -----------------------
        
        setPredictedLetter(letter);
        setConfidence(conf);

        // Hold-to-confirm logic (2 seconds)
        if (letter && conf > 85) {
          const now = Date.now();
          
          if (letter === lastPredLetterRef.current) {
            // Same letter, check duration
            const duration = now - predStartTimeRef.current;
            if (duration > 1000 && !isAppendedRef.current) {
              // Confirmed!
              setRecognizedText(prev => prev + letter);
              setLettersRecognized(prev => prev + 1);
              isAppendedRef.current = true; // Prevent multiple appends for same hold
            }
          } else {
            // New letter detected
            lastPredLetterRef.current = letter;
            predStartTimeRef.current = now;
            isAppendedRef.current = false;
          }
        } else {
          // No valid letter or low confidence -> reset
          lastPredLetterRef.current = '';
          isAppendedRef.current = false;
        }
        return;
      }

      console.warn('Unexpected API response format:', json);
    } catch (e: any) {
      console.error('Prediction error:', e);
      setError(e.message || "Prediction failed");
    }
  };

  const isRecognizingRef = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    isRecognizingRef.current = isRecognizing;
  }, [isRecognizing]);

  const startRecognition = () => {
    console.log("Starting recognition...");
    setIsRecognizing(true);
    isRecognizingRef.current = true;
    startRecognitionLoop();

    timerIntervalRef.current = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecognition = () => {
    setIsRecognizing(false);
    isRecognizingRef.current = false;

    if (requestLoopRef.current) {
        cancelAnimationFrame(requestLoopRef.current);
        requestLoopRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setPredictedLetter('');
    setConfidence(0);
  };

  const clearText = () => {
    setRecognizedText('');
    setLettersRecognized(0);
  };

  const handleBackspace = () => {
    setRecognizedText(prev => prev.slice(0, -1));
    setLettersRecognized(prev => Math.max(0, prev - 1));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;

    if (video && canvas) {
      const handleLoadedMetadata = () => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        console.log(`Video metadata loaded: ${canvas.width}x${canvas.height}`);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [isCameraActive]);

  // Auto-start camera when model is ready
  useEffect(() => {
    if (!isModelLoading && !isCameraActive) {
      startCamera();
    }
  }, [isModelLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const startRecognitionLoop = () => {
    const loop = async () => {
      if (!isRecognizingRef.current) return;
      if (!videoRef.current || !handsRef.current) return;
      
      const now = Date.now();
      
      // Throttle: only send if enough time has passed
      if (videoRef.current.readyState >= 2 && (now - lastSendTimeRef.current) >= THROTTLE_MS) {
        lastSendTimeRef.current = now;
        try {
          await handsRef.current.send({ image: videoRef.current });
        } catch (e) {
          console.warn("MediaPipe send error:", e);
        }
      }
      
      if (isRecognizingRef.current) {
        requestLoopRef.current = requestAnimationFrame(loop);
      }
    };
    requestLoopRef.current = requestAnimationFrame(loop);
  };

  return (
    <div className={`recognition-container ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
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

          <div className="nav-actions">
            <button className="back-btn" onClick={onNavigateToHome}>
              <ArrowLeft size={20} />
              Back to Home
            </button>
            <motion.button
              className="theme-toggle"
              onClick={toggleTheme}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isDarkTheme ? <Sun size={24} /> : <Moon size={24} />}
            </motion.button>
          </div>
        </div>
      </motion.nav>

      <div className="main-content">
        <motion.div
          className="page-header"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <h1 className="page-title">ASL Recognition Studio</h1>
          <p className="page-subtitle">
            Real-time American Sign Language alphabet recognition powered by deep learning
          </p>
        </motion.div>

        <motion.div
          className="recognition-grid"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div className="video-section" variants={fadeInUp}>
            {error && (
              <div style={{ 
                backgroundColor: '#ff4444', 
                color: 'white', 
                padding: '10px', 
                borderRadius: '8px', 
                marginBottom: '10px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
            <div className="video-container">
              <div className="video-placeholder" style={{ position: 'relative' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="video-element"
                  style={{ transform: 'scaleX(-1)', width: '100%', height: '100%' }}
                />
                <canvas
                  ref={overlayCanvasRef}
                  className="video-overlay-canvas"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 10
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {!isCameraActive && (
                  <div className="video-overlay">
                    {isModelLoading ? (
                      <>
                        <div className="loading-spinner" style={{
                          width: '48px',
                          height: '48px',
                          border: '4px solid rgba(255,255,255,0.2)',
                          borderTop: '4px solid #00ff88',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          marginBottom: '16px'
                        }} />
                        <div className="video-placeholder-text">
                          <p style={{ color: '#00ff88' }}>{modelLoadProgress}</p>
                          <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>
                            Preparing hand detection model...
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Camera className="video-placeholder-icon" />
                        <div className="video-placeholder-text">
                          <p>Allow camera access to begin</p>
                          <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>
                            Grant permission if prompted by browser
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {isCameraActive && isRecognizing && (
                  <motion.div
                    className="recording-indicator"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="recording-dot" />
                    <span>RECOGNIZING</span>
                  </motion.div>
                )}
              </div>
            </div>

            <motion.div className="controls" variants={fadeInUp}>
              {!isCameraActive ? (
                <motion.button
                  className="control-btn control-btn-primary"
                  onClick={startCamera}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isModelLoading}
                  style={{ opacity: isModelLoading ? 0.5 : 1, cursor: isModelLoading ? 'wait' : 'pointer' }}
                >
                  <Video size={20} />
                  {isModelLoading ? 'Loading Model...' : 'Start Camera'}
                </motion.button>
              ) : (
                <>
                  {!isRecognizing ? (
                    <motion.button
                      className="control-btn control-btn-primary"
                      onClick={startRecognition}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Play size={20} />
                      Start Recognition
                    </motion.button>
                  ) : (
                    <motion.button
                      className="control-btn control-btn-secondary"
                      onClick={stopRecognition}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Pause size={20} />
                      Pause Recognition
                    </motion.button>
                  )}
                  <motion.button
                    className="control-btn control-btn-danger"
                    onClick={stopCamera}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <VideoOff size={20} />
                    Stop Camera
                  </motion.button>
                </>
              )}
            </motion.div>
          </motion.div>

          <motion.div className="sidebar" variants={fadeInUp}>
            <div className="sidebar-card">
              <h3 className="card-title">
                <Target size={20} />
                Current Prediction
              </h3>

              <div className="prediction-display">
                {predictedLetter ? (
                  <div>
                    <div className="predicted-letter">{predictedLetter}</div>
                    <div className="prediction-label">Detected Letter</div>
                  </div>
                ) : (
                  <div className="no-prediction">
                    {isRecognizing ? 'Show a sign...' : 'Start recognition to see predictions'}
                  </div>
                )}
              </div>

              {predictedLetter && (
                <motion.div
                  className="confidence-meter"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="confidence-label">
                    <span>Confidence</span>
                    <span>{confidence}%</span>
                  </div>
                  <div className="confidence-bar-bg">
                    <motion.div
                      className="confidence-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${confidence}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="sidebar-card">
              <div className="text-output-header">
                <h3 className="card-title">
                  <Zap size={20} />
                  Recognized Text
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {recognizedText && (
                    <motion.button
                      className="clear-btn"
                      onClick={handleBackspace}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Backspace"
                    >
                      <Delete size={16} />
                    </motion.button>
                  )}
                  {recognizedText && (
                    <motion.button
                      className="clear-btn"
                      onClick={clearText}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Clear All"
                    >
                      <X size={16} />
                      Clear
                    </motion.button>
                  )}
                </div>
              </div>

              <div className={`text-output-box ${!recognizedText ? 'empty' : ''}`}>
                {recognizedText || 'Your recognized letters will appear here...'}
              </div>

              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{lettersRecognized}</div>
                  <div className="stat-label">Letters</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{formatTime(sessionTime)}</div>
                  <div className="stat-label">Time</div>
                </div>
              </div>
            </div>

            <div className="sidebar-card">
              <h3 className="card-title">
                <Lightbulb size={20} />
                Quick Tips
              </h3>

              <ul className="instructions-list">
                <motion.li className="instruction-item" whileHover={{ scale: 1.02 }}>
                  <div className="instruction-icon">
                    <CheckCircle size={20} />
                  </div>
                  <div className="instruction-text">
                    <div className="instruction-title">Good Lighting</div>
                    <div className="instruction-desc">
                      Ensure your hand is well-lit for better accuracy
                    </div>
                  </div>
                </motion.li>

                <motion.li className="instruction-item" whileHover={{ scale: 1.02 }}>
                  <div className="instruction-icon">
                    <Hand size={20} />
                  </div>
                  <div className="instruction-text">
                    <div className="instruction-title">Clear Background</div>
                    <div className="instruction-desc">
                      Position hand against a plain background
                    </div>
                  </div>
                </motion.li>

                <motion.li className="instruction-item" whileHover={{ scale: 1.02 }}>
                  <div className="instruction-icon">
                    <Target size={20} />
                  </div>
                  <div className="instruction-text">
                    <div className="instruction-title">Center Position</div>
                    <div className="instruction-desc">
                      Keep your hand centered in the frame
                    </div>
                  </div>
                </motion.li>

                <motion.li className="instruction-item" whileHover={{ scale: 1.02 }}>
                  <div className="instruction-icon">
                    <TrendingUp size={20} />
                  </div>
                  <div className="instruction-text">
                    <div className="instruction-title">Hold Steady</div>
                    <div className="instruction-desc">
                      Maintain the sign for 1-2 seconds
                    </div>
                  </div>
                </motion.li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
