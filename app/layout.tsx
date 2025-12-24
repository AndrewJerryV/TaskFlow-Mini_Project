import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';

export const metadata = {
  title: 'TaskFlow - Project Management',
  description: 'A modern project management and task tracking tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <AuthProvider>
          <AuthenticatedLayout>
            {children}
          </AuthenticatedLayout>
        </AuthProvider>
      </body>
    </html>
  );
}