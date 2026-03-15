import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ComposerTrigger } from '@/components/composer/composer-trigger';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopBar />

      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 pb-20 md:px-6 md:py-8 md:pb-8">
          {children}
        </div>
      </main>

      <BottomNav />
      <ComposerTrigger />
    </div>
  );
}
