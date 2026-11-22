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
import { ChooseModelScreen } from "./model/ChooseModelScreen";

/**
 * The client-side app, served at the root of its own host (try.selfprint.org).
 * The public marketing/legal site is a separate repo at selfprint.org. Routes
 * are root-relative (the router basename is empty - see main.tsx).
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<MapScreen />} />
        <Route path="model" element={<ChooseModelScreen />} />
        <Route path="facts" element={<FactsScreen />} />
        <Route path="interview" element={<InterviewScreen />} />
        <Route path="profile" element={<ProfileScreen />} />
        <Route path="mirror" element={<MirrorScreen />} />
        <Route path="test" element={<TestScreen />} />
        <Route path="export" element={<ExportScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
