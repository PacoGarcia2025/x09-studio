import AppHeader from "@/components/layout/AppHeader";
import Sidebar from "@/components/layout/Sidebar";
import Workspace from "@/components/layout/Workspace";
import StatusBar from "@/components/layout/StatusBar";

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-zinc-950">

      <AppHeader />

      <div className="flex flex-1 overflow-hidden">

        <Sidebar />

        <Workspace />

      </div>

      <StatusBar />

    </div>
  );
}