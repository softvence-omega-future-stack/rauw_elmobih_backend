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