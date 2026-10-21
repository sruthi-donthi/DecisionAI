import { useState, useEffect, useRef } from "react";
import "./App.css";

const API_URL = "https://decisionai-w2pt.onrender.com";

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hi! Welcome to DecideAI! 👋\n\nI am your AI assistant. Ask me anything about technology, programming, education, products, or general topics.\n\nHow can I help you today?",
};

// Format bold text and inline code
function formatInline(text) {
  return text.split(/(\*\*.*?\*\*|`.*?`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    return part;
  });
}

// Format AI responses
function FormattedMessage({ content }) {
  return (
    <div className="formatted-message">
      {String(content || "")
        .split("\n")
        .map((line, index) => {
          const text = line.trim();

          if (!text) {
            return <div key={index} className="message-spacer" />;
          }

          if (/^#{1,6}\s/.test(text)) {
            return (
              <h3 key={index}>
                {formatInline(text.replace(/^#{1,6}\s/, ""))}
              </h3>
            );
          }

          if (/^[-*]\s/.test(text)) {
            return (
              <div key={index} className="message-list-item">
                <span>•</span>
                <span>{formatInline(text.replace(/^[-*]\s/, ""))}</span>
              </div>
            );
          }

          if (/^\d+[.)]\s/.test(text)) {
            const number = text.match(/^\d+[.)]/)?.[0] || "";

            return (
              <div key={index} className="message-list-item">
                <span>{number}</span>
                <span>
                  {formatInline(text.replace(/^\d+[.)]\s/, ""))}
                </span>
              </div>
            );
          }

          if (/^---+$/.test(text)) {
            return <hr key={index} />;
          }

          return <p key={index}>{formatInline(text)}</p>;
        })}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading, error]);

  // Send message to FastAPI
  async function sendMessage(event) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) {
      return;
    }

    setInput("");
    setError("");
    setLoading(true);

    // Display current user message
    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: message,
      },
    ]);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        // IMPORTANT:
        // No previous conversation is sent to Groq.
        body: JSON.stringify({
          message: message,
          history: [],
        }),
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid response from the backend.");
      }

      if (!response.ok) {
        const detail = data?.detail;

        let errorMessage = `Request failed with status ${response.status}.`;

        if (typeof detail === "string") {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail
            .map((item) => item.msg || JSON.stringify(item))
            .join("; ");
        }

        throw new Error(errorMessage);
      }

      if (
        !data ||
        typeof data.reply !== "string" ||
        !data.reply.trim()
      ) {
        throw new Error("The AI returned an empty response.");
      }

      // Display AI response
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (err) {
      let errorMessage =
        err instanceof Error
          ? err.message
          : "Something went wrong.";

      if (
        err instanceof TypeError &&
        /fetch/i.test(errorMessage)
      ) {
        errorMessage =
          "Cannot connect to the backend. Make sure FastAPI is running on port 8000.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  // Clear conversation
  function newChat() {
    if (loading) {
      return;
    }

    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setError("");

    inputRef.current?.focus();
  }

  const suggestions = [
    "What is artificial intelligence?",
    "Explain Python programming",
    "Recommend a laptop for students",
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">D</div>

          <div className="brand-text">
            <h1>DecideAI</h1>
            <p>Your AI Assistant</p>
          </div>
        </div>

        <button
          type="button"
          className="new-chat-button"
          onClick={newChat}
          disabled={loading}
        >
          + New Chat
        </button>
      </header>

      {/* Chat area */}
      <main className="chat-container">
        <section
          className="messages-container"
          aria-label="Chat messages"
          aria-live="polite"
        >
          {messages.map((item, index) => (
            <div
              key={`${item.role}-${index}`}
              className={`message-row ${
                item.role === "user"
                  ? "user-row"
                  : "assistant-row"
              }`}
            >
              {item.role === "assistant" && (
                <div className="avatar assistant-avatar">
                  AI
                </div>
              )}

              <div
                className={`message-bubble ${
                  item.role === "user"
                    ? "user-message"
                    : "assistant-message"
                }`}
              >
                {item.role === "assistant" ? (
                  <FormattedMessage content={item.content} />
                ) : (
                  <p>{item.content}</p>
                )}
              </div>

              {item.role === "user" && (
                <div className="avatar user-avatar">
                  You
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="message-row assistant-row">
              <div className="avatar assistant-avatar">
                AI
              </div>

              <div
                className="message-bubble assistant-message typing-bubble"
                role="status"
              >
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span>DecideAI is thinking...</span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="error-message" role="alert">
              <strong>Unable to get a response</strong>

              <p>{error}</p>

              <button
                type="button"
                onClick={() => setError("")}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Suggested questions */}
          {messages.length === 1 && !loading && (
            <div className="suggestions">
              <p>Try asking:</p>

              <div className="suggestion-list">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="suggestion-button"
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </section>

        {/* Message input */}
        <footer className="chat-footer">
          <form className="chat-form" onSubmit={sendMessage}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask me anything..."
              aria-label="Enter your message"
              maxLength={2000}
              disabled={loading}
            />

            <button
              type="submit"
              className="send-button"
              disabled={loading || !input.trim()}
            >
              {loading ? "Thinking..." : "Send ↑"}
            </button>
          </form>

          <p className="footer-note">
            DecideAI can make mistakes. Verify important information.
          </p>
        </footer>
      </main>
    </div>
  );
}
