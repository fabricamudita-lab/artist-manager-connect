import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedEntity {
  type: 'persona' | 'empresa';
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  dni?: string;
  cif?: string;
  iban?: string;
  bank_name?: string;
  swift_code?: string;
  website?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentText } = await req.json();

    if (!documentText || typeof documentText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'documentText is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Eres un asistente especializado en extraer información de contacto de documentos como facturas, contratos, y documentos legales.

Tu tarea es analizar el texto del documento y extraer TODAS las entidades (personas y empresas) con su información de contacto.

Para cada entidad, extrae los siguientes campos si están disponibles:
- type: "persona" o "empresa"
- name: nombre completo o razón social
- email: correo electrónico
- phone: teléfono (puede haber varios, usa el principal)
- address: dirección completa
- dni: DNI/NIE (solo para personas)
- cif: CIF/NIF (solo para empresas)
- iban: número de cuenta bancaria
- bank_name: nombre del banco
- swift_code: código SWIFT/BIC
- website: página web

IMPORTANTE:
- Extrae TODAS las entidades diferentes que encuentres en el documento
- No inventes información que no esté en el documento
- Mantén el formato original de los datos (no reformatees IBANs, teléfonos, etc.)
- Si un campo no está presente, no lo incluyas en el resultado`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extrae la información de contacto del siguiente documento:\n\n${documentText}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_entities',
              description: 'Extrae entidades (personas y empresas) con su información de contacto del documento',
              parameters: {
                type: 'object',
                properties: {
                  entities: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: ['persona', 'empresa'] },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        phone: { type: 'string' },
                        address: { type: 'string' },
                        dni: { type: 'string' },
                        cif: { type: 'string' },
                        iban: { type: 'string' },
                        bank_name: { type: 'string' },
                        swift_code: { type: 'string' },
                        website: { type: 'string' }
                      },
                      required: ['type', 'name']
                    }
                  }
                },
                required: ['entities']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_entities' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_entities') {
      throw new Error('Unexpected response format from AI');
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ entities: result.entities || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error extracting contact from document:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
