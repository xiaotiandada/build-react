export type Props = {
  [key: string]: any
}

export type FunctionComponent = (props: Props) => any

export type Fiber = {
  type: string | FunctionComponent
  props: Props
  dom?: HTMLElement
  parent?: Fiber
  child?: Fiber
  sibling?: Fiber
  alternate?: Fiber
  effectTag?: string
  hooks?: any[]
}
