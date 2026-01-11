
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
  attachment?: string; // URL ou base64 do comprovante
}

export interface Visitation {
  id: string;
  date: string;
  status: 'Planejado' | 'Realizado' | 'Cancelado';
  pickupTime?: string;
  returnTime?: string;
  location?: string;
  notes: string;
  confirmed?: boolean;
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

export interface ChildData {
  name: string;
  birthDate: string;
  photo?: string;
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
  child: ChildData;
  transactions: Transaction[];
  visitations: Visitation[];
  goals: Goal[];
  childSupportStatus: 'Pago' | 'Pendente' | 'Atrasado';
  monthlyPensionAmount: number;
  pensionDueDate: number; // Dia do mês
  settings: {
    language: string;
    currency: string;
    dateFormat: string;
    spendingLimit: number;
    notifications: NotificationSettings;
    theme: 'light' | 'dark' | 'auto';
  };
}
