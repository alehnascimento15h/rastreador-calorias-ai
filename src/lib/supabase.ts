import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types para o banco de dados
export type UserProfile = {
  id: string;
  user_id: string;
  nome: string;
  idade: number;
  peso: number;
  altura: number;
  genero: string;
  objetivo: string;
  nivel_atividade: string;
  calorias_diarias: number;
  created_at: string;
  updated_at: string;
};

export type Meal = {
  id: string;
  user_id: string;
  tipo: 'cafe' | 'almoco' | 'lanche' | 'bebida' | 'janta';
  nome: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  horario: string;
  data: string;
  created_at: string;
};

export type AiTip = {
  id: string;
  user_id: string;
  tip: string;
  created_at: string;
};
