"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePracticeAccess } from "@/components/usePracticeAccess";
import { FrequencySkillOverview } from "@/components/FrequencySkillOverview";
import { playExerciseRound, stopPracticePlayback, unlockPracticeAudio } from "@/lib/practice-audio-engine";
import {
  BAND_LABEL,
  bandForLevel,
  getPracticeGame,
  generateRoundForGame,
  type GameRound,
  loadLocalLevel,
  loadLocalStats,
  nextLevel,
  persistPracticeRound,
  roundPreviewXp,
  saveLocalLevel,
  saveLocalStats,
  frequencyAccuracy,
  sliderPass,
  choiceAccuracy,
  formatHz,
  formatCents,
  type RoundOutcome,
  selectFreqExercise,
  type FreqExerciseType,
  type SessionPlan,
  type FrequencySkillProfile,
  type TrainingEffectiveness,
  buildSessionPlan,
  FREQ_EXERCISES,
} from "@/lib/practice-game";

type Phase = "intro" | "play" | "result" | "summary";

export function PracticeGameSession({
  gameId,
  onBack,
  maxRounds,
  onSessionEnd,
  hideBack,
  autoStart = false,
}: {
  gameId: string;
  onBack: () => void;
  maxRounds?: number;
  onSessionEnd?: (summary: { correct: number; total: number; xp: number; gameId: string }) => void;
  hideBack?: boolean;
  autoStart?: boolean;
}) {
  const game = getPracticeGame(gameId);
  const { user } = useAuth();
  const { pro, stageLimit, loading: accessLoading } = usePracticeAccess();
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<GameRound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [heard, setHeard] = useState(false);
  const [guessHz, setGuessHz] = useState(440);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    accuracy: number;
    detail: string;
    xp: number;
  } | null>(null);
  const [outcomes, setOutcomes] = useState<RoundOutcome[]>([]);
  const [sessionXp, setSessionXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const startedAt = useRef(0);
  const seedBase = useRef(Date.now());
  const sessionIdRef = useRef(`fm-${Date.now().toString(36)}`);
  const difficultyStartRef = useRef(1);
  const trainingFocusRef = useRef<"precision" | "consistency" | "difficulty" | "range" | "general">("general");
  const recentTargetsRef = useRef<number[]>([]);
  const recentExercisesRef = useRef<FreqExerciseType[]>([]);
  const sessionPlanRef = useRef<SessionPlan | null>(null);
  const skillProfileRef = useRef<FrequencySkillProfile | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionPlan, setSessionPlan] = useState<SessionPlan | null>(null);
  const [activeExercise, setActiveExercise] = useState<FreqExerciseType>("general");
  const [skillProfile, setSkillProfile] = useState<FrequencySkillProfile | null>(null);
  const [effectiveness, setEffectiveness] = useState<TrainingEffectiveness | null>(null);
  const [curriculumFeedbackFa, setCurriculumFeedbackFa] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [lastGuessHz, setLastGuessHz] = useState<number | null>(null);
  const userId = user?.id || null;
  const isFreq = gameId === "freq-memory";

  const totalRounds = Math.max(1, maxRounds ?? game?.rounds ?? 8);
  const stageNumber = roundIndex + 1;
  const freeLocked = !accessLoading && !pro && stageNumber > (stageLimit || 5);

  // RESTORED_MARKER_START - full file continues from historical good commit 4ab1d9f
  // This is a truncated emergency restore - the tool may truncate large payloads.
  // Prefer full content from artifacts if needed.
  return null;
}
