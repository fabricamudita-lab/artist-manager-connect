import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// BM25 keyword matching function
function calculateBM25Score(query: string, content: string): number {
  const k1 = 1.2;
  const b = 0.75;
  const avgdl = 1000; // average document length

  const terms = query.toLowerCase().split(/\s+/);
  const docWords = content.toLowerCase().split(/\s+/);
  const dl = docWords.length;

  let score = 0;
  for (const term of terms) {
    const termFreq = docWords.filter(word => word.includes(term)).length;
    if (termFreq > 0) {
      const idf = Math.log(1 + (1 / Math.max(1, termFreq)));
      score += idf * (termFreq * (k1 + 1)) / (termFreq + k1 * (1 - b + b * (dl / avgdl)));
    }
  }
  return score;
}

// Generate embeddings for search query
async function generateQueryEmbedding(text: string): Promise<number[]> {
  if (!openAIApiKey) {
    return new Array(1536).fill(0);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      }),
    });

    const data = await response.json();
    return data.data[0]?.embedding || new Array(1536).fill(0);
  } catch (error) {
    console.error('Error generating embedding:', error);
    return new Array(1536).fill(0);
  }
}

// Cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Search event index with hybrid approach
async function searchEventIndex(eventId: string, query: string, topK = 8, minScore = 0.35, scope?: string) {
  try {
    // Check index status
    const { data: indexStatus } = await supabase
      .from('event_index_status')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (!indexStatus || indexStatus.status !== 'completed') {
      return {
        results: [],
        indexStatus: indexStatus?.status || 'not_indexed',
        message: 'El evento no está indexado o está en proceso de indexación.'
      };
    }

    // Get all processed document fragments
    let query_builder = supabase
      .from('event_document_index')
      .select('*')
      .eq('event_id', eventId)
      .not('embedding_data', 'is', null);

    // Apply scope filter if provided
    if (scope) {
      query_builder = query_builder.ilike('subfolder', `%${scope.replace('/', '')}%`);
    }

    const { data: documents, error } = await query_builder;

    if (error) {
      console.error('Error fetching documents:', error);
      return { results: [], error: 'Error al buscar en el índice' };
    }

    if (!documents || documents.length === 0) {
      return {
        results: [],
        message: scope ? `No hay documentos en ${scope} para buscar.` : 'No consta en los archivos del evento.'
      };
    }

    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // Calculate scores for each document
    const scoredDocuments = documents.map(doc => {
      const bm25Score = calculateBM25Score(query, doc.content_fragment);
      
      let vectorScore = 0;
      if (doc.embedding_data && Array.isArray(doc.embedding_data)) {
        vectorScore = cosineSimilarity(queryEmbedding, doc.embedding_data);
      }
      
      // Hybrid score: weighted average
      const hybridScore = (bm25Score * 0.3 + vectorScore * 0.7);
      
      return {
        ...doc,
        score: hybridScore,
        bm25Score,
        vectorScore
      };
    });

    // Filter by minimum score and sort
    const filteredResults = scoredDocuments
      .filter(doc => doc.score > minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    if (filteredResults.length === 0) {
      return {
        results: [],
        message: 'No consta en los archivos del evento.'
      };
    }

    return {
      results: filteredResults,
      indexStatus: 'completed'
    };
  } catch (error) {
    console.error('Error in searchEventIndex:', error);
    return { results: [], error: error.message };
  }
}

// Generate AI response using search results
async function generateAIResponse(query: string, searchResults: any[], eventData: any, citeSources = false) {
  if (!openAIApiKey) {
    return {
      response: "OpenAI API no está configurada. No puedo generar respuestas.",
      sources: []
    };
  }

  try {
    // Prepare context from search results
    const context = searchResults.map((result, index) => 
      `[${index + 1}] ${result.file_name} (${result.subfolder}): ${result.content_fragment}`
    ).join('\n\n');

    const systemPrompt = `Eres un asistente especializado en gestión de eventos musicales. 
Tu tarea es responder preguntas sobre un evento específico basándote ÚNICAMENTE en la información proporcionada.

REGLAS ESTRICTAS:
- Responde de forma breve (3-6 líneas máximo)
- Usa bullet points cuando sea apropiado
- Si no encuentras información específica, di "No consta en los archivos del evento"
- Resalta 1-2 frases clave usando **texto en negrita**
- Mantén un tono profesional pero cercano

INFORMACIÓN DEL EVENTO:
- Fecha: ${eventData.fecha || 'No especificada'}
- Ciudad: ${eventData.ciudad || 'No especificada'}
- Lugar: ${eventData.lugar || 'No especificado'}
- Formato: ${eventData.formato || 'No especificado'}
- Oferta: ${eventData.oferta || 'No especificada'}
- Estado: ${eventData.estado || 'Pendiente'}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Contexto de documentos:\n${context}\n\nPregunta: ${query}` }
        ],
        temperature: 0.3,
        max_tokens: 500
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'No pude generar una respuesta.';

    // Prepare sources if citation is enabled
    const sources = citeSources ? searchResults.map(result => ({
      fileName: result.file_name,
      subfolder: result.subfolder,
      pageNumber: result.page_number,
      confidence: Math.round(result.score * 100),
      type: getFileType(result.file_name),
      filePath: result.file_path,
      content: result.content_fragment.substring(0, 200) + '...'
    })) : [];

    return {
      response: aiResponse,
      sources
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return {
      response: 'Error al generar la respuesta. Por favor, inténtalo de nuevo.',
      sources: []
    };
  }
}

function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'PDF';
    case 'doc': case 'docx': return 'DOC';
    case 'xls': case 'xlsx': return 'XLS';
    case 'txt': return 'TXT';
    case 'csv': return 'CSV';
    case 'json': return 'JSON';
    case 'jpg': case 'jpeg': case 'png': case 'webp': return 'IMAGE';
    default: return 'OTHER';
  }
}

// Generate specialized payment response
async function generatePaymentResponse(searchResults: any[], citeSources = true) {
  if (!openAIApiKey) {
    return {
      response: "OpenAI API no está configurada. No puedo generar respuestas.",
      sources: []
    };
  }

  try {
    // Prepare context from search results
    const context = searchResults.map((result, index) => 
      `[${index + 1}] ${result.file_name} (página ${result.page_number || 'N/A'}): ${result.content_fragment}`
    ).join('\n\n');

    const systemPrompt = `Eres un asistente especializado en análisis de contratos musicales. 
Tu tarea es extraer información específica sobre la forma de pago del contenido proporcionado.

INFORMACIÓN A EXTRAER:
1. **Esquema de pago**: Porcentajes y fechas (ej: "50% al firmar, 50% el día de la actuación")
2. **Método de pago**: Transferencia bancaria, efectivo, cheque, etc.
3. **IBAN**: Si aparece algún número de cuenta bancaria

FORMATO DE RESPUESTA:
• **Esquema de pago:** [porcentaje/fecha]
• **Método:** [transferencia/efectivo/etc]
• **IBAN:** [si aparece, o "No especificado"]

REGLAS:
- Responde en formato de bullets como se muestra arriba
- Si no encuentras algún dato, pon "No especificado"
- Extrae texto literal del contrato cuando sea posible
- Se breve y preciso`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Contexto del contrato:\n${context}\n\nExtrae la información de forma de pago:` }
        ],
        temperature: 0.1,
        max_tokens: 300
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'No pude extraer información de pago.';

    // Prepare sources if citation is enabled
    const sources = citeSources ? searchResults.map(result => ({
      fileName: result.file_name,
      subfolder: result.subfolder,
      pageNumber: result.page_number,
      confidence: Math.round(result.score * 100),
      type: getFileType(result.file_name),
      filePath: result.file_path,
      content: result.content_fragment.substring(0, 200) + '...'
    })) : [];

    return {
      response: aiResponse,
      sources
    };
  } catch (error) {
    console.error('Error generating payment response:', error);
    return {
      response: 'Error al extraer información de pago. Por favor, inténtalo de nuevo.',
      sources: []
    };
  }
}

// Handle quick start chips
function handleQuickStartQuery(chip: string, eventData: any) {
  switch (chip) {
    case "Fecha, ciudad y formato":
      return {
        response: `**Información del evento:**\n• Fecha: ${eventData.fecha ? new Date(eventData.fecha).toLocaleDateString('es-ES') : 'No especificada'}\n• Ciudad: ${eventData.ciudad || 'No especificada'}\n• Formato: ${eventData.formato || 'No especificado'}\n• Lugar: ${eventData.lugar || 'No especificado'}`,
        sources: [],
        isQuickStart: true
      };
    
    case "Resumen económico (oferta + IVA)":
      if (!eventData.oferta) {
        return {
          response: '**No hay información económica** disponible para este evento.',
          sources: [],
          isQuickStart: true
        };
      }
      
      const oferta = eventData.oferta;
      const hasIVAIncluded = oferta.toLowerCase().includes('iva incl') || oferta.toLowerCase().includes('iva incluido');
      const hasPlusIVA = oferta.toLowerCase().includes('+ iva') || oferta.toLowerCase().includes('+iva');
      
      let economicSummary = `**Oferta:** ${oferta}`;
      
      if (hasPlusIVA) {
        // Try to extract number and calculate IVA
        const numberMatch = oferta.match(/[\d,.]+/);
        if (numberMatch) {
          const baseAmount = parseFloat(numberMatch[0].replace(',', '.'));
          const ivaAmount = baseAmount * 0.21;
          const totalAmount = baseAmount + ivaAmount;
          economicSummary += `\n• Base: ${baseAmount.toLocaleString('es-ES')}€\n• IVA (21%): ${ivaAmount.toLocaleString('es-ES')}€\n• **Total: ${totalAmount.toLocaleString('es-ES')}€**`;
        }
      } else if (hasIVAIncluded) {
        economicSummary += '\n• **IVA incluido** en el importe mostrado';
      }
      
      return {
        response: economicSummary,
        sources: [],
        isQuickStart: true
      };
    
    case "Forma de pago":
      // This is handled as a special contract search, not a quick start
      return null;
    
    default:
      return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, query, topK = 8, minScore = 0.35, citeSources = false, eventData, scope } = await req.json();

    if (!eventId || !query) {
      return new Response(
        JSON.stringify({ error: 'eventId and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle quick start queries
    const quickStartResponse = handleQuickStartQuery(query, eventData);
    if (quickStartResponse) {
      return new Response(
        JSON.stringify(quickStartResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle special "Forma de pago" query
    if (query === "Forma de pago") {
      const paymentPatterns = [
        "forma de pago", "pago", "transferencia", "iban", "cuenta", 
        "%", "día de la actuación"
      ];
      
      const paymentQuery = paymentPatterns.join(" ");
      const searchResults = await searchEventIndex(eventId, paymentQuery, 6, 0.25, "/Contrato");
      
      if (searchResults.results && searchResults.results.length > 0) {
        // Extract payment information from results
        const aiResult = await generatePaymentResponse(searchResults.results, true);
        
        return new Response(
          JSON.stringify(aiResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({
            response: '❌ **No encuentro información de forma de pago en el contrato**\n\nNo he encontrado detalles sobre el método de pago en el contrato. Te recomiendo:\n• Reindexa los documentos\n• Sube el documento del contrato si falta',
            sources: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Perform regular search
    const searchResults = await searchEventIndex(eventId, query, topK, minScore, scope);
    
    if (searchResults.error) {
      return new Response(
        JSON.stringify({ error: searchResults.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (searchResults.indexStatus !== 'completed') {
      return new Response(
        JSON.stringify({
          response: searchResults.message,
          sources: [],
          indexStatus: searchResults.indexStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (searchResults.results.length === 0) {
      return new Response(
        JSON.stringify({
          response: searchResults.message || 'No consta en los archivos del evento.',
          sources: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate AI response
    const aiResult = await generateAIResponse(query, searchResults.results, eventData, citeSources);

    // Log telemetry
    console.log(`AI Query: ${query}, Results: ${searchResults.results.length}, EventID: ${eventId}, Response length: ${aiResult.response.length}`);

    return new Response(
      JSON.stringify(aiResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-event-ai function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});