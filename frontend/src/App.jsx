import { BrowserRouter as Router, Route , Routes } from 'react-router-dom'
import './App.css'
import Auth from './pages/auth/Auth'
import Dashboard from './pages/Dashboard/Dashboard'
import IsLogin from './pages/auth/IsLogin'

function App() {
  

  return (
    <>
      <Router>
        <Routes>
          <Route element={<IsLogin/>}>
            <Route path="/" element={<Dashboard />} />
          </Route>
          <Route path="/signup" element={<Auth type="signup" />} />
          <Route path="/login" element={<Auth type="login" />} />
        </Routes>
      </Router>
    </>
  );
}

export default App
