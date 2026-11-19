import { Outlet } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";

/** Shared chrome for every app screen: the header plus the routed content. */
export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <Outlet />
    </div>
  );
}
