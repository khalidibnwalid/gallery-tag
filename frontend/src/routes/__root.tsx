import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/routes/-components/Sidebar";
import SearchBox from "./-components/SearchBox";

const RootLayout = () => (
  <>
    <Sidebar />
    <SearchBox />
    <main className="ps-20">
      <Outlet />
    </main>
  </>
);

export const Route = createRootRoute({ component: RootLayout });
