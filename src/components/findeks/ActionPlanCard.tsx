import { motion } from 'framer-motion';
import { ActionStep } from '@/types';

interface ActionPlanCardProps {
  step: ActionStep;
  index: number;
}

export default function ActionPlanCard({ step, index }: ActionPlanCardProps) {
  const priorityColors: Record<number, string> = {
    1: 'bg-red-100 border-red-300 text-red-700',
    2: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    3: 'bg-green-100 border-green-300 text-green-700',
  };

  const priorityLabels: Record<number, string> = {
    1: '🔴 Kritik Öncelik',
    2: '🟡 Orta Öncelik',
    3: '🟢 Düşük Öncelik',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 + index * 0.1 }}
      className={`p-4 rounded-lg border-l-4 border-l-blue-600 bg-white shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-blue-600">{index + 1}</span>
            <h4 className="text-lg font-bold text-neutral-900">{step.title}</h4>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${priorityColors[step.priority]}`}>
          {priorityLabels[step.priority]}
        </div>
      </div>

      <p className="text-neutral-700 text-sm mb-3 leading-relaxed">{step.description}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-50 p-3 rounded">
          <p className="text-xs text-neutral-600">Beklenen Etki</p>
          <p className="text-lg font-bold text-blue-600">+{step.expectedImpact} puan</p>
        </div>
        <div className="bg-neutral-50 p-3 rounded">
          <p className="text-xs text-neutral-600">Tahmini Zaman</p>
          <p className="text-sm font-medium">{step.timeline}</p>
        </div>
      </div>
    </motion.div>
  );
}
