import { Optional } from '@/utils/types'
import { TalkView } from '../../models/talkView'
import { getTimeStr } from '@/utils/time'
import { trim } from '@/utils/utils'

type Props = { view: Optional<TalkView>; isDk?: boolean }

export function Side({ view }: Props) {
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
