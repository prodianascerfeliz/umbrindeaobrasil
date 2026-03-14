export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const hoje = req.body.data || new Date().toISOString().slice(0, 10);

  const prompt = `Hoje é ${hoje}. Você é o VINI, sommelier brasileiro do site "Um Brinde ao Brasil".

Gere EXATAMENTE 5 dicas de vinho no formato JSON abaixo. Cada dica deve ser contextualizada com algo relevante do momento atual — pode ser uma data comemorativa, evento esportivo, tendência gastronômica, estação do ano, cultura pop, ou qualquer contexto que torne a dica interessante e compartilhável nas redes sociais.

Regras:
- Foco EXCLUSIVO em vinhos brasileiros
- Cada dica deve ter uma conexão real com o contexto do dia ou semana
- Linguagem acessível, apaixonada, sem esnobismo
- O campo "texto" deve ter entre 2-3 frases envolventes
- Varie as tags entre: Harmonização, Espumante, Descoberta, Tendência, Temporada, Evento, Gastronomia
- Varie as regiões: Serra Gaúcha, Pinto Bandeira, Campanha Gaúcha, São Joaquim, Serra da Mantiqueira, Vale do São Francisco

Responda APENAS com JSON válido, sem texto antes ou depois:

{
  "dicas": [
    {
      "tag": "string (categoria)",
      "titulo": "string (título criativo, pode usar HTML <em> para itálico)",
      "texto": "string (2-3 frases, texto puro sem HTML)",
      "vinho": "string (nome do vinho/estilo + região)",
      "data": "${hoje}"
    }
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Extrai o texto da resposta (pode vir após tool_use blocks)
    let texto = '';
    for (const block of data.content) {
      if (block.type === 'text') {
        texto += block.text;
      }
    }

    // Parse do JSON
    const jsonMatch = texto.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'JSON não encontrado na resposta', raw: texto });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: 'Erro ao gerar dicas', detail: err.message });
  }
}
