import FactoryDataProvider from "@/components/factoryDataProvider/FactoryDataProvider";

export default function FactoryChatLayout({ children }) {
  return <FactoryDataProvider>{children}</FactoryDataProvider>;
}
