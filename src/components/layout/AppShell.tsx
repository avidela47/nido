import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-4 p-4">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Topbar />
          <main className="min-w-0 flex-1 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 md:p-6 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}



