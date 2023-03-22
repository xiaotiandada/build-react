import { Props } from './index.d'

// 事件侦听器，以“on”前缀开头
export const isEvent = (key: string) => key.startsWith('on')
export const isProperty = (key: string) => key !== 'children' && !isEvent(key)
export const isNew = (prev: Props, next: Props) => (key: string) =>
  prev[key] !== next[key]
export const isGone = (prev: Props, next: Props) => (key: string) =>
  !(key in next)
