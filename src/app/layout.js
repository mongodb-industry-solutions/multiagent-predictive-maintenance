import "./globals.css";
import Navbar from "@/components/navBar/NavBar";

export const metadata = {
  title: "Agentic Predictive Maintenance",
  description: "A demo by MongoDB Industry Solutions",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="pt-16 min-h-screen h-screen overflow-hidden">
        <Navbar />
        <div className="px-2 sm:px-4 md:px-6 lg:px-8 pb-4 pt-2 w-full h-[calc(100vh-4rem)] max-w-screen-3xl mx-auto overflow-hidden flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
