import { FrontWarning } from '@/lib/nutrition-engine';

interface Props {
  warnings: FrontWarning;
  id?: string;
}

const MagnifyingGlass = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

export function FrontWarningSeals({ warnings, id }: Props) {
  const seals: { label: string; value: number; limit: number; unit: string }[] = [];

  if (warnings.sugar_added) {
    seals.push({ label: 'ALTO EM AÇÚCARES ADICIONADOS', value: warnings.sugar_value, limit: warnings.sugar_limit, unit: 'g/100g' });
  }
  if (warnings.sat_fat) {
    seals.push({ label: 'ALTO EM GORDURAS SATURADAS', value: warnings.sat_fat_value, limit: warnings.sat_fat_limit, unit: 'g/100g' });
  }
  if (warnings.sodium) {
    seals.push({ label: 'ALTO EM SÓDIO', value: warnings.sodium_value, limit: warnings.sodium_limit, unit: 'mg/100g' });
  }

  if (seals.length === 0) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-center">
        <p className="text-sm font-medium text-success">✓ Nenhum selo "ALTO EM" necessário</p>
        <p className="mt-1 text-xs text-muted-foreground">Os valores por 100g/100ml estão abaixo dos limites da ANVISA.</p>
      </div>
    );
  }

  return (
    <div id={id} className="space-y-3">
      {seals.map((seal, i) => (
        <div key={i}>
          <div className="front-seal">
            <MagnifyingGlass />
            <span>{seal.label}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Valor: {seal.value.toFixed(1)} {seal.unit} | Limite: ≥ {seal.limit} {seal.unit}
          </p>
        </div>
      ))}
    </div>
  );
}
