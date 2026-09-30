import { NextResponse } from "next/server";
import {
  createFactoryOrder,
  listActiveOrderSummaries,
} from "@/lib/factory/serverFactoryClient";

const RETRY_DELAYS_MS = [0, 600, 1200, 2400];
let ensurePromise = null;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deliveryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

async function ensureOrder(marker) {
  let lastError = null;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await wait(delay);

    const activeOrders = await listActiveOrderSummaries();
    if (activeOrders.length > 0) {
      return { ...activeOrders[0], guardian_created: false };
    }

    try {
      const order = await createFactoryOrder({
        product_id: "1",
        quantity: 20,
        customer: "Factory Chat Demo",
        customer_po: `UNS-${marker}-${Date.now()
          .toString(36)
          .toUpperCase()}`,
        delivery_date: deliveryDate(),
      });
      return { ...order, guardian_created: true };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Unable to ensure a running order");
}

export async function POST(request) {
  let marker = "DEMO";
  try {
    const body = await request.json();
    if (/^[A-Z0-9-]{1,24}$/i.test(body?.marker || "")) {
      marker = body.marker.toUpperCase();
    }
  } catch {
    // A marker is optional; the order contract remains server controlled.
  }

  if (!ensurePromise) {
    ensurePromise = ensureOrder(marker).finally(() => {
      ensurePromise = null;
    });
  }

  try {
    return NextResponse.json(await ensurePromise);
  } catch (error) {
    console.error("Unable to ensure Factory Chat order:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to ensure a running order" },
      { status: error?.status || 502 }
    );
  }
}
