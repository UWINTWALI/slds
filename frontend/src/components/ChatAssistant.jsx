/**
 * ChatAssistant — floating AI chat widget
 * A Rwanda-green circular button fixed to the bottom-right corner.
 * Opens a slide-up chat panel backed by the SLDS Assistant (Claude).
 */
import { useState, useRef, useEffect } from 'react'
import { askAssistant } from '../api/client'

/* ── Inline SVG icons (no external dependency) ───────────────────────────── */
function IconChat({ size = 22 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconClose({ size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconSend({ size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function IconBot({ size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <line x1="12" y1="7" x2="12" y2="11" />
      <line x1="8" y1="15" x2="8" y2="17" />
      <line x1="16" y1="15" x2="16" y2="17" />
    </svg>
  )
}

/* ── Suggested questions shown as quick chips ─────────────────────────────── */
const SUGGESTIONS = [
  'What can I do on this platform?',
  'What are the 4 user roles?',
  'How is the CDI score calculated?',
  'How do I use the Simulation module?',
  'What does a Sector Officer do?',
]

const WELCOME = {
  role: 'assistant',
  content:
    "👋 Hello! I'm the **SLDS Assistant** — your guide to Rwanda's " +
    'Sector-Level Development Simulator.\n\n' +
    'I can help you understand any part of the platform: user roles, ' +
    'the CDI score, planning modules, and how to navigate the system.\n\n' +
    'What would you like to know?',
}

/* ── Simple markdown bold renderer ───────────────────────────────────────── */
function renderText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const lines  = msg.content.split('\n')

  return (
    <div className={`chat-bubble-row ${isUser ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
      {!isUser && (
        <div className="chat-avatar">
          <IconBot size={14} />
        </div>
      )}
      <div className={`chat-bubble ${isUser ? 'bubble-user' : 'bubble-bot'}`}>
        {lines.map((line, i) => (
          <span key={i}>
            {renderText(line)}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="chat-bubble-row chat-bubble-bot">
      <div className="chat-avatar">
        <IconBot size={14} />
      </div>
      <div className="chat-bubble bubble-bot chat-typing">
        <span /><span /><span />
      </div>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function ChatAssistant() {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([WELCOME])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [pulse,    setPulse]    = useState(true)   // draws attention on first load
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  // Remove pulse after 6 seconds
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 6000)
    return () => clearTimeout(t)
  }, [])

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  async function sendMessage(text) {
    const trimmed = (text ?? input).trim()
    if (!trimmed || loading) return

    const userMsg   = { role: 'user', content: trimmed }
    const history   = [...messages.filter(m => m !== WELCOME), userMsg]
    // Keep only last 10 turns to stay within token limits
    const context   = history.slice(-10)

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const data = await askAssistant(context)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry, I couldn\'t reach the assistant service right now. ' +
            'Please try again in a moment.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        className={`chat-fab${pulse && !open ? ' chat-fab-pulse' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI assistant"
        title="SLDS Assistant"
      >
        {open ? <IconClose size={20} /> : <IconChat size={22} />}
        {!open && <span className="chat-fab-badge">AI</span>}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div className="chat-panel" role="dialog" aria-label="SLDS Assistant">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-header-avatar">
                <IconBot size={16} />
              </div>
              <div>
                <div className="chat-header-title">SLDS Assistant</div>
                <div className="chat-header-sub">AI-powered guide</div>
              </div>
            </div>
            <button className="chat-close-btn" onClick={() => setOpen(false)}
              aria-label="Close assistant">
              <IconClose size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestion chips (only shown initially) */}
          {messages.length <= 1 && !loading && (
            <div className="chat-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="chat-chip"
                  onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="chat-input-row">
            <textarea
              ref={inputRef}
              className="chat-input"
              rows={1}
              placeholder="Ask me anything about SLDS…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              <IconSend size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
