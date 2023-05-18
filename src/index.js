/** @jsx Didact.createElement */

// 浏览器线程空闲时执行回调的工作流
// 每个element对应一个fiber，每个fiber是一个work unit
let nextUnitOfWork
// work in progress root，由于线程空闲时才渲染DOM，所以会渲染不完整的UI，为了防止这种情况需要从此处删除更改DOM的部分
// 所以需要跟踪fiber tree的根节点
// 当没有下一个 work unit，我们才将整个fiber tree插入DOM
let wipRoot
// 为了实现 reconciliation，需要比较render接收的element和DOM对应的最新fiber tree。该变量保存插入DOM的最新fiber tree
let currentRoot
// 由于将 fiber tree插入DOM中是我们是从wipRoot开始，而其没有old fibers，所以需要数组保存我们需要删除的nodes
let deletions
let wipFiber
let hookIndex

const isProperty = (key) => key !== 'children' && !isEvent(key)
const isNew = (prev, next) => (key) => prev[key] !== next[key]
const isGone = (prev, next) => (key) => !(key in next)
const isEvent = (key) => key.startsWith('on')

const createElement = (type, props, ...children) => {
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

const createTextElement = (text) => {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

const updateDOM = (dom, prevProps, nextProps) => {
  // 移除旧的或改变event listener
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })
  // 移除旧props
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => (dom[name] = ''))
  // 设置新的或改变props
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      if (dom.setAttribute) {
        dom.setAttribute(name, nextProps[name])
      } else {
        dom[name] = nextProps[name]
      }
    })
  // 新增event listener
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })
}

const commitDeletion = (fiber, domParent) => {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

/**
 * @description render函数
 * @param {React Element}
 * @param {Node}
 */
const render = (element, container) => {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    // 指向上一次commit阶段插入DOM的fiber
    alternate: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

// 将nodes插入DOM
const commitRoot = () => {
  // 删除操作
  deletions.forEach(commitWork)
  // commit work
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  wipRoot = null
}

const commitWork = (fiber) => {
  if (!fiber) return

  // 函数组件 fiber 没有 dom node，需要递归找到最近的祖先 node
  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  // PLACEMENT: 插入新的node
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'DELETION') {
    // DELETION: 删除旧的node
    commitDeletion(fiber.child, domParent)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom) {
    // UPDATE: 更新node
    updateDOM(fiber.dom, fiber.alternate.props, fiber.props)
  }

  // commit work Child and sibling
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

const workLoop = (deadline) => {
  let shouldYield = false
  // step 2
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    // 有空闲时间
    shouldYield = deadline.timeRemaining() < 1
  }
  // step 1
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  // loop
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

const createDOM = (fiber) => {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type)

  updateDOM(dom, {}, fiber.props)
  return dom
}

/**
 * 做3件事
 * 1. 将element加到DOM
 * 2. 为element的children创建fiber
 * 3. 选择下一个work unit
 */
const performUnitOfWork = (fiber) => {
  const isFunctionComponents = fiber.type instanceof Function
  // 函数组件
  if (isFunctionComponents) {
    updateFunctionComponent(fiber)
  } else {
    // 普通组件
    updateHostComponent(fiber)
  }

  // 如果有子元素
  if (fiber.child) {
    return fiber.child
  }
  // 如果没有子元素，就找兄弟元素
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    // 如果没有兄弟元素，就找父元素的兄弟元素
    nextFiber = nextFiber.parent
  }
}

const updateFunctionComponent = (fiber) => {
  wipFiber = fiber
  hookIndex = 0
  wipFiber.hooks = []
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

// 更新普通组件
const updateHostComponent = (fiber) => {
  if (!fiber.dom) {
    fiber.dom = createDOM(fiber)
  }
  const elements = fiber.props.children
  reconcileChildren(fiber, elements)
}

function useState(initial) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  }

  const actions = oldHook ? oldHook.queue : []
  actions.forEach(action => {
    hook.state = action(hook.state)
  })

  const setState = (action) => {
    hook.queue.push(action)
    // 开始一个新的render阶段
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }

  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
}

/**
 * 简易reconciliation包括3部分
 * 1. 如果旧fiber和新element type相同，保留DOM，更新props
 * 2. 如果type不同，渲染新DOM
 * 3. 如果type不同同时存在旧fiber，需要删除旧node
 */
const reconcileChildren = (wipFiber, elements) => {
  let index = 0
  let prevSibling
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child

  while (index < elements.length || oldFiber) {
    const element = elements[index]
    let newFiber

    const sameType = oldFiber && element && oldFiber.type === element.type

    // 如果 type 相同，更新 props
    if (sameType) {

      console.log('element', element)

      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      }
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      }
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

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
  useState,
}

const content = (
  <div className="root">
    <h1 data-me="heihei" cc="123">
      <p>hah</p>
      <a>bobo</a>
    </h1>
    <h2>sib</h2>
  </div>
)

/**
 * 函数组件的fiber没有对应DOM node
 * children来自于函数返回值而不是直接从props中取得
 */
function Counter() {
  const [state, setState] = Didact.useState(1)

  console.log('state', state)
  console.log('setState', setState)

  const onClick = () => {
    console.log('click', state)
    setState((c) => c + 1)
  }
  return <h1 onClick={onClick}>Count: {state}</h1>
}

const container = document.getElementById('app')
// Didact.render(content, container)
Didact.render(<Counter />, container)
