import './globals.css';
import Script from 'next/script';
import AuthGate from './components/AuthGate';

export const metadata = {
  title: 'Cursed Shrine — Shows',
  description: 'Personal media library',
  icons: {
    icon: [
      { url: '/favicon-mark.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo-icon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    // Theme: paper (default) matches the blog + cursedshrine.com.
    // Old dark palette is kept in globals.css — use <html data-theme="charcoal"> to restore it.
    <html lang="en">
      <body>
        <AuthGate>{children}</AuthGate>
        <footer className="site-footer">
          <div className="site-footer-inner">
            <span>© {new Date().getFullYear()} Cursed Shrine · built on a Raspberry Pi</span>
            <span className="site-footer-links">
              <a href="https://cursedshrine.com">Home</a>
              <a href="https://gaurav.cursedshrine.com">Portfolio</a>
              <a href="https://cursedshrine.com/blog/">Blog</a>
            </span>
            <span className="credit">
              developed and managed by{' '}
              <a href="https://gaurav.cursedshrine.com" target="_blank" rel="noopener noreferrer">
                Gaurav Rathore
              </a>
            </span>
            <span className="assist">With the help of Claudy Rex (AI Assistant)</span>
          </div>
        </footer>
        {/* Shared Cursed Shrine doodles. data-anchor: margins = outside the .page column;
            the watch page's [data-doodle-slot] strip is filled by the same script. */}
        <Script
          src="https://cursedshrine.com/doodles.js?v=20260914b"
          strategy="afterInteractive"
          data-anchor=".page"
        />
      </body>
    </html>
  );
}
