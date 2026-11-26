import { useEffect, useRef, useState } from 'react'
import apiClient from '../../api'

export const MAX_SECONDS = 60

const fmtSec = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// 녹음 재생: 토큰이 필요해서 <audio src> 로 바로 못 부르고, 받아서 blob 주소로 재생
const blobCache = new Map()

export function AudioClip({ audioId, label, duration }) {
  const [url, setUrl] = useState(blobCache.get(audioId) || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const audioRef = useRef(null)
  const playAfterLoad = useRef(false)  // ▶ 를 눌러서 받은 경우에만 바로 재생 (다른 화면에서 받아 둔 건 자동 재생 안 함)

  const load = async () => {
    if (url) { audioRef.current?.play(); return }
    playAfterLoad.current = true
    setLoading(true)
    try {
      const res = await apiClient.get(`/buzzword/audio/${audioId}`, { responseType: 'blob' })
      const u = URL.createObjectURL(res.data)
      blobCache.set(audioId, u)
      setUrl(u)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (url && audioRef.current && playAfterLoad.current) {
      playAfterLoad.current = false
      audioRef.current.play().catch(() => {})
    }
  }, [url])

  return (
    <div className="bz-clip">
      {url ? (
        <audio ref={audioRef} src={url} controls preload="auto" />
      ) : (
        <button type="button" className="bz-play" onClick={load} disabled={loading}>
          {loading ? '불러오는 중…' : error ? '다시 시도' : '▶ 듣기'}
        </button>
      )}
      <span className="bz-clip-meta">{label || '녹음'}{duration ? ` · ${fmtSec(duration)}` : ''}</span>
    </div>
  )
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']
  return types.find(t => MediaRecorder.isTypeSupported?.(t)) || ''
}

// 녹음하거나 파일을 골라서 onReady(blob, filename) 로 넘김. 서버가 작은 m4a 로 바꿔서 저장함
export function AudioRecorder({ onReady, disabled }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const recRef = useRef(null)
  const timerRef = useRef(null)
  const fileRef = useRef(null)
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && pickMimeType() !== null

  const stop = () => {
    clearInterval(timerRef.current)
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    setRecording(false)
  }

  const start = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType()
      const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64000 })
      const chunks = []
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const type = rec.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunks, { type })
        if (blob.size) onReady(blob, `녹음.${type.includes('mp4') ? 'm4a' : 'webm'}`)
      }
      recRef.current = rec
      rec.start()
      setSeconds(0)
      setRecording(true)
      const startedAt = Date.now()
      timerRef.current = setInterval(() => {
        const s = (Date.now() - startedAt) / 1000
        setSeconds(s)
        if (s >= MAX_SECONDS) stop()
      }, 250)
    } catch {
      setError('마이크를 쓸 수 없어요. 브라우저에서 마이크 권한을 허용해 주세요.')
    }
  }

  useEffect(() => () => { clearInterval(timerRef.current); if (recRef.current?.state === 'recording') recRef.current.stop() }, [])

  const onFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) onReady(f, f.name)
  }

  return (
    <div className="bz-recorder">
      {canRecord && (recording ? (
        <button type="button" className="bz-rec on" onClick={stop}>
          <span className="dot" /> 녹음 중 {fmtSec(seconds)} / {fmtSec(MAX_SECONDS)} · 멈추기
        </button>
      ) : (
        <button type="button" className="bz-rec" onClick={start} disabled={disabled}>🎙 녹음하기</button>
      ))}
      <button type="button" className="bz-file" onClick={() => fileRef.current?.click()} disabled={disabled || recording}>
        📁 파일 올리기
      </button>
      <input ref={fileRef} type="file" accept="audio/*,video/mp4,.m4a,.mp3,.wav,.aac,.webm,.ogg" hidden onChange={onFile} />
      {error && <p className="bz-error">{error}</p>}
    </div>
  )
}
