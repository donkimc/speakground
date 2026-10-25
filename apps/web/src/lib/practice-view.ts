export type ItemFlag = {
  itemIndex: number;
  kind: "wrong" | "too-hard" | "too-easy";
};

export type PracticeQuestionView = {
  skill: string;
  question: string;
  options: string[];
};

export type PracticeReviewView = PracticeQuestionView & {
  chosen: number;
  answerIndex: number;
  correct: boolean;
  explanation: { en: string; ko: string };
};

export type WritingFeedbackView = {
  score: number;
  corrections: {
    original: string;
    suggestion: string;
    note: { en: string; ko: string };
  }[];
  better: string;
  summary: { en: string; ko: string };
};

export type PracticeWritingResult = {
  prompt: string;
  promptKo: string;
  text: string;
  feedback: WritingFeedbackView;
};

export type PracticeView = {
  level: string;
  topic: string;
  showKorean: boolean;
} & (
  | {
      status: "review";
      cards: { id: string; term: string; meaningKo: string; example: string }[];
    }
  | { status: "questions"; questions: PracticeQuestionView[]; flags: ItemFlag[] }
  | { status: "writing"; score: number; total: number; prompt: string; promptKo: string }
  | {
      status: "done";
      score: number;
      total: number;
      review: PracticeReviewView[];
      writing: PracticeWritingResult;
      flags: ItemFlag[];
    }
);
