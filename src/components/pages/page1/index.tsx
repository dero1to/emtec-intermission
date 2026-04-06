import { Optional } from '@/utils/types'
import { TalkView } from '../../models/talkView'
import { useContext, useEffect, useRef } from 'react'
import { PageCtx } from '../../models/pageContext'
import config from '@/config'
import { getTimeStr } from '@/utils/time'
import { trim } from '@/utils/utils'
import PageHeader from '../PageHeader'
import { pushPageMeasurement, pushPageEvent } from '@/lib/faro'
import Image from 'next/image'

type PageProps = { view: Optional<TalkView>; isDk: boolean }
type Props = { view: Optional<TalkView>; isDk?: boolean }

export default function Page({ view, isDk }: PageProps) {
  const { goNextPage } = useContext(PageCtx)
  const renderStartTime = useRef(performance.now())

  useEffect(() => {
    const duration = performance.now() - renderStartTime.current
    pushPageMeasurement('Page1', duration)
    pushPageEvent('Page1', 'page_displayed')

    const cancel = setTimeout(() => {
      pushPageEvent('Page1', 'page_exit')
      goNextPage()
    }, config.transTimePage1 * 1000)
    return () => clearTimeout(cancel)
  }, [goNextPage])

  return (
    <div className="m-auto w-[90%]">
      <PageHeader view={view} isDk={isDk} />
      <div className="h-full">
        <div className="flex flex-row h-full">
          <div className="basis-3/5">
            <Main view={view} isDk={isDk} />
          </div>
          <div className="basis-2/5">
            <Side view={view} />
          </div>
        </div>
        <div className="h-[80px] flex items-center justify-center text-xl font-bold text-[#333333] mt-5">
          <p>
            何か注意があったら入れるなど？落とし物、忘れ物はピンクの腕章を付けたスタッフにお声がけください！
          </p>
        </div>
      </div>
    </div>
  )
}

function Main({ view, isDk: _isDk }: Props) {
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
                  @phpcon_odawara
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Side({ view }: Props) {
  if (!view) {
    return <></>
  }
  // 現在のトークより前のものは表示しない
  const talkStartTime = view.talksLeftInSameTrack()[0]?.startTime
  if (!talkStartTime) {
    return <></>
  }
  // 午前セッションは、keynoteとして1枠で表示する。
  const _hasKeynote =
    view
      .talksInSameTrack()
      .filter(
        (t) => t.talkCategory === 'Keynote' && t.startTime > talkStartTime
      ).length > 0
  const talks = view
    .talksInSameTrack()
    .filter((t) => t.talkCategory !== 'Keynote' && t.startTime > talkStartTime)
    .slice(0, 4)
  return (
    <div className="ps-[30px] pt-[115px] flex flex-col items-center">
      {talks.map((talk) => (
        <div
          key={talk.id}
          className="text-right w-[580px] h-[130px] backdrop-blur-xl bg-white px-4 pt-3 pb-2 my-3 rounded-xl shadow-lg"
        >
          <div className="flex flex-row">
            <div className="text-left basis-1/2 text-[#333333] text-sm font-bold">
              {getTimeStr(talk.startTime)} - {getTimeStr(talk.endTime)}
            </div>
            <div className="basis-1/2 text-[#333333] text-sm">
              {/* {talk.speakers.map((t) => t.name).join(', ')} */}
              {talk.speakers[0]?.name}
            </div>
          </div>
          <div className="text-center text-[#333333] text-base min-h-[70px] py-2 font-bold">
            {trim(talk.title, 45)}
          </div>
        </div>
      ))}
    </div>
  )
}
