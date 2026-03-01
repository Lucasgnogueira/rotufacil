import { NutritionResult } from '@/lib/nutrition-engine';

interface Props {
  result: NutritionResult;
  id?: string;
}

export function NutritionTable({ result, id }: Props) {
  const { per_serving, per_100, vd_per_serving, serving_size_g_ml, household_measure, product_type } = result;
  const unit = product_type === 'liquid' ? 'ml' : 'g';

  const rows = [
    { label: 'Valor energético', per_s: `${per_serving.kcal} kcal = ${per_serving.kj} kJ`, per_100v: `${per_100.kcal} kcal = ${per_100.kj} kJ`, vd: vd_per_serving.kcal, thick: true },
    { label: 'Carboidratos', per_s: `${per_serving.carbs_g} g`, per_100v: `${per_100.carbs_g} g`, vd: vd_per_serving.carbs_g },
    { label: 'Açúcares totais', per_s: `${per_serving.sugars_total_g} g`, per_100v: `${per_100.sugars_total_g} g`, indent: true },
    { label: 'Açúcares adicionados', per_s: `${per_serving.sugars_added_g} g`, per_100v: `${per_100.sugars_added_g} g`, vd: vd_per_serving.sugars_added_g, indent: true },
    { label: 'Proteínas', per_s: `${per_serving.protein_g} g`, per_100v: `${per_100.protein_g} g`, vd: vd_per_serving.protein_g },
    { label: 'Gorduras totais', per_s: `${per_serving.fat_total_g} g`, per_100v: `${per_100.fat_total_g} g`, vd: vd_per_serving.fat_total_g },
    { label: 'Gorduras saturadas', per_s: `${per_serving.sat_fat_g} g`, per_100v: `${per_100.sat_fat_g} g`, vd: vd_per_serving.sat_fat_g, indent: true },
    { label: 'Gorduras trans', per_s: `${per_serving.trans_fat_g} g`, per_100v: `${per_100.trans_fat_g} g`, indent: true },
    { label: 'Fibra alimentar', per_s: `${per_serving.fiber_g} g`, per_100v: `${per_100.fiber_g} g`, vd: vd_per_serving.fiber_g },
    { label: 'Sódio', per_s: `${per_serving.sodium_mg} mg`, per_100v: `${per_100.sodium_mg} mg`, vd: vd_per_serving.sodium_mg },
  ];

  return (
    <div id={id} className="nutrition-table">
      <div className="nt-header">INFORMAÇÃO NUTRICIONAL</div>
      <div style={{ fontSize: '11px', marginBottom: '4px' }}>
        Porção de {serving_size_g_ml}{unit} ({household_measure})
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr className="nt-thick">
            <th style={{ width: '45%' }}></th>
            <th style={{ width: '22%', fontSize: '10px' }}>Por porção</th>
            <th style={{ width: '22%', fontSize: '10px' }}>Por 100{unit}</th>
            <th style={{ width: '11%', fontSize: '10px' }}>%VD*</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={r.thick ? 'nt-thick' : ''}>
              <td className={r.indent ? 'nt-indent' : ''} style={{ fontWeight: r.thick ? '700' : '400' }}>
                {r.label}
              </td>
              <td>{r.per_s}</td>
              <td>{r.per_100v}</td>
              <td>{r.vd !== undefined ? `${r.vd}%` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: '9px', marginTop: '4px', lineHeight: '1.3' }}>
        * % Valores Diários com base em uma dieta de 2.000 kcal. Seus valores diários podem ser maiores ou menores dependendo das suas necessidades energéticas.
      </div>
    </div>
  );
}
