import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Imagem não fornecida" },
        { status: 400 }
      );
    }

    // Verificar se a chave da OpenAI está configurada
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json(
        { error: "Chave da OpenAI não configurada" },
        { status: 500 }
      );
    }

    // Chamar a OpenAI Vision API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um nutricionista especializado em análise de alimentos. Analise a imagem fornecida e identifique TODOS os alimentos visíveis. Para cada alimento, forneça valores nutricionais precisos e realistas baseados em porções típicas visíveis na foto.

IMPORTANTE:
- Identifique CADA alimento separadamente (ex: se há arroz, feijão e carne, liste os 3)
- Estime porções realistas baseadas no que vê na imagem
- Forneça valores nutricionais precisos por porção
- Se não conseguir identificar claramente, indique isso

Retorne APENAS um JSON válido no formato:
{
  "analysis": [
    {
      "alimento": "nome do alimento com porção estimada",
      "calorias": número,
      "proteinas": número,
      "carboidratos": número,
      "gorduras": número
    }
  ]
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta imagem de alimento e forneça informações nutricionais detalhadas para CADA alimento visível. Seja específico e preciso.",
              },
              {
                type: "image_url",
                image_url: {
                  url: image,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro da OpenAI:", errorData);
      return NextResponse.json(
        { error: "Erro ao analisar imagem com IA" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Resposta vazia da IA" },
        { status: 500 }
      );
    }

    // Extrair JSON da resposta
    let analysisData;
    try {
      // Tentar parsear diretamente
      analysisData = JSON.parse(content);
    } catch {
      // Se falhar, tentar extrair JSON de markdown
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[1]);
      } else {
        // Última tentativa: procurar por { ... }
        const jsonStart = content.indexOf("{");
        const jsonEnd = content.lastIndexOf("}") + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          analysisData = JSON.parse(content.substring(jsonStart, jsonEnd));
        } else {
          throw new Error("Não foi possível extrair JSON da resposta");
        }
      }
    }

    // Validar estrutura da resposta
    if (!analysisData.analysis || !Array.isArray(analysisData.analysis)) {
      return NextResponse.json(
        { error: "Formato de resposta inválido" },
        { status: 500 }
      );
    }

    // Garantir que todos os valores são números
    analysisData.analysis = analysisData.analysis.map((item: any) => ({
      alimento: item.alimento || "Alimento não identificado",
      calorias: Math.round(Number(item.calorias) || 0),
      proteinas: Math.round(Number(item.proteinas) || 0),
      carboidratos: Math.round(Number(item.carboidratos) || 0),
      gorduras: Math.round(Number(item.gorduras) || 0),
    }));

    return NextResponse.json(analysisData);
  } catch (error) {
    console.error("Erro ao processar análise:", error);
    return NextResponse.json(
      { 
        error: "Erro ao processar análise",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}
