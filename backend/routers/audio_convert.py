"""녹음 파일을 작게 바꾸기 (유행어 메뉴).

어떤 형식이 와도(휴대폰 음성메모 m4a, 크롬 녹음 webm, mp3, wav 등) 모노 AAC(.m4a)로 바꿔서 저장한다.
AAC 를 고른 이유: 아이폰 사파리·안드로이드·PC 브라우저 어디서나 재생됨 (webm/opus 는 아이폰에서 안 될 수 있음).
말소리·흥얼거림이 목적이라 32kbps 모노면 충분 → 1분에 약 240KB.
PyAV(av) 휠에 ffmpeg 가 들어 있어서 서버에 ffmpeg 를 따로 깔 필요가 없다.
"""
import io

import av

TARGET_RATE = 24000      # Hz. 말소리엔 충분, 용량 절약
TARGET_BITRATE = 32000   # bps
MAX_SECONDS = 60         # 이보다 길면 잘라서 저장


class AudioError(Exception):
    pass


def convert_to_small_m4a(raw: bytes, max_seconds: int = MAX_SECONDS) -> dict:
    """원본 바이트 → {"data": m4a 바이트, "duration_sec", "original_bytes", "size_bytes", "truncated"}"""
    try:
        src = av.open(io.BytesIO(raw), mode="r")
    except Exception as e:
        raise AudioError(f"녹음 파일을 읽을 수 없어요: {e}")
    if not src.streams.audio:
        raise AudioError("소리가 들어 있지 않은 파일이에요.")
    in_stream = src.streams.audio[0]

    out_buf = io.BytesIO()
    dst = av.open(out_buf, mode="w", format="mp4")
    out_stream = dst.add_stream("aac", rate=TARGET_RATE, layout="mono")
    out_stream.bit_rate = TARGET_BITRATE
    resampler = av.AudioResampler(format="fltp", layout="mono", rate=TARGET_RATE)

    written_samples = 0
    limit_samples = max_seconds * TARGET_RATE
    truncated = False
    try:
        for frame in src.decode(in_stream):
            frame.pts = None
            for rf in resampler.resample(frame):
                if written_samples >= limit_samples:
                    truncated = True
                    break
                written_samples += rf.samples
                for packet in out_stream.encode(rf):
                    dst.mux(packet)
            if truncated:
                break
        for rf in resampler.resample(None):  # 남은 것 비우기
            if written_samples < limit_samples:
                written_samples += rf.samples
                for packet in out_stream.encode(rf):
                    dst.mux(packet)
        for packet in out_stream.encode(None):
            dst.mux(packet)
    except Exception as e:
        raise AudioError(f"녹음 파일을 바꾸다가 문제가 생겼어요: {e}")
    finally:
        dst.close()
        src.close()

    if written_samples == 0:
        raise AudioError("소리가 들어 있지 않은 파일이에요.")
    data = out_buf.getvalue()
    return {
        "data": data,
        "mime_type": "audio/mp4",
        "duration_sec": round(min(written_samples, limit_samples) / TARGET_RATE, 1),
        "original_bytes": len(raw),
        "size_bytes": len(data),
        "truncated": truncated,
    }
