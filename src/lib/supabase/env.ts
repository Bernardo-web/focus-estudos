/**
 * Endereço e chave pública do Supabase.
 * Aceita tanto as variáveis digitadas à mão (NEXT_PUBLIC_*) quanto as criadas
 * pela integração Vercel + Supabase (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY...).
 * Todo acesso ao Supabase no Focus roda no servidor, então as duas formas funcionam.
 */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";
