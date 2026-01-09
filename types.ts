
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
  sharedPercentage?: number; // porcentagem que o usuário paga (ex: 50, 100)
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

export interface AppState {
  transactions: Transaction[];
  visitations: Visitation[];
  goals: Goal[];
  childSupportStatus: 'Pago' | 'Pendente';
  monthlyPensionAmount: number;
}
