import { EvaluationResult } from '../evaluation/evaluation.types';

export interface OrchestratorInput {
  eventId: string;
  eventType: string;
  userId: string;
  tenantId: string;
  payload: Record<string, unknown>;
  correlationId: string;
}

export interface ChannelOutcome {
  channel: string;
  status: 'sent' | 'failed' | 'skipped' | 'queued';
  providerId?: string;
  error?: string;
  skipReason?: string;
}

export interface OrchestratorResult {
  eventId: string;
  outcomes: ChannelOutcome[];
  evaluationResult: EvaluationResult;
}