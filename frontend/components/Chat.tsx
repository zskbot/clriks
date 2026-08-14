'use client'  
  
import { useState, useRef, useEffect } from 'react'  
import axios from 'axios'  
  
interface ToolCall {  
  tool: string  
  command?: string  
interface ToolCallResult {
  returncode: number;
  stdout: string;
  stderr: string;
}

interface ToolCall {
  tool: string;
  command?: string;
  result?: ToolCallResult;
}
}  
  
interface Message {  
  role: 'user' | 'assistant'  
  content: string  
  timestamp: string  
  toolCalls?: ToolCall[]  
}  
  
export default function Chat() {  
  const [messages, setMessages] = useState<Message[]>([])  
  const [input, setInput] = useState('')  
  const [loading, setLoading] = useState(false)  
  const [conversationId, setConversationId] = useState('')  
  const messagesEndRef = useRef<HTMLDivElement>(null)  
  
  useEffect(() => {  
    const newConvId = Math.random().toString(36).substring(7)  
    setConversationId(newConvId)  
  }, [])  
  
  useEffect(() => {  
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })  
  }, [messages])  
  
  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message])
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    addMessage({
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    })
    setInput('')
    setLoading(true)

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat`,
        {
          conversation_id: conversationId,
          message: input,
          use_tools: true,
        }
      )

      addMessage({
        role: 'assistant',
        content: response.data.message,
        timestamp: response.data.timestamp,
        toolCalls: response.data.tool_calls || [],
      })
    } catch (error) {
      console.error('Error sending message:', error)
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (  
    <div className="chat-container">  
      <div className="chat-messages">  
        {messages.length === 0 && (  
          <div style={{ textAlign: 'center', marginTop: '100px', opacity: 0.6 }}>  
            <h1>Risk AI</h1>  
            <p>Start a conversation or ask for help with coding</p>  
          </div>  
        )}  
        {messages.map((msg, idx) => (  
        {messages.map((msg) => (
          <div key={msg.timestamp} className={`message ${msg.role}`}>
            <p>{msg.content}</p>  
            {msg.toolCalls && msg.toolCalls.length > 0 && (  
              <div className="tool-calls">  
                {msg.toolCalls.map((tc, i) => (  
                  <pre  
                    key={i}  
                    style={{  
                      background: '#1e1e1e',  
                      color: '#d4d4d4',  
                      padding: '10px',  
                      borderRadius: '6px',  
                      overflowX: 'auto',  
                      fontFamily: 'monospace',  
                      fontSize: '13px',  
                    }}  
                  >  
                    {`$ ${tc.command ?? ''}\n`}  
                    {tc.result?.stdout ?? ''}  
                    {tc.result?.stderr ? `\n${tc.result.stderr}` : ''}  
                  </pre>  
                ))}  
              </div>  
            )}  
          </div>  
        ))}  
        <div ref={messagesEndRef} />  
      </div>  
  
      <div className="chat-input">  
        <div className="input-group">  
          <textarea  
            value={input}  
            onChange={(e) => setInput(e.target.value)}  
            onKeyPress={(e) => {  
              if (e.key === 'Enter' && !e.shiftKey) {  
                e.preventDefault()  
                handleSendMessage()  
              }  
            }}  
            placeholder="Nhap tin nhan... go !<lenh> de chay shell (vd: !git status)"  
            rows={3}  
            style={{ flex: 1 }}  
            disabled={loading}  
          />  
          <button  
            onClick={handleSendMessage}  
            disabled={loading}  
            style={{ alignSelf: 'flex-end' }}  
          >  
            {loading ? 'Sending...' : 'Send'}  
          </button>  
        </div>  
      </div>  
    </div>  
  )  
}  
