export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
  quiz: QuizQuestion[];
  order: number;
}
