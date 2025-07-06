import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HRDashboard from './components/HRDashboard';
import CandidateInterview from './components/CandidateInterview';
import InterviewResults from './components/InterviewResults';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<HRDashboard />} />
          <Route path="/interview/:interviewLink" element={<CandidateInterview />} />
          <Route path="/results/:interviewId" element={<InterviewResults />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;