import {
    AIProvider,
    AIRequest,
    AIResponse
} from "./types";

export class GeminiProvider implements AIProvider {

    async generate(
        request: AIRequest
    ): Promise<AIResponse> {

        try {

            const response = await fetch(

                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
                process.env.NEXT_PUBLIC_GEMINI_API_KEY,

                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({

                        contents: [

                            {

                                parts: [

                                    {

                                        text:
                                            (request.systemPrompt ?? "") +
                                            "\n\n" +
                                            request.prompt,

                                    },

                                ],

                            },

                        ],

                    }),

                }

            );

            const json = await response.json();

            return {

                success: true,

                text:
                    json.candidates?.[0]?.content?.parts?.[0]?.text ??
                    "",

            };

        } catch (e) {

            return {

                success: false,

                text: "",

                error: String(e),

            };

        }

    }

}