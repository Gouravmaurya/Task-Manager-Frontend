// app/layout.js
import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'TaskZen',
  description: 'TaskZen is a task management system that allows you to manage your tasks and projects.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="h-screen">
        {/* <header className="bg-white shadow p-4">
          <nav className="container mx-auto flex gap-4">
            <Link href="/" className="text-blue-600 font-semibold hover:underline">Home</Link>
            <Link href="/login" className="text-blue-600 font-semibold hover:underline">Login</Link>
          </nav>
        </header> */}
        <main className="container mx-auto p-4 bg-black">{children}</main>
      </body>
    </html>
  );
}
