// src/app/api/chat/route.js
import { NextResponse } from 'next/server';

const toolBox = {
    search: async ({ query }) => `Search results for '${query}': IBM is a multinational tech company founded in 1911.`,
    code_interpreter: async ({ code }) => {
        try {
            return `Execution result: ${eval(code)}`;
        } catch (error) {
            return `Execution error: ${error.message}`;
        }
    }
};

const toolSchemas = [
    { type: 'function', function: { name: 'search', description: 'Search for information.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
    { type: 'function', function: { name: 'code_interpreter', description: 'Execute JavaScript code.', parameters: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } } }
];

async function runAgentLoop(messages, apiKey, model, baseUrl) {
    // Construct the full URL from the user-provided base URL
    const fullUrl = `${baseUrl}/chat/completions`;

    const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model, 
            messages: messages,
            tools: toolSchemas,
            tool_choice: 'auto'
        })
    });

    if (!response.ok) {
        throw new Error(`API Error at ${fullUrl}: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message;
    messages.push(assistantMessage);

    if (assistantMessage.tool_calls) {
        for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name;
            if (toolBox[toolName]) {
                const toolResult = await toolBox[toolName](JSON.parse(toolCall.function.arguments));
                messages.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: toolName,
                    content: toolResult,
                });
            }
        }
        return await runAgentLoop(messages, apiKey, model, baseUrl);
    }
    
    return messages;
}

export async function POST(req) {
    try {
        const { messages, apiKey, model, baseUrl } = await req.json();

        if (!apiKey || !model || !baseUrl) {
            return NextResponse.json({ error: 'API key, model, and base URL are required.' }, { status: 400 });
        }
        const finalMessages = await runAgentLoop(messages, apiKey, model, baseUrl);
        return NextResponse.json({ messages: finalMessages });
    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
