import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDeveloperInfo, setShowDeveloperInfo] = useState(false);

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Fetch questions when document is selected
  useEffect(() => {
    if (selectedDocument) {
      fetchQuestions(selectedDocument.id);
    }
  }, [selectedDocument]);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchQuestions = async (documentId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/document/${documentId}/questions`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      setUploadMessage('Please select a PDF file');
      return;
    }

    setIsUploading(true);
    setUploadMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadMessage('PDF uploaded successfully!');
      await fetchDocuments();

      // Auto-select the newly uploaded document
      const newDoc = {
        id: response.data.document_id,
        filename: response.data.filename,
        upload_date: response.data.upload_date
      };
      setSelectedDocument(newDoc);

    } catch (error) {
      setUploadMessage(error.response?.data?.detail || 'Error uploading PDF');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!currentQuestion.trim() || !selectedDocument) return;

    setIsAsking(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/ask-question`, null, {
        params: {
          document_id: selectedDocument.id,
          question: currentQuestion,
        },
      });

      // Add new Q&A to the list
      setQuestions(prev => [...prev, response.data]);
      setCurrentQuestion('');

    } catch (error) {
      console.error('Error asking question:', error);
      alert(error.response?.data?.detail || 'Error asking question');
    } finally {
      setIsAsking(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const scrollToUpload = () => {
    document.querySelector('.upload-section').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="brand-icon">🤖</div>
            <span className="brand-text">PDF Q&A Assistant</span>
          </div>
          <div className="nav-actions">
            <button
              className="developer-btn"
              onClick={() => setShowDeveloperInfo(!showDeveloperInfo)}
            >
              <span className="dev-icon">👨‍💻</span>
              Developer
            </button>
            <button className="theme-toggle" onClick={toggleTheme}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      {/* Developer Info Modal */}
      {showDeveloperInfo && (
        <div className="modal-overlay" onClick={() => setShowDeveloperInfo(false)}>
          <div className="developer-modal" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowDeveloperInfo(false)}
            >
              ×
            </button>
            <div className="developer-info">
              <div className="developer-avatar">
                <div className="avatar-placeholder">👨‍💻</div>
              </div>
              <img className='Developer-Image' src="https://res.cloudinary.com/dxtkbq48i/image/upload/v1747891625/abrar_o9ijbd.jpg" alt="" />
              <h2>Meet the Developer</h2>
              <div className="developer-details">
                <h3>Mo. Abrar Qureshi</h3>
                <p className="developer-title">Full Stack Developer</p>
                <div className="developer-skills">
                  <span className="skill-tag">React</span>
                  <span className="skill-tag">Python</span>
                  <span className="skill-tag">FastAPI</span>
                  <span className="skill-tag">AI/ML</span>
                </div>
                <div className="developer-links">
                  <a href="https://portfolioabrarquershi.onrender.com/" className="dev-link">
                    <span className="link-icon">🔗</span>
                    Portfolio
                  </a>
                  <a href="https://www.linkedin.com/in/moabrarqureshi" className="dev-link">
                    <span className="link-icon">💼</span>
                    LinkedIn
                  </a>
                  <a href="mailto:moabrarqureshi786@gmail.com" className="dev-link">
                    <span className="link-icon">📧</span>
                    Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-background">
          <div className="floating-elements">
            <div className="floating-element" style={{ '--delay': '0s' }}>📄</div>
            <div className="floating-element" style={{ '--delay': '2s' }}>🤖</div>
            <div className="floating-element" style={{ '--delay': '4s' }}>💬</div>
            <div className="floating-element" style={{ '--delay': '6s' }}>⚡</div>
          </div>
        </div>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="gradient-text">Intelligent PDF</span>
              <br />
              Question & Answer
            </h1>
            <p className="hero-subtitle">
              Upload your PDF documents and get instant answers using advanced AI.
              Transform static documents into interactive knowledge bases.
            </p>
            <div className="hero-features">
              <div className="feature-item">
                <span className="feature-icon">🚀</span>
                <span>Lightning Fast</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🧠</span>
                <span>AI Powered</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span>Secure</span>
              </div>
            </div>
            <button className="cta-button" onClick={scrollToUpload}>
              <span>Get Started</span>
              <div className="button-shine"></div>
            </button>
          </div>
          <div className="hero-visual">
            <div className="visual-container">
              <div className="pdf-icon">📄</div>
              <div className="arrow-flow">
                <div className="arrow">→</div>
              </div>
              <div className="ai-brain">🧠</div>
              <div className="arrow-flow">
                <div className="arrow">→</div>
              </div>
              <div className="answer-bubble">💬</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="main-content">
        {/* Upload Section */}
        <section className="upload-section">
          <div className="section-header">
            <h2 className="section-title">Upload Your PDF</h2>
            <p className="section-subtitle">Drag and drop or click to select your PDF document</p>
          </div>

          <div className="upload-card">
            <div className="upload-area">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="file-input"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="upload-label">
                {isUploading ? (
                  <div className="upload-loading">
                    <div className="loading-spinner"></div>
                    <span>Processing your PDF...</span>
                  </div>
                ) : (
                  <div className="upload-content">
                    <div className="upload-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h3>Drop your PDF here</h3>
                    <p>or click to browse files</p>
                    <div className="file-types">Supports: PDF files up to 10MB</div>
                  </div>
                )}
              </label>
            </div>
            {uploadMessage && (
              <div className={`upload-message ${uploadMessage.includes('Error') ? 'error' : 'success'}`}>
                <span className="message-icon">
                  {uploadMessage.includes('Error') ? '❌' : '✅'}
                </span>
                {uploadMessage}
              </div>
            )}
          </div>
        </section>

        {/* Documents Grid */}
        {documents.length > 0 && (
          <section className="documents-section">
            <div className="section-header">
              <h2 className="section-title">Your Documents</h2>
              <p className="section-subtitle">Select a document to start asking questions</p>
            </div>

            <div className="documents-grid">
              {documents.map((doc, index) => (
                <div
                  key={doc.id}
                  className={`document-card ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDocument(doc)}
                  style={{ '--delay': `${index * 0.1}s` }}
                >
                  <div className="document-icon">📄</div>
                  <div className="document-info">
                    <h3 className="document-title">{doc.filename}</h3>
                    <p className="document-date">
                      {new Date(doc.upload_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="document-status">
                    {selectedDocument?.id === doc.id && <span className="status-badge">Active</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Q&A Section */}
        {selectedDocument && (
          <section className="qa-section">
            <div className="section-header">
              <h2 className="section-title">Ask Questions</h2>
              <p className="section-subtitle">
                Currently analyzing: <strong>{selectedDocument.filename}</strong>
              </p>
            </div>

            {/* Question Form */}
            <div className="question-form-container">
              <form onSubmit={handleAskQuestion} className="question-form">
                <div className="question-input-wrapper">
                  <input
                    type="text"
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    placeholder="What would you like to know about this document?"
                    className="question-input"
                    disabled={isAsking}
                  />
                  <button
                    type="submit"
                    disabled={isAsking || !currentQuestion.trim()}
                    className="ask-button"
                  >
                    {isAsking ? (
                      <div className="button-loading">
                        <div className="loading-spinner small"></div>
                      </div>
                    ) : (
                      <span>Ask</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Q&A List */}
            <div className="qa-container">
              {questions.length === 0 ? (
                <div className="no-questions">
                  <div className="empty-state">
                    <div className="empty-icon">💭</div>
                    <h3>No questions yet</h3>
                    <p>Ask your first question about the document above!</p>
                  </div>
                </div>
              ) : (
                <div className="qa-list">
                  {questions.map((qa, index) => (
                    <div
                      key={index}
                      className="qa-item"
                      style={{ '--delay': `${index * 0.1}s` }}
                    >
                      <div className="qa-question">
                        <div className="qa-avatar question-avatar">Q</div>
                        <div className="qa-content">
                          <p>{qa.question}</p>
                        </div>
                      </div>
                      <div className="qa-answer">
                        <div className="qa-avatar answer-avatar">A</div>
                        <div className="qa-content">
                          <p>{qa.answer}</p>
                          <div className="qa-timestamp">
                            {new Date(qa.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-text">
            <p>Built with ❤️ for AI Planet</p>
            <p>Powered by Advanced AI Technology</p>
          </div>
          <div className="footer-links">
            <button onClick={() => setShowDeveloperInfo(true)}>
              Developer Info
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;