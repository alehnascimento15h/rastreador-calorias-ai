"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Home, TrendingUp, User, Settings, X, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type MealAnalysis = {
  alimento: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  posicao?: { x: number; y: number };
};

export default function Home() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para análise de refeição com foto
  const [mealImage, setMealImage] = useState<string | null>(null);
  const [analyzingMeal, setAnalyzingMeal] = useState(false);
  const [mealAnalysis, setMealAnalysis] = useState<MealAnalysis[]>([]);

  // Verificar autenticação
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
      setLoading(false);
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      router.push('/login');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMealImage(reader.result as string);
        analyzeMeal(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeMeal = async (image: string) => {
    setAnalyzingMeal(true);
    try {
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });

      const data = await response.json();
      
      // Adicionar posições aleatórias para as etiquetas
      const analysisWithPositions = (data.analysis || []).map((item: MealAnalysis, index: number) => ({
        ...item,
        posicao: {
          x: 15 + (index * 20) % 70,
          y: 20 + (index * 25) % 60,
        }
      }));
      
      setMealAnalysis(analysisWithPositions);
    } catch (error) {
      console.error("Erro ao analisar refeição:", error);
      setMealAnalysis([]);
    } finally {
      setAnalyzingMeal(false);
    }
  };

  const totalCalorias = mealAnalysis.reduce((sum, item) => sum + item.calorias, 0);
  const totalProteinas = mealAnalysis.reduce((sum, item) => sum + item.proteinas, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header com título */}
      <header className="px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Cal AI</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setMealImage(null);
            setMealAnalysis([]);
          }}
          className="text-white hover:bg-gray-800"
        >
          <X className="w-6 h-6" />
        </Button>
      </header>

      {/* Área principal - Imagem com etiquetas */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {!mealImage ? (
          <div className="text-center space-y-6">
            <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto">
              <Camera className="w-16 h-16 text-gray-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Tire uma foto</h2>
              <p className="text-gray-400">Aponte para sua refeição e capture</p>
            </div>
          </div>
        ) : (
          <div className="relative w-full max-w-2xl">
            {/* Imagem da refeição */}
            <div className="relative rounded-3xl overflow-hidden">
              <img
                src={mealImage}
                alt="Refeição"
                className="w-full h-auto object-cover"
              />
              
              {/* Overlay de análise */}
              {analyzingMeal && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
                    <p className="text-white font-semibold">Analisando com IA...</p>
                  </div>
                </div>
              )}

              {/* Etiquetas flutuantes com informações nutricionais */}
              {!analyzingMeal && mealAnalysis.length > 0 && mealAnalysis.map((item, index) => (
                <div
                  key={index}
                  className="absolute animate-in fade-in zoom-in duration-500"
                  style={{
                    left: `${item.posicao?.x || 50}%`,
                    top: `${item.posicao?.y || 50}%`,
                    transform: 'translate(-50%, -50%)',
                    animationDelay: `${index * 150}ms`
                  }}
                >
                  {/* Linha apontadora */}
                  <div className="absolute w-0.5 h-8 bg-white/60 -bottom-8 left-1/2 -translate-x-1/2"></div>
                  
                  {/* Etiqueta */}
                  <div className="bg-white text-black rounded-2xl px-4 py-3 shadow-2xl min-w-[140px] border-2 border-gray-200">
                    <p className="font-bold text-sm mb-1 text-center">{item.alimento}</p>
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="font-semibold">{item.calorias} kcal</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-700">{item.proteinas}g prot</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo total abaixo da imagem */}
            {!analyzingMeal && mealAnalysis.length > 0 && (
              <div className="mt-6 bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    Análise Completa
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-xl p-4 border border-green-500/30">
                    <p className="text-xs text-gray-400 mb-1">Calorias</p>
                    <p className="text-3xl font-bold text-green-400">{totalCalorias}</p>
                    <p className="text-xs text-gray-500 mt-1">kcal</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl p-4 border border-blue-500/30">
                    <p className="text-xs text-gray-400 mb-1">Proteínas</p>
                    <p className="text-3xl font-bold text-blue-400">{totalProteinas}</p>
                    <p className="text-xs text-gray-500 mt-1">gramas</p>
                  </div>
                </div>

                {/* Lista de alimentos */}
                <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
                  {mealAnalysis.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{item.alimento}</span>
                      <span className="text-gray-500">{item.calorias} kcal</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Barra de navegação inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Ícone Home */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full w-12 h-12"
          >
            <Home className="w-6 h-6" />
          </Button>

          {/* Ícone Estatísticas */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full w-12 h-12"
          >
            <TrendingUp className="w-6 h-6" />
          </Button>

          {/* Botão de Captura Central */}
          <label
            htmlFor="camera-input"
            className="relative -mt-8 cursor-pointer"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 via-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
              <Camera className="w-10 h-10 text-white" />
            </div>
          </label>
          <Input
            id="camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Ícone Perfil */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full w-12 h-12"
          >
            <User className="w-6 h-6" />
          </Button>

          {/* Ícone Configurações */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full w-12 h-12"
          >
            <Settings className="w-6 h-6" />
          </Button>
        </div>
      </nav>
    </div>
  );
}
