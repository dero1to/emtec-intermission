import { Optional } from '@/utils/types'
import { TalkView } from '../../models/talkView'
import { useContext, useEffect, useState } from 'react'
import { PageCtx } from '../../models/pageContext'
import config from '@/config'
import PageHeader from '../PageHeader'
import Image from 'next/image'

type PageProps = { view: Optional<TalkView>; isDk: boolean }

const alias: string = 'phpcon_odawara'

const images: string[] = [
  'info_002.jpg',
  'info_003.jpg',
  'info_004.jpg',
  'info_005.jpg',
  'info_006.jpg',
  'info_007.jpg',
]

export default function Page({ view, isDk }: PageProps) {
  const { goNextPage } = useContext(PageCtx)
  const { count } = useCounter(images.length)

  useEffect(() => {
    if (count >= images.length) {
      goNextPage()
    }
  }, [count, goNextPage])

  return (
    <div className="m-auto w-[90%]">
      <PageHeader view={view} isDk={isDk} />
      <Image
        src={`/${alias}/${images[count]}`}
        alt={'information'}
        width={1582}
        height={890}
        className="m-auto"
      />
    </div>
  )
}

const useCounter = (total: number) => {
  const [count, setCount] = useState<number>(0)
  useEffect(() => {
    const timer = setInterval(
      () => {
        setCount((c) => c + 1)
      },
      (config.transTimePage3 * 1000) / total
    )
    return () => clearInterval(timer)
  }, [total])
  return { count }
}
