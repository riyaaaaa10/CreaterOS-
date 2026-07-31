import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Home from './pages/Home.jsx';
import SignUp from './pages/SignUp.jsx';
import Login from './pages/Login.jsx';
import ProfileSetup from './pages/ProfileSetup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import IdeaInput from './pages/IdeaInput.jsx';
import MatchResults from './pages/MatchResults.jsx';
import Workspace from './pages/Workspace.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/profile-setup"
            element={
              <RequireAuth>
                <ProfileSetup />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/idea-input"
            element={
              <RequireAuth>
                <IdeaInput />
              </RequireAuth>
            }
          />
          <Route
            path="/idea-input/:projectId"
            element={
              <RequireAuth>
                <IdeaInput />
              </RequireAuth>
            }
          />
          <Route
            path="/matches/:projectId"
            element={
              <RequireAuth>
                <MatchResults />
              </RequireAuth>
            }
          />
          <Route
            path="/workspace/:projectId"
            element={
              <RequireAuth>
                <Workspace />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
