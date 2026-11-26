import apiClient from '../../api'

// 녹음 올리기 (서버에서 변환). 성공하면 바뀐 유행어를 돌려줌
export async function uploadAudio(buzzwordId, blob, filename, label) {
  const form = new FormData()
  form.append('file', blob, filename)
  form.append('label', label || '')
  const res = await apiClient.post(`/buzzword/${buzzwordId}/audio`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}
