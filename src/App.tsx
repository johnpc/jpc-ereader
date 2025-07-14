import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ReaderPage } from './pages/ReaderPage';
import './App.css';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/read/:bookId" element={<ReaderPage />} />
        {/* Catch-all route - redirect to home */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </div>
  );
}

export default App;
