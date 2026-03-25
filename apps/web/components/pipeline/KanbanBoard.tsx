'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { BID_STAGES, STAGE_CONFIG, type BidStage } from '@on/db';
import { usePipelineStore, type PipelineProject } from '@/lib/store';
import { KanbanColumn } from './KanbanColumn';
import { ProjectCard } from './ProjectCard';

export function KanbanBoard() {
  const { projects, moveProject, reorderInStage } = usePipelineStore();
  const [activeProject, setActiveProject] = useState<PipelineProject | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const projectsByStage = useMemo(() => {
    const map: Record<BidStage, PipelineProject[]> = {
      lead: [],
      estimating: [],
      review: [],
      submitted: [],
      won: [],
      lost: [],
    };
    for (const project of projects) {
      map[project.stage].push(project);
    }
    // Sort within each stage
    for (const stage of BID_STAGES) {
      map[stage].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [projects]);

  function handleDragStart(event: DragStartEvent) {
    const project = projects.find((p) => p.id === event.active.id);
    if (project) setActiveProject(project);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeProject = projects.find((p) => p.id === activeId);
    if (!activeProject) return;

    // Check if dropping on a column
    if (BID_STAGES.includes(overId as BidStage)) {
      if (activeProject.stage !== overId) {
        moveProject(activeId, overId as BidStage);
      }
      return;
    }

    // Dropping on another card
    const overProject = projects.find((p) => p.id === overId);
    if (overProject && activeProject.stage !== overProject.stage) {
      moveProject(activeId, overProject.stage);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveProject(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeProj = projects.find((p) => p.id === activeId);
    const overProj = projects.find((p) => p.id === overId);

    if (activeProj && overProj && activeProj.stage === overProj.stage) {
      reorderInStage(activeProj.stage, activeId, overId);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        {BID_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            config={STAGE_CONFIG[stage]}
            projects={projectsByStage[stage]}
          />
        ))}
      </div>

      <DragOverlay>
        {activeProject ? (
          <div className="rotate-3 opacity-90">
            <ProjectCard project={activeProject} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
