/**
 * AI Service for generating quizzes and flashcards
 * Uses Google Gemini API to create educational content from notes
 * Free tier: 60 requests/minute, no credit card required
 */

export type GeneratedQuestion = {
  text: string;
  answers: Array<{ text: string; correct: boolean }>;
  detail: string;
  tag?: string;
};

export type GenerateQuizRequest = {
  content: string;
  difficulty: "ง่าย" | "ปานกลาง" | "ยาก";
  count: number;
  language: "Thai" | "English";
};

export type GenerateQuizFromImageRequest = {
  imageDataUrl: string; // base64 data URL or URL
  difficulty: "ง่าย" | "ปานกลาง" | "ยาก";
  count: number;
  language: "Thai" | "English";
};

export type GenerateQuizResponse = {
  questions: GeneratedQuestion[];
  title: string;
  subtitle: string;
};

export type GeneratedFlashcard = {
  front: string;
  back: string;
};

export type GenerateFlashcardRequest = {
  content: string;
  count: number;
  language: "Thai" | "English";
};

export type GenerateFlashcardFromImageRequest = {
  imageDataUrl: string; // base64 data URL or URL
  count: number;
  language: "Thai" | "English";
};

export type GenerateFlashcardResponse = {
  flashcards: GeneratedFlashcard[];
  title: string;
  subtitle: string;
};

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

class AIService {
  private validateApiKey(): void {
    if (!GEMINI_API_KEY) {
      throw new Error(
        "Google Gemini API key not found. Please add VITE_GEMINI_API_KEY to your .env.local file. Get free key at https://ai.google.dev"
      );
    }
  }

  private buildQuizPrompt(
    content: string,
    difficulty: string,
    count: number,
    language: string
  ): string {
    const difficultyGuide = {
      ง่าย: "basic concepts and definitions",
      ปานกลาง: "intermediate understanding and applications",
      ยาก: "advanced concepts and critical thinking",
    };

    return `You are an expert educational content creator. Based on the following content, generate ${count} multiple-choice quiz questions in ${language}.

Each question should:
- Focus on ${difficultyGuide[difficulty as keyof typeof difficultyGuide]}
- Have exactly 4 answer options
- Have only one correct answer
- Include a detailed explanation for the correct answer
- Be clear and unambiguous

Content to base questions on:
"""
${content}
"""

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "title": "Generated Quiz Title",
  "subtitle": "Brief description of the quiz",
  "questions": [
    {
      "text": "Question text here?",
      "answers": [
        {"text": "Option A", "correct": true},
        {"text": "Option B", "correct": false},
        {"text": "Option C", "correct": false},
        {"text": "Option D", "correct": false}
      ],
      "detail": "Explanation of why the correct answer is right",
      "tag": "Optional category/concept"
    }
  ]
}

Important:
- Do not include markdown formatting or any text outside the JSON object
- Ensure questions are meaningful and test understanding, not just memorization
- Vary question types (definitions, application, analysis, etc.)
- Make sure exactly one answer is marked correct: true
- Keep explanations concise but informative
- All text should be in ${language}`;
  }

  async generateQuiz(request: GenerateQuizRequest): Promise<GenerateQuizResponse> {
    this.validateApiKey();

    if (!request.content || request.content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }

    if (request.count < 1 || request.count > 20) {
      throw new Error("Question count must be between 1 and 20");
    }

    const prompt = this.buildQuizPrompt(
      request.content,
      request.difficulty,
      request.count,
      request.language
    );

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_CIVIC_INTEGRITY",
              threshold: "BLOCK_NONE",
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || `Gemini API error: ${response.status}`
        );
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log("Raw Gemini response content:", content); 

      if (!content) {
        throw new Error("No content received from Gemini");
      }

      // Remove markdown code blocks if present (```json ... ```)
      let jsonString = content.trim();
      if (jsonString.startsWith("```")) {
        // Remove opening ```json or ```
        jsonString = jsonString.replace(/^```(?:json)?\n?/, "");
        // Remove closing ```
        jsonString = jsonString.replace(/\n?```$/, "");
      }

      // Parse the JSON response
      const parsed = JSON.parse(jsonString);

      // Validate the response structure
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid response structure from Gemini");
      }

      // Ensure each question has exactly 4 options with one correct answer
      const validatedQuestions = parsed.questions.map(
        (q: any): GeneratedQuestion => {
          const answers = (q.answers || []).slice(0, 4); // Limit to 4 options
          if (answers.length < 2) {
            throw new Error("Each question must have at least 2 answers");
          }

          const hasCorrect = answers.some((a: any) => a.correct === true);
          if (!hasCorrect) {
            // Mark first answer as correct if none marked
            answers[0].correct = true;
            answers.slice(1).forEach((a: any) => {
              a.correct = false;
            });
          }

          return {
            text: q.text || "",
            answers: answers.map((a: any) => ({
              text: a.text || "",
              correct: a.correct === true,
            })),
            detail: q.detail || "",
            tag: q.tag || undefined,
          };
        }
      );

      return {
        title: parsed.title || "Generated Quiz",
        subtitle: parsed.subtitle || "Created from your notes",
        questions: validatedQuestions,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error("JSON Parse Error:", error);
        throw new Error(
          "Failed to parse Gemini response. The generated content may not be valid JSON. Please try again."
        );
      }
      throw error;
    }
  }

  /**
   * Generate quiz from canvas/image - extracts text and generates quiz in one step
   */
  async generateQuizFromImage(
    request: GenerateQuizFromImageRequest
  ): Promise<GenerateQuizResponse> {
    this.validateApiKey();

    if (!request.imageDataUrl) {
      throw new Error("Image data is required");
    }

    if (request.count < 1 || request.count > 20) {
      throw new Error("Question count must be between 1 and 20");
    }

    // Extract base64 from data URL if needed
    let base64Data = request.imageDataUrl;
    if (request.imageDataUrl.startsWith("data:")) {
      // Format: data:image/png;base64,xxxxx
      const parts = request.imageDataUrl.split(",");
      if (parts.length === 2) {
        base64Data = parts[1];
      }
    }

    // Determine MIME type from data URL
    let mimeType = "image/png";
    if (request.imageDataUrl.includes("image/jpeg")) mimeType = "image/jpeg";
    else if (request.imageDataUrl.includes("image/webp")) mimeType = "image/webp";

    const difficultyGuide = {
      ง่าย: "basic concepts and definitions",
      ปานกลาง: "intermediate understanding and applications",
      ยาก: "advanced concepts and critical thinking",
    };

    const prompt = `You are an expert educational content creator. Examine this image carefully and extract the content/text from it. Based on what you see, generate ${request.count} multiple-choice quiz questions in ${request.language}.

Each question should:
- Focus on ${difficultyGuide[request.difficulty as keyof typeof difficultyGuide]}
- Have exactly 4 answer options
- Have only one correct answer
- Include a detailed explanation for the correct answer
- Be clear and unambiguous
- Be based directly on the content visible in the image

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "title": "Generated Quiz Title Based on Image Content",
  "subtitle": "Brief description of the quiz",
  "questions": [
    {
      "text": "Question text here?",
      "answers": [
        {"text": "Option A", "correct": true},
        {"text": "Option B", "correct": false},
        {"text": "Option C", "correct": false},
        {"text": "Option D", "correct": false}
      ],
      "detail": "Explanation of why the correct answer is right",
      "tag": "Optional category/concept"
    }
  ]
}

Important:
- Extract ALL relevant content from the image
- Ensure questions test understanding of the image content
- Make sure exactly one answer is marked correct: true
- Keep explanations concise but informative
- All text should be in ${request.language}`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_CIVIC_INTEGRITY",
              threshold: "BLOCK_NONE",
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || `Gemini API error: ${response.status}`
        );
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log("Raw Gemini image response:", content);

      if (!content) {
        throw new Error("No content received from Gemini");
      }

      // Remove markdown code blocks if present
      let jsonString = content.trim();
      if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```(?:json)?\n?/, "");
        jsonString = jsonString.replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(jsonString);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid response structure from Gemini");
      }

      const validatedQuestions = parsed.questions.map(
        (q: any): GeneratedQuestion => {
          const answers = (q.answers || []).slice(0, 4);
          if (answers.length < 2) {
            throw new Error("Each question must have at least 2 answers");
          }

          const hasCorrect = answers.some((a: any) => a.correct === true);
          if (!hasCorrect) {
            answers[0].correct = true;
            answers.slice(1).forEach((a: any) => {
              a.correct = false;
            });
          }

          return {
            text: q.text || "",
            answers: answers.map((a: any) => ({
              text: a.text || "",
              correct: a.correct === true,
            })),
            detail: q.detail || "",
            tag: q.tag || undefined,
          };
        }
      );

      return {
        title: parsed.title || "Generated Quiz from Image",
        subtitle: parsed.subtitle || "Created from your notes",
        questions: validatedQuestions,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error("JSON Parse Error:", error);
        throw new Error(
          "Failed to parse Gemini response from image. The generated content may not be valid JSON. Please try again."
        );
      }
      throw error;
    }
  }

  private buildFlashcardPrompt(
    content: string,
    count: number,
    language: string
  ): string {
    return `You are an expert language learning and vocabulary expert. Based on the following content, generate ${count} flashcard pairs (front/back) in ${language}.

Each flashcard should:
- Have a clear, concise front (question/term/prompt)
- Have a clear, concise back (answer/definition/response)
- Test understanding of key concepts from the content
- Be suitable for spaced repetition learning
- Be distinct and non-repetitive

Content to create flashcards from:
"""
${content}
"""

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "title": "Flashcard Deck Title",
  "subtitle": "Brief description of the deck",
  "flashcards": [
    {
      "front": "Question or term here",
      "back": "Answer or definition here"
    },
    {
      "front": "Another question",
      "back": "Another answer"
    }
  ]
}

Important:
- Do not include markdown formatting or any text outside the JSON object
- Each front should be brief (under 100 characters)
- Each back should be concise but complete (under 300 characters)
- Create diverse flashcards covering different aspects of the content
- All text should be in ${language}
- Generate exactly ${count} flashcard pairs`;
  }

  async generateFlashcards(
    request: GenerateFlashcardRequest
  ): Promise<GenerateFlashcardResponse> {
    this.validateApiKey();

    if (!request.content || request.content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }

    if (request.count < 1 || request.count > 50) {
      throw new Error("Flashcard count must be between 1 and 50");
    }

    const prompt = this.buildFlashcardPrompt(
      request.content,
      request.count,
      request.language
    );

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_CIVIC_INTEGRITY",
              threshold: "BLOCK_NONE",
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || `Gemini API error: ${response.status}`
        );
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log("Raw Gemini flashcard response:", content);

      if (!content) {
        throw new Error("No content received from Gemini");
      }

      // Remove markdown code blocks if present
      let jsonString = content.trim();
      if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```(?:json)?\n?/, "");
        jsonString = jsonString.replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(jsonString);

      if (!parsed.flashcards || !Array.isArray(parsed.flashcards)) {
        throw new Error("Invalid response structure from Gemini");
      }

      const validatedFlashcards = parsed.flashcards.map(
        (fc: any): GeneratedFlashcard => ({
          front: fc.front || "",
          back: fc.back || "",
        })
      );

      return {
        title: parsed.title || "Generated Flashcards",
        subtitle: parsed.subtitle || "Created from your notes",
        flashcards: validatedFlashcards,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error("JSON Parse Error:", error);
        throw new Error(
          "Failed to parse Gemini response. The generated content may not be valid JSON. Please try again."
        );
      }
      throw error;
    }
  }

  /**
   * Generate flashcards from image - extracts text and generates flashcards in one step
   */
  async generateFlashcardsFromImage(
    request: GenerateFlashcardFromImageRequest
  ): Promise<GenerateFlashcardResponse> {
    this.validateApiKey();

    if (!request.imageDataUrl) {
      throw new Error("Image data is required");
    }

    if (request.count < 1 || request.count > 50) {
      throw new Error("Flashcard count must be between 1 and 50");
    }

    // Extract base64 from data URL if needed
    let base64Data = request.imageDataUrl;
    if (request.imageDataUrl.startsWith("data:")) {
      // Format: data:image/png;base64,xxxxx
      const parts = request.imageDataUrl.split(",");
      if (parts.length === 2) {
        base64Data = parts[1];
      }
    }

    // Determine MIME type from data URL
    let mimeType = "image/png";
    if (request.imageDataUrl.includes("image/jpeg")) mimeType = "image/jpeg";
    else if (request.imageDataUrl.includes("image/webp")) mimeType = "image/webp";

    const prompt = `You are an expert language learning and vocabulary expert. Examine this image carefully and extract the content/text from it. Based on what you see, generate ${request.count} flashcard pairs (front/back) in ${request.language}.

Each flashcard should:
- Have a clear, concise front (question/term/prompt)
- Have a clear, concise back (answer/definition/response)
- Test understanding of key concepts from the image content
- Be suitable for spaced repetition learning
- Be distinct and non-repetitive
- Be based directly on the content visible in the image

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "title": "Flashcard Deck Title",
  "subtitle": "Brief description of the deck",
  "flashcards": [
    {
      "front": "Question or term here",
      "back": "Answer or definition here"
    },
    {
      "front": "Another question",
      "back": "Another answer"
    }
  ]
}

Important:
- Extract ALL relevant content from the image
- Do not include markdown formatting or any text outside the JSON object
- Each front should be brief (under 100 characters)
- Each back should be concise but complete (under 300 characters)
- Create diverse flashcards covering different aspects of the content
- Ensure questions test understanding of the image content
- All text should be in ${request.language}
- Generate exactly ${request.count} flashcard pairs`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_CIVIC_INTEGRITY",
              threshold: "BLOCK_NONE",
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || `Gemini API error: ${response.status}`
        );
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log("Raw Gemini flashcard image response:", content);

      if (!content) {
        throw new Error("No content received from Gemini");
      }

      // Remove markdown code blocks if present
      let jsonString = content.trim();
      if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```(?:json)?\n?/, "");
        jsonString = jsonString.replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(jsonString);

      if (!parsed.flashcards || !Array.isArray(parsed.flashcards)) {
        throw new Error("Invalid response structure from Gemini");
      }

      const validatedFlashcards = parsed.flashcards.map(
        (fc: any): GeneratedFlashcard => ({
          front: fc.front || "",
          back: fc.back || "",
        })
      );

      return {
        title: parsed.title || "Generated Flashcards from Image",
        subtitle: parsed.subtitle || "Created from your notes",
        flashcards: validatedFlashcards,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error("JSON Parse Error:", error);
        throw new Error(
          "Failed to parse Gemini response from image. The generated content may not be valid JSON. Please try again."
        );
      }
      throw error;
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!GEMINI_API_KEY;
  }

  /**
   * Get estimated token count for content
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

export const aiService = new AIService();
