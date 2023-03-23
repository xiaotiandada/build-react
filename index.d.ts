export type Props = {
  [key: string]: any
}

export type FunctionComponent = (props: Props) => any

export type Fiber = {
  type?: string | FunctionComponent
  props: Props
  dom?: HTMLElement | Text | null
  parent?: Fiber
  child?: Fiber | null
  sibling?: Fiber | null
  alternate?: Fiber | null
  effectTag?: string
  hooks?: any[]
}
