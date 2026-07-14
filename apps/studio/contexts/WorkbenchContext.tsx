"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type WorkbenchTab =
  | "overview"
  | "explorer"
  | "chat"
  | "preview"
  | "logs";

interface WorkbenchContextData {
  activeTab: WorkbenchTab;
  setActiveTab: (tab: WorkbenchTab) => void;
}

const WorkbenchContext = createContext(
  {} as WorkbenchContextData
);

export function WorkbenchProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeTab, setActiveTab] =
    useState<WorkbenchTab>("overview");

  return (
    <WorkbenchContext.Provider
      value={{
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </WorkbenchContext.Provider>
  );
}

export function useWorkbench() {
  return useContext(WorkbenchContext);
}