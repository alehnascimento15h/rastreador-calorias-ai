import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(request: Request) {
  try {
    const userData = await request.json();

    const prompt = `Você é um nutricionista especializado. Com base nas informações abaixo, gere 5 dicas práticas e personalizadas para o dia a dia:

Nome: ${userData.nome}
Idade: ${userData.idade} anos
Peso: ${userData.peso} kg
Altura: ${userData.altura} cm
Gênero: ${userData.genero}
Objetivo: ${userData.objetivo === "perder" ? "Perder peso" : userData.objetivo === "ganhar" ? "Ganhar massa muscular" : "Manter peso"}
Nível de atividade: ${userData.nivelAtividade}

Forneça 5 dicas práticas, objetivas e motivacionais. Cada dica deve ter no máximo 2 linhas.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é um nutricionista experiente que fornece dicas práticas e motivacionais.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content || "";
    const tips = content
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => line.replace(/^\d+\.\s*/, "").replace(/^-\s*/, "").trim())
      .filter((tip) => tip.length > 10)
      .slice(0, 5);

    return NextResponse.json({ tips });
  } catch (error) {
    console.error("Erro ao gerar dicas:", error);
    
    // Dicas padrão em caso de erro
    return NextResponse.json({
      tips: [
        "Beba pelo menos 2 litros de água por dia para manter-se hidratado",
        "Faça 5-6 refeições pequenas ao longo do dia para acelerar o metabolismo",
        "Inclua proteínas magras em todas as refeições principais",
        "Evite alimentos processados e priorize alimentos naturais",
        "Durma de 7-8 horas por noite para melhor recuperação muscular",
      ],
    });
  }
}
