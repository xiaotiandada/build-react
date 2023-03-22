import { Fiber, FunctionComponent, Props } from './index.d'

// 我们对 props 使用扩展运算符，对 children 使用剩余参数语法，这样 children prop 将始终是一个数组。
function createElement(
  type: string | FunctionComponent,
  props: Props,
  ...children: any[]
) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === 'object' ? child : createTextElement(child)
      ),
    },
  }
}

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

function createDom(fiber: Fiber) {
  // 处理文本元素，如果元素类型是 TEXT_ELEMENT ，我们创建一个文本节点而不是常规节点。
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type as string)

  // 将元素 props 分配给节点。
  updateDom(dom, {}, fiber.props)

  return dom
}

// 事件侦听器，以“on”前缀开头
const isEvent = (key: string) => key.startsWith('on')
const isProperty = (key: string) => key !== 'children' && !isEvent(key)
const isNew = (prev: Props, next: Props) => (key: string) =>
  prev[key] !== next[key]
const isGone = (prev: Props, next: Props) => (key: string) => !(key in next)

// 我们将旧 fiber 的 props 与新 fiber 的 props 进行比较，移除消失的 props，并设置新的或更改的 props。
function updateDom(dom: HTMLElement, prevProps: Props, nextProps: Props) {
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)

      dom.removeEventListener(eventType, prevProps[name])
    })

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = ''
    })

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name]
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    // .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)

      dom.addEventListener(eventType, nextProps[name])
    })
}

function commitRoot() {
  // 当我们将更改提交到 DOM 时，我们还使用该数组中的 fiber。
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  // 在完成提交后保存对“我们提交给 DOM 的最后一个 fiber tree ”的引用。我们称它为 currentRoot 。
  currentRoot = wipRoot
  wipRoot = null
}

// 找 child 然后找 sibling，最后找到 parent
// 递归地将所有节点附加到 dom。
function commitWork(fiber: Fiber) {
  console.log('commitWork', fiber)
  if (!fiber) {
    return
  }

  // 要找到 DOM 节点的父节点，我们需要沿着fiber tree 向上移动，直到找到带有 DOM 节点的 fiber。
  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom
  // 如果 fiber 有一个 PLACEMENT effect 标签，我们和以前一样，将 DOM 节点附加到父 fiber 的节点。
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    // 如果它是一个 UPDATE ，我们需要用改变的属性更新现有的 DOM 节点。
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent)
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitDeletion(fiber: Fiber, domParent: HTMLElement) {
  if (fiber.dom) {
    // 如果是 DELETION ，我们做相反的事情，删除孩子。
    domParent.removeChild(fiber.dom)
  } else {
    // 在删除节点时，我们还需要继续前进，直到找到具有 DOM 节点的子节点。
    commitDeletion(fiber.child, domParent)
  }
}

// Render 渲染
// 将 nextUnitOfWork 设置为 root fiber
function render(element: any, container: HTMLElement) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    // 将 alternate 属性添加到每个 fiber 。此属性是指向 old fiber 的链接，old fiber 是我们在前一个提交阶段提交给 DOM 的 fiber。
    alternate: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

// 下一个工作单元
let nextUnitOfWork: Fiber | null = null
// 当前 Root
let currentRoot: Fiber | null = null
// 将跟踪 fiber tree。我们称它为正在进行的工作 root 或 wipRoot 。
let wipRoot: Fiber | null = null
// 但是当我们将纤程树提交给 DOM 时，我们是从正在进行的工作根目录中执行的，它没有 old fiber。
// 所以我们需要一个数组来跟踪我们要删除的节点。
let deletions: Fiber[] | null = null

// 所以我们要把工作分解成小的单元，当我们完成每个单元后，如果还有其他需要做的事情，我们会让浏览器中断渲染。
function workLoop(deadline: any) {
  // console.log('workLoop', deadline.timeRemaining());
  let shouldYield = false

  // 截至 2019 年 11 月，并发模式在 React 中还不稳定。循环的稳定版本看起来更像这样：
  while (nextUnitOfWork && !shouldYield) {
    // 设置第一个工作单元
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)

    // 检查在浏览器需要再次控制之前我们有多少时间。
    shouldYield = deadline.timeRemaining() < 1
  }

  // 一旦我们完成所有工作（我们知道它是因为没有下一个工作单元），我们将整个 fiber 树提交给 DOM。
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

// 我们使用 requestIdleCallback 进行循环
// React doesn’t use requestIdleCallback anymore. 现在它使用调度程序包。但对于这个用例，它在概念上是相同的。
// https://github.com/facebook/react/tree/main/packages/scheduler
// 当浏览器准备就绪时，它将调用我们的 workLoop ，我们将开始处理根目录。
requestIdleCallback(workLoop)

// 执行工作而且返回下一个工作单元。
function performUnitOfWork(fiber: Fiber): Fiber | null {
  // 我们检查 fiber 类型是否是一个函数，并根据它转到不同的更新函数。
  const isFunctionComponent = fiber.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  // 搜索下一个工作单元。我们先尝试孩子
  if (fiber.child) {
    return fiber.child
  }

  // 然后是兄弟姐妹，然后是叔叔，依此类推。
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }

  return null
}

let wipFiber: Fiber | null = null
let hookIndex: number | null = null

function updateFunctionComponent(fiber: Fiber) {
  // 设置正在进行的工作 fiber。
  wipFiber = fiber
  // 我们会跟踪当前的 hook index
  hookIndex = 0
  // 在 fiber 添加了一个 hooks 数组，以支持在同一个组件中多次调用 useState 。
  wipFiber.hooks = []
  // get the children.
  // fiber.type 是函数，当我们运行它时，它返回 element
  const children = [fiber.type(fiber.props)]
  // 以同样的方式调用 reconcileChildren
  reconcileChildren(fiber, children)
}

function useState(initial: any): [any, (action: any) => void] {
  // 当函数组件调用 useState 时，我们检查是否有 old hook。我们使用 hook index 检查 fiber 的 alternate 。
  const oldHook = wipFiber?.alternate?.hooks?.[hookIndex!]

  // 如果我们有一个 old hook，我们将状态从 old hook 复制到 new hook，如果我们没有，我们初始化状态。
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  }

  // 我们在下次渲染组件时这样做，我们从 old hook 队列中获取所有动作
  const actions = oldHook ? oldHook.queue : []
  // 然后将它们一个一个地应用到 new hook 状态，所以当我们返回状态时它被更新了。
  actions.forEach((action) => {
    hook.state = action(hook.state)
  })

  const setState = (action: any) => {
    // 我们将该操作推送到我们添加到 hook 的队列中。
    hook.queue.push(action)
    // 然后我们做一些类似于我们在 render 函数中所做的事情，设置一个新的正在进行的工作根作为下一个工作单元，这样工作循环就可以开始一个新的渲染阶段。
    wipRoot = {
      dom: currentRoot!.dom,
      props: currentRoot!.props,
      alternate: currentRoot,
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }

  // 然后我们将 new hook 添加到 fiber 中，将 hook index 加一，
  wipFiber!.hooks.push(hook)
  hookIndex!++
  // 然后返回状态。useState 还应该返回一个函数来更新状态，因此我们定义了一个接收动作的 setState 函数
  return [hook.state, setState]
}

function updateHostComponent(fiber: Fiber) {
  // 建一个新节点并将其附加到 DOM。
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

// 创建 new fiber
function reconcileChildren(wipFiber: Fiber, elements: any[]) {
  let index = 0
  // old fiber
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling: Fiber | null = null

  // 同时遍历 old fiber ( wipFiber.alternate ) 的子节点和我们想要协调的元素数组。
  // 如果我们忽略同时遍历一个数组和一个链表所需的所有样板，那么我们只剩下 while 中最重要的内容： oldFiber 和 element 。
  // element 是我们要渲染到 DOM 的东西， oldFiber 是我们上次渲染的东西。
  // 为每个孩子创建一个 new fiber。
  // 我们在 fiber.dom 属性中跟踪 DOM 节点。
  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    let newFiber: Fiber | null = null

    const sameType = oldFiber && element && element.type == oldFiber.type

    // 如果旧的 fiber 和新的元素有相同的类型，我们可以保留 DOM 节点并用新的 props 更新它
    if (sameType) {
      // 当旧的 fiber 和元素具有相同的类型时，我们创建一个新的 fiber，保留旧 fiber 的 DOM 节点和元素的 props
      // 我们还向纤程添加了一个新属性： effectTag 。
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      }
    }
    // 如果类型不同并且有一个新元素，则意味着我们需要创建一个新的 DOM 节点
    if (element && !sameType) {
      // 然后，对于元素需要新 DOM 节点的情况，我们使用 PLACEMENT effect 标签标记 new fiber。
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      }
    }

    // 如果类型不同并且有旧光纤，我们需要删除旧节点
    if (oldFiber && !sameType) {
      // 对于我们需要删除节点的情况，我们没有新的 fiber，所以我们将 effect 标签添加到旧的 fiber。
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    // TODO compare oldFiber to element
    // 将它添加到 fiber 树中，将其设置为子节点或兄弟节点，具体取决于它是否是第一个子节点。
    if (index === 0) {
      wipFiber.child = newFiber
    } else if (element) {
      prevSibling!.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

const Didact = {
  createElement,
  render,
  useState,
}

/** @jsx Didact.createElement */
function Counter() {
  const [state, setState] = Didact.useState(1)
  return Didact.createElement(
    'div',
    null,
    Didact.createElement(
      'h1',
      {
        onClick: () => setState((c) => c + 1),
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
const elementState = Didact.createElement(Counter, null)

/** @jsx Didact.createElement */
function App(props: { name: string }) {
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
  elementState
)

const container = document.getElementById('root')

Didact.render(element, container)
