"use client";

import { useWorkbench } from "@/contexts/WorkbenchContext";
import type { WorkbenchTab } from "@/contexts/WorkbenchContext";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "explorer", label: "Explorer" },
  { id: "chat", label: "AI Chat" },
  { id: "preview", label: "Preview" },
  { id: "logs", label: "Logs" },
];

export default function WorkbenchTabs() {
  const { activeTab, setActiveTab } = useWorkbench();

  return (
    <div className="flex gap-2 border-b border-zinc-800 mb-8">

      {tabs.map((tab) => (

        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as WorkbenchTab)}
          className={`px-5 py-3 rounded-t-lg transition

            ${
              activeTab === tab.id
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
        >
          {tab.label}
        </button>

      ))}

    </div>
  );
}