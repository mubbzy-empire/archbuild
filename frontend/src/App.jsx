import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import SideNav from './components/SideNav';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Chat from './pages/Chat';
import Results from './pages/Results';
import Projects from './pages/Projects';
import EstateGenerate from './pages/EstateGenerate';
import EstateResults from './pages/EstateResults';
import ManualModeler from './pages/ManualModeler';
import ProfessionalModeler from './pages/ProfessionalModeler';

export default function App() {
  const location = useLocation();
  const immersiveModeler = location.pathname === '/modeler';
  return (
    <div className={`app-shell${immersiveModeler ? ' immersive-app' : ''}`}>
      {!immersiveModeler && <SideNav />}
      <div className="app-main">
        {!immersiveModeler && <TopBar />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/estate" element={<EstateGenerate />} />
          <Route path="/estate/:id" element={<EstateResults />} />
          <Route path="/modeler" element={<ProfessionalModeler />} />
          <Route path="/legacy-modeler" element={<ManualModeler />} />
        </Routes>
        {!immersiveModeler && <BottomNav />}
      </div>
    </div>
  );
}
