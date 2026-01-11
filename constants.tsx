
import { AppState, Category, TransactionType } from './types';

export const INITIAL_STATE: AppState = {
  user: {
    name: 'Marcos Oliveira',
    email: 'marcos.oliveira@email.com',
    phone: '(11) 98765-4321',
    avatar: ''
  },
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
  monthlyPensionAmount: 500,
  settings: {
    language: 'pt-BR',
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
    spendingLimit: 2500,
    theme: 'light',
    notifications: {
      push: true,
      email: true,
      whatsapp: false,
      alerts: {
        lowBalance: true,
        billDue: true,
        newIncome: true
      }
    }
  }
};
