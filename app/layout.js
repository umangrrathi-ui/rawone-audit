import "./globals.css";

export const metadata = {
  title: "Free Instagram + Google Audit – RawOne",
  description: "Get a free audit of your business Instagram and Google profile in under a minute. Score, issues and 3 quick fixes — by RawOne, Ahmedabad.",
  robots: { index: true, follow: true },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 166 138'%3E%3Cpath fill='%23FE6037' d='M132.862 0C134.067 0 135.241.391 136.206 1.114c18.815 14.107 17.577 42.714-2.386 55.143L4.624 136.688c-2.367 1.474-5.296-.772-4.487-3.44L38.607 6.43C39.766 2.611 43.286 0 47.277 0h85.585zm31.415 128.719c2.522 1.645 1.346 5.564-1.665 5.55l-75.96-.367c-13.234-.064-23.683-11.259-22.834-24.466l37.34-21.887 63.119 41.17z'/%3E%3C/svg%3E",
  },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#FEFAF6" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Outfit:wght@300;400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
