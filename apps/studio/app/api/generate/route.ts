import { NextResponse } from "next/server";

export async function POST(req: Request) {

    const { prompt } = await req.json();

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
                                    text: `
Você é um Arquiteto de Software Senior.

Sua missão é gerar projetos completos.

Sempre responda SOMENTE em JSON.

Formato:

{
  "projectName":"",
  "summary":"",
  "modules":[],
  "database":[],
  "stack":[],
  "steps":[]
}

Pedido:

${prompt}
`,
                                },
                            ],
                        },
                    ],
                }),
            }
        );

        const json = await response.json();

        return NextResponse.json({

            success: true,

            text:
                json.candidates?.[0]?.content?.parts?.[0]?.text ?? "",

        });

    } catch (e) {

        return NextResponse.json({

            success: false,

            error: String(e),

        });

    }

}