import { Optional } from '@/utils/types'
import { TalkView } from '../../models/talkView'
import { useContext, useEffect } from 'react'
import { PageCtx } from '../../models/pageContext'
import config from '@/config'
import PageHeader from '../PageHeader'
import { Main } from './main'
import { Side } from './side'

type PageProps = { view: Optional<TalkView>; isDk: boolean }

export default function Page({ view, isDk }: PageProps) {
  const { goNextPage } = useContext(PageCtx)

  useEffect(() => {
    const cancel = setTimeout(() => {
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
        <div className="h-[80px] flex items-center justify-center text-2.5xl font-bold text-[#333333] mt-5">
          <p>落とし物、忘れ物はスタッフにお声がけください！</p>
        </div>
      </div>
    </div>
  )
}
