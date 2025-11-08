import React, { useState } from 'react';
import './QuizPanel.css';

function QuizPanel({ activeQuiz, onStartQuiz, onSubmitAnswer, role }) {
  const [answers, setAnswers] = useState({});
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  const [submitted, setSubmitted] = useState(false);

  const handleCreateQuiz = () => {
    const quiz = {
      id: `quiz_${Date.now()}`,
      title: quizTitle,
      questions: questions.filter(q => q.question.trim()),
      createdAt: new Date()
    };
    onStartQuiz(quiz);
    setQuizTitle('');
    setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setAnswers({
      ...answers,
      [questionIndex]: optionIndex
    });
  };

  const handleSubmitAnswers = () => {
    onSubmitAnswer(answers);
    setSubmitted(true);
  };

  if (role === 'instructor' && !activeQuiz) {
    return (
      <div className="quiz-panel">
        <div className="quiz-creator">
          <h3>Create Quiz</h3>

          <div className="form-group">
            <label>Quiz Title</label>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="Enter quiz title"
              className="quiz-input"
            />
          </div>

          {questions.map((q, qIndex) => (
            <div key={qIndex} className="question-block">
              <h4>Question {qIndex + 1}</h4>
              <input
                type="text"
                value={q.question}
                onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                placeholder="Enter question"
                className="quiz-input"
              />

              <div className="options-list">
                {q.options.map((option, oIndex) => (
                  <div key={oIndex} className="option-input">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={q.correctAnswer === oIndex}
                      onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      placeholder={`Option ${oIndex + 1}`}
                      className="quiz-input"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={addQuestion} className="btn-add-question">
            + Add Question
          </button>

          <button
            onClick={handleCreateQuiz}
            className="btn-start-quiz"
            disabled={!quizTitle.trim() || questions.every(q => !q.question.trim())}
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (activeQuiz) {
    return (
      <div className="quiz-panel">
        <div className="quiz-active">
          <h3>{activeQuiz.title}</h3>
          <p className="quiz-info">{activeQuiz.questions.length} questions</p>

          {!submitted ? (
            <>
              {activeQuiz.questions.map((q, qIndex) => (
                <div key={qIndex} className="quiz-question">
                  <h4>Q{qIndex + 1}. {q.question}</h4>
                  <div className="quiz-options">
                    {q.options.map((option, oIndex) => (
                      <label
                        key={oIndex}
                        className={`quiz-option ${answers[qIndex] === oIndex ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`question-${qIndex}`}
                          checked={answers[qIndex] === oIndex}
                          onChange={() => handleAnswerSelect(qIndex, oIndex)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {role === 'student' && (
                <button
                  onClick={handleSubmitAnswers}
                  className="btn-submit-quiz"
                  disabled={Object.keys(answers).length !== activeQuiz.questions.length}
                >
                  Submit Answers
                </button>
              )}
            </>
          ) : (
            <div className="quiz-submitted">
              <div className="success-icon">✓</div>
              <h3>Quiz Submitted!</h3>
              <p>Your answers have been recorded.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-panel">
      <div className="quiz-empty">
        <div className="empty-icon">📝</div>
        <h3>No Active Quiz</h3>
        <p>Waiting for instructor to start a quiz...</p>
      </div>
    </div>
  );
}

export default QuizPanel;
