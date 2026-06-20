import './globals.css';

export const metadata = {
  title: 'Cursed Shrine — Shows',
  description: 'Personal media library',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
