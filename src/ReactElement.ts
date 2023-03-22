import { FunctionComponent, Props } from '../index.d'

// 使用 textNode 而不是设置 innerText 将允许我们稍后以相同的方式处理所有元素
// 还要注意我们如何设置 nodeValue 就像我们对 h1 标题所做的那样，它几乎就像字符串有 props: {nodeValue: "hello"} 一样。
// children 数组还可以包含原始值，如字符串或数字。所以我们将所有不是对象的东西都包装在它自己的元素中，并为它们创建一个特殊类型： TEXT_ELEMENT 。
// 当没有 children 时，React 不会包装原始值或创建空数组，但我们这样做是因为它会简化我们的代码，并且对于我们的库，我们更喜欢简单的代码而不是高性能的代码。
function createTextElement(text: string) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

// 我们对 props 使用扩展运算符，对 children 使用剩余参数语法，这样 children prop 将始终是一个数组。
export function createElement(
  type: string | FunctionComponent,
  config: Props | null,
  ...children: any[]
) {
  return {
    type,
    props: {
      ...config,
      children: children.map((child) =>
        typeof child === 'object' ? child : createTextElement(child)
      ),
    },
  }
}
