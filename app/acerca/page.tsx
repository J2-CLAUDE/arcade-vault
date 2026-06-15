import type { Metadata } from "next";
import About from "@/components/about";

export const metadata: Metadata = {
  title: "Acerca de · Arcade Vault",
};

export default function AcercaPage() {
  return <About />;
}
