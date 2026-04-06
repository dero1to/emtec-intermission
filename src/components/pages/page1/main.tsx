import { Optional } from '@/utils/types'
import { TalkView } from '../../models/talkView'
import { getTimeStr } from '@/utils/time'
import Image from 'next/image'

type Props = { view: Optional<TalkView>; isDk?: boolean }

export function Main({ view, isDk: _isDk }: Props) {
  if (!view) {
    return <></>
  }
  const talk = view.talksLeftInSameTrack()[0]
  if (!talk) {
    return <></>
  }
  const speakers = view.speakersOf(talk.id)

  return (
    <div className="text-[#333333] mt-[50px] ms-6">
      <div>
        <div className="text-left font-bold font-din-2014 tracking-wide text-2xl">
          NEXT SESSION {getTimeStr(talk.startTime)} - {getTimeStr(talk.endTime)}
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
          <div className="basis-3/4 h-[470px] px-11 flex flex-col items-start justify-center">
            <div className="basis-3/5 flex items-end justify-start text-2xl font-bold text-[#333333] break-words">
              <p className="mb-7">{talk.title}</p>
            </div>
            <div className="basis-2/5 flex items-start justify-start">
              <div className="mt-7 flex items-center justify-start gap-4">
                <Image
                  className="rounded-full"
                  src={speakers[0]?.avatarUrl || '/phpcon_odawara/naruto.png'}
                  alt={speakers[0]?.name || 'default avatar'}
                  width={75}
                  height={75}
                />
                <div className="text-[#333333] text-xl font-bold">
                  {talk.speakers[0]?.name}
                </div>
                <div className="text-[#333333] text-lg font-bold">
                  {speakers[0]?.twitter && `@${speakers[0].twitter}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
