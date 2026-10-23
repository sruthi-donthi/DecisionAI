import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const suggestions = [
  {
    icon: "💻",
    title: "Best laptop for students",
    prompt: "Suggest the best laptop for a computer science student.",
  },
  {
    icon: "🎧",
    title: "Wireless earbuds",
    prompt: "Compare wireless earbuds under ₹5,000.",
  },
  {
    icon: "📱",
    title: "iPhone vs Samsung",
    prompt: "Compare iPhone and Samsung smartphones.",
  },
  {
    icon: "⌚",
    title: "Best smartwatch",
    prompt: "Recommend a smartwatch with good battery life.",
  },
];

function Robot({ small = false }) {
  return (
    <div className={`robot ${small ? "robot-small" : ""}`} aria-label="DecisionAI robot">
      <div className="antenna"><span /></div>
      <div className="robot-ear left-ear" />
      <div className="robot-ear right-ear" />

      <div className="robot-head">
        <div className="robot-eyes">
          <span />
          <span />
        </div>
        <div className="robot-smile" />
      </div>

      {!small && (
        <>
          <div className="robot-body" />
          <div className="robot-arm left-arm" />
          <div className="robot-arm right-arm" />
        </>
      )}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [activeChat, setActiveChat] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const inputRef = useRef(null);
  const conversationRef = useRef(null);
  const shouldAutoScroll = useRef(true);

  const hasMessages = messages.length > 0;

  // Scroll the conversation, not the entire page.
  useEffect(() => {
    const element = conversationRef.current;

    if (element && shouldAutoScroll.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, loading]);

  function handleConversationScroll() {
    const element = conversationRef.current;
    if (!element) return;

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    shouldAutoScroll.current = distanceFromBottom < 100;
  }

  function newChat() {
    if (loading) return;

    setMessages([]);
    setInput("");
    setError("");
    setActiveChat("");
    setSidebarOpen(false);
    shouldAutoScroll.current = true;

    inputRef.current?.focus();
  }

  function openChat(chat) {
    if (loading) return;

    setMessages(chat.messages);
    setActiveChat(chat.id);
    setError("");
    setSidebarOpen(false);
    shouldAutoScroll.current = true;
  }

  function saveChat(id, nextMessages, question) {
    setHistory((previous) => {
      const existing = previous.find((chat) => chat.id === id);

      const updatedChat = {
        id,
        title: existing
          ? existing.title
          : question.slice(0, 35) +
            (question.length > 35 ? "…" : ""),
        messages: nextMessages,
      };

      return existing
        ? previous.map((chat) =>
            chat.id === id ? updatedChat : chat
          )
        : [updatedChat, ...previous];
    });
  }

  async function sendMessage(value = input) {
    const question = String(value || "").trim();

    if (!question || loading) return;

    const chatId = activeChat || String(Date.now());

    const userMessage = {
      role: "user",
      content: question,
    };

    const nextMessages = [...messages, userMessage];

    shouldAutoScroll.current = true;
    setMessages(nextMessages);
    setActiveChat(chatId);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          messages: nextMessages,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Request failed (${response.status}).`;

        try {
          const data = await response.json();

          if (data.detail) {
            errorMessage =
              typeof data.detail === "string"
                ? data.detail
                : JSON.stringify(data.detail);
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      const answer =
        typeof data === "string"
          ? data
          : data.response ??
            data.answer ??
            data.reply ??
            data.message;

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error(
          "Unexpected response format. Check your FastAPI /chat endpoint."
        );
      }

      const finalMessages = [
        ...nextMessages,
        {
          role: "assistant",
          content: answer.trim(),
        },
      ];

      setMessages(finalMessages);
      saveChat(chatId, finalMessages, question);
    } catch (err) {
      console.error("DecisionAI error:", err);

      setError(
        err instanceof TypeError
          ? "Cannot connect to the backend. Check that FastAPI is running and VITE_API_URL is correct."
          : err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function retryMessage() {
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== "user" || loading) {
      return;
    }

    const question = lastMessage.content;

    // Restore the conversation to the state before the failed request.
    setMessages((previous) => previous.slice(0, -1));
    setError("");

    await sendMessage(question);
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <Robot small />

          <div className="brand-text">
            <strong>
              Decision<span>AI</span>
            </strong>
            <small>Your Product Decision Helper</small>
          </div>

          <button
            className="close-sidebar"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <button
          className="new-chat-button"
          onClick={newChat}
          disabled={loading}
        >
          ＋ New Chat
        </button>

        <div className="search-box">
          <span>⌕</span>
          <input placeholder="Search conversations..." />
        </div>

        <div className="section-heading">
          <span>Recent Chats</span>
          <span>▤</span>
        </div>

        <div className="history-list">
          {history.length === 0 ? (
            <p className="empty-history">
              Your conversations will appear here.
            </p>
          ) : (
            history.map((chat) => (
              <button
                key={chat.id}
                className={`history-item ${
                  activeChat === chat.id ? "history-active" : ""
                }`}
                onClick={() => openChat(chat)}
                disabled={loading}
              >
                <span className="history-icon">▢</span>
                <span className="history-title">{chat.title}</span>
              </button>
            ))
          )}
        </div>

        <div className="sidebar-promo">
          <div className="promo-icon">♛</div>
          <h3>Make smarter choices</h3>
          <p>
            Compare options, understand features, and decide with confidence.
          </p>

          <div className="promo-tags">
            <span>✓ Compare</span>
            <span>✓ Analyze</span>
            <span>✓ Recommend</span>
          </div>
        </div>

        <div className="sidebar-profile">
          <div className="profile-avatar">S</div>

          <div>
            <strong>DecisionAI User</strong>
            <small>Personal assistant</small>
          </div>

          <span className="profile-dots">•••</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            ☰
          </button>

          <nav className="top-nav">
            <button className="nav-active" onClick={newChat}>
              Home
            </button>

            <button
              onClick={() =>
                sendMessage(
                  "Help me compare products and explain their differences."
                )
              }
            >
              Compare
            </button>

            <button
              onClick={() =>
                sendMessage(
                  "What product categories can you help me choose from?"
                )
              }
            >
              Categories
            </button>

            <button
              onClick={() =>
                sendMessage(
                  "Explain how DecisionAI helps me make product decisions."
                )
              }
            >
              How it Works
            </button>
          </nav>

          <div className="top-actions">
            <span className="ready-badge">
              <i /> AI ready
            </span>
            <div className="top-avatar">S</div>
          </div>
        </header>

        <div className="page-content">
          <section className="main-column">
            {!hasMessages && (
              <>
                <section className="hero">
                  <div className="hero-copy">
                    <div className="eyebrow">
                      ✦ YOUR SMART DECISION ASSISTANT
                    </div>

                    <h1>
                      Make Better Decisions
                      <br />
                      <span>with AI.</span>
                    </h1>

                    <p>
                      Ask anything about products and get personalized
                      recommendations, comparisons and expert insights.
                    </p>

                    <div className="hero-benefits">
                      <div>
                        <span className="benefit green">✓</span>
                        <span>
                          <b>Reliable</b>
                          <small>Suggestions</small>
                        </span>
                      </div>

                      <div>
                        <span className="benefit violet">ϟ</span>
                        <span>
                          <b>AI-Powered</b>
                          <small>Analysis</small>
                        </span>
                      </div>

                      <div>
                        <span className="benefit pink">♥</span>
                        <span>
                          <b>Saves</b>
                          <small>Time & Effort</small>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hero-art">
                    <div className="hero-orbit" />

                    <div className="speech-bubble">
                      <strong>Hi! I'm DecisionAI</strong>
                      <br />
                      How can I help you today?
                    </div>

                    <div className="floating-product laptop-product">
                      <span>💻</span>
                      <b>Laptops</b>
                      <small>★★★★★</small>
                    </div>

                    <div className="floating-product audio-product">
                      <span>🎧</span>
                      <b>Audio</b>
                      <small>★★★★★</small>
                    </div>

                    <div className="floating-product phone-product">
                      <span>📱</span>
                      <b>Phones</b>
                      <small>★★★★★</small>
                    </div>

                    <Robot />

                    <span className="sparkle sparkle-one">✦</span>
                    <span className="sparkle sparkle-two">✧</span>

                    <span className="hero-caption">
                      Find the best
                      <br />
                      fit for you ♡
                    </span>
                  </div>
                </section>

                <section className="suggestion-section">
                  <div className="suggestion-heading">
                    <span>💡</span>

                    <div>
                      <h2>Try asking me</h2>
                      <p>Choose a suggestion to get started</p>
                    </div>
                  </div>

                  <div className="suggestion-grid">
                    {suggestions.map((item) => (
                      <button
                        key={item.title}
                        className="suggestion-card"
                        onClick={() => sendMessage(item.prompt)}
                        disabled={loading}
                      >
                        <span className="suggestion-image">
                          {item.icon}
                        </span>

                        <span className="suggestion-copy">
                          <strong>{item.title}</strong>
                          <small>{item.prompt}</small>
                        </span>

                        <span className="suggestion-arrow">›</span>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {hasMessages && (
              <section
                className="conversation"
                ref={conversationRef}
                onScroll={handleConversationScroll}
                aria-label="Chat messages"
              >
                <div className="conversation-heading">
                  <span className="heading-star">✦</span>

                  <div>
                    <h2>Your AI conversation</h2>
                    <p>Ask follow-up questions to refine your decision.</p>
                  </div>

                  <button onClick={newChat} disabled={loading}>
                    ＋ New chat
                  </button>
                </div>

                {messages.map((message, index) => (
                  <div
                    key={`${activeChat}-${index}`}
                    className={`message-row ${
                      message.role === "user"
                        ? "user-row"
                        : "assistant-row"
                    }`}
                  >
                    {message.role !== "user" && (
                      <div className="chat-robot">
                        <Robot small />
                      </div>
                    )}

                    <div
                      className={`message-bubble ${
                        message.role === "user"
                          ? "user-bubble"
                          : "assistant-bubble"
                      }`}
                    >
                      {message.role !== "user" && (
                        <strong className="message-author">
                          DecisionAI ✦
                        </strong>
                      )}

                      <p>{message.content}</p>
                    </div>

                    {message.role === "user" && (
                      <div className="user-avatar">S</div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="message-row assistant-row">
                    <div className="chat-robot">
                      <Robot small />
                    </div>

                    <div className="message-bubble assistant-bubble">
                      <strong className="message-author">
                        DecisionAI
                      </strong>

                      <div className="typing-indicator">
                        <i />
                        <i />
                        <i />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="error-box" role="alert">
                    <strong>Unable to get a response</strong>
                    <p>{error}</p>
                    <button onClick={retryMessage} disabled={loading}>
                      Try again
                    </button>
                  </div>
                )}
              </section>
            )}

            <footer className="composer-area">
              <form className="composer" onSubmit={handleSubmit}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about products..."
                  rows={2}
                  disabled={loading}
                  aria-label="Message DecisionAI"
                />

                <div className="composer-bottom">
                  <div className="quick-prompts">
                    <button
                      type="button"
                      onClick={() => setInput("Compare these products: ")}
                      disabled={loading}
                    >
                      ⇄ Compare products
                    </button>

                    <button
                      type="button"
                      onClick={() => setInput("Explain the features of ")}
                      disabled={loading}
                    >
                      ✧ Explain features
                    </button>

                    <button
                      type="button"
                      onClick={() => setInput("Which is better and why? ")}
                      disabled={loading}
                    >
                      ↗ Which is better?
                    </button>
                  </div>

                  <button
                    className="send-button"
                    type="submit"
                    disabled={!input.trim() || loading}
                    aria-label="Send message"
                  >
                    {loading ? <span className="spinner" /> : "➤"}
                  </button>
                </div>
              </form>

              <p className="disclaimer">
                DecisionAI may make mistakes. Verify current prices and product
                details before buying.
              </p>
            </footer>
          </section>

          <aside className="right-panel">
            <section className="info-card">
              <div className="info-heading">
                <span className="target-icon">◎</span>
                <h2>Why DecisionAI?</h2>
              </div>

              <div className="feature-row">
                <span className="feature-icon purple">✧</span>
                <div>
                  <b>Smart Recommendations</b>
                  <small>Based on your needs</small>
                </div>
              </div>

              <div className="feature-row">
                <span className="feature-icon green">⊞</span>
                <div>
                  <b>Detailed Comparisons</b>
                  <small>With pros & cons</small>
                </div>
              </div>

              <div className="feature-row">
                <span className="feature-icon orange">★</span>
                <div>
                  <b>Product Insights</b>
                  <small>Features and value</small>
                </div>
              </div>

              <div className="feature-row">
                <span className="feature-icon blue">◷</span>
                <div>
                  <b>Saves your Time</b>
                  <small>Less research effort</small>
                </div>
              </div>
            </section>

            <section className="info-card trending-card">
              <div className="info-heading">
                <span className="trending-icon">♨</span>
                <h2>Trending Searches</h2>
              </div>

              {suggestions.map((item, index) => (
                <button
                  className="trending-row"
                  key={item.title}
                  onClick={() =>
                    sendMessage(
                      `Help me choose: ${item.title}. Ask me any questions you need before recommending.`
                    )
                  }
                  disabled={loading}
                >
                  <span className="trending-emoji">{item.icon}</span>

                  <span className="trending-copy">
                    <b>{item.title}</b>
                    <small>
                      {["12k+", "9k+", "8k+", "6k+"][index]} searches
                    </small>
                  </span>

                  <span className="trending-arrow">↗</span>
                </button>
              ))}
            </section>

            <section className="decision-card">
              <span className="decision-label">
                YOUR CHOICE, MADE EASIER
              </span>

              <h2>
                Make your next
                <br />
                decision a smart one.
              </h2>

              <p>Compare. Understand. Choose confidently.</p>

              <div className="mini-robot">
                <Robot small />
              </div>

              <button onClick={() => inputRef.current?.focus()}>
                Ask DecisionAI <span>→</span>
              </button>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}