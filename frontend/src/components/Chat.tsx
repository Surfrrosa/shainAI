'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: Array<{
    title: string
    uri: string
    similarity: string
  }>
}

interface Toast {
  id: number
  message: string
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState<'gpt-4' | 'claude'>('gpt-4')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [collapsedCitations, setCollapsedCitations] = useState<Set<number>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('shainai-messages')
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages)
        // Restore Date objects
        const restored = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
        setMessages(restored)
      } catch (error) {
        console.error('Failed to load messages from localStorage:', error)
      }
    }
  }, [])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('shainai-messages', JSON.stringify(messages))
    }
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const showToast = (message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('Copied to clipboard! ✨')
    } catch (err) {
      showToast('Failed to copy')
    }
  }

  const copyMessage = (message: Message) => {
    let text = message.content
    if (message.citations && message.citations.length > 0) {
      text += '\n\nSources:\n' + message.citations.map(c => `- ${c.title}\n  ${c.uri}`).join('\n')
    }
    copyToClipboard(text)
  }

  const copyConversation = () => {
    const conversation = messages
      .map(m => {
        let text = `${m.role === 'user' ? 'You' : 'ShainAI'}: ${m.content}`
        if (m.citations && m.citations.length > 0) {
          text += '\n\nSources:\n' + m.citations.map(c => `- ${c.title}\n  ${c.uri}`).join('\n')
        }
        return text
      })
      .join('\n\n---\n\n')
    copyToClipboard(conversation)
  }

  const toggleCitations = (index: number) => {
    setCollapsedCitations(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  const saveToMemory = async () => {
    if (messages.length === 0) {
      showToast('No conversation to save')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('http://localhost:3001/api/ingest-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          project: 'personal',
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`)
      }

      const result = await response.json()
      showToast('Conversation saved to memory! 💾')
      console.log('Saved conversation:', result)
    } catch (error) {
      console.error('Failed to save conversation:', error)
      showToast('Failed to save conversation')
    } finally {
      setIsSaving(false)
    }
  }

  const clearConversation = () => {
    if (confirm('Clear this conversation? (It will be saved to memory first if you haven\'t already)')) {
      setMessages([])
      localStorage.removeItem('shainai-messages')
      showToast('Conversation cleared')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:3001/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          model,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        citations: data.citations?.map((c: any) => ({
          title: c.title,
          uri: c.uri,
          similarity: c.similarity,
        })) || []
      }

      setMessages(prev => {
        const updated = [...prev, assistantMessage]

        // Auto-save every 5 Q&A exchanges (10 messages)
        if (updated.length % 10 === 0) {
          setTimeout(() => {
            saveToMemory()
          }, 1000)
        }

        return updated
      })
      setLoading(false)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen w-full chat-container">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-zinc-800/50 backdrop-blur-xl bg-zinc-950/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center p-1.5">
            <img
              src="https://img.icons8.com/ios/250/FFFFFF/brain.png"
              alt="brain"
              className="w-full h-full"
            />
          </div>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            shainAI
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Action Buttons */}
          {messages.length > 0 && (
            <>
              <button
                onClick={saveToMemory}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-violet-400 hover:text-violet-300 hover:bg-violet-900/20 border border-violet-800/50 transition-all flex items-center gap-2 disabled:opacity-50"
                title="Save conversation to memory"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {isSaving ? 'Saving...' : 'Save to Memory'}
              </button>

              <button
                onClick={copyConversation}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-zinc-800/50 transition-all flex items-center gap-2"
                title="Copy entire conversation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>

              <button
                onClick={clearConversation}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-900/20 border border-zinc-800/50 hover:border-red-800/50 transition-all"
                title="Clear conversation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}

          {/* Model Switcher */}
          <div className="flex items-center gap-2 bg-zinc-900/50 rounded-full p-1 border border-zinc-800/50">
            <button
              onClick={() => setModel('gpt-4')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                model === 'gpt-4'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              GPT-4
            </button>
            <button
              onClick={() => setModel('claude')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                model === 'claude'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Claude
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mb-6 p-4">
                <img
                  src="https://img.icons8.com/ios/250/FFFFFF/brain.png"
                  alt="brain"
                  className="w-full h-full"
                />
              </div>
              <h2 className="text-2xl font-semibold mb-3 bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Hey there! 👋
              </h2>
              <p className="text-zinc-500 max-w-md mb-2">
                I'm your second brain, here to help you remember and connect ideas across all your projects, notes, and conversations.
              </p>
              <p className="text-zinc-600 text-sm max-w-md">
                Try asking me about your past decisions, code snippets, or anything you've worked on. I'll dig through your memory and find what you need.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`chat-message ${message.role}`}>
              <div className="message-bubble group">
                {/* Message Header with Copy and Timestamp */}
                <div className="flex items-center justify-between mb-2 opacity-70 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-zinc-500 font-medium">
                    {message.role === 'user' ? 'You' : '🧠 ShainAI'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600">
                      {formatTime(message.timestamp)}
                    </span>
                    <button
                      onClick={() => copyMessage(message)}
                      className="p-1 rounded hover:bg-zinc-800/50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Copy message"
                    >
                      <svg className="w-4 h-4 text-zinc-500 hover:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Message Content */}
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline ? (
                          <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto my-3 border border-zinc-800">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code className="bg-zinc-800 text-violet-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                            {children}
                          </code>
                        )
                      },
                      pre({ node, children, ...props }) {
                        return <>{children}</>
                      },
                      a({ node, children, ...props }) {
                        return (
                          <a
                            {...props}
                            className="text-violet-400 hover:text-violet-300 underline transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                        )
                      },
                      p({ node, children, ...props }) {
                        return <p className="mb-3 last:mb-0 leading-relaxed" {...props}>{children}</p>
                      },
                      ul({ node, children, ...props }) {
                        return <ul className="list-disc pl-6 mb-3 space-y-1" {...props}>{children}</ul>
                      },
                      ol({ node, children, ...props }) {
                        return <ol className="list-decimal pl-6 mb-3 space-y-1" {...props}>{children}</ol>
                      },
                      li({ node, children, ...props }) {
                        return <li className="text-zinc-300" {...props}>{children}</li>
                      },
                      h1({ node, children, ...props }) {
                        return <h1 className="text-2xl font-bold mb-3 mt-4 text-violet-300" {...props}>{children}</h1>
                      },
                      h2({ node, children, ...props }) {
                        return <h2 className="text-xl font-bold mb-2 mt-3 text-violet-300" {...props}>{children}</h2>
                      },
                      h3({ node, children, ...props }) {
                        return <h3 className="text-lg font-semibold mb-2 mt-3 text-violet-300" {...props}>{children}</h3>
                      },
                      blockquote({ node, children, ...props }) {
                        return (
                          <blockquote
                            className="border-l-4 border-violet-600 pl-4 italic text-zinc-400 my-3"
                            {...props}
                          >
                            {children}
                          </blockquote>
                        )
                      },
                      hr({ node, ...props }) {
                        return <hr className="border-zinc-800 my-4" {...props} />
                      },
                      strong({ node, children, ...props }) {
                        return <strong className="font-bold text-violet-300" {...props}>{children}</strong>
                      },
                      em({ node, children, ...props }) {
                        return <em className="italic text-zinc-300" {...props}>{children}</em>
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Citations - Collapsible and Less Prominent */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-4 opacity-40 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleCitations(index)}
                      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 mb-2 transition-colors"
                    >
                      <svg
                        className={`w-3 h-3 transition-transform ${!collapsedCitations.has(index) ? '' : 'rotate-90'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-xs">{message.citations.length} {message.citations.length === 1 ? 'source' : 'sources'}</span>
                    </button>

                    {collapsedCitations.has(index) && (
                      <div className="space-y-1.5 pl-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                        {message.citations.map((citation, i) => (
                          <div key={i} className="text-xs text-zinc-600 border-l-2 border-zinc-800 pl-2 py-1">
                            <div className="font-medium text-zinc-500">{citation.title}</div>
                            <div className="text-zinc-700 text-[10px] truncate">{citation.uri}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message assistant">
              <div className="message-bubble">
                <div className="flex items-center gap-2 text-zinc-500">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span>Percolating...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="input-container">
        <div className="input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What would you like to remember? Ask me anything..."
            className="chat-input"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="send-button"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </form>

      {/* Toast Notifications */}
      <div className="fixed bottom-20 right-6 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in-0 duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
