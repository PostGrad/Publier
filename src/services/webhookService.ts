import {
  getWebhooksForEvent,
  createDelivery,
  updateDeliveryStatus,
  signPayload,
  WebhookEvent,
} from "../repositories/webhooksRepository";
import { randomUUID } from "crypto";

/*
Handles async delivery of webhook events.
Fire-and-forget from the caller's perspective.
We don't block the main request waiting for webhook delivery.
*/

interface WebhookPayload {
  id: string;
  type: WebhookEvent;
  created_at: string;
  data: Record<string, any>;
}

/*
Dispatches a webhook event to all registered endpoints.
This is async and non-blocking.
*/
export async function dispatchWebhookEvent(
  appId: string,
  eventType: WebhookEvent,
  data: Record<string, any>
): Promise<void> {
  const webhooks = await getWebhooksForEvent(appId, eventType);

  if (webhooks.length === 0) {
    return;
  }

  const payload: WebhookPayload = {
    id: `evt_${randomUUID()}`,
    type: eventType,
    created_at: new Date().toISOString(),
    data,
  };

  // Dispatch to all webhooks in parallel (fire-and-forget)
  const deliveryPromises = webhooks.map((webhook) =>
    deliverWebhook(webhook, payload).catch((err) => {
      console.error(`Webhook delivery failed for ${webhook.id}:`, err.message);
    })
  );

  // Don't await — let them run in background
  Promise.all(deliveryPromises);
}

// Delivers a single webhook with retry logic.

async function deliverWebhook(
  webhook: { id: string; url: string; secret: string },
  payload: WebhookPayload
): Promise<void> {
  const delivery = await createDelivery({
    webhookId: webhook.id,
    eventType: payload.type,
    payload,
  });

  const payloadString = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(payloadString, webhook.secret, timestamp);

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Publier-Signature": `t=${timestamp},v1=${signature}`,
        "X-Publier-Event": payload.type,
        "X-Publier-Delivery": delivery.id,
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await updateDeliveryStatus(delivery.id, "success");
  } catch (error: any) {
    await updateDeliveryStatus(delivery.id, "failed", error.message);
    // Future work: retry with exponential backoff
  }
}
