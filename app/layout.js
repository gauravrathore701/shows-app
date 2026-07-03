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
        <div className="dev-credit">
          developed and managed by{' '}
          <a href="https://gaurav.cursedshrine.com" target="_blank" rel="noopener noreferrer">
            Gaurav Rathore
          </a>
        </div>
      </body>
    </html>
  );
}
