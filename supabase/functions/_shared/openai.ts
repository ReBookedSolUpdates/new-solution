// Shared OpenAI helper for edge functions
export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIResult {
  success: boolean;
  response: string;
  error?: string;
  tokens_used?: number;
}

const SYSTEM_PROMPT = `You are ReBooked Genius, a friendly AI tutor for South African students.
You help with CAPS, IEB and Cambridge curricula across all subjects.
Be warm, concise, and encouraging. Use examples relevant to South African students.`;

export async function callOpenAI(
  messages: OpenAIMessage[],
  apiKey: string,
  model: string = "gpt-4o-mini-2024-07-18",
): Promise<OpenAIResult> {
  try {
    const fullMessages: OpenAIMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, response: "", error: `OpenAI API ${res.status}: ${errText}` };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim() || "";
    const tokens = data?.usage?.total_tokens || 0;

    if (!content) {
      return { success: false, response: "", error: "Empty response from OpenAI" };
    }

    return { success: true, response: content, tokens_used: tokens };
  } catch (err) {
    return {
      success: false,
      response: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
