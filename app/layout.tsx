import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
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
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="font-sans bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>
          {/* AuthProvider must wrap everything to provide session state */}
          <AuthProvider>
            {/* We keep AuthenticatedLayout here, but inside that component, 
               you must ensure it doesn't redirect if the path is '/login' 
            */}
            <AuthenticatedLayout>
              {children}
            </AuthenticatedLayout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}