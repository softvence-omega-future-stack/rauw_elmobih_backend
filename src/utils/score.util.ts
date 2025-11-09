import { ColorLevel } from '@prisma/client';

/**
 * Calculate WHO-5 score from responses
 * Input: responses object { q1: 2, q2: 4, q3: 1, q4: 3, q5: 2 }
 * Output: { rawScore: 12, score: 48, colorLevel: 'ORANGE' }
 */
export function calculateWHO5Score(responses: {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
}): {
  rawScore: number;
  score: number;
  colorLevel: ColorLevel;
} {
  // Validate responses (0-5 for each question)
  Object.values(responses).forEach((value) => {
    if (value < 0 || value > 5) {
      throw new Error('Each response must be between 0 and 5');
    }
  });

  // Calculate raw score (sum of all responses, 0-25)
  const rawScore = responses.q1 + responses.q2 + responses.q3 + responses.q4 + responses.q5;

  // Convert to percentage (0-100)
  const score = Math.round((rawScore / 25) * 100);

  // Determine color level
  const colorLevel = getColorLevel(score);

  return { rawScore, score, colorLevel };
}

/**
 * Get color level based on score
 */
export function getColorLevel(score: number): ColorLevel {
  if (score >= 84) return ColorLevel.GREEN; // Excellent
  if (score >= 44) return ColorLevel.ORANGE; // Moderate
  return ColorLevel.RED; // Needs Support
}

/**
 * Get score category name
 */
export function getScoreCategory(score: number): string {
  if (score >= 84) return 'Excellent';
  if (score >= 44) return 'Moderate';
  return 'Needs Support';
}

/**
 * Get feedback message based on score
 */
export function getScoreFeedback(score: number): string {
  if (score >= 84) {
    return "Great! You're doing well overall. Your wellbeing is in a good place. Keep nurturing the practices that support your well-being.";
  }
  if (score >= 44) {
    return "Moderate well-being reported across all dimensions. Some positive moments throughout the week. Energy fluctuations noticed.";
  }
  return "Let's have a quick chat about how you're feeling. It seems like things have been difficult lately. Taking small steps toward self-care can make a difference.";
}

/**
 * Validate WHO-5 responses
 */
export function validateWHO5Responses(responses: any): boolean {
  if (!responses || typeof responses !== 'object') return false;
  
  const requiredKeys = ['q1', 'q2', 'q3', 'q4', 'q5'];
  
  for (const key of requiredKeys) {
    if (!(key in responses)) return false;
    const value = responses[key];
    if (typeof value !== 'number' || value < 0 || value > 5) return false;
  }
  
  return true;
}