import { Optional } from '@/utils/types'
import { TalkView } from '../../models/talkView'
import { useContext } from 'react'
import { PageCtx } from '../../models/pageContext'
import VideoPlaylist, { Playlist } from '../../media/VideoPlaylist'

type Props = { view: Optional<TalkView>; onEnded?: () => void }

// CM スポンサーがいない時には 各 source をコメントアウトする

const playlist: Playlist = [
  {
    sources: [
      {
        src: 'https://intermission.dero1to.live/output_compressed.mp4',
        type: 'video/mp4',
      },
    ],
  },
  // {
  //   sources: [
  //     {
  //       src: 'https://web-intermission.s3.isk01.sakurastorage.jp/cndw2024/cm5.mp4',
  //       type: 'video/mp4',
  //     },
  //   ],
  // },
]

export default function Page({ onEnded }: Props) {
  const { goNextPage } = useContext(PageCtx)

  const handleEnded = () => {
    if (onEnded) {
      onEnded()
    } else {
      goNextPage()
    }
  }

  return (
    <div className="w-full h-full">
      <VideoPlaylist onEnded={handleEnded} playlist={playlist}></VideoPlaylist>
    </div>
  )
}
