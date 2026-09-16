"use client";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TemplateFileTree } from "@/modules/playground/components/playground-explorer";
import { usePlayground } from "@/modules/playground/hooks/usePlayground";
import { useParams } from "next/navigation";
import React from "react";

const MainPlaygroundPage = () => {
  const { id } = useParams<{ id: string }>();
    const { playgroundData, templateData, isLoading, error, saveTemplateData } =
      usePlayground(id);
      console.log("template Data" , templateData)
       console.log("playground Data", playgroundData);
return (
  <TooltipProvider>
    <>
      <TemplateFileTree
        data={templateData!}
        onFileSelect={() => {}}
        title="File Explorer"
        onAddFile={() => {}}
        onAddFolder={() => {}}
        onDeleteFile={() => {}}
        onDeleteFolder={() => {}}
        onRenameFile={() => {}}
        onRenameFolder={() => {}}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="flex flex-1 items-center gap-2">
          <div className="flex flex-col flex-1">
            <h1 className="text-sm font-medium">
              {playgroundData?.title || "Code Playground"}
            </h1>
          </div>
        </div>
      </SidebarInset>
    </>
  </TooltipProvider>
);
};

export default MainPlaygroundPage