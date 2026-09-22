export interface DashboardMetric {
  label: string;
  value: number;
  suffix?: string;
}

export interface DailyQuestionStat {
  day: string;
  count: number;
}

export interface DashboardData {
  totalConversations: number;
  autoResolutionRate: number;
  escalationsCount: number;
  averageSatisfaction: number;
  totalDocuments?: number;
  indexedDocuments?: number;
  pendingIndexations?: number;
  failedIndexations?: number;
  categoriesCount?: number;
  questionsWithoutAnswers?: number;
  customerSatisfactionRate?: number;
  frequentlyAskedQuestions?: string[];
  documentationCoverage?: number;
  dailyQuestions: DailyQuestionStat[];
  unresolvedQuestions: string[];
}
