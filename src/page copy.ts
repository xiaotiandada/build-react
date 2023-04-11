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

// 创建一个对象，type props
/** @jsx Didact.createElement */
const element = Didact.createElement(
  'div',
  {
    className: 'w-full',
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

/** @jsx Didact.createElement */
function Home() {
  const [count, setCount] = Didact.useState(1);
  return Didact.createElement("div", {
    className: "App"
  }, Didact.createElement("div", null, Didact.createElement("a", {
    href: "https://vitejs.dev",
    target: "_blank"
  }, Didact.createElement("img", {
    src: '',
    className: "logo",
    alt: "Vite logo"
  })), Didact.createElement("a", {
    href: "https://react.dev",
    target: "_blank"
  }, Didact.createElement("img", {
    src: '',
    className: "logo react",
    alt: "React logo"
  }))), Didact.createElement("h1", null, "Vite + React"), Didact.createElement("div", {
    className: "card"
  }, Didact.createElement("button", {
    onClick: () => setCount((count: number) => count + 1)
  }, "count is ", count), Didact.createElement("p", null, "Edit ", Didact.createElement("code", null, "src/App.tsx"), " and save to test HMR")), Didact.createElement("p", {
    className: "read-the-docs"
  }, "Click on the Vite and React logos to learn more"));
}

const HomeApp = Didact.createElement(Home, {})

const container = document.getElementById('_root')
if (container) {
  Didact.render(HomeApp, container)
} else {
  console.warn('not root')
}
