import { CSSProperties } from 'react';
import { FrontWarning } from '@/lib/nutrition-engine';

interface Props {
  warnings: FrontWarning;
  id?: string;
}

const sealContainer: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  alignItems: 'flex-start',
};

const sealBox: CSSProperties = {
  backgroundColor: '#000000',
  color: '#FFFFFF',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontWeight: 700,
  fontSize: '13px',
  lineHeight: 1.3,
  textAlign: 'center',
  textTransform: 'uppercase',
  padding: '10px 20px',
  border: 'none',
  borderRadius: '0',
  display: 'inline-block',
  letterSpacing: '0.02em',
};

export function FrontWarningSeals({ warnings, id }: Props) {
  const seals: string[] = [];

  if (warnings.sugar_added) seals.push('AÇÚCARES ADICIONADOS');
  if (warnings.sat_fat) seals.push('GORDURAS SATURADAS');
  if (warnings.sodium) seals.push('SÓDIO');

  if (seals.length === 0) {
    return (
      <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#333' }}>
        Nenhum selo frontal necessário — valores abaixo dos limites.
      </div>
    );
  }

  return (
    <div id={id} style={sealContainer}>
      {seals.map((nutrient, i) => (
        <div key={i} style={sealBox}>
          <div>ALTO EM</div>
          <div>{nutrient}</div>
        </div>
      ))}
    </div>
  );
}
