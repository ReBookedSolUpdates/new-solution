import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, content, count, language = 'en' } = await req.json();
    console.log('Received request:', { type, count, language, contentLength: content?.length });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';
    const isAfrikaans = language === 'af';

    if (type === 'flashcards') {
      if (isAfrikaans) {
        systemPrompt = `Jy is 'n kundige opvoeder. Genereer flitskaarte vanuit die verskafde inhoud.
        Elke flitskaart moet 'n duidelike vraag (voor) en 'n bondige antwoord (agter) hê.
        Gee SLEGS 'n geldige JSON-skikking van flitskaart-objekte met "front" en "back" eienskappe.
        Moenie enige ander teks of markdown insluit nie, net die JSON-skikking.`;
        userPrompt = `Genereer ${count || 5} flitskaarte vanuit hierdie inhoud:\n\n${content}`;
      } else {
        systemPrompt = `You are an expert educator. Generate flashcards from the provided content.
        Each flashcard should have a clear question (front) and a concise answer (back).
        Return ONLY a valid JSON array of flashcard objects with "front" and "back" properties.
        Do not include any other text or markdown, just the JSON array.`;
        userPrompt = `Generate ${count || 5} flashcards from this content:\n\n${content}`;
      }
    } else if (type === 'quiz') {
      if (isAfrikaans) {
        systemPrompt = `Jy is 'n kundige opvoeder. Genereer meerkeuse-toetsvrae vanuit die verskafde inhoud.
        Elke vraag moet 4 opsies met een korrekte antwoord hê.
        Gee SLEGS 'n geldige JSON-skikking van vraag-objekte met hierdie eienskappe:
        - "question": die vraagteks
        - "options": skikking van 4 opsie-stringe
        - "correct_answer": die korrekte opsie (moet presies ooreenstem met een van die opsies)
        - "explanation": kort verklaring van waarom dit korrek is
        Moenie enige ander teks of markdown insluit nie, net die JSON-skikking.`;
        userPrompt = `Genereer ${count || 5} toetsvrae vanuit hierdie inhoud:\n\n${content}`;
      } else {
        systemPrompt = `You are an expert educator. Generate multiple choice quiz questions from the provided content.
        Each question should have 4 options with one correct answer.
        Return ONLY a valid JSON array of question objects with these properties:
        - "question": the question text
        - "options": array of 4 option strings
        - "correct_answer": the correct option (must match one of the options exactly)
        - "explanation": brief explanation of why this is correct
        Do not include any other text or markdown, just the JSON array.`;
        userPrompt = `Generate ${count || 5} quiz questions from this content:\n\n${content}`;
      }
    } else if (type === 'summary') {
      if (isAfrikaans) {
        systemPrompt = `Jy is 'n kundige opvoeder wat spesialiseer in studietegnieke.
        Skep 'n duidelike, gestruktureerde opsomming van die verskafde inhoud wat 'n student kan help om effektief te studeer.
        Gebruik koeëltjies en organiseer volgens sleutelkonsepte.`;
        userPrompt = `Vat hierdie inhoud saam vir studeerdoeleindes:\n\n${content}`;
      } else {
        systemPrompt = `You are an expert educator specializing in study techniques.
        Create a clear, structured summary of the provided content that would help a student study effectively.
        Use bullet points and organize by key concepts.`;
        userPrompt = `Summarize this content for study purposes:\n\n${content}`;
      }
    } else {
      throw new Error('Invalid generation type');
    }

    console.log('Calling OpenAI API with model gpt-4o-mini-2024-07-18');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-2024-07-18',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error response:', response.status, error);
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log('OpenAI response received successfully');
    const generatedContent = data.choices[0].message.content;

    // For flashcards and quizzes, parse the JSON
    if (type === 'flashcards' || type === 'quiz') {
      try {
        // Clean potential markdown code blocks
        let cleanContent = generatedContent.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.slice(7);
        }
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith('```')) {
          cleanContent = cleanContent.slice(0, -3);
        }
        
        const parsed = JSON.parse(cleanContent.trim());
        console.log('Successfully parsed JSON response');
        return new Response(JSON.stringify({ data: parsed }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (parseError) {
        console.error('Parse error:', parseError, 'Content:', generatedContent);
        return new Response(JSON.stringify({ 
          error: 'Failed to parse generated content',
          raw: generatedContent 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ data: generatedContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI generate error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
