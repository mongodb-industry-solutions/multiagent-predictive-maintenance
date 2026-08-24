"use client";

import { useMemo, useState } from "react";
import Icon from "@leafygreen-ui/icon";
import { H2, H3, Body, Description } from "@leafygreen-ui/typography";
import { useFactoryData } from "@/components/factoryDataProvider/FactoryDataProvider";

function defaultDeliveryDate() {
  const date = new Date(Date.now() + 7 * 86400000);
  return date.toISOString().slice(0, 10);
}

function eventSummary(metrics = {}) {
  return Object.entries(metrics)
    .filter(([, value]) => !Array.isArray(value))
    .slice(0, 3)
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${String(value)}`)
    .join(" · ");
}

export default function OperationsWorkspace({ onOpenDocument }) {
  const {
    products,
    stations,
    snapshot,
    selectedOrderId,
    selectOrder,
    startOrder,
    stopOrder,
    busyAction,
  } = useFactoryData();
  const [stationFilter, setStationFilter] = useState("");
  const [form, setForm] = useState({
    product_id: "1",
    quantity: 8,
    customer: "H Motors",
    customer_po: "",
    delivery_date: defaultDeliveryDate(),
  });
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const visibleEvents = useMemo(
    () =>
      snapshot.events
        .filter((event) => !stationFilter || event.station === stationFilter)
        .slice(0, 24),
    [snapshot.events, stationFilter]
  );

  const submitOrder = async (event) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    if (!form.customer.trim()) {
      setFormError("Customer is required.");
      return;
    }
    if (Number(form.quantity) < 1 || Number(form.quantity) > 100) {
      setFormError("Quantity must be between 1 and 100.");
      return;
    }
    if (!form.delivery_date) {
      setFormError("Delivery date is required.");
      return;
    }

    try {
      const order = await startOrder({
        ...form,
        customer: form.customer.trim(),
        customer_po: form.customer_po.trim(),
        quantity: Number(form.quantity),
      });
      setSuccessMessage(`Order ${order.order_id} is now running.`);
    } catch {
      // The provider exposes the API error in the source bar.
    }
  };

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={submitOrder}
          className="min-w-0 rounded-2xl border border-[#D8E3DF] bg-white p-6 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3FCF7] text-[#00684A]">
              <Icon glyph="Plus" size={20} />
            </span>
            <div className="min-w-0">
              <H2 className="!text-xl !leading-7 text-[#112733]">
                Start production
              </H2>
              <Description className="mt-1">
                Create an order and start its factory runtime.
              </Description>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[#3D4F58]">
              Product
              <select
                value={form.product_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    product_id: event.target.value,
                  }))
                }
                className="h-11 w-full min-w-0 rounded-lg border border-[#C1C7C6] bg-white px-3 text-[#112733] outline-none focus:border-[#00A35C]"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code} · {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[#3D4F58]">
              Quantity
              <input
                type="number"
                min="1"
                max="100"
                value={form.quantity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
                className="h-11 w-full min-w-0 rounded-lg border border-[#C1C7C6] px-3 text-[#112733] outline-none focus:border-[#00A35C]"
              />
            </label>
            <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[#3D4F58]">
              Customer
              <input
                type="text"
                value={form.customer}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customer: event.target.value,
                  }))
                }
                className="h-11 w-full min-w-0 rounded-lg border border-[#C1C7C6] px-3 text-[#112733] outline-none focus:border-[#00A35C]"
              />
            </label>
            <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[#3D4F58]">
              Customer PO
              <input
                type="text"
                placeholder="Optional"
                value={form.customer_po}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customer_po: event.target.value,
                  }))
                }
                className="h-11 w-full min-w-0 rounded-lg border border-[#C1C7C6] px-3 text-[#112733] outline-none focus:border-[#00A35C]"
              />
            </label>
            <label className="grid min-w-0 gap-1.5 text-sm font-medium text-[#3D4F58] sm:col-span-2">
              Delivery date
              <input
                type="date"
                value={form.delivery_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    delivery_date: event.target.value,
                  }))
                }
                className="h-11 w-full min-w-0 rounded-lg border border-[#C1C7C6] px-3 text-[#112733] outline-none focus:border-[#00A35C]"
              />
            </label>
          </div>

          {formError && (
            <p className="mt-4 text-sm font-medium text-[#B1371F]">
              {formError}
            </p>
          )}
          {successMessage && (
            <p className="mt-4 text-sm font-medium text-[#00684A]">
              {successMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={busyAction === "start-order"}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00684A] px-5 font-medium text-white hover:bg-[#00543D] disabled:cursor-wait disabled:opacity-60"
          >
            {busyAction === "start-order" ? (
              <>
                <Icon glyph="Refresh" size={17} className="animate-spin" />
                Starting factory…
              </>
            ) : (
              <>
                <Icon glyph="Play" size={17} />
                Start simulation
              </>
            )}
          </button>
        </form>

        <div className="min-w-0 rounded-2xl border border-[#D8E3DF] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <H2 className="!text-xl !leading-7 text-[#112733]">
                Active orders
              </H2>
              <Description className="mt-1">
                Select an order to scope events, alerts, and analytics.
              </Description>
            </div>
            <span className="rounded-full bg-[#E3FCF7] px-3 py-1 text-sm font-semibold text-[#00684A]">
              {snapshot.activeOrders.length} running
            </span>
          </div>

          <div className="cardlist-scrollbar mt-5 grid max-h-[420px] gap-3 overflow-y-auto pr-1">
            {snapshot.activeOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#C1C7C6] bg-[#F8FAF9] p-8 text-center">
                <Icon
                  glyph="Clock"
                  size={24}
                  className="mx-auto text-[#889397]"
                />
                <Body className="mt-2 text-[#5C6C75]">
                  No active orders. Start one to see the line come alive.
                </Body>
              </div>
            ) : (
              snapshot.activeOrders.map((order) => {
                const selected = selectedOrderId === order.order_id;
                const currentBatch = Number(
                  order.runtime?.batch_id ?? order.runtime?.batchId ?? 1
                );
                const completedBatches = Math.max(
                  0,
                  currentBatch - 1
                );
                const progress = Math.min(
                  100,
                  (completedBatches / Math.max(1, order.quantity || 1)) * 100
                );
                return (
                  <div
                    key={order.order_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectOrder(order.order_id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectOrder(order.order_id);
                      }
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-[#00A35C] bg-[#E3FCF7]"
                        : "border-[#D8E3DF] bg-[#F8FAF9] hover:border-[#889397]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Body weight="medium" className="truncate text-[#112733]">
                          {order.order_id}
                        </Body>
                        <Description className="mt-1 truncate">
                          {order.customer || "Factory customer"} ·{" "}
                          {order.sales_order || order.product_id}
                        </Description>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#00684A]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#00A35C]" />
                        Running
                      </span>
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-[#00A35C] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Description className="text-xs">
                        {completedBatches} / {order.quantity || "?"} units
                      </Description>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (
                            window.confirm(
                              `Stop simulation for ${order.order_id}?`
                            )
                          ) {
                            stopOrder(order.order_id);
                          }
                        }}
                        className="rounded-md px-2 py-1 text-xs font-medium text-[#B1371F] hover:bg-[#FDEDEB]"
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#D8E3DF] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <H2 className="!text-xl !leading-7 text-[#112733]">
                Machine events
              </H2>
              <Description className="mt-1">
                Raw station signals entering the unified namespace.
              </Description>
            </div>
            <select
              value={stationFilter}
              onChange={(event) => setStationFilter(event.target.value)}
              className="h-9 rounded-lg border border-[#C1C7C6] bg-white px-3 text-sm text-[#112733]"
            >
              <option value="">All stations</option>
              {stations.map((station) => (
                <option key={station.name} value={station.name}>
                  {station.shortName}
                </option>
              ))}
            </select>
          </div>

          <div className="cardlist-scrollbar mt-5 max-h-[500px] overflow-y-auto px-2">
            {visibleEvents.length === 0 ? (
              <div className="rounded-xl bg-[#F8FAF9] p-8 text-center text-[#5C6C75]">
                No events match this filter.
              </div>
            ) : (
              <ol className="relative ml-1 border-l border-[#D8E3DF] pl-6">
                {visibleEvents.map((event) => (
                  <li key={event.event_id} className="relative pb-5">
                    <span
                      className={`absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
                        event.ok === false ? "bg-[#DB3030]" : "bg-[#00A35C]"
                      }`}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <Body weight="medium" className="text-sm text-[#112733]">
                        {event.station}
                      </Body>
                      <Description className="shrink-0 text-[11px]">
                        {event.ts
                          ? new Date(event.ts).toLocaleTimeString()
                          : "Now"}
                      </Description>
                    </div>
                    <Description className="mt-1 break-words text-xs leading-5">
                      Batch {event.batch_id} · {eventSummary(event.metrics)}
                    </Description>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#D8E3DF] bg-white p-6 shadow-sm">
          <div>
            <H2 className="!text-xl !leading-7 text-[#112733]">
              Recent production units
            </H2>
            <Description className="mt-1">
              Live work in progress and completed genealogy documents.
            </Description>
          </div>

          <div className="cardlist-scrollbar mt-5 grid max-h-[500px] gap-3 overflow-y-auto pr-1">
            {snapshot.liveProductionUnit && (
              <article className="rounded-xl border border-[#00A35C] bg-[#E3FCF7] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Body weight="medium" className="truncate text-[#112733]">
                      Batch {snapshot.liveProductionUnit.batch_id} ·{" "}
                      {snapshot.liveProductionUnit.order_id}
                    </Body>
                    <Description className="mt-1 truncate text-xs">
                      {snapshot.liveProductionUnit.current_stage_label ||
                        "Starting production"}
                    </Description>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#00684A]">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#00A35C]" />
                      In progress
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenDocument(
                          `Production unit · Batch ${snapshot.liveProductionUnit.batch_id}`,
                          `${snapshot.liveProductionUnit.order_id} · live document`,
                          snapshot.liveProductionUnit
                        )
                      }
                      aria-label="View live production unit document"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#00A35C] bg-white font-mono text-sm font-semibold text-[#00684A]"
                    >
                      {"{}"}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#3D4F58]">
                  <span>
                    {
                      Object.keys(
                        snapshot.liveProductionUnit.process || {}
                      ).length
                    }{" "}
                    stations completed
                  </span>
                  <span>Streaming from SCADA state</span>
                </div>
              </article>
            )}

            {!snapshot.liveProductionUnit &&
              snapshot.productionUnits.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#C1C7C6] bg-[#F8FAF9] p-8 text-center">
                <Body className="text-[#5C6C75]">
                  Production units will appear here.
                </Body>
              </div>
              )}

            {snapshot.productionUnits.slice(0, 24).map((unit) => (
                <article
                  key={`${unit.order_id}-${unit.batch_id}`}
                  className="rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Body weight="medium" className="truncate text-[#112733]">
                        Batch {unit.batch_id} · {unit.order_id}
                      </Body>
                      <Description className="mt-1 truncate text-xs">
                        {unit.order?.customer || "Factory customer"} ·{" "}
                        {Number(unit.cycle_time_sec || 0).toFixed(2)}s cycle
                      </Description>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          unit.final_status === "pass"
                            ? "bg-[#E3FCF7] text-[#00684A]"
                            : "bg-[#FDEDEB] text-[#B1371F]"
                        }`}
                      >
                        {unit.final_status === "pass" ? "Pass" : "Fail"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenDocument(
                            `Production unit · Batch ${unit.batch_id}`,
                            `${unit.order_id} · MongoDB document`,
                            unit
                          )
                        }
                        aria-label={`View batch ${unit.batch_id} document`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#C1C7C6] font-mono text-sm font-semibold text-[#00684A] hover:bg-[#E3FCF7]"
                      >
                        {"{}"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5C6C75]">
                    <span>{unit.cells?.length || 0} cells</span>
                    <span>{Object.keys(unit.process || {}).length} processes</span>
                    <span>
                      {unit.completed_at
                        ? new Date(unit.completed_at).toLocaleString()
                        : "Completed"}
                    </span>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
