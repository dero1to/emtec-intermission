import { Optional } from '@/utils/types'
import { TalkView } from '../models/talkView'
import { PageCtx } from '../models/pageContext'
import { useContext } from 'react'
import config from '@/config'
import { getTimeStr } from '@/utils/time'
import { trim } from '@/utils/utils'
import Image from 'next/image'

type Props = { view: Optional<TalkView>; isDk: boolean }

export default function Header({ view, isDk }: Props) {
  const { now } = useContext(PageCtx)
  const { eventAbbr, dkEventAbbr } = config
  if (!view) {
    return <></>
  }
  const talk = view.talksLeftInSameTrack()[0]
  if (!talk) {
    return <div>No talks left.</div>
  }
  const eventAbbrToShow = isDk ? dkEventAbbr : eventAbbr
  if (!eventAbbrToShow) {
    return <div>No eventAbbr configured.</div>
  }
  return (
    <div className="flex flex-row items-center h-[190px] text-[#333333] font-din-2014 font-bold">
      <div className="basis-1/3 flex items-center justify-start">
        <Image
          src="/phpcon_odawara/fv01.png"
          alt="logo"
          width={370}
          height={130}
        />
      </div>

      <div className="basis-1/3 flex items-center justify-center">
        <div className="px-5 py-2 bg-red-200 rounded-full text-5xl text-center">
          {now.format('HH:mm:ss')}
        </div>
      </div>

      <div className="basis-1/3 flex items-end justify-center">
        <div className="basis-1/2 flex items-end justify-center">
          <div className="text-base text-center opacity-75">部屋</div>
          <div className="text-4xl text-center">{view.selectedTrack.name}</div>
        </div>
        <div className="basis-1/2 flex items-end justify-start">
          <div className="text-2xl text-left">
            {view.selectedTrack.hashTag ? (
              <>
                #{eventAbbrToShow}
                <br />#{view.selectedTrack.hashTag}
              </>
            ) : (
              <>
                #{eventAbbrToShow}_{view.selectedTrack.name}
                <br />#{eventAbbrToShow}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
