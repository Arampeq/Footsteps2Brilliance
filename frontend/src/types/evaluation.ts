export interface RubricDimension {
  score: number;
  feedback: string;
}

export interface PageEvaluation {
  pageNumber: number;
  label: string;
  imageUrl: string;
  pageText: string;
  feedback: string;
}

export type BookGenre =
  | 'Fiction'
  | 'Non-fiction'
  | 'Instructional'
  | 'Personal Narrative'
  | 'Other';

export type EvaluationFocus =
  | 'balanced'
  | 'creativity'
  | 'language'
  | 'structure'
  | 'illustrations'
  | 'effort';

export interface EvaluationResult {
  bookTitle: string;
  bookUrl: string;

  genre: BookGenre;
  overallScore: number;
  overallGrade: string;

  teacherSummary: string;

  rubric: {
    contentStructure: RubricDimension;
    languageAndVocabulary: RubricDimension;
    illustrationTextHarmony: RubricDimension;
    creativityAndVoice: RubricDimension;
    effortAndDepth: RubricDimension;
  };

  highlights: string[];
  suggestions: string[];

  pages: PageEvaluation[];
  orientation: 'portrait' | 'landscape';

  confidence: 'high' | 'medium' | 'low';
  confidenceNote: string | null;
  uncertainties: string[];

  cached?: boolean;
  focus?: EvaluationFocus;
}

export type EvaluationState =
  | { status: 'idle' }
  | { status: 'processing' }
  | { status: 'success'; result: EvaluationResult }
  | { status: 'error'; message: string };
