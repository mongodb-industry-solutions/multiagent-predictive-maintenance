/**
 * Orders started by this user in this browser session. Nothing is fetched
 * about other orders; an order enters the list when the user starts it and
 * stays there (as complete/stopped) after its factory runtime exits.
 */

// A freshly created order may take a refresh or two to appear in the
// simulator's active list; don't mark it complete before then.
const NEW_ORDER_GRACE_MS = 15000;

export function isRunningOrder(order) {
  return order?.status === "running" || order?.status === "paused";
}

export function toSessionOrder(order) {
  return {
    order_id: order.order_id,
    mes_order_id: order.mes_order_id ?? order.id,
    product_id: order.product_id,
    quantity: Number(order.quantity) || null,
    customer: order.customer,
    customer_po: order.customer_po,
    delivery_date: order.delivery_date,
    sales_order: order.sales_order,
    created_at: order.created_at || new Date().toISOString(),
    status: "running",
    completed_units: 0,
    runtime: order.runtime || null,
  };
}

/** Merge live runtime data into the session list and finalize orders that left it. */
export function reconcileSessionOrders(sessionOrders, activeOrders) {
  const live = new Map(activeOrders.map((order) => [order.order_id, order]));
  return sessionOrders.map((order) => {
    const active = live.get(order.order_id);
    if (active) {
      const batch = Number(
        active.runtime?.batch_id ?? active.runtime?.batchId ?? 1
      );
      return {
        ...order,
        ...active,
        status: active.status === "paused" ? "paused" : "running",
        completed_units: Math.max(order.completed_units || 0, batch - 1),
      };
    }
    if (
      isRunningOrder(order) &&
      Date.now() - Date.parse(order.created_at) > NEW_ORDER_GRACE_MS
    ) {
      // Left the active list without an explicit stop: the run finished.
      return {
        ...order,
        status: "complete",
        completed_units: order.quantity || order.completed_units,
        stopped_at: new Date().toISOString(),
        runtime: null,
      };
    }
    return order;
  });
}

export function markSessionOrderStopped(sessionOrders, orderId) {
  return sessionOrders.map((order) =>
    order.order_id === orderId && isRunningOrder(order)
      ? {
          ...order,
          status: "stopped",
          stopped_at: new Date().toISOString(),
          runtime: null,
        }
      : order
  );
}
