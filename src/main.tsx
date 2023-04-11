import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { elementApp }  from './page'
import * as Didact from '../index'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

const container = document.getElementById('_root') as HTMLElement
Didact.render(elementApp, container)