import { CSSProperties, forwardRef } from 'react';
import { FrontWarningSeals } from '@/components/FrontWarningSeals';
import { FrontWarning, NutritionResult } from '@/lib/nutrition-engine';

interface NutritionTableExportProps {
  result: NutritionResult;
}

const hiddenStageStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  transform: 'translateX(-200vw)',
  pointerEvents: 'none',
  zIndex: -1,
  opacity: 1,
};

const exportSurfaceStyle: CSSProperties = {
  backgroundColor: 'hsl(0 0% 100%)',
  color: 'hsl(0 0% 0%)',
  padding: '24px',
};

const nutritionShellStyle: CSSProperties = {
  width: '360px',
  backgroundColor: 'hsl(0 0% 100%)',
  color: 'hsl(0 0% 0%)',
  border: '2px solid hsl(0 0% 0%)',
  padding: '12px',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const textStyle: CSSProperties = {
  textAlign: 'left',
};

const cellStyle: CSSProperties = {
  textAlign: 'left',
  padding: '2px 4px',
  borderBottom: '1px solid hsl(0 0% 0%)',
  fontSize: '12px',
  lineHeight: 1.3,
  verticalAlign: 'top',
};

const headerStyle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 800,
  borderBottom: '2px solid hsl(0 0% 0%)',
  paddingBottom: '4px',
  marginBottom: '4px',
};

const thickRowStyle: CSSProperties = {
  borderBottom: '4px solid hsl(0 0% 0%)',
};

function NutritionTableExport({ result }: NutritionTableExportProps) {
  const { per_serving, per_100, vd_per_serving, serving_size_g_ml, household_measure, product_type } = result;
  const unit = product_type === 'liquid' ? 'ml' : 'g';

  const rows = [
    {
      label: 'Valor energético',
      perServing: `${per_serving.kcal} kcal = ${per_serving.kj} kJ`,
      per100: `${per_100.kcal} kcal = ${per_100.kj} kJ`,
      vd: vd_per_serving.kcal,
      thick: true,
    },
    { label: 'Carboidratos', perServing: `${per_serving.carbs_g} g`, per100: `${per_100.carbs_g} g`, vd: vd_per_serving.carbs_g },
    { label: 'Açúcares totais', perServing: `${per_serving.sugars_total_g} g`, per100: `${per_100.sugars_total_g} g`, indent: true },
    {
      label: 'Açúcares adicionados',
      perServing: `${per_serving.sugars_added_g} g`,
      per100: `${per_100.sugars_added_g} g`,
      vd: vd_per_serving.sugars_added_g,
      indent: true,
    },
    { label: 'Proteínas', perServing: `${per_serving.protein_g} g`, per100: `${per_100.protein_g} g`, vd: vd_per_serving.protein_g },
    { label: 'Gorduras totais', perServing: `${per_serving.fat_total_g} g`, per100: `${per_100.fat_total_g} g`, vd: vd_per_serving.fat_total_g },
    {
      label: 'Gorduras saturadas',
      perServing: `${per_serving.sat_fat_g} g`,
      per100: `${per_100.sat_fat_g} g`,
      vd: vd_per_serving.sat_fat_g,
      indent: true,
    },
    { label: 'Gorduras trans', perServing: `${per_serving.trans_fat_g} g`, per100: `${per_100.trans_fat_g} g`, indent: true },
    { label: 'Fibra alimentar', perServing: `${per_serving.fiber_g} g`, per100: `${per_100.fiber_g} g`, vd: vd_per_serving.fiber_g },
    { label: 'Sódio', perServing: `${per_serving.sodium_mg} mg`, per100: `${per_100.sodium_mg} mg`, vd: vd_per_serving.sodium_mg },
  ];

  return (
    <div style={nutritionShellStyle}>
      <div style={headerStyle}>INFORMAÇÃO NUTRICIONAL</div>
      <div style={{ ...textStyle, fontSize: '11px', marginBottom: '4px' }}>
        Porção de {serving_size_g_ml}
        {unit} ({household_measure})
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={thickRowStyle}>
            <th style={{ ...cellStyle, width: '45%', borderBottom: '0', fontWeight: 700 }}></th>
            <th style={{ ...cellStyle, width: '22%', borderBottom: '0', fontWeight: 700, fontSize: '10px' }}>Por porção</th>
            <th style={{ ...cellStyle, width: '22%', borderBottom: '0', fontWeight: 700, fontSize: '10px' }}>Por 100{unit}</th>
            <th style={{ ...cellStyle, width: '11%', borderBottom: '0', fontWeight: 700, fontSize: '10px' }}>%VD*</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} style={row.thick ? thickRowStyle : undefined}>
              <td
                style={{
                  ...cellStyle,
                  paddingLeft: row.indent ? '16px' : '4px',
                  fontWeight: row.thick ? 700 : 400,
                }}
              >
                {row.label}
              </td>
              <td style={cellStyle}>{row.perServing}</td>
              <td style={cellStyle}>{row.per100}</td>
              <td style={cellStyle}>{row.vd !== undefined ? `${row.vd}%` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ ...textStyle, fontSize: '9px', marginTop: '4px', lineHeight: 1.3 }}>
        * % Valores Diários com base em uma dieta de 2.000 kcal. Seus valores diários podem ser maiores ou menores dependendo das suas necessidades energéticas.
      </div>
    </div>
  );
}

export const NutritionTableExportStage = forwardRef<HTMLDivElement, { result: NutritionResult }>(
  ({ result }, ref) => (
    <div aria-hidden="true" style={hiddenStageStyle}>
      <div ref={ref} data-export-surface="nutrition-table" style={exportSurfaceStyle}>
        <NutritionTableExport result={result} />
      </div>
    </div>
  ),
);

NutritionTableExportStage.displayName = 'NutritionTableExportStage';

export const FrontWarningExportStage = forwardRef<HTMLDivElement, { warnings: FrontWarning }>(
  ({ warnings }, ref) => (
    <div aria-hidden="true" style={hiddenStageStyle}>
      <div
        ref={ref}
        data-export-surface="front-warnings"
        style={{
          ...exportSurfaceStyle,
          width: '520px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <FrontWarningSeals warnings={warnings} />
      </div>
    </div>
  ),
);

FrontWarningExportStage.displayName = 'FrontWarningExportStage';
