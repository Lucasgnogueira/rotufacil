// Stripe plan configuration
// Mensal: R$39,90/mês | Semestral: R$197/6 meses | Anual: R$117/ano
export const PLANS = {
  mensal: {
    name: 'Mensal',
    price_id: 'price_1T7OOaRw6ud4bYxHP2czsSUD',
    product_id: 'prod_U5ZXAWu5HWI6xw',
    amount: 3990,
    interval: 'mês',
    description: 'Cobrado mensalmente',
  },
  semestral: {
    name: 'Semestral',
    price_id: 'price_1T7OPGRw6ud4bYxHoyZl1tfB',
    product_id: 'prod_U5ZYp1bIh34jMx',
    amount: 19700,
    interval: '6 meses',
    description: 'R$32,83/mês — Economia de 18%',
  },
  anual: {
    name: 'Anual',
    price_id: 'price_1T7OQ5Rw6ud4bYxHVPvmLPnd',
    product_id: 'prod_U5ZZVPiLb9YVH7',
    amount: 11700,
    interval: 'ano',
    description: 'R$9,75/mês — Economia de 76%',
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanByPriceId(priceId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.price_id === priceId) return key as PlanKey;
  }
  return null;
}

export function getPlanByProductId(productId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.product_id === productId) return key as PlanKey;
  }
  return null;
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Free tier limits
export const FREE_LIMITS = {
  maxRecipes: 3,
  canExport: false,
  canUseSubproducts: false,
  canUsePackagedProducts: false,
} as const;
