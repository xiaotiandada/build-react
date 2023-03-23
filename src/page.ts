import { Props } from '../index.d'
import * as Didact from '../index'

/** @jsx Didact.createElement */
function Counter() {
  const [state, setState] = Didact.useState(1)
  return Didact.createElement(
    'div',
    null,
    Didact.createElement(
      'h1',
      {
        onClick: () => setState((c: number) => c + 1),
      },
      'Count: ',
      state
    ),
    Didact.createElement(
      'button',
      {
        onClick: () => console.log('click event'),
      },
      'event'
    )
  )
}

/** @jsx Didact.createElement */
function Counter1() {
  const [state, setState] = Didact.useState(1)
  const [state1, setState1] = Didact.useState(10)
  return Didact.createElement(
    'div',
    null,
    Didact.createElement(
      'h1',
      {
        onClick: () => setState((c: number) => c + 1),
      },
      'Count: ',
      state
    ),
    Didact.createElement(
      'h2',
      {
        onClick: () => setState1((c: number) => c + 1),
      },
      'Count: ',
      state1
    ),
    Didact.createElement(
      'button',
      {
        onClick: () => console.log('click event'),
      },
      'event'
    )
  )
}

const elementState = Didact.createElement(Counter, null)
const elementState1 = Didact.createElement(Counter1, null)

/** @jsx Didact.createElement */
function App(props: Props) {
  return Didact.createElement('h1', null, 'Hi ', props.name)
}

const elementApp = Didact.createElement(App, {
  name: 'foo',
})

/** @jsx Didact.createElement */
// 创建一个对象，type props
const element = Didact.createElement(
  'div',
  {
    id: 'foo',
    style: 'background: salmon',
  },
  Didact.createElement('h1', null, 'Hello World'),
  Didact.createElement(
    'h2',
    {
      style: 'text-align:right',
    },
    'from Didact'
  ),
  elementApp,
  elementState,
  elementState1
)

const container = document.getElementById('_root')
if (container) {
  Didact.render(element, container)
} else {
  console.warn('not root')
}
