import "./globals.css";

export const metadata = {
  title: "Tuğba Kuruyemiş — Hediye Çarkı",
  description: "Tuğba Kuruyemiş Mağazaları Özel Hediye Çarkı Sistemi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        {children}
      </body>
    </html>
  );
}
