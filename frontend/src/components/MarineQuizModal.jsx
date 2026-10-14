import React, { useState } from 'react';
import { QUIZ_TOPICS, QUIZ_QUESTIONS } from '../data/marineQuizData';

export default function MarineQuizModal({ isOpen, onClose }) {
  const [activeTopicId, setActiveTopicId] = useState('topic-pfz');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  // Answers state keyed strictly by question.id: { [qId]: number | number[] }
  // Initialized completely empty so no options are pre-selected by default
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  // Filter questions strictly belonging to the active topic
  const topicQuestions = QUIZ_QUESTIONS.filter(q => q.topicId === activeTopicId);
  const currentQ = topicQuestions[currentQIndex] || topicQuestions[0];
  const activeTopic = QUIZ_TOPICS.find(t => t.id === activeTopicId) || QUIZ_TOPICS[0];

  // Handle switching topics: strictly resets index and submission state to prevent cross-contamination
  const handleTopicSelect = (topicId) => {
    setActiveTopicId(topicId);
    setCurrentQIndex(0);
    setIsSubmitted(false);
  };

  // Single-choice radio selection handler (ensures clean single-value assignment)
  const handleSelectRadio = (optIdx) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [currentQ.id]: optIdx
    }));
  };

  // Multi-choice checkbox toggle handler (toggles ONLY target index without bleed-over)
  const handleToggleCheckbox = (optIdx) => {
    if (isSubmitted) return;
    setUserAnswers(prev => {
      const currentList = Array.isArray(prev[currentQ.id]) ? prev[currentQ.id] : [];
      const updatedList = currentList.includes(optIdx)
        ? currentList.filter(i => i !== optIdx)
        : [...currentList, optIdx];
      return {
        ...prev,
        [currentQ.id]: updatedList
      };
    });
  };

  // Calculate score for active topic
  const calculateScore = () => {
    let score = 0;
    topicQuestions.forEach(q => {
      const ans = userAnswers[q.id];
      if (q.type === 'single') {
        if (ans === q.correctAnswer) score += 1;
      } else if (q.type === 'multiple' && Array.isArray(ans) && Array.isArray(q.correctAnswer)) {
        const sortedAns = [...ans].sort();
        const sortedCorrect = [...q.correctAnswer].sort();
        if (sortedAns.length === sortedCorrect.length && sortedAns.every((v, idx) => v === sortedCorrect[idx])) {
          score += 1;
        }
      }
    });
    return score;
  };

  const currentSelection = userAnswers[currentQ?.id];
  const isQuestionAnswered = currentQ?.type === 'single'
    ? typeof currentSelection === 'number'
    : Array.isArray(currentSelection) && currentSelection.length > 0;

  // Check if current question's answer is correct (for post-submission review)
  const isCurrentCorrect = () => {
    if (!isSubmitted || !isQuestionAnswered) return false;
    if (currentQ.type === 'single') {
      return currentSelection === currentQ.correctAnswer;
    }
    if (currentQ.type === 'multiple' && Array.isArray(currentSelection) && Array.isArray(currentQ.correctAnswer)) {
      const a = [...currentSelection].sort();
      const b = [...currentQ.correctAnswer].sort();
      return a.length === b.length && a.every((v, i) => v === b[i]);
    }
    return false;
  };

  return (
    <div className="quiz-modal-overlay" onClick={onClose}>
      <div className="quiz-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="quiz-modal-header">
          <div className="quiz-header-title">
            <span className="quiz-header-icon">📚</span>
            <div>
              <h3>Marine Knowledge &amp; Regulatory Practice Assessment</h3>
              <p>ISRO Ocean Intelligence Competency Modules for Coastal Fishers &amp; Marine Navigators</p>
            </div>
          </div>
          <button className="quiz-close-btn" onClick={onClose} type="button" title="Close Assessment">✕</button>
        </div>

        {/* Topic Selector Tabs (Strict Data Separation) */}
        <div className="quiz-topics-bar">
          {QUIZ_TOPICS.map((topic) => {
            const topicQCount = QUIZ_QUESTIONS.filter(q => q.topicId === topic.id).length;
            return (
              <button
                key={topic.id}
                type="button"
                className={`quiz-topic-btn ${activeTopicId === topic.id ? 'active' : ''}`}
                onClick={() => handleTopicSelect(topic.id)}
              >
                <span className="topic-icon">{topic.icon}</span>
                <span className="topic-text">{topic.title.split('&')[0].trim()}</span>
                <span className="topic-q-count">({topicQCount} Qs)</span>
              </button>
            );
          })}
        </div>

        {/* Assessment Card Body */}
        <div className="quiz-body-card">
          <div className="quiz-meta-row">
            <div className="quiz-topic-badge">
              <strong>{activeTopic.icon} {activeTopic.title}</strong>
            </div>
            <div className="quiz-q-progress">
              Question <strong>{currentQIndex + 1}</strong> of <strong>{topicQuestions.length}</strong>
            </div>
          </div>

          <p className="quiz-topic-desc">{activeTopic.description}</p>

          {/* Question Prompt */}
          <div className="quiz-question-box">
            <span className="quiz-question-type-badge">
              {currentQ.type === 'single' ? '🔘 Single Choice (Radio)' : '☑️ Multiple Choice (Checkbox)'}
            </span>
            <h4 className="quiz-question-text">{currentQ.question}</h4>
          </div>

          {/* Options Container */}
          <div className="quiz-options-list">
            {currentQ.options.map((option, optIdx) => {
              const isChecked = currentQ.type === 'single'
                ? currentSelection === optIdx
                : Array.isArray(currentSelection) && currentSelection.includes(optIdx);

              const isOptionCorrect = currentQ.type === 'single'
                ? currentQ.correctAnswer === optIdx
                : Array.isArray(currentQ.correctAnswer) && currentQ.correctAnswer.includes(optIdx);

              let optionClass = "quiz-option-item";
              if (isChecked) optionClass += " selected";
              if (isSubmitted) {
                if (isOptionCorrect) optionClass += " verified-correct";
                else if (isChecked && !isOptionCorrect) optionClass += " verified-incorrect";
              }

              return (
                <label key={optIdx} className={optionClass}>
                  {currentQ.type === 'single' ? (
                    <input
                      type="radio"
                      name={`quiz-radio-${currentQ.id}`}
                      checked={isChecked}
                      onChange={() => handleSelectRadio(optIdx)}
                      disabled={isSubmitted}
                      className="quiz-input-radio"
                    />
                  ) : (
                    <input
                      type="checkbox"
                      name={`quiz-check-${currentQ.id}-${optIdx}`}
                      checked={isChecked}
                      onChange={() => handleToggleCheckbox(optIdx)}
                      disabled={isSubmitted}
                      className="quiz-input-checkbox"
                    />
                  )}
                  <span className="option-letter">{String.fromCharCode(65 + optIdx)}.</span>
                  <span className="option-text">{option}</span>
                </label>
              );
            })}
          </div>

          {/* Post-Submission Verified Explanation */}
          {isSubmitted && (
            <div className={`quiz-explanation-box ${isCurrentCorrect() ? 'correct' : 'incorrect'}`}>
              <div className="explanation-header">
                {isCurrentCorrect() ? '✅ Correct Answer!' : '❌ Incorrect Selection'}
              </div>
              <p className="explanation-text">{currentQ.explanation}</p>
            </div>
          )}

          {/* Action & Navigation Bar */}
          <div className="quiz-footer-row">
            <div className="quiz-nav-left">
              <button
                type="button"
                className="quiz-nav-btn"
                onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQIndex === 0}
              >
                ◀ Previous
              </button>
              <button
                type="button"
                className="quiz-nav-btn"
                onClick={() => setCurrentQIndex(prev => Math.min(topicQuestions.length - 1, prev + 1))}
                disabled={currentQIndex === topicQuestions.length - 1}
              >
                Next ▶
              </button>
            </div>

            <div className="quiz-action-right">
              {!isSubmitted ? (
                <button
                  type="button"
                  className="quiz-submit-btn"
                  onClick={() => setIsSubmitted(true)}
                  disabled={!isQuestionAnswered}
                >
                  📝 Check Answers for this Module
                </button>
              ) : (
                <div className="quiz-score-summary">
                  <span className="score-label">Module Score:</span>
                  <span className="score-value">{calculateScore()} / {topicQuestions.length}</span>
                  <button
                    type="button"
                    className="quiz-retry-btn"
                    onClick={() => {
                      setIsSubmitted(false);
                      setUserAnswers(prev => {
                        const copy = { ...prev };
                        topicQuestions.forEach(q => delete copy[q.id]);
                        return copy;
                      });
                    }}
                  >
                    🔄 Retake Module
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
