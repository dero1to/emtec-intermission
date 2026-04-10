import { useState, useRef, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { Layout } from '@/components/Layout'

type FileInfo = { name: string; size: number; type: string } | null
type AudioMode = '1' | '2' | 'both' | 'mute'

function formatTime(sec: number) {
  if (!isFinite(sec) || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}

function formatFileSize(bytes: number) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return bytes + ' B'
}

function formatBitrate(bps: number) {
  if (bps >= 1000000) return (bps / 1000000).toFixed(2) + ' Mbps'
  if (bps >= 1000) return (bps / 1000).toFixed(2) + ' Kbps'
  return bps.toFixed(0) + ' bps'
}

export default function VideoCheck() {
  const video1Ref = useRef<HTMLVideoElement>(null)
  const video2Ref = useRef<HTMLVideoElement>(null)
  const waveform1Ref = useRef<HTMLCanvasElement>(null)
  const waveform2Ref = useRef<HTMLCanvasElement>(null)
  const timeRulerRef = useRef<HTMLCanvasElement>(null)
  const waveformScrollRef = useRef<HTMLDivElement>(null)
  const waveformInnerRef = useRef<HTMLDivElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioBuffersRef = useRef<{
    1: AudioBuffer | null
    2: AudioBuffer | null
  }>({ 1: null, 2: null })
  const fileDataRef = useRef<{ 1: FileInfo; 2: FileInfo }>({
    1: null,
    2: null,
  })
  const isSeekingRef = useRef(false)

  const [file1Info, setFile1Info] =
    useState<string>('ファイルを選択してください')
  const [file2Info, setFile2Info] =
    useState<string>('ファイルを選択してください')
  const [seekValue, setSeekValue] = useState(0)
  const [timeDisplay, setTimeDisplay] = useState('0:00 / 0:00')
  const [volume, setVolume] = useState(0.5)
  const [audioMode, setAudioMode] = useState<AudioMode>('1')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [maxDuration, setMaxDuration] = useState(0)
  const [progress1, setProgress1] = useState(0)
  const [progress2, setProgress2] = useState(0)
  const [playheadPct, setPlayheadPct] = useState(0)

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      audioCtxRef.current = new Ctx()
    }
    return audioCtxRef.current
  }

  const drawWaveform = useCallback(
    (audioBuffer: AudioBuffer, canvas: HTMLCanvasElement, videoNum: 1 | 2) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const rect = canvas.getBoundingClientRect()
      const width = Math.min(rect.width * 2, 8000)
      const height = rect.height * 2
      canvas.width = width
      canvas.height = height

      ctx.fillStyle = '#171717'
      ctx.fillRect(0, 0, width, height)

      const channels = audioBuffer.numberOfChannels
      const length = audioBuffer.length
      const mixedData = new Float32Array(length)
      for (let ch = 0; ch < channels; ch++) {
        const channelData = audioBuffer.getChannelData(ch)
        for (let i = 0; i < length; i++) {
          mixedData[i] += channelData[i] / channels
        }
      }

      const step = Math.ceil(length / width)
      const amp = height / 2

      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      if (videoNum === 1) {
        gradient.addColorStop(0, '#60a5fa')
        gradient.addColorStop(0.5, '#3b82f6')
        gradient.addColorStop(1, '#60a5fa')
      } else {
        gradient.addColorStop(0, '#f87171')
        gradient.addColorStop(0.5, '#ef4444')
        gradient.addColorStop(1, '#f87171')
      }
      ctx.fillStyle = gradient

      for (let i = 0; i < width; i++) {
        let min = 1.0
        let max = -1.0
        for (let j = 0; j < step; j++) {
          const idx = i * step + j
          if (idx < length) {
            const datum = mixedData[idx]
            if (datum < min) min = datum
            if (datum > max) max = datum
          }
        }
        const y1 = amp + min * amp
        const y2 = amp + max * amp
        ctx.fillRect(i, y1, 1, y2 - y1 || 1)
      }

      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '18px sans-serif'
      ctx.fillText(
        `${channels}ch / ${audioBuffer.sampleRate}Hz`,
        width - 200,
        24
      )
    },
    []
  )

  const drawTimeRuler = useCallback(() => {
    const canvas = timeRulerRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const v1 = video1Ref.current
    const v2 = video2Ref.current
    const duration = maxDuration || v1?.duration || v2?.duration || 60
    canvas.width = Math.min(canvas.offsetWidth * 2, 8000)
    canvas.height = canvas.offsetHeight * 2

    ctx.fillStyle = '#171717'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#525252'
    ctx.fillStyle = '#a3a3a3'
    ctx.font = '16px sans-serif'

    const pixelsPerSecond = canvas.width / duration
    let interval = 1
    if (pixelsPerSecond < 5) interval = 30
    else if (pixelsPerSecond < 10) interval = 10
    else if (pixelsPerSecond < 30) interval = 5

    for (let t = 0; t <= duration; t += interval) {
      const x = (t / duration) * canvas.width
      ctx.beginPath()
      ctx.moveTo(x, canvas.height - 10)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
      ctx.fillText(formatTime(t), x + 4, canvas.height - 14)
    }
  }, [maxDuration])

  const redrawAll = useCallback(() => {
    if (audioBuffersRef.current[1] && waveform1Ref.current) {
      drawWaveform(audioBuffersRef.current[1]!, waveform1Ref.current, 1)
    }
    if (audioBuffersRef.current[2] && waveform2Ref.current) {
      drawWaveform(audioBuffersRef.current[2]!, waveform2Ref.current, 2)
    }
    drawTimeRuler()
  }, [drawWaveform, drawTimeRuler])

  useEffect(() => {
    redrawAll()
  }, [zoomLevel, maxDuration, redrawAll])

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(redrawAll, 200)
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [redrawAll])

  const updateVideoInfo = useCallback(
    (video: HTMLVideoElement, fileInfo: FileInfo) => {
      if (!video.videoWidth) return '読み込み中...'
      const duration = video.duration
      const bitrate = fileInfo ? (fileInfo.size * 8) / duration : 0
      const lines: string[] = []
      lines.push(
        `<span class="mr-4"><span class="text-neutral-400">解像度:</span> <strong class="text-white">${video.videoWidth} × ${video.videoHeight}</strong></span>`
      )
      lines.push(
        `<span><span class="text-neutral-400">時間:</span> <strong class="text-white">${formatTime(
          duration
        )}</strong></span><br>`
      )
      lines.push(
        `<span><span class="text-neutral-400">ファイル名:</span> <strong class="text-white">${
          fileInfo ? fileInfo.name : '-'
        }</strong></span><br>`
      )
      lines.push(
        `<span class="mr-4"><span class="text-neutral-400">サイズ:</span> <strong class="text-white">${
          fileInfo ? formatFileSize(fileInfo.size) : '-'
        }</strong></span>`
      )
      lines.push(
        `<span class="mr-4"><span class="text-neutral-400">ビットレート:</span> <strong class="text-white">${
          bitrate ? formatBitrate(bitrate) : '-'
        }</strong></span>`
      )
      lines.push(
        `<span><span class="text-neutral-400">形式:</span> <strong class="text-white">${
          fileInfo ? fileInfo.type : '-'
        }</strong></span>`
      )
      return lines.join('')
    },
    []
  )

  const analyzeAudio = useCallback(
    async (file: File, canvas: HTMLCanvasElement, videoNum: 1 | 2) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.min(rect.width * 2, 8000)
      canvas.height = rect.height * 2
      ctx.fillStyle = '#171717'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#a3a3a3'
      ctx.font = '20px sans-serif'
      ctx.fillText('波形解析中...', 20, canvas.height / 2)

      try {
        const arrayBuffer = await file.arrayBuffer()
        const audioCtx = getAudioContext()
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        audioBuffersRef.current[videoNum] = audioBuffer
        drawWaveform(audioBuffer, canvas, videoNum)
        drawTimeRuler()
      } catch {
        ctx.fillStyle = '#171717'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#f87171'
        ctx.font = '18px sans-serif'
        ctx.fillText('音声トラックなし', 20, canvas.height / 2)
      }
    },
    [drawWaveform, drawTimeRuler]
  )

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, videoNum: 1 | 2) => {
      const file = e.target.files?.[0]
      if (!file) return
      const videoEl = videoNum === 1 ? video1Ref.current : video2Ref.current
      const canvas =
        videoNum === 1 ? waveform1Ref.current : waveform2Ref.current
      if (!videoEl || !canvas) return
      fileDataRef.current[videoNum] = {
        name: file.name,
        size: file.size,
        type: file.type,
      }
      videoEl.src = URL.createObjectURL(file)
      await analyzeAudio(file, canvas, videoNum)
    },
    [analyzeAudio]
  )

  const updateAudio = useCallback((mode: AudioMode, vol: number) => {
    const v1 = video1Ref.current
    const v2 = video2Ref.current
    if (!v1 || !v2) return
    if (mode === '1') {
      v1.volume = vol
      v2.volume = 0
    } else if (mode === '2') {
      v1.volume = 0
      v2.volume = vol
    } else if (mode === 'both') {
      v1.volume = vol
      v2.volume = vol
    } else {
      v1.volume = 0
      v2.volume = 0
    }
  }, [])

  useEffect(() => {
    updateAudio(audioMode, volume)
  }, [audioMode, volume, updateAudio])

  const autoScrollWaveform = useCallback(() => {
    const scroll = waveformScrollRef.current
    const inner = waveformInnerRef.current
    const v1 = video1Ref.current
    if (!scroll || !inner || !v1) return
    const duration = maxDuration || v1.duration || 1
    const pos = (v1.currentTime / duration) * inner.offsetWidth
    const scrollLeft = scroll.scrollLeft
    const scrollWidth = scroll.offsetWidth
    const threshold = scrollWidth * 0.8
    const leftThreshold = scrollWidth * 0.2
    if (pos > scrollLeft + threshold) {
      scroll.scrollLeft = pos - scrollWidth * 0.3
    } else if (pos < scrollLeft + leftThreshold && scrollLeft > 0) {
      scroll.scrollLeft = Math.max(0, pos - scrollWidth * 0.3)
    }
  }, [maxDuration])

  const onTimeUpdate1 = () => {
    const v1 = video1Ref.current
    if (!v1 || !v1.duration) return
    if (!isSeekingRef.current) {
      setSeekValue((v1.currentTime / v1.duration) * 100)
      setTimeDisplay(
        `${formatTime(v1.currentTime)} / ${formatTime(v1.duration)}`
      )
      const duration = maxDuration || v1.duration || 1
      setProgress1((v1.currentTime / duration) * 100)
      setPlayheadPct((v1.currentTime / duration) * 100)
      autoScrollWaveform()
    }
  }

  const onTimeUpdate2 = () => {
    const v1 = video1Ref.current
    const v2 = video2Ref.current
    if (!v2) return
    const duration = maxDuration || v1?.duration || v2.duration || 1
    setProgress2((v2.currentTime / duration) * 100)
  }

  const onLoadedMeta = (videoNum: 1 | 2) => {
    const v = videoNum === 1 ? video1Ref.current : video2Ref.current
    if (!v) return
    const info = updateVideoInfo(v, fileDataRef.current[videoNum])
    if (videoNum === 1) {
      setFile1Info(info)
      setTimeDisplay(`0:00 / ${formatTime(v.duration)}`)
    } else {
      setFile2Info(info)
    }
    setMaxDuration((prev) => Math.max(prev, v.duration || 0))
    updateAudio(audioMode, volume)
  }

  const play = () => {
    ;[video1Ref.current, video2Ref.current].forEach((v) => {
      if (v && v.src) v.play()
    })
  }
  const pause = () => {
    ;[video1Ref.current, video2Ref.current].forEach((v) => v?.pause())
  }
  const stop = () => {
    ;[video1Ref.current, video2Ref.current].forEach((v) => {
      if (!v) return
      v.pause()
      v.currentTime = 0
    })
  }
  const sync = () => {
    const v1 = video1Ref.current
    const v2 = video2Ref.current
    if (v1 && v2) v2.currentTime = v1.currentTime
  }

  const onSeek = (val: number) => {
    const v1 = video1Ref.current
    if (!v1 || !v1.duration) return
    const time = (val / 100) * v1.duration
    ;[video1Ref.current, video2Ref.current].forEach((v) => {
      if (v && v.src) v.currentTime = time
    })
    setSeekValue(val)
    setTimeDisplay(`${formatTime(time)} / ${formatTime(v1.duration)}`)
  }

  const onWaveformClick = (e: React.MouseEvent) => {
    const inner = waveformInnerRef.current
    if (!inner) return
    const rect = inner.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const v1 = video1Ref.current
    const v2 = video2Ref.current
    const duration = maxDuration || v1?.duration || v2?.duration || 0
    if (duration) {
      ;[v1, v2].forEach((v) => {
        if (v && v.src) v.currentTime = pos * duration
      })
    }
  }

  const onWheelZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.8 : 1.25
      setZoomLevel((z) => Math.min(Math.max(z * delta, 0.5), 5))
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        const v1 = video1Ref.current
        if (!v1) return
        if (v1.paused) play()
        else pause()
      } else if (e.code === 'ArrowLeft') {
        ;[video1Ref.current, video2Ref.current].forEach((v) => {
          if (v) v.currentTime = Math.max(0, v.currentTime - 5)
        })
      } else if (e.code === 'ArrowRight') {
        ;[video1Ref.current, video2Ref.current].forEach((v) => {
          if (v) v.currentTime += 5
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Layout>
      <Head>
        <title>動画比較プレイヤー | EMTEC Intermission</title>
      </Head>

      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-bold text-white mb-8">
          動画比較プレイヤー
        </h1>

        <div className="flex flex-wrap items-center gap-3 mb-6 bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <button
            onClick={play}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white transition-colors"
          >
            ▶ 再生
          </button>
          <button
            onClick={pause}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-md text-white transition-colors"
          >
            ⏸ 一時停止
          </button>
          <button
            onClick={stop}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-md text-white transition-colors"
          >
            ⏹ 停止
          </button>
          <button
            onClick={sync}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-md text-white transition-colors"
          >
            🔄 同期
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={seekValue}
              onMouseDown={() => (isSeekingRef.current = true)}
              onMouseUp={() => (isSeekingRef.current = false)}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="text-sm text-neutral-300 font-mono min-w-[110px] text-center">
              {timeDisplay}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-300">🔊</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-24 accent-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 text-sm text-neutral-300">
            {(['1', '2', 'both', 'mute'] as AudioMode[]).map((v) => (
              <label key={v} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="audio"
                  value={v}
                  checked={audioMode === v}
                  onChange={() => setAudioMode(v)}
                  className="accent-blue-500"
                />
                {v === '1'
                  ? '左音声'
                  : v === '2'
                    ? '右音声'
                    : v === 'both'
                      ? '両方'
                      : 'ミュート'}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {([1, 2] as const).map((n) => (
            <div key={n}>
              <label className="block text-center text-neutral-300 mb-2">
                動画 {n}
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleFileChange(e, n)}
                className="block w-full p-2 mb-2 bg-neutral-800 border-2 border-dashed border-neutral-700 hover:border-neutral-500 rounded-md text-neutral-300 cursor-pointer transition-colors"
              />
              <video
                ref={n === 1 ? video1Ref : video2Ref}
                className="w-full bg-black rounded-md"
                onLoadedMetadata={() => onLoadedMeta(n)}
                onTimeUpdate={n === 1 ? onTimeUpdate1 : onTimeUpdate2}
              />
              <div
                className="mt-2 p-3 bg-neutral-800/50 border border-neutral-700 rounded-md text-sm leading-relaxed text-white"
                dangerouslySetInnerHTML={{
                  __html: n === 1 ? file1Info : file2Info,
                }}
              />
            </div>
          ))}
        </div>

        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">音声波形比較</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(z / 1.5, 0.5))}
                className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded-md text-white text-sm"
              >
                −
              </button>
              <span className="text-sm text-neutral-300 min-w-[50px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(z * 1.5, 5))}
                className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded-md text-white text-sm"
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded-md text-white text-sm"
              >
                フィット
              </button>
            </div>
          </div>

          <div
            ref={waveformScrollRef}
            onWheel={onWheelZoom}
            className="overflow-x-auto overflow-y-hidden scroll-smooth"
          >
            <div
              ref={waveformInnerRef}
              className="relative min-w-full"
              style={{ width: `${100 * zoomLevel}%` }}
              onClick={onWaveformClick}
            >
              <div className="h-5 relative bg-neutral-900 rounded-t">
                <canvas ref={timeRulerRef} className="w-full h-full block" />
              </div>
              <div className="flex flex-col gap-1 mt-0.5">
                {([1, 2] as const).map((n) => (
                  <div key={n} className="relative h-20">
                    <div
                      className="absolute top-1 left-2 z-10 px-1.5 py-0.5 rounded text-xs text-white"
                      style={{
                        background:
                          n === 1
                            ? 'rgba(59, 130, 246, 0.4)'
                            : 'rgba(239, 68, 68, 0.4)',
                      }}
                    >
                      動画 {n}
                    </div>
                    <canvas
                      ref={n === 1 ? waveform1Ref : waveform2Ref}
                      className="w-full h-full block bg-neutral-900 rounded"
                    />
                    <div
                      className="absolute top-0 left-0 h-full bg-white/15 pointer-events-none rounded-l"
                      style={{
                        width: `${n === 1 ? progress1 : progress2}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div
                className="absolute top-0 w-0.5 h-full bg-white pointer-events-none z-10"
                style={{ left: `${playheadPct}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-neutral-500 mt-2">
            ヒント: Space で再生/一時停止、←/→
            で5秒スキップ、Ctrl+ホイールで波形をズーム
          </p>
        </div>
      </div>
    </Layout>
  )
}
