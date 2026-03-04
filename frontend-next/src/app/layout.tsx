import "./globals.css";
import { AppProviders } from "@/providers/app-providers";

export const metadata = {
  title: "BJM Prescrição Assistida",
  description: "MVP frontend para prescrição médica assistida por IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
