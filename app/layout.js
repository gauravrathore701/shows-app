import './globals.css';
import AuthGate from './components/AuthGate';

export const metadata = {
  title: 'Cursed Shrine — Shows',
  description: 'Personal media library',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
