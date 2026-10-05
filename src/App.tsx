import { AppHeader } from "@/components/AppHeader";
import { Inspector } from "@/components/Inspector";
import { ProgramPanel } from "@/components/ProgramPanel";
import { SimulatorPanel } from "@/components/SimulatorPanel";
import { StatusBar } from "@/components/StatusBar";
import { StudioCanvas } from "@/components/StudioCanvas";
import { ToolRail } from "@/components/ToolRail";
import { ProjectProvider, useProject } from "@/state/ProjectContext";
import { StudioSessionProvider } from "@/state/StudioSession";
import { HandLibraryProvider } from "@/state/HandLibrary";

export function App() {
  return (
    <ProjectProvider>
      <Workspace />
    </ProjectProvider>
  );
}

function Workspace() {
  const { state } = useProject();

  return (
    <div className="flex h-dvh flex-col bg-[var(--chrome)]">
      <AppHeader />
      <main className="flex min-h-0 flex-1">
        {state.view === "studio" ? (
          <StudioSessionProvider>
            <HandLibraryProvider>
              <ToolRail />
              <section className="min-w-0 flex-1">
                <StudioCanvas />
              </section>
              <Inspector />
            </HandLibraryProvider>
          </StudioSessionProvider>
        ) : null}
        {state.view === "program" ? (
          <section className="min-w-0 flex-1">
            <ProgramPanel />
          </section>
        ) : null}
        {state.view === "simulate" ? (
          <section className="min-w-0 flex-1">
            <SimulatorPanel />
          </section>
        ) : null}
      </main>
      <StatusBar />
    </div>
  );
}
