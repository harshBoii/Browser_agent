'use client';

import { useState, useEffect, useRef } from 'react';

function SettingsModal({ isOpen, onClose, onSave }) {
    const [key, setKey] = useState('');
    const [model, setModel] = useState('gpt-4o');
    const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');

    if (!isOpen) return null;

    const handleSave = () => {
        if (key.trim() && baseUrl.trim()) {
            onSave({ apiKey: key, model, baseUrl });
            onClose();
        }
    };

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className='M'>
                    <div className="modal-header">
                        <h5 className="modal-title">API Configuration</h5>
                    </div>
                    <div className="modal-body">
                        <div className="mb-3">
                            <label htmlFor="baseUrlInput" className="form-label">API Base URL</label>
                            <input id="baseUrlInput" type="url" className="form-control" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="modelSelect" className="form-label">ModelName- </label>
                            <input id="modelSelect" type="text" className="form-control" placeholder="e.g., gpt-4o, llama3" value={model} onChange={e => setModel(e.target.value)} />
                        </div>
                         <div className="mb-3">
                            <label htmlFor="apiKeyInput" className="form-label">Enter API Key</label>
                            <input id="apiKeyInput" type="password" className="form-control" placeholder="Enter your API key" value={key} onChange={(e) => setKey(e.target.value)} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                        <button type="button" className="btn btn-primary" onClick={handleSave}>Save Configuration</button>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [config, setConfig] = useState({ apiKey: '', model: '', baseUrl: '' });
    const [isModalOpen, setIsModalOpen] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        if (!config.apiKey) { setIsModalOpen(true); return; }

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMessage], ...config }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'API request failed');
            setMessages(data.messages);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderMessage = (msg, index) => {
        if (msg.role === 'tool') {
            return <div key={index} className="chat-message tool-message"><b>Tool Result ({msg.name}):</b><br />{msg.content}</div>;
        }
        if (msg.tool_calls) {
            return <div key={index} className="chat-message assistant-message"><i>Using tool: {msg.tool_calls[0].function.name}(...)</i></div>;
        }
        if (msg.role === 'user' || msg.role === 'assistant') {
            return <div key={index} className={`chat-message ${msg.role}-message`}>{msg.content}</div>;
        }
        return null;
    };

    return (
        <>
            <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={setConfig} />
            <div className="d-flex flex-column vh-100">
                <header>
                    <h4 className="m-0">Next.js LLM Agent</h4>
                    <button className="btn btn-outline-light btn-sm" onClick={() => setIsModalOpen(true)}>Settings</button>
                </header>
                <main>{messages.map(renderMessage)}<div ref={messagesEndRef} /></main>
                <footer className="p-3">
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <input type="text" className="form-control" placeholder={isLoading ? "Agent is processing..." : "Ask the agent anything..."} value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading} />
                        </div>
                    </form>
                </footer>
            </div>
        </>
    );
}