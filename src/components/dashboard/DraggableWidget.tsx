import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Widget } from '@/types/widgets';

interface DraggableWidgetProps {
  widget: Widget;
  children: ReactNode;
  isDragMode: boolean;
}

export default function DraggableWidget({
  widget,
  children,
  isDragMode,
}: DraggableWidgetProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sizeClasses = {
    '1x1': 'col-span-1',
    '2x1': 'col-span-2',
    '2x2': 'col-span-2 row-span-2',
    '3x1': 'col-span-3',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`${sizeClasses[widget.size]}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`h-full rounded-lg border-2 transition-all ${
          isDragMode
            ? 'border-dashed border-blue-400 bg-blue-50 cursor-grab active:cursor-grabbing'
            : 'border-neutral-200 bg-white hover:shadow-md'
        } ${isDragging ? 'shadow-xl' : 'shadow-sm'}`}
        {...(isDragMode && { ...attributes, ...listeners })}
      >
        {isDragMode && (
          <div className="flex items-center justify-center gap-2 p-2 border-b border-blue-200 bg-blue-100 rounded-t text-xs font-medium text-blue-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Sürükleyin
          </div>
        )}
        <div className={isDragMode ? 'p-4 pointer-events-none' : 'p-4'}>{children}</div>
      </div>
    </motion.div>
  );
}
