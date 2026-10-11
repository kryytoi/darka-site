// Список моделей. Используется и на сервере, и в интерфейсе.
// plan: 'free' — доступна всем, 'pro' — только с подпиской.
export const MODELS = [
  {
    id: 'quiziw',
    name: 'Darka Quiziw 7.0',
    short: 'Quiziw 7.0',
    tag: 'Флагман',
    note: 'Самая вдумчивая, для сложных задач',
    plan: 'pro',
    color: '#C4B5FD',
  },
  {
    id: 'shadow',
    name: 'Darka Shadow 1.0',
    short: 'Shadow 1.0',
    tag: 'Быстрая',
    note: 'Короткие ответы по делу',
    plan: 'free',
    color: '#8B5CF6',
  },
  {
    id: 'darka01',
    name: 'Darka 0.1',
    short: 'Darka 0.1',
    tag: 'Базовая',
    note: 'Простая основа для повседневных задач',
    plan: 'free',
    color: '#A78BFA',
  },
  {
    id: 'darka02',
    name: 'Darka 0.2 Enchanted',
    short: '0.2 Enchanted',
    tag: 'Эксперимент',
    note: 'Образно, со стилем и настроением',
    plan: 'pro',
    color: '#D8B4FE',
  },
];

export function getModel(id) {
  return MODELS.find((m) => m.id === id) || null;
}

export function canUseModel(model, effectivePlan, role) {
  if (!model) return false;
  if (role === 'admin') return true;
  if (model.plan === 'free') return true;
  return effectivePlan === 'pro';
}
