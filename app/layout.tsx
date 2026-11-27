import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: {
    default: "LabsRadar | Book diagnostic tests from NABL certified labs",
    template: "%s | LabsRadar",
  },
  description:
    "Compare NABL certified labs near you, choose your tests, and book a lab visit or home sample collection.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t bg-white mt-12">
          <div className="max-w-5xl mx-auto px-6 py-6 text-sm text-gray-600">
            &copy; {new Date().getFullYear()} LabsRadar. Diagnostic tests from NABL certified partner labs.
          </div>
        </footer>
      </body>
    </html>
  );
}
