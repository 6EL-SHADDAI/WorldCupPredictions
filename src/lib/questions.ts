import type { QuestionOption } from "@/db/schema"

export type QuestionTemplate = {
  key: string
  text: (homeTeam: string, awayTeam: string) => string
  options: (homeTeam: string, awayTeam: string) => QuestionOption[]
  isKnockoutOnly: boolean
  sortOrder: number
  points: number // base points if correct
  isScoreInput?: boolean // renders as two number steppers instead of option buttons
  noConfidenceMultiplier?: boolean // if true, confidence multiplier does NOT apply
}

// ─── Scoring constants ────────────────────────────────────────────────────────

export const SCORING = {
  winner: 3,
  margin: 1,
  extra_time: 1,
  penalties: 1,
  first_goal_nation: 1,
  match_vibe: 1,
  wildcard: 2,
  exact_score: 10, // fixed bonus — correct gets +10, wrong gets 0, no confidence multiplier
  // Q8 (confidence) is a multiplier, not a standalone question
} as const

export const MAX_SCORE_GROUP = 8 // no extra_time / penalties in groups
export const MAX_SCORE_KNOCKOUT = 10

// Confidence multiplier applied to total score
export const confidenceMultiplier = (confidence: number, correct: boolean): number => {
  if (confidence === 5) return correct ? 2 : 0
  if (confidence === 4) return correct ? 1.5 : 0.5
  return 1 // confidence 1-3: no multiplier, no penalty
}

// ─── Question templates ───────────────────────────────────────────────────────

export const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    key: "winner",
    text: (home, away) => `Who wins the match?`,
    options: (home, away) => [
      { value: "home", label: home },
      { value: "draw", label: "Draw" },
      { value: "away", label: away },
    ],
    isKnockoutOnly: false,
    sortOrder: 1,
    points: SCORING.winner,
  },
  {
    key: "margin",
    text: () => "What's the winning margin?",
    options: () => [
      { value: "1", label: "1 goal" },
      { value: "2", label: "2 goals" },
      { value: "3+", label: "3+ goals" },
      { value: "draw", label: "It's a draw" },
    ],
    isKnockoutOnly: false,
    sortOrder: 2,
    points: SCORING.margin,
  },
  {
    key: "extra_time",
    text: () => "Does it go to extra time?",
    options: () => [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    isKnockoutOnly: true, // only shown in knockout rounds
    sortOrder: 3,
    points: SCORING.extra_time,
  },
  {
    key: "penalties",
    text: () => "Does it go to penalties?",
    options: () => [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    isKnockoutOnly: true,
    sortOrder: 4,
    points: SCORING.penalties,
  },
  {
    key: "first_goal_nation",
    text: (home, away) => "Which team scores first?",
    options: (home, away) => [
      { value: "home", label: home },
      { value: "away", label: away },
      { value: "none", label: "No goals (0-0)" },
    ],
    isKnockoutOnly: false,
    sortOrder: 5,
    points: SCORING.first_goal_nation,
  },
  {
    key: "match_vibe",
    text: () => "What's the vibe of this match?",
    options: () => [
      { value: "cagey", label: "Cagey (0-1 total goals)" },
      { value: "balanced", label: "Balanced (2-3 goals)" },
      { value: "open", label: "Open (4+ goals)" },
      { value: "one_sided", label: "One-sided (3+ goal gap)" },
    ],
    isKnockoutOnly: false,
    sortOrder: 6,
    points: SCORING.match_vibe,
  },
  {
    key: "wildcard",
    text: () => "Pick your wildcard event",
    options: () => [
      { value: "red_card", label: "Red card shown" },
      { value: "var_drama", label: "VAR overturns a goal" },
      { value: "own_goal", label: "Own goal scored" },
      { value: "none", label: "None of the above" },
    ],
    isKnockoutOnly: false,
    sortOrder: 7,
    points: SCORING.wildcard,
  },
  {
    key: "exact_score",
    text: (home, away) => `Exact score? (${home} – ${away})`,
    options: () => [], // rendered as number steppers, not option buttons
    isKnockoutOnly: false,
    sortOrder: 8,
    points: SCORING.exact_score,
    isScoreInput: true,
    noConfidenceMultiplier: true, // bonus is flat — confidence doesn't affect it
  },
  {
    key: "confidence",
    text: () => "How confident are you overall?",
    options: () => [
      { value: "1", label: "Just guessing" },
      { value: "2", label: "Not sure" },
      { value: "3", label: "Fairly confident" },
      { value: "4", label: "Very confident" },
      { value: "5", label: "Absolutely certain" },
    ],
    isKnockoutOnly: false,
    sortOrder: 8,
    points: 0, // multiplier only, not standalone points
  },
]

export const getQuestionsForStage = (stage: string): QuestionTemplate[] => {
  const isKnockout = stage !== "group"
  return QUESTION_TEMPLATES.filter((q) => !q.isKnockoutOnly || isKnockout)
}
