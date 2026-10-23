import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useTracePlayback Hook
 * 
 * Manages deterministic, accessible step-by-step trace simulation.
 * Supports play, pause, resume, restart, step forward/backward, jump to step,
 * and playback speeds (0.5x, 1x, 2x).
 * Fully respects prefers-reduced-motion.
 */
export function useTracePlayback(steps = [], options = {}) {
  const {
    initialSpeed = 1,
    autoPlay = false,
    baseIntervalMs = 1800,
    onStepChange = null
  } = options;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialSpeed);
  const timerRef = useRef(null);

  // Check prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const listener = (e) => setReducedMotion(e.matches);
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", listener);
        return () => mediaQuery.removeEventListener("change", listener);
      }
    }
  }, []);

  const totalSteps = steps.length;
  const activeStep = steps[currentStepIndex] || null;

  // Clear running timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    clearTimer();
  }, [clearTimer]);

  const play = useCallback(() => {
    if (totalSteps <= 0) return;
    if (currentStepIndex >= totalSteps - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(true);
  }, [totalSteps, currentStepIndex]);

  const resume = useCallback(() => {
    if (totalSteps > 0 && currentStepIndex < totalSteps - 1) {
      setIsPlaying(true);
    } else {
      play();
    }
  }, [totalSteps, currentStepIndex, play]);

  const restart = useCallback(() => {
    setCurrentStepIndex(0);
    setIsPlaying(true);
  }, []);

  const stepForward = useCallback(() => {
    pause();
    setCurrentStepIndex((prev) => Math.min(prev + 1, Math.max(0, totalSteps - 1)));
  }, [pause, totalSteps]);

  const stepBackward = useCallback(() => {
    pause();
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, [pause]);

  const jumpToStep = useCallback((index) => {
    pause();
    if (index >= 0 && index < totalSteps) {
      setCurrentStepIndex(index);
    }
  }, [pause, totalSteps]);

  const setSpeed = useCallback((speed) => {
    setPlaybackSpeed(speed);
  }, []);

  // Interval ticker when playing
  useEffect(() => {
    if (!isPlaying || totalSteps <= 1 || reducedMotion) {
      clearTimer();
      return;
    }

    const interval = Math.max(400, Math.round(baseIntervalMs / playbackSpeed));
    timerRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          clearTimer();
          return prev;
        }
        return prev + 1;
      });
    }, interval);

    return () => clearTimer();
  }, [isPlaying, totalSteps, playbackSpeed, baseIntervalMs, clearTimer, reducedMotion]);

  // Notify onStepChange callback if provided
  useEffect(() => {
    if (onStepChange && activeStep) {
      onStepChange(activeStep, currentStepIndex);
    }
  }, [activeStep, currentStepIndex, onStepChange]);

  // If steps change, clamp currentStepIndex
  useEffect(() => {
    if (currentStepIndex >= totalSteps && totalSteps > 0) {
      setCurrentStepIndex(totalSteps - 1);
    }
  }, [totalSteps, currentStepIndex]);

  return {
    currentStepIndex,
    totalSteps,
    activeStep,
    isPlaying,
    playbackSpeed,
    reducedMotion,
    play,
    pause,
    resume,
    restart,
    stepForward,
    stepBackward,
    jumpToStep,
    setSpeed
  };
}
