
import { AppState, Category, TransactionType } from './types';

export const INITIAL_STATE: AppState = {
  transactions: [
    {
      id: '1',
      date: new Date().toISOString().split('T')[0],
      description: 'Salário Mensal',
      amount: 3500,
      type: TransactionType.INCOME,
      category: Category.OTHER,
      isCoparenting: false
    },
    {
      id: '2',
      date: new Date().toISOString().split('T')[0],
      description: 'Pensão Alimentícia - Junho',
      amount: 500,
      type: TransactionType.EXPENSE,
      category: Category.PENSION,
      isCoparenting: true,
      sharedPercentage: 100
    },
    {
      id: '3',
      date: new Date().toISOString().split('T')[0],
      description: 'Supermercado',
      amount: 150.50,
      type: TransactionType.EXPENSE,
      category: Category.FOOD,
      isCoparenting: false
    }
  ],
  visitations: [
    {
      id: 'v1',
      date: new Date().toISOString().split('T')[0],
      status: 'Realizado',
      notes: 'Final de semana normal. Tomou vitamina C às 08:00.'
    }
  ],
  goals: [
    {
      id: 'g1',
      name: 'Reserva de Emergência',
      targetAmount: 5000,
      currentAmount: 1250
    }
  ],
  childSupportStatus: 'Pago',
  monthlyPensionAmount: 500
};
