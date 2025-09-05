import "./globals.css";
import Nav from "../components/Nav"; // <- add this

export const metadata = {
  title: "BadgeFlow — Staff ID cards",
  description: "BadgeFlow minimal starter"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <Nav /> {/* <- add this */}
        <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}

