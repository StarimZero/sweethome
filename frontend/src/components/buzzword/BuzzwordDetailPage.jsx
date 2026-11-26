import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../../api'
import { useToast } from '../common/Toast'
import { useConfirm } from '../common/ConfirmDialog'
import { AudioClip, AudioRecorder } from './audio'
import { uploadAudio } from './buzzwordApi'
import BuzzwordForm from './BuzzwordForm'
import { STATUS_LABEL, STARTED_BY_LABEL, fmtMonth, fmtKB, emptyForm } from './constants'
import './Buzzword.scss'

function BuzzwordDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [word, setWord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [label, setLabel] = useState('')

  useEffect(() => {
    apiClient.get(`/buzzword/${id}`)
      .then(res => setWord(res.data))
      .catch(() => toast.error('유행어를 불러오지 못했어요.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const startEdit = () => { setForm({ ...emptyForm(), ...word }); setEditing(true) }

  const save = async (e) => {
    e.preventDefault()
    if (!form.phrase.trim()) return toast.error('유행어를 입력해 주세요.')
    setBusy(true)
    try {
      const res = await apiClient.put(`/buzzword/${id}`, form)
      setWord(res.data); setEditing(false); toast.success('고쳤어요.')
    } catch (err) {
      toast.error(err.response?.data?.detail || '저장하지 못했어요.')
    } finally { setBusy(false) }
  }

  const remove = async () => {
    const ok = await confirm({ title: '유행어 삭제', message: `'${word.phrase}'와 녹음을 모두 지울까요?`, danger: true })
    if (!ok) return
    setBusy(true)
    try { await apiClient.delete(`/buzzword/${id}`); toast.success('지웠어요.'); navigate('/buzzword') }
    catch { toast.error('지우지 못했어요.'); setBusy(false) }
  }

  const addAudio = async (blob, name) => {
    setUploading(true)
    try {
      const updated = await uploadAudio(id, blob, name, label)
      const added = updated.audios[updated.audios.length - 1]
      setWord(updated); setLabel('')
      toast.success(`녹음을 남겼어요. (${(blob.size / 1024).toFixed(0)}KB → ${fmtKB(added?.size_bytes)})`)
    } catch (err) {
      toast.error(err.response?.data?.detail || '녹음을 올리지 못했어요.')
    } finally { setUploading(false) }
  }

  const removeAudio = async (a) => {
    const ok = await confirm({ title: '녹음 삭제', message: `${a.label || '이 녹음'}을 지울까요?`, danger: true })
    if (!ok) return
    try { const res = await apiClient.delete(`/buzzword/${id}/audio/${a.audio_id}`); setWord(res.data) }
    catch { toast.error('지우지 못했어요.') }
  }

  if (loading) return <div className="bz-root"><div className="bz-loading"><div className="spinner" /></div></div>
  if (!word) return <div className="bz-root"><div className="bz-empty">유행어를 찾을 수 없어요.</div></div>

  if (editing) {
    return (
      <div className="bz-root bz-form-page">
        <h2>유행어 고치기</h2>
        <form onSubmit={save}>
          <BuzzwordForm form={form} setForm={setForm} />
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setEditing(false)} disabled={busy}>취소</button>
            <button type="submit" className="btn primary" disabled={busy}>{busy ? '저장하는 중...' : '저장'}</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="bz-root bz-detail">
      <button className="bz-back" onClick={() => navigate('/buzzword')}>‹ 유행어 목록</button>

      <div className="bz-detail-card">
        <div className="bz-item-top">
          <h2 className="bz-phrase big">{word.phrase}</h2>
          <span className={`bz-status ${word.status}`}>{STATUS_LABEL[word.status] || '요즘 씀'}</span>
        </div>
        <div className="bz-item-meta">
          <span>{fmtMonth(word.started_at)}{word.retired_at ? ` ~ ${fmtMonth(word.retired_at)}` : ''}</span>
          {word.started_by && <span>· {STARTED_BY_LABEL[word.started_by]}{word.started_by !== 'both' ? '가 시작' : ''}</span>}
        </div>
        {word.meaning && <p className="bz-meaning big">{word.meaning}</p>}
        {word.example && <p className="bz-example">“{word.example}”</p>}
        {word.origin_story && (<><div className="bz-label">어떻게 생겼나</div><p className="bz-story">{word.origin_story}</p></>)}
        {(word.comment_husband || word.comment_wife) && (
          <div className="bz-comments">
            {word.comment_husband && <div className="c husband"><b>호랭이</b>{word.comment_husband}</div>}
            {word.comment_wife && <div className="c wife"><b>보구치</b>{word.comment_wife}</div>}
          </div>
        )}
      </div>

      <div className="bz-detail-card">
        <div className="bz-label">녹음 {word.audios?.length || 0}개</div>
        {word.audios?.length === 0 && <p className="bz-hint">아직 녹음이 없어요. 어떻게 부르는지 남겨 주세요.</p>}
        {word.audios?.map(a => (
          <div key={a.audio_id} className="bz-audio-row">
            <AudioClip audioId={a.audio_id} label={a.label} duration={a.duration_sec} />
            <span className="bz-size">{fmtKB(a.size_bytes)}</span>
            <button className="bz-x" onClick={() => removeAudio(a)}>삭제</button>
          </div>
        ))}
        <div className="bz-add-audio">
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="녹음 이름 (예: 호랭이 버전)" maxLength={40} disabled={uploading} />
          <AudioRecorder onReady={addAudio} disabled={uploading} />
          {uploading && <p className="bz-hint">작게 바꿔서 올리는 중...</p>}
        </div>
      </div>

      <div className="form-actions">
        <button className="btn danger" onClick={remove} disabled={busy}>삭제</button>
        <button className="btn primary" onClick={startEdit} disabled={busy}>고치기</button>
      </div>
    </div>
  )
}

export default BuzzwordDetailPage
