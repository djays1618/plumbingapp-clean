export type JobPayload = {
    issueCode: string;
    issueLabel: string;
    severity: "routine" | "urgent" | "emergency";
    estimatedPriceRange: {
      low: number;
      high: number;
    };
    duration: string;
    answers: Record<string, string>;
    createdAt: string;
  };
  