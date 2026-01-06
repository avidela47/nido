// Tipos compartidos de la app (personas, categorías, reportes, etc.)

export type PersonRow = { _id: string; name: string };

export type CategoryRow = { _id: string; name: string };

export type TxType = "income" | "expense";

export type PersonSummaryRow = {
  personId: string;
  personName: string;
  income: number;
  expense: number;
  balance: number;
};

export type CategorySummaryRow = {
  categoryId: string;
  categoryName: string;
  spent: number;
  budget?: number;
  percent?: number;
  status?: string;
};
