import { SCORING, confidenceMultiplier, getQuestionsForStage } from "./questions"
import type { Match, PredictionAnswers } from "@/db/schema"

export type ScoreBreakdown = {
  questionKey: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  pointsEarned: number
  pointsPossible: number
}

export type ScoreResult = {
  score: number
  maxPossibleScore: number
  breakdown: ScoreBreakdown[]
  correctWinner: boolean
}

/**
 * Derive correct answers from a finished match's data.
 * This is the single source of truth — called during the scoring cron.
 */
export function deriveCorrectAnswers(match: Match): Record<string, string> {
  const { homeScore, awayScore, winner, wentToExtraTime, wentToPenalties } = match

  if (homeScore == null || awayScore == null || !winner) {
    throw new Error(`Match ${match.id} is not finished — cannot derive answers`)
  }

  const totalGoals = homeScore + awayScore
  const margin = Math.abs(homeScore - awayScore)

  const answers: Record<string, string> = {}

  // Q1: winner
  answers.winner = winner // "home" | "away" | "draw"

  // Q2: margin
  if (winner === "draw") {
    answers.margin = "draw"
  } else if (margin === 1) {
    answers.margin = "1"
  } else if (margin === 2) {
    answers.margin = "2"
  } else {
    answers.margin = "3+"
  }

  // Q3: extra_time (knockout only)
  answers.extra_time = wentToExtraTime ? "yes" : "no"

  // Q4: penalties (knockout only)
  answers.penalties = wentToPenalties ? "yes" : "no"

  // Q5: first_goal_nation — we can only derive no-goals case from score
  // Real first goal data would require a goals endpoint; for now we mark
  // "none" if 0-0, otherwise leave as null to be set manually / via goals API
  if (totalGoals === 0) {
    answers.first_goal_nation = "none"
  }
  // Note: for non-0-0 matches this key is set separately from the goals API

  // Q6: match_vibe
  if (totalGoals <= 1) {
    answers.match_vibe = "cagey"
  } else if (totalGoals <= 3 && margin <= 2) {
    answers.match_vibe = "balanced"
  } else if (totalGoals >= 4 && margin <= 2) {
    answers.match_vibe = "open"
  } else {
    answers.match_vibe = "one_sided"
  }

  // Q7: wildcard — can't derive from score alone, requires events API
  // Set to null here; scoring cron should enrich via match events endpoint

  // Q8: exact score — simply "homeScore-awayScore" e.g. "1-0", "2-2"
  answers.exact_score = `${homeScore}-${awayScore}`

  return answers
}

/**
 * Score a single prediction against correct answers.
 * Returns breakdown per question and total score with confidence multiplier applied.
 */
export function scorePrediction(
  userAnswers: PredictionAnswers,
  correctAnswers: Record<string, string>,
  stage: string
): ScoreResult {
  const questions = getQuestionsForStage(stage).filter((q) => q.key !== "confidence")
  const confidence = parseInt(userAnswers.confidence ?? "3", 10)

  let rawScore = 0
  let maxRawScore = 0
  const breakdown: ScoreBreakdown[] = []

  for (const question of questions) {
    // exact_score is scored separately below — flat bonus, no confidence multiplier
    if (question.key === "exact_score") continue

    const userAnswer = userAnswers[question.key]
    const correctAnswer = correctAnswers[question.key]

    // Skip questions we don't have a correct answer for yet (e.g. wildcard)
    if (!correctAnswer || !userAnswer) continue

    const pointsPossible = question.points
    const isCorrect = userAnswer === correctAnswer
    const pointsEarned = isCorrect ? pointsPossible : 0

    rawScore += pointsEarned
    maxRawScore += pointsPossible

    breakdown.push({
      questionKey: question.key,
      userAnswer,
      correctAnswer,
      isCorrect,
      pointsEarned,
      pointsPossible,
    })
  }

  // Apply confidence multiplier to raw score (exact_score excluded above)
  const multiplier = confidenceMultiplier(confidence, rawScore > maxRawScore * 0.5)
  const score = Math.round(rawScore * multiplier)
  const maxPossibleScore = Math.round(maxRawScore * 2) // max is at confidence 5, all correct

  // Exact score bonus — flat +10 if correct, 0 if wrong, added after multiplier
  const exactScoreUserAnswer = userAnswers.exact_score
  const exactScoreCorrect = correctAnswers.exact_score
  let exactScoreBonus = 0
  if (exactScoreUserAnswer && exactScoreCorrect) {
    const isCorrect = exactScoreUserAnswer === exactScoreCorrect
    exactScoreBonus = isCorrect ? SCORING.exact_score : 0
    breakdown.push({
      questionKey: "exact_score",
      userAnswer: exactScoreUserAnswer,
      correctAnswer: exactScoreCorrect,
      isCorrect,
      pointsEarned: exactScoreBonus,
      pointsPossible: SCORING.exact_score,
    })
  }

  const correctWinner = userAnswers.winner === correctAnswers.winner

  return {
    score: score + exactScoreBonus,
    maxPossibleScore: maxPossibleScore + (exactScoreUserAnswer ? SCORING.exact_score : 0),
    breakdown,
    correctWinner,
  }
}

/**
 * Determine if a user's streak should increment or reset.
 * A streak increments when the user correctly called the winner (Q1).
 */
export function updateStreakValues(
  current: number,
  best: number,
  correctWinner: boolean
): { currentStreak: number; bestStreak: number } {
  if (correctWinner) {
    const newCurrent = current + 1
    return { currentStreak: newCurrent, bestStreak: Math.max(best, newCurrent) }
  }
  return { currentStreak: 0, bestStreak: best }
}
