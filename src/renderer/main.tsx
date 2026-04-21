import React from 'react'
import ReactDOM from 'react-dom/client'
import { Assets } from 'pixi.js'
import { App } from './App'
import './styles/global.css'

Assets.setPreferences({ preferWorkers: false })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
