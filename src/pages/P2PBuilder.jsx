import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GENLAYER_NETWORK_LABEL, GENLAYER_STUDIO_URL } from '../lib/config'

const openNativePicker = (event) => {
  event.currentTarget.showPicker?.()
}

const sanitize = (value) => value.replace(/<[^>]*>/g, '').trim()

const buildUtcDate = (date, time = '00:00') => new Date(`${date}T${time || '00:00'}:00Z`)

const formatUtcDateTime = (value) => new Date(value).toLocaleString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
}) + ' UTC'

export default function P2PBuilder() {
  const [form, setForm] = useState({
    statement: '',
    stakeUsdc: '',
    cutoffDate: '',
    cutoffTime: '00:00',
    supplementalSources: '',
  })
  const [errors, setErrors] = useState({})
  const [payload, setPayload] = useState(null)
  const [copied, setCopied] = useState(false)

  const cutoffPreview = useMemo(() => {
    if (!form.cutoffDate || !form.cutoffTime) return null
    const cutoff = buildUtcDate(form.cutoffDate, form.cutoffTime)
    if (Number.isNaN(cutoff.getTime())) return null
    return cutoff
  }, [form.cutoffDate, form.cutoffTime])

  const fundingDeadlinePreview = useMemo(() => {
    if (!cutoffPreview) return null
    return new Date(cutoffPreview.getTime() - 15 * 60 * 1000)
  }, [cutoffPreview])
  const supplementalSources = useMemo(
    () => form.supplementalSources.split('\n').map(line => sanitize(line)).filter(Boolean),
    [form.supplementalSources],
  )

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setCopied(false)
  }

  const validate = () => {
    const nextErrors = {}
    const statement = sanitize(form.statement)

    if (!statement) nextErrors.statement = 'Statement is required'
    if (!form.cutoffDate) nextErrors.cutoffDate = 'Cutoff date is required'
    if (!form.cutoffTime) nextErrors.cutoffTime = 'Cutoff time is required'
    if (!cutoffPreview || cutoffPreview <= new Date()) {
      nextErrors.cutoffDate = 'Cutoff must be in the future'
    }
    if (!fundingDeadlinePreview || fundingDeadlinePreview <= new Date()) {
      nextErrors.cutoffTime = 'Cutoff must be at least 15 minutes from now'
    }

    return nextErrors
  }

  const handleGeneratePayload = () => {
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const nextPayload = {
      statement: sanitize(form.statement),
      cutoff_iso: cutoffPreview.toISOString(),
      funding_deadline_iso: fundingDeadlinePreview.toISOString(),
      supplemental_sources: supplementalSources,
    }

    setPayload(nextPayload)
    setCopied(false)
  }

  const handleCopyPayload = async () => {
    if (!payload) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '72px' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', marginBottom: '16px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Temporary Studio Test Flow
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ maxWidth: '620px' }}>
              <h1 style={{ fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: '12px', color: 'var(--text)' }}>
                Build A P2P Market Payload
              </h1>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: '12px' }}>
                This page does not send anything to the relayer yet. It only builds the JSON payload so you can paste it into GenLayer Studio and test the contract flow there.
              </p>
            </div>
            <Link
              to="/"
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '44px',
                padding: '0 18px',
                borderRadius: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              Back Home
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(320px, 0.95fr)', gap: '18px', alignItems: 'start' }}>
            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '6px' }}>
                    Market Draft
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>
                    Create Or Test A P2P Market
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                    Market statement
                  </label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder='Example: "Will ETH trade above $5,000 before December 31, 2026?"'
                    value={form.statement}
                    onChange={event => setField('statement', event.target.value)}
                  />
                  {errors.statement && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--no-color)' }}>{errors.statement}</div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                      Amount (USDC)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      placeholder="50"
                      value={form.stakeUsdc}
                      onChange={event => setField('stakeUsdc', event.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                      Cutoff date
                    </label>
                    <input
                      type="date"
                      className="input"
                      min={new Date().toISOString().split('T')[0]}
                      value={form.cutoffDate}
                      onClick={openNativePicker}
                      onFocus={openNativePicker}
                      onChange={event => setField('cutoffDate', event.target.value)}
                    />
                    {errors.cutoffDate && (
                      <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--no-color)' }}>{errors.cutoffDate}</div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                      Cutoff time (UTC)
                    </label>
                    <input
                      type="time"
                      className="input"
                      value={form.cutoffTime}
                      onClick={openNativePicker}
                      onFocus={openNativePicker}
                      onChange={event => setField('cutoffTime', event.target.value)}
                    />
                    {errors.cutoffTime && (
                      <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--no-color)' }}>{errors.cutoffTime}</div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                    Supplementary sources
                  </label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder={'Optional. Add one source URL per line.'}
                    value={form.supplementalSources}
                    onChange={event => setField('supplementalSources', event.target.value)}
                  />
                </div>

                <button className="btn btn-gold btn-lg" onClick={handleGeneratePayload}>
                  Generate Payload
                </button>
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px' }}>
                <div style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '8px' }}>
                  Generated Output
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: '16px' }}>
                  Payload Preview
                </div>

                {payload ? (
                  <>
                    <pre style={{ margin: 0, padding: '16px', borderRadius: '14px', background: '#050505', border: '1px solid rgba(255,255,255,0.08)', color: '#D7E3F7', fontSize: '12px', lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(payload, null, 2)}
                    </pre>

                    <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
                      <button className="btn btn-outline" onClick={handleCopyPayload}>
                        {copied ? 'Payload Copied' : 'Copy Payload'}
                      </button>
                      <a
                        href={GENLAYER_STUDIO_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-gold"
                        style={{ justifyContent: 'center' }}
                      >
                        Demo On GenLayer Studio
                      </a>
                    </div>
                  </>
                ) : (
                  <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.10)', padding: '18px', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.7 }}>
                    Fill in the form, click Generate Payload, then copy the JSON into Studio.
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px' }}>
                <div style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '8px' }}>
                  Timing Preview
                </div>
                <div style={{ display: 'grid', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <div>
                    Cutoff:
                    <span style={{ color: 'var(--text)', marginLeft: '6px' }}>
                      {cutoffPreview ? formatUtcDateTime(cutoffPreview.toISOString()) : 'Waiting for a valid cutoff'}
                    </span>
                  </div>
                  <div>
                    Funding deadline:
                    <span style={{ color: 'var(--text)', marginLeft: '6px' }}>
                      {fundingDeadlinePreview ? formatUtcDateTime(fundingDeadlinePreview.toISOString()) : 'Waiting for a valid cutoff'}
                    </span>
                  </div>
                  <div>
                    Supplementary sources:
                    <span style={{ color: 'var(--text)', marginLeft: '6px' }}>{supplementalSources.length}</span>
                  </div>
                  <div>
                    Studio:
                    <span style={{ color: 'var(--text)', marginLeft: '6px' }}>{GENLAYER_STUDIO_URL}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
