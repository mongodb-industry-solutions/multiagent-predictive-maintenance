import LeafyFactoryExplainer from "@/components/leafyFactory/LeafyFactoryExplainer";

export const metadata = {
  title: "Leafy Factory",
  description:
    "Explore the EV battery production process and the systems behind the Leafy Factory simulator.",
};

// The image is built before Drone injects LEAFY_*_URL. Render on each request
// so those deployment values are read from the running container.
export const dynamic = "force-dynamic";

function optionalUrl(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export default function LeafyFactoryPage() {
  return (
    <LeafyFactoryExplainer
      externalUrls={{
        LEAFY_ERP_URL: optionalUrl("LEAFY_ERP_URL"),
        LEAFY_MES_URL: optionalUrl("LEAFY_MES_URL"),
        LEAFY_SCADA_URL: optionalUrl("LEAFY_SCADA_URL"),
      }}
    />
  );
}
