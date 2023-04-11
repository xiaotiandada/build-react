import { Props } from '../index.d'
import * as Didact from '../index'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'


/** @jsx Didact.createElement */
function App() {
  const [count, setCount] = Didact.useState(0);
  return Didact.createElement("div", {
    className: "App"
  }, Didact.createElement("div", null, Didact.createElement("a", {
    href: "https://vitejs.dev",
    target: "_blank"
  }, Didact.createElement("img", {
    src: viteLogo,
    className: "logo",
    alt: "Vite logo"
  })), Didact.createElement("a", {
    href: "https://react.dev",
    target: "_blank"
  }, Didact.createElement("img", {
    src: reactLogo,
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

export const elementApp = Didact.createElement(App, {})
