/**
 * Barrel for the Kre8trix API layer.
 *
 * Re-exports the core client (src/lib/api.ts), the shared domain types, and
 * the mock-registry registration hook so domain modules can import
 * everything from one place:
 *
 *   import { get, registerMockHandler, type Advance } from '@/lib/api/index';
 */
export {
  ApiError,
  request,
  get,
  post,
  put,
  del,
  delay,
  getAuthToken,
} from '../api';
export type { HttpMethod, RequestOptions } from '../api';

export { registerMockHandler } from '../mock/registry';
export type { MockHandler } from '../mock/registry';

export type {
  Currency,
  CCSTierName,
  User,
  CreatorProfile,
  TransactionType,
  TransactionStatus,
  Transaction,
  Balance,
  CCSSignal,
  CCSHistoryPoint,
  CCSScore,
  CCSTier,
  ForecastPoint,
  ForecastRange,
  AdvanceStatus,
  Advance,
  PlatformConnection,
  Notification,
} from './types';
