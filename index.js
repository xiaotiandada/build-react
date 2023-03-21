// 我们对 props 使用扩展运算符，对 children 使用剩余参数语法，这样 children prop 将始终是一个数组。
function createElement(type, props, ...children) {
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
function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

function createDom(filber) {
  // 处理文本元素，如果元素类型是 TEXT_ELEMENT ，我们创建一个文本节点而不是常规节点。
  const dom =
  filber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(filber.type)

  // 将元素 props 分配给节点。
  const isProperty = (key) => key !== 'children'
  Object.keys(filber.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = filber.props[name]
    })

    return dom
}

function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  wipRoot = null
}

const isEvent = key => key.startsWith("on")
const isProperty = key => key !== "children" && !isEvent(key)
const isNew = (prev, next) => key => prev[key] !== next[key]
const isGone = (prev, next) => key => !(key in next)

function updateDom(dom, prevProps, nextProps) {
  //Remove old or changed event listeners
  Object.keys(prevProps)
  .filter(isEvent)
  .filter(
    key =>
      !(key in nextProps) ||
      isNew(prevProps, nextProps)(key)
  )
  .forEach(name => {
    const eventType = name
      .toLowerCase()
      .substring(2)

    dom.removeEventListener(
      eventType,
      prevProps[name]
    )
  })

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ""
    })

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })

   // Add event listeners
  Object.keys(nextProps)
  .filter(isEvent)
  .filter(isNew(prevProps, nextProps))
  .forEach(name => {
    const eventType = name
      .toLowerCase()
      .substring(2)
    dom.addEventListener(
      eventType,
      nextProps[name]
    )
  })
}

// 找 child 然后找 sibling，最后找到 parent
function commitWork(fiber) {
  console.log('commitWork', fiber);
  if (!fiber) {
    return
  }

  const domParent = fiber.parent.dom
  if (
    fiber.effectTag === "PLACEMENT" &&
    fiber.dom != null
  ) {
    domParent.appendChild(fiber.dom)
  } else if (
    fiber.effectTag === "UPDATE" &&
    fiber.dom != null
  ) {
    updateDom(
      fiber.dom,
      fiber.alternate.props,
      fiber.props
    )
  } else if (fiber.effectTag === "DELETION") {
    domParent.removeChild(fiber.dom)
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

// Render 渲染
// 将 nextUnitOfWork 设置为 root fiber
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let deletions = null

// 所以我们要把工作分解成小的单元，当我们完成每个单元后，如果还有其他需要做的事情，我们会让浏览器中断渲染。
function workLoop(deadline) {
  // console.log('workLoop', deadline.timeRemaining());
  let shouldYield = false

  // 截至 2019 年 11 月，并发模式在 React 中还不稳定。循环的稳定版本看起来更像这样：
  while (nextUnitOfWork && !shouldYield) {
    // 设置第一个工作单元
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)

    // 检查在浏览器需要再次控制之前我们有多少时间。
    shouldYield = deadline.timeRemaining() < 1
  }

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
function performUnitOfWork(fiber) {
  // 建一个新节点并将其附加到 DOM。
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  // 我们在 fiber.dom 属性中跟踪 DOM 节点。

  const elements = fiber.props.children
  reconcileChildren(fiber, elements)

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
}

function reconcileChildren(wipFiber, elements) {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  // 为每个孩子创建一个 new fiber。
  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    let newFiber = null

    const sameType = oldFiber && element && element.type == oldFiber.type

    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE"
      }
    }

    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      }
    }

    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION"
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
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

const Didact = {
  createElement,
  render,
}

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
  )
)

const container = document.getElementById('root')

Didact.render(element, container)
