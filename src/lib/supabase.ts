import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types para o banco de dados (correspondendo ao schema real)
export type UserProfile = {
  id: string;
  user_id?: string;
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: string;
  goal: string;
  target_weight: number;
  activity_level: string;
  daily_calorie_goal: number;
  workouts_per_week: string;
  weight_goal: string;
  has_used_calorie_apps?: boolean;
  previous_apps?: string[];
  barriers?: string[];
  aspirations?: string[];
  subscription_status?: string;
  trial_start_date?: string;
  subscription_end_date?: string;
  created_at?: string;
  updated_at?: string;
};

export type Meal = {
  id: string;
  user_id: string;
  timestamp: string;
  image_url?: string;
  total_calories: number;
  total_protein?: number;
  total_carbs?: number;
  total_fat?: number;
  created_at?: string;
};

export type FoodItem = {
  id: string;
  meal_id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  portion?: string;
  created_at?: string;
};

export type AiTip = {
  id: string;
  user_id: string;
  tip: string;
  created_at?: string;
};

export type DailyProgress = {
  id: string;
  user_id: string;
  date: string;
  calories_consumed?: number;
  calories_goal: number;
  created_at?: string;
  updated_at?: string;
};
