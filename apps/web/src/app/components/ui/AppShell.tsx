import { Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <main className="shell">
      <Outlet />
    </main>
  );
}
