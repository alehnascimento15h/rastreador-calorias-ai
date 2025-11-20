import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();

    // Verificar se a chave da OpenAI está configurada
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      // Retornar dicas padrão se não houver chave configurada
      return NextResponse.json({
        tips: [
          "Beba pelo menos 2 litros de água por dia para manter-se hidratado",
          "Faça 5-6 refeições pequenas ao longo do dia para manter o metabolismo ativo",
          "Inclua proteínas em todas as refeições para melhor saciedade",
          "Evite alimentos processados e açúcares refinados",
          "Durma de 7-8 horas por noite para melhor recuperação muscular",
        ],
      });
    }

    // Preparar contexto do usuário
    const objetivo = userData.objetivo === "perder" ? "perder peso" : 
                     userData.objetivo === "ganhar" ? "ganhar massa muscular" : 
                     "manter o peso";

    const nivelAtividade = userData.nivelAtividade === "sedentario" ? "sedentário" :
                           userData.nivelAtividade === "leve" ? "levemente ativo" :
                           userData.nivelAtividade === "moderado" ? "moderadamente ativo" :
                           userData.nivelAtividade === "intenso" ? "muito ativo" :
                           "extremamente ativo";

    // Chamar a OpenAI API
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
            content: `Você é um nutricionista e personal trainer especializado. Forneça dicas personalizadas de nutrição e treino baseadas no perfil do usuário. Seja específico, prático e motivador.`,
          },
          {
            role: "user",
            content: `Gere 5 dicas personalizadas para:
- Nome: ${userData.nome}
- Idade: ${userData.idade} anos
- Peso: ${userData.peso} kg
- Altura: ${userData.height || userData.altura} cm
- Gênero: ${userData.genero}
- Objetivo: ${objetivo}
- Nível de atividade: ${nivelAtividade}

Forneça dicas práticas e específicas para este perfil. Retorne APENAS um JSON no formato:
{
  "tips": ["dica 1", "dica 2", "dica 3", "dica 4", "dica 5"]
}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro da OpenAI:", errorData);
      // Retornar dicas padrão em caso de erro
      return NextResponse.json({
        tips: [
          "Beba pelo menos 2 litros de água por dia para manter-se hidratado",
          "Faça 5-6 refeições pequenas ao longo do dia para manter o metabolismo ativo",
          "Inclua proteínas em todas as refeições para melhor saciedade",
          "Evite alimentos processados e açúcares refinados",
          "Durma de 7-8 horas por noite para melhor recuperação muscular",
        ],
      });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        tips: [
          "Beba pelo menos 2 litros de água por dia para manter-se hidratado",
          "Faça 5-6 refeições pequenas ao longo do dia para manter o metabolismo ativo",
          "Inclua proteínas em todas as refeições para melhor saciedade",
          "Evite alimentos processados e açúcares refinados",
          "Durma de 7-8 horas por noite para melhor recuperação muscular",
        ],
      });
    }

    // Extrair JSON da resposta
    let tipsData;
    try {
      // Tentar parsear diretamente
      tipsData = JSON.parse(content);
    } catch {
      // Se falhar, tentar extrair JSON de markdown
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        tipsData = JSON.parse(jsonMatch[1]);
      } else {
        // Última tentativa: procurar por { ... }
        const jsonStart = content.indexOf("{");
        const jsonEnd = content.lastIndexOf("}") + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          tipsData = JSON.parse(content.substring(jsonStart, jsonEnd));
        } else {
          // Se tudo falhar, retornar dicas padrão
          return NextResponse.json({
            tips: [
              "Beba pelo menos 2 litros de água por dia para manter-se hidratado",
              "Faça 5-6 refeições pequenas ao longo do dia para manter o metabolismo ativo",
              "Inclua proteínas em todas as refeições para melhor saciedade",
              "Evite alimentos processados e açúcares refinados",
              "Durma de 7-8 horas por noite para melhor recuperação muscular",
            ],
          });
        }
      }
    }

    return NextResponse.json(tipsData);
  } catch (error) {
    console.error("Erro ao processar dicas:", error);
    return NextResponse.json({
      tips: [
        "Beba pelo menos 2 litros de água por dia para manter-se hidratado",
        "Faça 5-6 refeições pequenas ao longo do dia para manter o metabolismo ativo",
        "Inclua proteínas em todas as refeições para melhor saciedade",
        "Evite alimentos processados e açúcares refinados",
        "Durma de 7-8 horas por noite para melhor recuperação muscular",
      ],
    });
  }
}
