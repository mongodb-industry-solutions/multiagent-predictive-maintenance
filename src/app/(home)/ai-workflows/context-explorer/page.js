import ContextExplorerWorkspace from "@/components/contextExplorer/ContextExplorerWorkspace";

export const metadata = {
  title: "Connected Factory Context Explorer | Leafy Factory",
  description:
    "Explore read-time operational context, interval joins, natural-language aggregations, and signal-shape vector search across EV battery pack welding data.",
};

export default function ConnectedFactoryContextExplorerPage() {
  return <ContextExplorerWorkspace />;
}
