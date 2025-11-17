import { AgeGroup, Language } from "@prisma/client";

export interface SubmissionResult {
  submission: {
    id: string;
    score: number;
    colorLevel: string;
    submittedAt: Date;
  };
  groupAverage: number | null;
  user: {
    id: string;
    language: Language;
    ageGroup: AgeGroup;
  };
  cooldown: {
    canSubmitAgain: boolean;
    nextSubmissionTime?: Date;
    timeRemaining?: string;
  };
}

export interface UserWithSubmissions {
  userId: string;
  deviceId: string;
  language: string;
  ageGroup: string | null;
  lastSeenAt: Date;
  createdAt: Date;
  totalSubmissions: number;
  submissions: Array<{
    id: string;
    ipHash: string;
    responses: Array<{
      questionKey: string;
      question: string;
      answerText: string;
    }>;
    score: number;
    colorLevel: string;
    userAgent?: string;
    submittedAt: Date;
    createdAt: Date;
  }>;
}