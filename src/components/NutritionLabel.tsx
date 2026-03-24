/**
 * NutritionLabel v1 — Professional regulatory nutrition label
 * Single source of truth for preview, print, and export.
 * Designed to match real Brazilian food packaging labels per ANVISA RDC 429/2020.
 */
import { CSSProperties } from 'react';
import { NutritionResult } from '@/lib/nutrition-engine';

export const LABEL_VERSION = 'v1';

interface Props {
  result: NutritionResult;
  id?: string;
  className?: string;
}

/* ── Inline styles for export independence (no CSS classes needed) ── */

const shell: CSSProperties = {
  width: '360px',
  backgroundColor: '#ffffff',
  color: '#000000',
  border: '3px solid #000000',
  padding: '10px 12px',
  fontFamily: 'Arial, Helvetica, sans-serif',
  lineHeight: 1.35,
  boxSizing: 'border-box',
};

const title: CSSProperties = {
  fontSize: '16px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  borderBottom: '4px solid #000000',
  paddingBottom: '4px',
  marginBottom: '2px',
  textAlign: 'left',
};

const serving: CSSProperties = {
  fontSize: '11px',
  fontWeight: 400,
  paddingBottom: '4px',
  borderBottom: '1px solid #000000',
  marginBottom: '0',
  textAlign: 'left',
};

const table: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

const thBase: CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  textAlign: 'right',
  padding: '4px 4px 4px 0',
  borderBottom: '3px solid #000000',
  verticalAlign: 'bottom',
  lineHeight: 1.2,
};

const tdBase: CSSProperties = {
  fontSize: '11.5px',
  fontWeight: 400,
  padding: '3px 4px 3px 0',
  borderBottom: '1px solid #000000',
  verticalAlign: 'top',
  textAlign: 'left',
  lineHeight: 1.3,
};

const footnote: CSSProperties = {
  fontSize: '8.5px',
  fontWeight: 400,
  lineHeight: 1.35,
  marginTop: '4px',
  textAlign: 'left',
  color: '#000000',
};

type Row = {
  label: string;
  perServing: string;
  per100: string;
  vd?: number;
  bold?: boolean;
  indent?: boolean;
  thickTop?: boolean;
  thickBottom?: boolean;
};

export function NutritionLabel({ result, id, className }: Props) {
  const { per_serving, per_100, vd_per_serving, serving_size_g_ml, household_measure, product_type } = result;
  const unit = product_type === 'liquid' ? 'ml' : 'g';

  const rows: Row[] = [
    {
      label: 'Valor energético',
      perServing: `${per_serving.kcal} kcal = ${per_serving.kj} kJ`,
      per100: `${per_100.kcal} kcal = ${per_100.kj} kJ`,
      vd: vd_per_serving.kcal,
      bold: true,
      thickBottom: true,
    },
    {
      label: 'Carboidratos',
      perServing: `${per_serving.carbs_g} g`,
      per100: `${per_100.carbs_g} g`,
      vd: vd_per_serving.carbs_g,
      bold: true,
    },
    {
      label: 'Açúcares totais',
      perServing: `${per_serving.sugars_total_g} g`,
      per100: `${per_100.sugars_total_g} g`,
      indent: true,
    },
    {
      label: 'Açúcares adicionados',
      perServing: `${per_serving.sugars_added_g} g`,
      per100: `${per_100.sugars_added_g} g`,
      vd: vd_per_serving.sugars_added_g,
      indent: true,
    },
    {
      label: 'Proteínas',
      perServing: `${per_serving.protein_g} g`,
      per100: `${per_100.protein_g} g`,
      vd: vd_per_serving.protein_g,
      bold: true,
    },
    {
      label: 'Gorduras totais',
      perServing: `${per_serving.fat_total_g} g`,
      per100: `${per_100.fat_total_g} g`,
      vd: vd_per_serving.fat_total_g,
      bold: true,
    },
    {
      label: 'Gorduras saturadas',
      perServing: `${per_serving.sat_fat_g} g`,
      per100: `${per_100.sat_fat_g} g`,
      vd: vd_per_serving.sat_fat_g,
      indent: true,
    },
    {
      label: 'Gorduras trans',
      perServing: `${per_serving.trans_fat_g} g`,
      per100: `${per_100.trans_fat_g} g`,
      indent: true,
    },
    {
      label: 'Fibra alimentar',
      perServing: `${per_serving.fiber_g} g`,
      per100: `${per_100.fiber_g} g`,
      vd: vd_per_serving.fiber_g,
      bold: true,
    },
    {
      label: 'Sódio',
      perServing: `${per_serving.sodium_mg} mg`,
      per100: `${per_100.sodium_mg} mg`,
      vd: vd_per_serving.sodium_mg,
      bold: true,
      thickTop: true,
    },
  ];

  return (
    <div id={id} className={className} style={shell} data-label-version={LABEL_VERSION}>
      {/* Title */}
      <div style={title}>Informação Nutricional</div>

      {/* Serving line */}
      <div style={serving}>
        Porção de {serving_size_g_ml}{unit} ({household_measure})
      </div>

      {/* Table */}
      <table style={table}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...thBase, textAlign: 'left' }}></th>
            <th style={thBase}>Por porção</th>
            <th style={thBase}>Por 100{unit}</th>
            <th style={thBase}>%VD*</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const borderBottom = row.thickBottom
              ? '3px solid #000000'
              : '1px solid #000000';
            const borderTop = row.thickTop
              ? '2px solid #000000'
              : undefined;

            const cellOverride: CSSProperties = {
              ...tdBase,
              borderBottom,
              ...(borderTop ? { borderTop } : {}),
            };

            return (
              <tr key={row.label}>
                <td
                  style={{
                    ...cellOverride,
                    textAlign: 'left',
                    paddingLeft: row.indent ? '14px' : '0',
                    fontWeight: row.bold ? 700 : 400,
                    fontSize: row.indent ? '11px' : '11.5px',
                  }}
                >
                  {row.label}
                </td>
                <td style={{ ...cellOverride, textAlign: 'right' }}>{row.perServing}</td>
                <td style={{ ...cellOverride, textAlign: 'right' }}>{row.per100}</td>
                <td style={{ ...cellOverride, textAlign: 'right', fontWeight: 500 }}>
                  {row.vd !== undefined ? `${row.vd}%` : '–'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legal footnote */}
      <div style={footnote}>
        *Percentual de valores diários fornecidos pela porção. Valores diários de referência com base em uma dieta de 2.000 kcal. Seus valores diários podem ser maiores ou menores dependendo das suas necessidades energéticas.
      </div>
    </div>
  );
}
