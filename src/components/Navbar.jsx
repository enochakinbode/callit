import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAccount, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import Logo from './Logo'
import { useTheme } from '../context/ThemeContext'
import { shortAddr } from '../lib/config'

const NavLink = ({ to, label }) => {
  const location = useLocation()
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
  return (
    <Link to={to} style={{
      color: active ? '#FFFFFF' : '#888888',
      fontWeight: active ? 600 : 500,
      fontSize: '14px',
      transition: 'color 0.16s ease',
      padding: '4px 0',
      letterSpacing: '-0.01em',
      borderBottom: active ? '2px solid #E8B84B' : '2px solid transparent',
      paddingBottom: '4px',
    }}>
      {label}
    </Link>
  )
}

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const walletRef = useRef(null)
  const menuRef = useRef(null)

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (walletRef.current && !walletRef.current.contains(e.target)) setWalletOpen(false)
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDisconnect = () => {
    disconnect()
    setWalletOpen(false)
    setMenuOpen(false)
  }

  const handleNav = (path) => {
    navigate(path)
    setWalletOpen(false)
    setMenuOpen(false)
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.90)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    }}>
      <div className="container" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '64px', gap: '24px',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', flexShrink: 0 }}>
          <Logo size={30} />
          <span style={{ fontWeight: 800, fontSize: '17px', color: '#FFFFFF', letterSpacing: '-0.03em' }}>
            Callit
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hide-mobile" style={{ display: 'flex', gap: '28px', alignItems: 'center', flex: 1 }}>
          <NavLink to="/markets" label="Markets" />
          <NavLink to="/multi" label="Multi Markets" />
          <NavLink to="/p2p" label="P2P Markets" />
          <NavLink to="/how-it-works" label="How It Works" />
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '7px 10px', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '14px', transition: 'all 0.16s ease',
              fontFamily: 'var(--font)', lineHeight: 1,
            }}
            title="Toggle theme"
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* Chain badges */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px', borderRadius: '6px',
              background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.18)',
              fontSize: '11px', fontWeight: 700, color: '#E8B84B', letterSpacing: '0.04em',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#26A17B', display: 'inline-block', flexShrink: 0 }} />
              BASE
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px', borderRadius: '6px',
              background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.18)',
              fontSize: '11px', fontWeight: 700, color: '#60a5fa', letterSpacing: '0.04em',
              opacity: 0.7,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', flexShrink: 0, opacity: 0.5 }} />
              TEMPO ⚡
            </div>
          </div>

          {/* Wallet button / connect */}
          {isConnected ? (
            <div ref={walletRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setWalletOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: walletOpen ? 'rgba(232,184,75,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${walletOpen ? 'rgba(232,184,75,0.35)' : 'rgba(255,255,255,0.10)'}`,
                  borderRadius: '8px', padding: '7px 12px', cursor: 'pointer',
                  color: '#FFFFFF', fontSize: '13px', fontWeight: 600,
                  transition: 'all 0.16s ease', fontFamily: 'var(--mono)',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#26A17B',
                  display: 'inline-block', flexShrink: 0,
                  boxShadow: '0 0 6px rgba(38,161,123,0.6)',
                }} />
                {shortAddr(address)}
                <span style={{ fontSize: '10px', color: '#888', marginLeft: 2 }}>
                  {walletOpen ? '▲' : '▼'}
                </span>
              </button>

              {/* Wallet Dropdown */}
              {walletOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, maxWidth: 'calc(100vw - 28px)',
                  background: '#111111', border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '12px', padding: '6px',
                  minWidth: '200px', boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
                  animation: 'scaleIn 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                  transformOrigin: 'top right', zIndex: 300,
                }}>
                  {/* Wallet address display */}
                  <div style={{
                    padding: '10px 12px 8px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: '4px',
                  }}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connected</div>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: '#E8B84B' }}>{shortAddr(address)}</div>
                  </div>

                  <button
                    onClick={() => handleNav('/history')}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', background: 'transparent', border: 'none',
                      color: '#FFFFFF', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                      borderRadius: '8px', transition: 'background 0.14s ease',
                      fontFamily: 'var(--font)', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '15px' }}>📋</span>
                    <span style={{ flex: 1 }}>Stake History</span>
                  </button>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

                  <button
                    onClick={handleDisconnect}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', background: 'transparent', border: 'none',
                      color: '#E85D5D', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                      borderRadius: '8px', transition: 'background 0.14s ease',
                      fontFamily: 'var(--font)', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,93,93,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '15px' }}>🔌</span>
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openConnectModal}
              className="btn btn-gold btn-sm"
              style={{ fontWeight: 700 }}
            >
              Connect Wallet
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            className="hide-desktop"
            onClick={() => setMenuOpen(v => !v)}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '7px 11px', cursor: 'pointer',
              color: '#FFFFFF', fontSize: '16px', fontFamily: 'var(--font)',
            }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          background: '#0D0D0D', borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px',
          animation: 'fadeIn 0.18s ease',
        }}>
          {[
            { to: '/markets', label: 'Markets' },
            { to: '/multi', label: 'Multi Markets' },
            { to: '/p2p', label: 'P2P Markets' },
            { to: '/how-it-works', label: 'How It Works' },
          ].map(link => (
            <button
              key={link.to}
              onClick={() => handleNav(link.to)}
              style={{
                background: 'transparent', border: 'none', color: '#CCCCCC',
                fontSize: '15px', fontWeight: 500, cursor: 'pointer', padding: '12px 4px',
                fontFamily: 'var(--font)', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {link.label}
            </button>
          ))}
          {isConnected && (
            <>
              <button
                onClick={() => handleNav('/history')}
                style={{ background: 'transparent', border: 'none', color: '#CCCCCC', fontSize: '15px', fontWeight: 500, cursor: 'pointer', padding: '12px 4px', fontFamily: 'var(--font)', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                📋 Stake History
              </button>
              <button
                onClick={handleDisconnect}
                style={{ background: 'transparent', border: 'none', color: '#E85D5D', fontSize: '15px', fontWeight: 500, cursor: 'pointer', padding: '12px 4px', fontFamily: 'var(--font)', textAlign: 'left' }}
              >
                🔌 Disconnect
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
