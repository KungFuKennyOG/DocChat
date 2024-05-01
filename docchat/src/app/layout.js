import "./globals.css";
import { ThemeProvider } from "@mui/material";
import { defaultTheme } from "./theme/theme";

const metadata = {
  title: "DocChat",
  description: "Doctor - patient chat app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={defaultTheme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
