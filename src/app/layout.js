import "./globals.css";
import Navbar from "@/components/navBar/NavBar";

export const metadata = {
  title: "Agentic Predictive Maintenance",
  description: "A demo by MongoDB Industry Solutions",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="pt-16 bg-gray-50">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
