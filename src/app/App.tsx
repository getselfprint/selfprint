import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { MapScreen } from "./screens/MapScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { InterviewScreen } from "./interview/InterviewScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ExportScreen } from "./screens/ExportScreen";
import { FactsScreen } from "./facts/FactsScreen";
import { TestScreen } from "./test/TestScreen";
import { MirrorScreen } from "./mirror/MirrorScreen";

/**
 * The client-side app lives under /app (spec §17 - the public marketing/legal
 * site is a separate pre-rendered build mounted at /). For now / redirects to
 * the app; the public site arrives in Milestone 1.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<MapScreen />} />
        <Route path="facts" element={<FactsScreen />} />
        <Route path="interview" element={<InterviewScreen />} />
        <Route path="profile" element={<ProfileScreen />} />
        <Route path="mirror" element={<MirrorScreen />} />
        <Route path="test" element={<TestScreen />} />
        <Route path="export" element={<ExportScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
