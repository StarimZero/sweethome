import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api'
import { useToast } from '../common/Toast'
import { AudioRecorder } from './audio'
import { uploadAudio } from './buzzwordApi'
import BuzzwordForm from './BuzzwordForm'
import { thisMonth, emptyForm } from './constants'
import './Buzzword.scss'

function BuzzwordInsertPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({ ...emptyForm(), started_at: thisMonth() })
  const [pending, setPending] = useState([])  // 저장할 때 같이 올릴 녹음 [{blob, name, label, url}]
  const [submitting, setSubmitting] = useState(false)

  const addPending = (blob, name) =>
    setPending(p => [...p, { blob, name, label: '', url: URL.createObjectURL(blob) }])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.phrase.trim()) return toast.error('유행어를 입력해 주세요.')
    setSubmitting(true)
    try {
      const res = await apiClient.post('/buzzword', form)
      const id = res.data._id || res.data.id
      let failed = 0
      for (const p of pending) {
        try { await uploadAudio(id, p.blob, p.name, p.label) } catch { failed += 1 }
      }
      if (failed) toast.error(`녹음 ${failed}개를 올리지 못했어요. 상세 화면에서 다시 올려 주세요.`)
      else toast.success('유행어를 남겼어요!')
      navigate(`/buzzword/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || '저장하지 못했어요.')
      setSubmitting(false)
    }
  }

  return (
    <div className="bz-root bz-form-page">
      <button className="bz-back" onClick={() => navigate('/buzzword')}>‹ 유행어 목록</button>
      <h2>유행어 추가</h2>
      <form onSubmit={submit}>
        <BuzzwordForm form={form} setForm={setForm} />

        <div className="form-section">
          <div className="section-title">소리로 남기기</div>
          <p className="bz-hint">부르는 소리를 녹음하거나 휴대폰 음성메모 파일을 올려요. 1분까지, 올릴 때 작게 바꿔서 저장해요.</p>
          {pending.map((p, i) => (
            <div key={p.url} className="bz-pending">
              <audio src={p.url} controls />
              <input value={p.label} placeholder="이름 (예: 보구치 버전)" maxLength={40}
                     onChange={e => setPending(list => list.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
              <button type="button" className="bz-x" onClick={() => setPending(list => list.filter((_, j) => j !== i))}>삭제</button>
            </div>
          ))}
          <AudioRecorder onReady={addPending} disabled={submitting} />
        </div>

        <div className="form-actions">
          <button type="button" className="btn" onClick={() => navigate('/buzzword')} disabled={submitting}>취소</button>
          <button type="submit" className="btn primary" disabled={submitting}>{submitting ? '저장하는 중...' : '저장'}</button>
        </div>
      </form>
    </div>
  )
}

export default BuzzwordInsertPage
