import { useState, useRef, useEffect } from "react";
import "./App.css";

const API_URL = "https://decisionai-w2pt.onrender.com";

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hi! Welcome to DecideAI! 👋\n\nI am your AI assistant. Ask me anything about technology, programming, education, products, or general topics.\n\nHow can I help you today?",
};

export default function App() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading, error]);

  async function sendMessage(event) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) return;

    setInput("");
    setError("");
    setLoading(true);

    setMessages((previous) => [
      ...previous,
      { role: "user", content: message },
    ]);

    const controller = new AbortController();

    // Allow time for Render's free service to wake up.
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message,
          history: [],
        }),
        signal: controller.signal,
        mode: "cors",
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = data?.detail;

        throw new Error(
          typeof detail === "string"
            ? detail
            : `The server returned error ${response.status}.`
        );
      }

      if (typeof data?.reply !== "string" || !data.reply.trim()) {
        throw new Error("The AI returned an empty response. Please try again.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (err) {
      console.error("DecideAI request failed:", err);

      let errorMessage;

      if (err.name === "AbortError") {
        errorMessage =
          "The request took too long. Please try again in a moment.";
      } else if (err instanceof TypeError) {
        errorMessage =
          "Unable to connect to the server. Check your internet connection and try again.";
      } else {
        errorMessage = err.message || "Something went wrong. Please try again.";
      }

      setError(errorMessage);

      // Restore the message so the user can retry.
      setInput(message);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function newChat() {
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setError("");
    setLoading(false);
    inputRef.current?.focus();
  }

  return (
    <main className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-logo">D</div>
          <div>
            <h1>DecideAI</h1>
            <p>Your AI Assistant</p>
          </div>
        </div>

        <button className="new-chat-button" onClick={newChat} type="button">
          + New Chat
        </button>
      </header>

      <section className="chat-area" aria-label="Chat conversation">
        <div className="messages">
          {messages.map((message, index) => (
            <div
              className={`message-row ${
                message.role === "user" ? "user-row" : "assistant-row"
              }`}
              key={`${index}-${message.role}`}
            >
              <div className="avatar">
                {message.role === "user" ? "You" : "AI"}
              </div>

              <div
                className={`message-bubble ${
                  message.role === "user" ? "user-bubble" : "assistant-bubble"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row assistant-row">
              <div className="avatar">AI</div>
              <div className="message-bubble assistant-bubble loading-text">
                Thinking...
              </div>
            </div>
          )}

          {error && (
            <div className="error-message" role="alert">
              <strong>Unable to get a response</strong>
              <p>{error}</p>
              <button
                type="button"
                className="dismiss-button"
                onClick={() => setError("")}
              >
                Dismiss
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </section>

      <form className="input-area" onSubmit={sendMessage}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask me anything..."
          aria-label="Message"
          autoComplete="off"
          disabled={loading}
        />

        <button
          className="send-button"
          type="submit"
          disabled={loading || !input.trim()}
        >
          {loading ? "Wait..." : "Send ↑"}
        </button>
      </form>

      <footer className="footer">
        DecideAI can make mistakes. Verify important information.
      </footer>
    </main>
  );
}