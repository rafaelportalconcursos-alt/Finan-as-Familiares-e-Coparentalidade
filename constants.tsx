
import { AppState, Category, TransactionType } from './types';

export const INITIAL_STATE: AppState = {
  user: {
    name: 'Rafael Silva',
    email: 'rafael.silva@email.com',
    phone: '(11) 98765-4321',
    avatar: ''
  },
  child: {
    name: 'Alice',
    birthDate: '2020-05-15',
    photo: '',
    pediatrician: 'Dra. Helena - (11) 91234-5678',
    school: 'Colégio Novo Horizonte - Maternal II',
    bloodType: 'O positivo (O+)',
    allergies: 'Nenhuma conhecida'
  },
  transactions: [
    {
      id: '1',
      date: new Date().toLocaleDateString('en-CA'),
      description: 'Salário Mensal',
      amount: 4500.00,
      type: TransactionType.INCOME,
      category: Category.OTHER,
      isCoparenting: false
    },
    {
      id: '2',
      date: new Date().toLocaleDateString('en-CA'),
      description: 'Pensão Alimentícia - Junho',
      amount: 750.00,
      type: TransactionType.EXPENSE,
      category: Category.PENSION,
      isCoparenting: true,
      sharedPercentage: 100
    },
    {
      id: '3',
      date: new Date().toLocaleDateString('en-CA'),
      description: 'Escola Alice',
      amount: 1200.00,
      type: TransactionType.EXPENSE,
      category: Category.EDUCATION,
      isCoparenting: true,
      sharedPercentage: 50
    }
  ],
  visitations: [
    {
      id: 'v1',
      date: new Date().toLocaleDateString('en-CA'),
      status: 'Realizado',
      notes: 'Final de semana excelente. Visitamos o parque.',
      pickupTime: '18:00',
      returnTime: '18:00',
      location: 'Casa da Mãe'
    }
  ],
  goals: [
    {
      id: 'g1',
      name: 'Reserva de Emergência',
      targetAmount: 5000,
      currentAmount: 1850
    },
    {
      id: 'g2',
      name: 'Viagem de Férias',
      targetAmount: 3000,
      currentAmount: 450
    }
  ],
  childSupportStatus: 'Pago',
  monthlyPensionAmount: 750,
  pensionDueDate: 10,
  settings: {
    language: 'pt-BR',
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
    spendingLimit: 3000,
    theme: 'dark',
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
