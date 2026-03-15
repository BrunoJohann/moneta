const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: number): string {
  return formatter.format(value);
}

interface CurrencyProps {
  value: number;
  className?: string;
}

export function Currency({ value, className }: CurrencyProps) {
  return <span className={className}>{formatCurrency(value)}</span>;
}
