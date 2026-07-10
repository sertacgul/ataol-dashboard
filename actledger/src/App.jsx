import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<div>AskDesk Landing</div>} />
      <Route path="/login" element={<div>Login</div>} />
      <Route path="/register" element={<div>Register</div>} />
      <Route path="/app/dashboard" element={<div>Dashboard</div>} />
    </Routes>
  )
}

export default App
