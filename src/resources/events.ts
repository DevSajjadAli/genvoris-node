import type { GenvorisConfig } from '../types.js';
import { request } from '../http.js';

export type WidgetEventType =
  | 'WIDGET_OPENED'
  | 'PHOTO_UPLOADED'
  | 'TRYON_GENERATED'
  | 'TRYON_VIEWED'
  | 'RESULT_SHARED'
  | 'ADDED_TO_CART'
  | 'CHECKOUT_STARTED'
  | 'CLOSED';

export interface WidgetEventInput {
  sessionId: string;
  eventType: WidgetEventType;
  productId?: string;
  productTitle?: string;
  pageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface EventBatchInput {
  events: WidgetEventInput[];
}

export interface EventsAccepted {
  accepted: number;
}

export class EventsResource {
  constructor(private readonly config: GenvorisConfig) {}

  /** Track one hosted-widget funnel event. */
  track(event: WidgetEventInput): Promise<EventsAccepted> {
    return request<EventsAccepted>(this.config, '/events', {
      method: 'POST',
      body: event,
    });
  }

  /** Track a batch of 1–50 hosted-widget funnel events. */
  trackBatch(events: WidgetEventInput[]): Promise<EventsAccepted> {
    return request<EventsAccepted>(this.config, '/events', {
      method: 'POST',
      body: { events },
    });
  }
}
