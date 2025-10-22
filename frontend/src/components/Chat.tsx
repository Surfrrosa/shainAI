'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  citations?: Array<{
    title: string
    uri: string
    similarity: string
  }>
}

interface ChatProps {
  project: string | null
}

export default function Chat({ project }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // TODO: Call /api/ask endpoint
      // For now, just echo back with a placeholder
      const assistantMessage: Message = {
        role: 'assistant',
        content: `[Placeholder response for: "${input}"]`,
        citations: []
      }

      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage])
        setLoading(false)
      }, 500)
    } catch (error) {
      console.error('Chat error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold">
          {project ? `Project: ${project}` : 'All Projects'}
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-xl mb-2">Ask me anything about your projects</p>
            <p className="text-sm">I'll search your memory and provide answers with sources.</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`chat-message ${message.role}`}>
            <div className="font-semibold mb-2">
              {message.role === 'user' ? 'You' : 'ShainAI'}
            </div>
            <div>{message.content}</div>
            {message.citations && message.citations.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.citations.map((citation, i) => (
                  <div key={i} className="citation">
                    <div className="font-semibold text-primary">{citation.title}</div>
                    <div className="text-xs">{citation.uri}</div>
                    <div className="text-xs">Similarity: {citation.similarity}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant">
            <div className="font-semibold mb-2">ShainAI</div>
            <div className="text-gray-400">Thinking...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-area">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your projects..."
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
