import { Optional } from '@/utils/types'
import { TalkView } from '../../models/talkView'
import { trim } from '@/utils/utils'
import Image from 'next/image'

type Props = { view: Optional<TalkView>; isDk?: boolean }

export function Side({ view }: Props) {
  if (!view) {
    return <></>
  }
  // 裏番組（同じ時間帯の他トラックのトーク）を表示
  const nextSlot = view.talksInNextSlot()
  const myTrackName = view.selectedTrack.name
  const talks = Object.entries(nextSlot)
    .filter(([trackName]) => trackName !== myTrackName)
    .map(([trackName, talk]) => ({ trackName, talk }))
    .slice(0, 2)
  const emptySlots = 2 - talks.length

  return (
    <div className="ps-[30px] pt-[115px] flex flex-col items-center">
      {talks.map(({ trackName, talk }) => {
        const speakers = view.speakersOf(talk.id)
        return (
          <div
            key={talk.id}
            className="w-[580px] h-[284px] backdrop-blur-xl bg-white px-6 pt-6 pb-3 my-3 rounded-xl shadow-lg flex flex-col"
          >
            <div className="flex items-center justify-between">
              <span className="inline-block px-5 py-2 bg-[#FFEDF2] text-[#333333] text-base font-bold rounded-full">
                {trackName}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[#333333] text-base font-bold">
                  {talk.speakers[0]?.name}
                </span>
                <Image
                  className="rounded-full shrink-0"
                  src={speakers[0]?.avatarUrl || '/phpcon_odawara/naruto.png'}
                  alt={speakers[0]?.name || 'speaker'}
                  width={50}
                  height={50}
                />
              </div>
            </div>
            <div className="flex-1 text-center text-[#333333] text-lg px-2 font-bold flex items-center justify-center">
              {trim(talk.title, 80)}
            </div>
          </div>
        )
      })}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div
          key={`naruto-${i}`}
          className="w-[580px] h-[284px] flex items-center justify-center my-3"
        >
          <Image
            src="/phpcon_odawara/naruto.png"
            alt="logo"
            width={140}
            height={140}
          />
        </div>
      ))}
    </div>
  )
}
