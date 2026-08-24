"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@leafygreen-ui/icon";
import { H2, H3, Body, Description } from "@leafygreen-ui/typography";
import PageContainer from "@/components/pageContainer/PageContainer";
import FactorySourceBar from "@/components/factorySourceBar/FactorySourceBar";
import { useFactoryData } from "@/components/factoryDataProvider/FactoryDataProvider";

function formatMetricName(value) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatMetricValue(value) {
  if (typeof value === "boolean") return value ? "Pass" : "Fail";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return value.toLocaleString();
  return value ?? "—";
}

export default function FactoryExplorerPage() {
  const {
    stations,
    snapshot,
    selectedOrderId,
    selectOrder,
    source,
    sources,
  } = useFactoryData();
  const [selectedStationIndex, setSelectedStationIndex] = useState(0);
  const selectedStation = stations[selectedStationIndex];

  const latestEvent = useMemo(() => {
    const liveResult = snapshot.scadaState?.last_results?.[selectedStation.name];
    if (liveResult) {
      return {
        ...liveResult,
        ts: liveResult.ts || liveResult.ts_iso,
      };
    }
    return snapshot.events.find(
      (event) => event.station === selectedStation.name
    );
  }, [selectedStation.name, snapshot.events, snapshot.scadaState]);

  const currentStageLabel = snapshot.scadaState?.current_stage_label;
  const isCurrentStation =
    currentStageLabel === selectedStation.output ||
    snapshot.scadaState?.station === selectedStation.name;
  const metrics = latestEvent?.metrics || {};

  return (
    <PageContainer
      eyebrow="Unified Namespace · Factory walkthrough"
      title="Explore Leafy Factory"
      description="Follow an EV battery module from incoming cells to end-of-line validation. Every station publishes a contextual event into one shared operational namespace."
      activeStageId="unified-namespace"
      actions={
        <>
          <Link
            href="/unified-namespace"
            className="inline-flex items-center gap-2 rounded-lg border border-[#C1C7C6] bg-white px-4 py-2.5 font-medium text-[#112733] hover:bg-[#F1F5F3]"
          >
            <Icon glyph="ArrowLeft" size={16} />
            UNS overview
          </Link>
          <Link
            href="/unified-namespace/uns-in-action"
            className="inline-flex items-center gap-2 rounded-lg bg-[#00684A] px-4 py-2.5 font-medium text-white hover:bg-[#00543D]"
          >
            Open UNS in Action
            <Icon glyph="ArrowRight" size={16} />
          </Link>
        </>
      }
    >
      <FactorySourceBar />

      <section className="rounded-2xl border border-[#D8E3DF] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Body
              weight="medium"
              className="uppercase tracking-[0.13em] text-[#00684A]"
            >
              Leafy Industries / Battery Plant / EV Module Line
            </Body>
            <H2 className="mt-2 text-[#112733]">Production flow</H2>
            <Description className="mt-1 max-w-2xl leading-6">
              Select a station to inspect its role, material flow, and latest UNS
              event.
            </Description>
          </div>

          {snapshot.activeOrders.length > 0 && (
            <label className="grid min-w-[240px] gap-1 text-sm font-medium text-[#3D4F58]">
              Live production order
              <select
                value={selectedOrderId || ""}
                onChange={(event) => selectOrder(event.target.value)}
                className="h-10 rounded-lg border border-[#C1C7C6] bg-white px-3 text-[#112733] outline-none focus:border-[#00A35C]"
              >
                {snapshot.activeOrders.map((order) => (
                  <option key={order.order_id} value={order.order_id}>
                    {order.order_id} · {order.customer || "Factory order"}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-6 overflow-x-auto pb-2">
          <div className="flex min-w-[1040px] items-start">
            {stations.map((station, index) => {
              const selected = selectedStationIndex === index;
              const completed = Boolean(
                snapshot.scadaState?.last_results?.[station.name]
              );
              const active = currentStageLabel === station.output;
              return (
                <div key={station.name} className="flex flex-1 items-start">
                  <button
                    type="button"
                    onClick={() => setSelectedStationIndex(index)}
                    className="group flex w-[86px] shrink-0 flex-col items-center text-center"
                    aria-pressed={selected}
                  >
                    <span
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition ${
                        selected
                          ? "border-[#00684A] bg-[#00684A] text-white shadow-md"
                          : active
                            ? "border-[#00A35C] bg-[#E3FCF7] text-[#00684A]"
                            : completed
                              ? "border-[#00A35C] bg-white text-[#00684A]"
                              : "border-[#C1C7C6] bg-[#F8FAF9] text-[#5C6C75]"
                      }`}
                    >
                      {completed && !selected ? (
                        <Icon glyph="Checkmark" size={17} />
                      ) : (
                        index + 1
                      )}
                      {active && (
                        <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-[#00ED64]" />
                      )}
                    </span>
                    <span
                      className={`mt-2 text-xs leading-4 ${
                        selected
                          ? "font-semibold text-[#00684A]"
                          : "text-[#5C6C75] group-hover:text-[#112733]"
                      }`}
                    >
                      {station.shortName}
                    </span>
                  </button>
                  {index < stations.length - 1 && (
                    <span
                      className={`mt-5 h-0.5 flex-1 ${
                        completed ? "bg-[#00A35C]" : "bg-[#D8E3DF]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-[#D8E3DF] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Body weight="medium" className="text-[#00684A]">
                Station {String(selectedStationIndex + 1).padStart(2, "0")}
              </Body>
              <H2 className="mt-1 text-[#112733]">{selectedStation.name}</H2>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                isCurrentStation
                  ? "bg-[#E3FCF7] text-[#00684A]"
                  : "bg-[#F1F5F3] text-[#5C6C75]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isCurrentStation ? "bg-[#00A35C]" : "bg-[#889397]"
                }`}
              />
              {isCurrentStation ? "Processing now" : "Ready"}
            </span>
          </div>
          <Description className="mt-4 max-w-3xl text-base leading-7 text-[#3D4F58]">
            {selectedStation.description}
          </Description>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#F1F5F3] p-4">
              <Description>Material input</Description>
              <H3 className="mt-1 text-base text-[#112733]">
                {selectedStation.input}
              </H3>
            </div>
            <div className="rounded-xl bg-[#E3FCF7] p-4">
              <Description>UNS output context</Description>
              <H3 className="mt-1 text-base text-[#00684A]">
                {selectedStation.output}
              </H3>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Body weight="medium" className="text-[#112733]">
                Latest station event
              </Body>
              {latestEvent?.ts && (
                <Description className="text-xs">
                  {new Date(latestEvent.ts).toLocaleString()}
                </Description>
              )}
            </div>
            {Object.keys(metrics).length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {Object.entries(metrics)
                  .slice(0, 6)
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-4"
                    >
                      <Description className="truncate">
                        {formatMetricName(key)}
                      </Description>
                      <p className="mt-2 truncate text-lg font-semibold text-[#112733]">
                        {formatMetricValue(value)}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#C1C7C6] bg-[#F8FAF9] p-6 text-center">
                <Icon
                  glyph="ActivityFeed"
                  size={24}
                  className="mx-auto text-[#889397]"
                />
                <Body className="mt-2 text-[#5C6C75]">
                  Start an order in UNS in Action to stream live station data.
                </Body>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-2xl bg-[#112733] p-6 text-white shadow-sm">
            <Body
              weight="medium"
              className="uppercase tracking-[0.13em] text-[#B8E4D8]"
            >
              Context path
            </Body>
            <p className="mt-3 break-words font-mono text-sm leading-7 text-white">
              leafy-factory / module-assembly / ev-line /{" "}
              {selectedStation.name.toLowerCase().replaceAll(" ", "-")}
            </p>
            <div className="mt-5 border-t border-white/15 pt-5">
              <Body className="leading-6 text-[#DCEBE7]">
                This stable path lets OT events, MES orders, ERP context, quality
                results, and maintenance signals resolve to the same asset and
                production unit.
              </Body>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D8E3DF] bg-white p-6 shadow-sm">
            <Body weight="medium" className="text-[#00684A]">
              Current data source
            </Body>
            <H3 className="mt-2 text-[#112733]">
              {source === sources.LOCAL
                ? "Local resilient simulation"
                : "Leafy Factory API"}
            </H3>
            <Description className="mt-2 leading-6">
              {source === sources.LOCAL
                ? "A browser-based factory keeps the full story demonstrable without external dependencies."
                : "Live station events and runtime state are read from the deployed factory simulator."}
            </Description>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                ["Stations", stations.length],
                ["Events", snapshot.events.length],
                ["Units", snapshot.productionUnits.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-[#F1F5F3] p-3">
                  <p className="text-xl font-semibold text-[#112733]">{value}</p>
                  <Description className="text-xs">{label}</Description>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
