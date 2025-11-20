"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Apple, Target, TrendingUp, Sparkles, User, Calendar, Activity, Scale, Camera, X, Loader2, Coffee, UtensilsCrossed, Cookie, Droplet, Moon, Trash2, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { UserProfile, Meal as MealType } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type UserData = {
  nome: string;
  idade: string;
  peso: string;
  altura: string;
  genero: string;
  objetivo: string;
  nivelAtividade: string;
};

type MealAnalysis = {
  alimento: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
};

type MealTypeEnum = "cafe" | "almoco" | "lanche" | "bebida" | "janta";

type Meal = {
  id: string;
  tipo: MealTypeEnum;
  nome: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  horario: string;
};

export default function Home() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "dashboard">("form");
  const [userData, setUserData] = useState<UserData>({
    nome: "",
    idade: "",
    peso: "",
    altura: "",
    genero: "",
    objetivo: "",
    nivelAtividade: "",
  });
  const [loading, setLoading] = useState(true);
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [caloriasDiarias, setCaloriasDiarias] = useState(0);
  
  // Estados para análise de refeição com foto
  const [mealImage, setMealImage] = useState<string | null>(null);
  const [analyzingMeal, setAnalyzingMeal] = useState(false);
  const [mealAnalysis, setMealAnalysis] = useState<MealAnalysis[]>([]);

  // Estados para adicionar refeições
  const [meals, setMeals] = useState<Meal[]>([]);

  // Verificar autenticação e carregar dados do usuário
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUserId(session.user.id);

      // Carregar perfil do usuário
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profile) {
        // Usuário já tem perfil, carregar dados
        setUserData({
          nome: profile.nome,
          idade: profile.idade.toString(),
          peso: profile.peso.toString(),
          altura: profile.altura.toString(),
          genero: profile.genero,
          objetivo: profile.objetivo,
          nivelAtividade: profile.nivel_atividade,
        });
        setCaloriasDiarias(profile.calorias_diarias);

        // Carregar dicas da IA
        const { data: tips } = await supabase
          .from('ai_tips')
          .select('tip')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (tips && tips.length > 0) {
          setAiTips(tips.map(t => t.tip));
        }

        // Carregar refeições de hoje
        await loadTodayMeals(session.user.id);

        setStep("dashboard");
      }

      setLoading(false);
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      setLoading(false);
    }
  };

  const loadTodayMeals = async (uid: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: mealsData } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', uid)
      .eq('data', today)
      .order('created_at', { ascending: false });

    if (mealsData) {
      setMeals(mealsData.map(m => ({
        id: m.id,
        tipo: m.tipo as MealTypeEnum,
        nome: m.nome,
        calorias: m.calorias,
        proteinas: m.proteinas,
        carboidratos: m.carboidratos,
        gorduras: m.gorduras,
        horario: m.horario,
      })));
    }
  };

  const handleInputChange = (field: keyof UserData, value: string) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  };

  const calcularCalorias = (data: UserData) => {
    const peso = parseFloat(data.peso);
    const altura = parseFloat(data.altura);
    const idade = parseInt(data.idade);

    // Fórmula de Harris-Benedict
    let tmb = 0;
    if (data.genero === "masculino") {
      tmb = 88.362 + 13.397 * peso + 4.799 * altura - 5.677 * idade;
    } else {
      tmb = 447.593 + 9.247 * peso + 3.098 * altura - 4.33 * idade;
    }

    // Fator de atividade
    const fatores: { [key: string]: number } = {
      sedentario: 1.2,
      leve: 1.375,
      moderado: 1.55,
      intenso: 1.725,
      muitoIntenso: 1.9,
    };

    let calorias = tmb * (fatores[data.nivelAtividade] || 1.2);

    // Ajustar baseado no objetivo
    if (data.objetivo === "perder") {
      calorias -= 500;
    } else if (data.objetivo === "ganhar") {
      calorias += 500;
    }

    return Math.round(calorias);
  };

  const gerarDicasIA = async () => {
    try {
      const response = await fetch("/api/ai-tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      const tips = data.tips || [
        "Beba pelo menos 2 litros de água por dia",
        "Faça 5-6 refeições pequenas ao longo do dia",
        "Inclua proteínas em todas as refeições",
        "Evite alimentos processados e açúcares refinados",
        "Durma de 7-8 horas por noite para melhor recuperação",
      ];

      setAiTips(tips);

      // Salvar dicas no Supabase
      if (userId) {
        for (const tip of tips) {
          await supabase.from('ai_tips').insert({
            user_id: userId,
            tip: tip,
          });
        }
      }
    } catch (error) {
      console.error("Erro ao gerar dicas:", error);
      setAiTips([
        "Beba pelo menos 2 litros de água por dia",
        "Faça 5-6 refeições pequenas ao longo do dia",
        "Inclua proteínas em todas as refeições",
        "Evite alimentos processados e açúcares refinados",
        "Durma de 7-8 horas por noite para melhor recuperação",
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const calorias = calcularCalorias(userData);
      setCaloriasDiarias(calorias);

      // Salvar perfil no Supabase
      if (userId) {
        const { error } = await supabase.from('user_profiles').upsert({
          user_id: userId,
          nome: userData.nome,
          idade: parseInt(userData.idade),
          peso: parseFloat(userData.peso),
          altura: parseFloat(userData.altura),
          genero: userData.genero,
          objetivo: userData.objetivo,
          nivel_atividade: userData.nivelAtividade,
          calorias_diarias: calorias,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          console.error('Erro ao salvar perfil:', error);
        }
      }

      await gerarDicasIA();
      setStep("dashboard");
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMealImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeMeal = async () => {
    if (!mealImage) return;

    setAnalyzingMeal(true);
    try {
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: mealImage }),
      });

      const data = await response.json();
      setMealAnalysis(data.analysis || []);
    } catch (error) {
      console.error("Erro ao analisar refeição:", error);
      setMealAnalysis([
        {
          alimento: "Não foi possível analisar a imagem",
          calorias: 0,
          proteinas: 0,
          carboidratos: 0,
          gorduras: 0,
        },
      ]);
    } finally {
      setAnalyzingMeal(false);
    }
  };

  const addMealFromAnalysis = async (item: MealAnalysis, tipo: MealTypeEnum) => {
    const horario = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const data = new Date().toISOString().split('T')[0];

    const meal: Meal = {
      id: Date.now().toString() + Math.random(),
      tipo: tipo,
      nome: item.alimento,
      calorias: item.calorias,
      proteinas: item.proteinas,
      carboidratos: item.carboidratos,
      gorduras: item.gorduras,
      horario: horario,
    };

    // Salvar no Supabase
    if (userId) {
      const { data: newMeal, error } = await supabase.from('meals').insert({
        user_id: userId,
        tipo: tipo,
        nome: item.alimento,
        calorias: item.calorias,
        proteinas: item.proteinas,
        carboidratos: item.carboidratos,
        gorduras: item.gorduras,
        horario: horario,
        data: data,
      }).select().single();

      if (newMeal && !error) {
        meal.id = newMeal.id;
      }
    }

    setMeals([...meals, meal]);
  };

  const removeMeal = async (id: string) => {
    // Remover do Supabase
    if (userId) {
      await supabase.from('meals').delete().eq('id', id);
    }

    setMeals(meals.filter((meal) => meal.id !== id));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const totalCaloriasConsumidas = meals.reduce((sum, meal) => sum + meal.calorias, 0);
  const totalProteinasConsumidas = meals.reduce((sum, meal) => sum + meal.proteinas, 0);
  const totalCarboidratosConsumidos = meals.reduce((sum, meal) => sum + meal.carboidratos, 0);
  const totalGordurasConsumidas = meals.reduce((sum, meal) => sum + meal.gorduras, 0);

  const totalCalorias = mealAnalysis.reduce((sum, item) => sum + item.calorias, 0);
  const totalProteinas = mealAnalysis.reduce((sum, item) => sum + item.proteinas, 0);
  const totalCarboidratos = mealAnalysis.reduce((sum, item) => sum + item.carboidratos, 0);
  const totalGorduras = mealAnalysis.reduce((sum, item) => sum + item.gorduras, 0);

  const progressPercentage = ((totalCaloriasConsumidas / caloriasDiarias) * 100) || 0;
  const caloriasRestantes = caloriasDiarias - totalCaloriasConsumidas;

  const getMealIcon = (tipo: MealTypeEnum) => {
    switch (tipo) {
      case "cafe":
        return <Coffee className="w-5 h-5" />;
      case "almoco":
        return <UtensilsCrossed className="w-5 h-5" />;
      case "lanche":
        return <Cookie className="w-5 h-5" />;
      case "bebida":
        return <Droplet className="w-5 h-5" />;
      case "janta":
        return <Moon className="w-5 h-5" />;
    }
  };

  const getMealLabel = (tipo: MealTypeEnum) => {
    switch (tipo) {
      case "cafe":
        return "Café da Manhã";
      case "almoco":
        return "Almoço";
      case "lanche":
        return "Lanche";
      case "bebida":
        return "Bebida";
      case "janta":
        return "Janta";
    }
  };

  const getMealsByType = (tipo: MealTypeEnum) => {
    return meals.filter((meal) => meal.tipo === tipo);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 via-blue-500 to-yellow-400 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Apple className="w-10 h-10 text-black" />
          </div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 via-blue-500 to-yellow-400 rounded-xl flex items-center justify-center">
                <Apple className="w-6 h-6 text-black" />
              </div>
              <h1 className="text-2xl font-bold">BR CALL AI</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>Powered by AI</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        {/* Form */}
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-2">
                <User className="w-6 h-6 text-blue-400" />
                Vamos começar sua jornada!
              </CardTitle>
              <CardDescription className="text-gray-400">
                Preencha suas informações para receber um plano personalizado com IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-white">
                    Nome completo
                  </Label>
                  <Input
                    id="nome"
                    placeholder="Digite seu nome"
                    value={userData.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Idade e Gênero */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="idade" className="text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-400" />
                      Idade
                    </Label>
                    <Input
                      id="idade"
                      type="number"
                      placeholder="Ex: 25"
                      value={userData.idade}
                      onChange={(e) => handleInputChange("idade", e.target.value)}
                      required
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genero" className="text-white">
                      Gênero
                    </Label>
                    <Select value={userData.genero} onValueChange={(value) => handleInputChange("genero", value)} required>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="masculino" className="text-white">Masculino</SelectItem>
                        <SelectItem value="feminino" className="text-white">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Peso e Altura */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="peso" className="text-white flex items-center gap-2">
                      <Scale className="w-4 h-4 text-blue-400" />
                      Peso (kg)
                    </Label>
                    <Input
                      id="peso"
                      type="number"
                      step="0.1"
                      placeholder="Ex: 70.5"
                      value={userData.peso}
                      onChange={(e) => handleInputChange("peso", e.target.value)}
                      required
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="altura" className="text-white">
                      Altura (cm)
                    </Label>
                    <Input
                      id="altura"
                      type="number"
                      placeholder="Ex: 175"
                      value={userData.altura}
                      onChange={(e) => handleInputChange("altura", e.target.value)}
                      required
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {/* Objetivo */}
                <div className="space-y-2">
                  <Label htmlFor="objetivo" className="text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-yellow-400" />
                    Qual é o seu objetivo?
                  </Label>
                  <Select value={userData.objetivo} onValueChange={(value) => handleInputChange("objetivo", value)} required>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Selecione seu objetivo" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="perder" className="text-white">Perder peso</SelectItem>
                      <SelectItem value="manter" className="text-white">Manter peso</SelectItem>
                      <SelectItem value="ganhar" className="text-white">Ganhar massa muscular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Nível de Atividade */}
                <div className="space-y-2">
                  <Label htmlFor="atividade" className="text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    Nível de atividade física
                  </Label>
                  <Select value={userData.nivelAtividade} onValueChange={(value) => handleInputChange("nivelAtividade", value)} required>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="sedentario" className="text-white">Sedentário (pouco ou nenhum exercício)</SelectItem>
                      <SelectItem value="leve" className="text-white">Leve (1-3 dias/semana)</SelectItem>
                      <SelectItem value="moderado" className="text-white">Moderado (3-5 dias/semana)</SelectItem>
                      <SelectItem value="intenso" className="text-white">Intenso (6-7 dias/semana)</SelectItem>
                      <SelectItem value="muitoIntenso" className="text-white">Muito intenso (2x por dia)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-500 via-blue-500 to-yellow-500 hover:from-green-600 hover:via-blue-600 hover:to-yellow-600 text-black font-bold text-lg py-6"
                  disabled={loading}
                >
                  {loading ? "Gerando seu plano..." : "Gerar meu plano com IA"}
                  <Sparkles className="w-5 h-5 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 via-blue-500 to-yellow-400 rounded-xl flex items-center justify-center">
              <Apple className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold">BR CALL AI</h1>
              <p className="text-xs text-gray-400">Olá, {userData.nome}!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("form")}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold border-0 shadow-lg"
            >
              Editar perfil
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cards de Estatísticas */}
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                Meta Diária
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-400">{caloriasDiarias}</div>
              <p className="text-sm text-gray-400 mt-1">calorias/dia</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Apple className="w-5 h-5 text-blue-400" />
                Consumidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-400">{totalCaloriasConsumidas}</div>
              <p className="text-sm text-gray-400 mt-1">calorias hoje</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                Restantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${caloriasRestantes >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                {Math.abs(caloriasRestantes)}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {caloriasRestantes >= 0 ? 'calorias restantes' : 'calorias excedidas'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progresso de Calorias */}
        <Card className="bg-gray-900 border-gray-800 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Progresso de Calorias</CardTitle>
            <CardDescription className="text-gray-400">
              {progressPercentage.toFixed(0)}% da sua meta diária
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="h-3" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400">Proteínas</p>
                <p className="text-lg font-bold text-blue-400">{totalProteinasConsumidas}g</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400">Carboidratos</p>
                <p className="text-lg font-bold text-yellow-400">{totalCarboidratosConsumidos}g</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400">Gorduras</p>
                <p className="text-lg font-bold text-purple-400">{totalGordurasConsumidas}g</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400">Refeições</p>
                <p className="text-lg font-bold text-green-400">{meals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Moderno de Análise de Refeição com Foto */}
        <Card className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border-gray-700 mt-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
          <CardHeader className="relative">
            <CardTitle className="text-white flex items-center gap-2 text-2xl">
              <Camera className="w-6 h-6 text-green-400" />
              Analisar Refeição com IA
            </CardTitle>
            <CardDescription className="text-gray-400">
              Tire uma foto do seu alimento e descubra todas as informações nutricionais instantaneamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            {/* Upload de Imagem */}
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                {mealImage ? (
                  <div className="relative w-full max-w-2xl">
                    <img
                      src={mealImage}
                      alt="Refeição"
                      className="w-full h-80 object-cover rounded-2xl border-2 border-gray-700 shadow-2xl"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-4 right-4 rounded-full shadow-lg"
                      onClick={() => {
                        setMealImage(null);
                        setMealAnalysis([]);
                      }}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="meal-image"
                    className="w-full max-w-2xl h-80 border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-500/5 transition-all duration-300 group"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Camera className="w-10 h-10 text-white" />
                    </div>
                    <span className="text-gray-300 text-lg font-semibold mb-2">Clique para tirar ou adicionar foto</span>
                    <span className="text-gray-500 text-sm">Suporta JPG, PNG - Análise instantânea com IA</span>
                  </label>
                )}
                <Input
                  id="meal-image"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Botão de Análise */}
            {mealImage && mealAnalysis.length === 0 && (
              <Button
                onClick={analyzeMeal}
                disabled={analyzingMeal}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold text-lg py-6 rounded-xl shadow-lg hover:shadow-2xl transition-all"
              >
                {analyzingMeal ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Analisando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 mr-2" />
                    Analisar Refeição com IA
                  </>
                )}
              </Button>
            )}

            {/* Resultados da Análise */}
            {mealAnalysis.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                    Análise Completa
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMealImage(null);
                      setMealAnalysis([]);
                    }}
                    className="border-gray-700 text-gray-400 hover:text-white"
                  >
                    Nova Análise
                  </Button>
                </div>
                
                {/* Resumo Total com Design Moderno e Detalhado */}
                <div className="bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-800/40 border-2 border-gray-700 rounded-3xl p-8 shadow-2xl">
                  <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Target className="w-6 h-6 text-green-400" />
                    Resumo Nutricional Total
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Calorias */}
                    <div className="bg-gradient-to-br from-green-500/30 to-green-500/10 border-2 border-green-500/50 rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300 shadow-xl">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500/40">
                        <Apple className="w-8 h-8 text-green-400" />
                      </div>
                      <p className="text-xs text-gray-300 uppercase tracking-widest mb-3 font-semibold">Calorias Totais</p>
                      <p className="text-5xl font-black text-green-400 mb-2">{totalCalorias}</p>
                      <p className="text-sm text-gray-400 font-medium">quilocalorias</p>
                      <div className="mt-4 pt-4 border-t border-green-500/30">
                        <p className="text-xs text-gray-400">Energia total da refeição</p>
                      </div>
                    </div>

                    {/* Proteínas */}
                    <div className="bg-gradient-to-br from-blue-500/30 to-blue-500/10 border-2 border-blue-500/50 rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300 shadow-xl">
                      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-500/40">
                        <Activity className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className="text-xs text-gray-300 uppercase tracking-widest mb-3 font-semibold">Proteínas</p>
                      <p className="text-5xl font-black text-blue-400 mb-2">{totalProteinas}</p>
                      <p className="text-sm text-gray-400 font-medium">gramas</p>
                      <div className="mt-4 pt-4 border-t border-blue-500/30">
                        <p className="text-xs text-gray-400">Construção muscular</p>
                      </div>
                    </div>

                    {/* Carboidratos */}
                    <div className="bg-gradient-to-br from-yellow-500/30 to-yellow-500/10 border-2 border-yellow-500/50 rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300 shadow-xl">
                      <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-500/40">
                        <TrendingUp className="w-8 h-8 text-yellow-400" />
                      </div>
                      <p className="text-xs text-gray-300 uppercase tracking-widest mb-3 font-semibold">Carboidratos</p>
                      <p className="text-5xl font-black text-yellow-400 mb-2">{totalCarboidratos}</p>
                      <p className="text-sm text-gray-400 font-medium">gramas</p>
                      <div className="mt-4 pt-4 border-t border-yellow-500/30">
                        <p className="text-xs text-gray-400">Fonte de energia</p>
                      </div>
                    </div>

                    {/* Gorduras */}
                    <div className="bg-gradient-to-br from-purple-500/30 to-purple-500/10 border-2 border-purple-500/50 rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300 shadow-xl">
                      <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-purple-500/40">
                        <Droplet className="w-8 h-8 text-purple-400" />
                      </div>
                      <p className="text-xs text-gray-300 uppercase tracking-widest mb-3 font-semibold">Gorduras</p>
                      <p className="text-5xl font-black text-purple-400 mb-2">{totalGorduras}</p>
                      <p className="text-sm text-gray-400 font-medium">gramas</p>
                      <div className="mt-4 pt-4 border-t border-purple-500/30">
                        <p className="text-xs text-gray-400">Gorduras essenciais</p>
                      </div>
                    </div>
                  </div>

                  {/* Informações Adicionais */}
                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div className="bg-gray-800/50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">Calorias por grama</p>
                        <p className="text-2xl font-bold text-white">
                          {totalProteinas + totalCarboidratos + totalGorduras > 0 
                            ? (totalCalorias / (totalProteinas + totalCarboidratos + totalGorduras)).toFixed(1)
                            : '0'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">kcal/g</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">% de Proteínas</p>
                        <p className="text-2xl font-bold text-blue-400">
                          {totalCalorias > 0 ? ((totalProteinas * 4 / totalCalorias) * 100).toFixed(0) : '0'}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">do total</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">% de Carboidratos</p>
                        <p className="text-2xl font-bold text-yellow-400">
                          {totalCalorias > 0 ? ((totalCarboidratos * 4 / totalCalorias) * 100).toFixed(0) : '0'}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">do total</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalhes por Alimento com Botão de Adicionar */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
                    <Apple className="w-5 h-5 text-green-400" />
                    Alimentos Identificados ({mealAnalysis.length})
                  </h4>
                  {mealAnalysis.map((item, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-gray-800 to-gray-800/50 border border-gray-700 rounded-xl p-5 space-y-4 hover:border-gray-600 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center font-bold text-white">
                              {index + 1}
                            </div>
                            <p className="font-bold text-white text-lg">{item.alimento}</p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                              <span className="text-gray-400 text-xs block mb-1">Calorias</span>
                              <span className="text-green-400 font-bold text-2xl">{item.calorias}</span>
                              <span className="text-gray-500 text-xs ml-1">kcal</span>
                            </div>
                            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                              <span className="text-gray-400 text-xs block mb-1">Proteínas</span>
                              <span className="text-blue-400 font-bold text-2xl">{item.proteinas}</span>
                              <span className="text-gray-500 text-xs ml-1">g</span>
                            </div>
                            <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                              <span className="text-gray-400 text-xs block mb-1">Carboidratos</span>
                              <span className="text-yellow-400 font-bold text-2xl">{item.carboidratos}</span>
                              <span className="text-gray-500 text-xs ml-1">g</span>
                            </div>
                            <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                              <span className="text-gray-400 text-xs block mb-1">Gorduras</span>
                              <span className="text-purple-400 font-bold text-2xl">{item.gorduras}</span>
                              <span className="text-gray-500 text-xs ml-1">g</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botões de Adicionar por Tipo de Refeição */}
                      <div className="border-t border-gray-700 pt-4">
                        <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Adicionar como:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <Button
                            size="sm"
                            onClick={() => addMealFromAnalysis(item, "cafe")}
                            className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30"
                          >
                            <Coffee className="w-4 h-4 mr-1" />
                            Café
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => addMealFromAnalysis(item, "almoco")}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                          >
                            <UtensilsCrossed className="w-4 h-4 mr-1" />
                            Almoço
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => addMealFromAnalysis(item, "lanche")}
                            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30"
                          >
                            <Cookie className="w-4 h-4 mr-1" />
                            Lanche
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => addMealFromAnalysis(item, "bebida")}
                            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30"
                          >
                            <Droplet className="w-4 h-4 mr-1" />
                            Bebida
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => addMealFromAnalysis(item, "janta")}
                            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30"
                          >
                            <Moon className="w-4 h-4 mr-1" />
                            Janta
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comparação com Meta */}
                <div className="bg-gradient-to-r from-gray-800 via-gray-800 to-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-400" />
                    Comparação com sua meta diária:
                  </p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300 font-semibold">Calorias desta refeição</span>
                        <span className="text-white font-bold">
                          {totalCalorias} / {caloriasDiarias} kcal ({((totalCalorias / caloriasDiarias) * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <Progress 
                        value={(totalCalorias / caloriasDiarias) * 100} 
                        className="h-3"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {totalCalorias < caloriasDiarias 
                        ? `Você ainda pode consumir ${caloriasDiarias - totalCalorias} kcal hoje` 
                        : `Você atingiu sua meta diária!`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Refeições Registradas por Tipo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {(["cafe", "almoco", "lanche", "bebida", "janta"] as MealTypeEnum[]).map((tipo) => {
            const mealsByType = getMealsByType(tipo);
            const totalCaloriasTipo = mealsByType.reduce((sum, meal) => sum + meal.calorias, 0);

            return (
              <Card key={tipo} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2 text-lg">
                    {getMealIcon(tipo)}
                    {getMealLabel(tipo)}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {totalCaloriasTipo} kcal • {mealsByType.length} {mealsByType.length === 1 ? 'item' : 'itens'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mealsByType.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      Nenhuma refeição registrada
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {mealsByType.map((meal) => (
                        <div
                          key={meal.id}
                          className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-white text-sm">{meal.nome}</p>
                              <p className="text-xs text-gray-400">{meal.horario}</p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeMeal(meal.id)}
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-400">Cal: </span>
                              <span className="text-green-400 font-semibold">{meal.calorias}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Prot: </span>
                              <span className="text-blue-400 font-semibold">{meal.proteinas}g</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Carb: </span>
                              <span className="text-yellow-400 font-semibold">{meal.carboidratos}g</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Gord: </span>
                              <span className="text-purple-400 font-semibold">{meal.gorduras}g</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Dicas da IA */}
        <Card className="bg-gray-900 border-gray-800 mt-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Dicas Personalizadas da IA
            </CardTitle>
            <CardDescription className="text-gray-400">
              Recomendações baseadas no seu perfil e objetivos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aiTips.map((tip, index) => (
                <div
                  key={index}
                  className="flex gap-3 p-4 rounded-lg bg-gradient-to-r from-gray-800 to-gray-800/50 border border-gray-700 hover:border-gray-600 transition-all"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    index % 3 === 0 ? "bg-green-500/20 text-green-400" :
                    index % 3 === 1 ? "bg-blue-500/20 text-blue-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {index + 1}
                  </div>
                  <p className="text-gray-200 text-sm leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Informações do Perfil */}
        <Card className="bg-gray-900 border-gray-800 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Seu Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400">Idade</p>
                <p className="text-lg font-semibold text-white">{userData.idade} anos</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Altura</p>
                <p className="text-lg font-semibold text-white">{userData.altura} cm</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Peso</p>
                <p className="text-lg font-semibold text-white">{userData.peso} kg</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Objetivo</p>
                <p className="text-lg font-semibold text-white capitalize">
                  {userData.objetivo === "perder" && "Perder Peso"}
                  {userData.objetivo === "manter" && "Manter"}
                  {userData.objetivo === "ganhar" && "Ganhar Massa"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
