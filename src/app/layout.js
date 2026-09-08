import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Leafy Factory | MongoDB Manufacturing Demo",
  description:
    "From unified factory data to AI workflows and autonomous operations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
