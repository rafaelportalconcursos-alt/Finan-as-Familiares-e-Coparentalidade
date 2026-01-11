
export enum TransactionType {
  INCOME = 'RECEITA',
  EXPENSE = 'DESPESA'
}

export enum Category {
  FOOD = 'Alimentação',
  HEALTH = 'Saúde',
  EDUCATION = 'Educação',
  LEISURE = 'Lazer',
  HOUSING = 'Habitação',
  TRANSPORT = 'Transporte',
  UTILITIES = 'Contas Fixas',
  PENSION = 'Pensão de Alimentos',
  OTHER = 'Outros'
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: Category;
  isCoparenting: boolean;
  sharedPercentage?: number;
}

export interface Visitation {
  id: string;
  date: string;
  status: 'Planejado' | 'Realizado' | 'Cancelado';
  notes: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  avatar?: string;
}

export interface NotificationSettings {
  push: boolean;
  email: boolean;
  whatsapp: boolean;
  alerts: {
    lowBalance: boolean;
    billDue: boolean;
    newIncome: boolean;
  };
}

export interface AppState {
  user: UserProfile;
  transactions: Transaction[];
  visitations: Visitation[];
  goals: Goal[];
  childSupportStatus: 'Pago' | 'Pendente';
  monthlyPensionAmount: number;
  settings: {
    language: string;
    currency: string;
    dateFormat: string;
    spendingLimit: number;
    notifications: NotificationSettings;
    theme: 'light' | 'dark' | 'auto';
  };
}
