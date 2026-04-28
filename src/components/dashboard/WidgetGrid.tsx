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

  const handleDragEnd = (event: import('@dnd-kit/core').DragEndEvent) => {
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
            {enabledWidgets.map((widget) => {
              const widgetComponent = widgets[widget.id];
              
              return (
                <DraggableWidget
                  key={widget.id}
                  widget={widget}
                  isDragMode={isDragMode}
                >
                  {isLoading ? (
                    <div className="h-48 animate-pulse bg-neutral-100 dark:bg-zinc-800 rounded-xl" />
                  ) : widgetComponent ? (
                    widgetComponent
                  ) : (
                    <div className="h-full min-h-[180px] bg-rose-50 dark:bg-rose-900/10 border-2 border-rose-200 dark:border-rose-800/30 rounded-xl flex flex-col items-center justify-center p-6 text-center group">
                      <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 mb-3 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <h4 className="text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest mb-1">Bileşen Kayıp</h4>
                      <code className="text-[9px] font-mono bg-white/50 dark:bg-black/20 px-2 py-1 rounded text-rose-600 dark:text-rose-500 font-bold border border-rose-200/50">
                        ID: {widget.id}
                      </code>
                      <p className="text-[9px] text-rose-500/70 mt-3 font-medium leading-tight">
                        Bu bileşen kayıtlı ancak render edilemedi.<br/>Registry kontrol edilmeli.
                      </p>
                    </div>
                  )}
                </DraggableWidget>
              );
            })}
            
            {isDragMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-1"
              >
                <button 
                  className="w-full h-full min-h-[180px] rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-neutral-50/50 dark:bg-zinc-900/30 flex flex-col items-center justify-center gap-3 group hover:border-primary-500 hover:bg-primary-50/50 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:text-primary-600 group-hover:scale-110 group-hover:shadow-lg transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-black text-zinc-500 group-hover:text-primary-700 uppercase tracking-widest">Yeni Widget Ekle</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </SortableContext>
    </DndContext>
  );
}
