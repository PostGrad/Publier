import { pool } from "../infra/db";
import { randomUUID, randomBytes, createHmac } from "crypto";

// TYPES

export const WEBHOOK_EVENTS = [
  "post.created",
  "post.scheduled",
  "post.published",
  "post.failed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface Webhook {
  id: string;
  app_id: string;
  url: string;
  events: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: object;
  status: "pending" | "success" | "failed";
  attempts: number;
  last_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
}

// WEBHOOK CRUD

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export async function createWebhook({
  appId,
  url,
  events = [],
}: {
  appId: string;
  url: string;
  events?: string[];
}): Promise<{ webhook: Webhook; secret: string }> {
  const id = randomUUID();
  const secret = generateWebhookSecret();

  const result = await pool.query(
    `
    INSERT INTO webhooks (id, app_id, url, secret, events)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, app_id, url, events, enabled, created_at, updated_at
    `,
    [id, appId, url, secret, events]
  );

  return {
    webhook: result.rows[0],
    secret, // Shown only once!
  };
}

export async function listWebhooksByApp(appId: string): Promise<Webhook[]> {
  const result = await pool.query(
    `
    SELECT id, app_id, url, events, enabled, created_at, updated_at
    FROM webhooks
    WHERE app_id = $1
    ORDER BY created_at DESC
    `,
    [appId]
  );

  return result.rows;
}

export async function getWebhookById(
  id: string,
  appId: string
): Promise<Webhook | null> {
  const result = await pool.query(
    `
    SELECT id, app_id, url, events, enabled, created_at, updated_at
    FROM webhooks
    WHERE id = $1 AND app_id = $2
    `,
    [id, appId]
  );

  return result.rows[0] || null;
}

export async function deleteWebhook(
  id: string,
  appId: string
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM webhooks WHERE id = $1 AND app_id = $2`,
    [id, appId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function updateWebhookEnabled(
  id: string,
  appId: string,
  enabled: boolean
): Promise<Webhook | null> {
  const result = await pool.query(
    `
    UPDATE webhooks
    SET enabled = $1
    WHERE id = $2 AND app_id = $3
    RETURNING id, app_id, url, events, enabled, created_at, updated_at
    `,
    [enabled, id, appId]
  );

  return result.rows[0] || null;
}

// WEBHOOK DELIVERY

// Gets all enabled webhooks that should receive an event
export async function getWebhooksForEvent(
  appId: string,
  eventType: WebhookEvent
): Promise<Array<{ id: string; url: string; secret: string }>> {
  const result = await pool.query(
    `
    SELECT id, url, secret
    FROM webhooks
    WHERE app_id = $1 
      AND enabled = true
      AND (events = '{}' OR $2 = ANY(events))
    `,
    [appId, eventType]
  );

  return result.rows;
}

//Creates a delivery record for tracking

export async function createDelivery({
  webhookId,
  eventType,
  payload,
}: {
  webhookId: string;
  eventType: string;
  payload: object;
}): Promise<WebhookDelivery> {
  const id = randomUUID();

  const result = await pool.query(
    `
    INSERT INTO webhook_deliveries (id, webhook_id, event_type, payload, status)
    VALUES ($1, $2, $3, $4, 'pending')
    RETURNING *
    `,
    [id, webhookId, eventType, JSON.stringify(payload)]
  );

  return result.rows[0];
}

// Updates delivery status after attempt

export async function updateDeliveryStatus(
  id: string,
  status: "success" | "failed",
  error?: string
): Promise<void> {
  await pool.query(
    `
    UPDATE webhook_deliveries
    SET status = $1,
        attempts = attempts + 1,
        last_attempt_at = now(),
        last_error = $2
    WHERE id = $3
    `,
    [status, error || null, id]
  );
}

// SIGNATURE GENERATION

/*
Generates HMAC signature for webhook payload.
Included a timestamp to prevent replay attacks.
The receiver should verify the timestamp is recent.
*/
export function signPayload(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signedPayload = `${timestamp}.${payload}`;
  return createHmac("sha256", secret).update(signedPayload).digest("hex");
}
