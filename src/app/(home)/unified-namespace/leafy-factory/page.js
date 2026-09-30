import LeafyFactoryExplainer from "@/components/leafyFactory/LeafyFactoryExplainer";

export const metadata = {
  title: "Leafy Factory",
  description:
    "Explore the EV battery production process and the systems behind the Leafy Factory simulator.",
};

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
