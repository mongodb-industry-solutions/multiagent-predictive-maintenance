import "./globals.css";

export const metadata = {
  title: "Agentic Predictive Maintenance",
  description: "A demo by MongoDB Industry Solutions",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
