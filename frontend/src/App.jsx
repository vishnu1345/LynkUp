import { Route, Router, Routes } from 'react-router-dom'
import './App.css'
import Auth from './pages/auth/Auth'

function App() {
  

  return (
    <>
      <Router>
        <Routes>
          <Route path='/signup' element = { <Auth type="signup" /> }/>
          <Route path='/login' element = { <Auth type="login" /> }/>
        </Routes>
      </Router>
    </>
  )
}

export default App
