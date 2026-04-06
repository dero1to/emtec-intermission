import { Optional } from '@/utils/types'
import { TalkView } from '../../models/talkView'
import { getTimeStr } from '@/utils/time'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type Props = { view: Optional<TalkView>; isDk?: boolean }

export function Main({ view, isDk: _isDk }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [isWrapped, setIsWrapped] = useState(false)

  const talk = view?.talksLeftInSameTrack()[0]
  const speakers = talk ? view?.speakersOf(talk.id) : []

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    // 画像75px + gap16px = 91px。高さがそれを超えたら回り込みが発生
    setIsWrapped(el.scrollHeight > 91)
  }, [talk, speakers])

  if (!view || !talk) {
    return <></>
  }
  const titleLen = talk.title.length
  const titleSize = (() => {
    switch (true) {
      case titleLen <= 10:
        return 'text-4xl'
      case titleLen <= 20:
        return 'text-3.5xl'
      case titleLen <= 30:
        return 'text-3xl'
      case titleLen <= 50:
        return 'text-2.5xl'
      default:
        return 'text-2xl'
    }
  })()

  return (
    <div className="text-[#333333] mt-[50px] ms-6">
      <div>
        <div className="text-left font-bold font-sen tracking-wide text-2.5xl">
          <span className="text-3.5xl">NEXT SESSION</span>　
          {getTimeStr(talk.startTime)} - {getTimeStr(talk.endTime)}
        </div>
      </div>
      <div className="mt-[30px] w-[1040px] h-[590px] flex items-center justify-center border-4 border-gray-300 bg-[#FFEDF2] rounded-2xl shadow-lg">
        <div className="w-[920px] h-[470px] rounded-3xl bg-white flex items-center justify-center">
          <div className="basis-1/4 ps-12">
            <Image
              src="/phpcon_odawara/naruto.png"
              alt="naruto"
              width={180}
              height={180}
            />
          </div>
          <div className="basis-3/4 h-[470px] flex flex-col items-start justify-center">
            <div
              className={`basis-3/5 flex items-center justify-start ${titleSize} font-bold text-[#333333] break-words w-full ps-11 pe-2 pt-[10%]`}
            >
              <p className="whitespace-pre-line">{talk.title}</p>
            </div>
            <div className="basis-2/5 flex items-start justify-start w-full ps-11 pe-2 pt-7">
              <div
                ref={wrapRef}
                className="flex flex-wrap items-center gap-x-4"
              >
                <Image
                  className="rounded-full shrink-0"
                  src={speakers[0]?.avatarUrl || '/phpcon_odawara/naruto.png'}
                  alt={speakers[0]?.name || 'default avatar'}
                  width={75}
                  height={75}
                />
                <div className="text-[#333333] text-xl font-bold">
                  {talk.speakers[0]?.name}
                </div>
                {speakers[0]?.twitter && (
                  <div
                    className={`text-[#5C5C5C] text-xl font-bold ${isWrapped ? 'w-full ps-[94px]' : ''}`}
                  >
                    @{speakers[0].twitter}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
