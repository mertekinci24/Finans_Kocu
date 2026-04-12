import { ReactNode } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { Widget, DashboardLayout } from '@/types/widgets';
import DraggableWidget from './DraggableWidget';

interface WidgetGridProps {
  layout: DashboardLayout;
  isDragMode: boolean;
  widgets: Record<string, ReactNode>;
  onReorder: (widgets: Widget[]) => void;
  isLoading: boolean;
}

export default function WidgetGrid({
  layout,
  isDragMode,
  widgets,
  onReorder,
  isLoading,
}: WidgetGridProps): JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const enabledWidgets = layout.widgets.filter((w) => w.enabled);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = enabledWidgets.findIndex((w) => w.id === active.id);
      const newIndex = enabledWidgets.findIndex((w) => w.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newWidgets = [...enabledWidgets];
        const [movedWidget] = newWidgets.splice(oldIndex, 1);
        newWidgets.splice(newIndex, 0, movedWidget);

        newWidgets.forEach((w, i) => {
          w.position = i;
        });

        onReorder(newWidgets);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={isDragMode ? handleDragEnd : undefined}
    >
      <SortableContext items={enabledWidgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        <motion.div
          className="grid gap-6 auto-rows-max"
          style={{
            gridTemplateColumns: `repeat(${layout.gridColumns}, minmax(0, 1fr))`,
          }}
        >
          <AnimatePresence>
            {enabledWidgets.map((widget) => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                isDragMode={isDragMode}
              >
                {isLoading ? <div className="h-48" /> : widgets[widget.id]}
              </DraggableWidget>
            ))}
          </AnimatePresence>
        </motion.div>
      </SortableContext>
    </DndContext>
  );
}
