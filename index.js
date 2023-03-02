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
  const dom =
  filber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(filber.type)

  const isProperty = (key) => key !== 'children'
  Object.keys(filber.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = filber.props[name]
    })

    return dom
}

function commitRoot() {
  commitWork(wipRoot.child, 'wipRoot')
  wipRoot = null
}

// 找 child 然后找 sibling，最后找到 parent
function commitWork(fiber, tag) {
  console.log('commitWork', fiber, tag);
  if (!fiber) {
    return
  }

  const domParent = fiber.parent.dom
  domParent.appendChild(fiber.dom)
  commitWork(fiber.child, fiber.type + 'child')
  commitWork(fiber.sibling, fiber.type + 'sibling')
}

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    }
  }

  nextUnitOfWork = wipRoot
}

let nextUnitOfWork = null
let wipRoot = null

function workLoop(deadline) {
  let shouldYield = false

  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)

    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  const elements = fiber.props.children
  let index = 0
  let prevSibling = null

  while (index < elements.length) {
    const element = elements[index]

    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      domm: null
    }

    if (index === 0) {
      fiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }

  if (fiber.child) {
    return fiber.child
  }

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

const Didact = {
  createElement,
  render,
}

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
