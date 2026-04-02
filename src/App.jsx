import { Routes, Route, Navigate } from 'react-router-dom'
import { Component } from 'react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Markets from './pages/Markets'
import HowItWorks from './pages/HowItWorks'
import Admin from './pages/Admin'
import Portfolio from './pages/StakeHistory'
import AccumulatorComingSoon from './pages/AccumulatorComingSoon'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) { console.error('Callit error:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#000', color: '#fff', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontWeight: 800, fontSize: 22 }}>Something went wrong</h2>
          <p style={{ color: '#666', fontSize: 14, maxWidth: 400 }}>Your funds are safe — they are held by the smart contract.</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/' }} style={{ background: '#E8B84B', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Go Home</button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/p2p" element={<Navigate to="/markets" replace />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/history" element={<Navigate to="/portfolio" replace />} />
        <Route path="/multi" element={<AccumulatorComingSoon />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </ErrorBoundary>
  )
}
