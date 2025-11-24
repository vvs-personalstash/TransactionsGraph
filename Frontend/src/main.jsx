import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import App from './App'
import Home from './Screens/Home'
import AddData from './Screens/AddData'
import Lists from './Screens/Lists'
import GraphView from './Screens/GraphView'
import Analytics from './Screens/Analytics'
import ExportPage from './Screens/Export'
import TransactionClusters from './Screens/TransactionClusters'
import './index.css'


ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index                          element={<Home />} />
        <Route path="add-data"               element={<AddData />} />
        <Route path="lists"                  element={<Lists />} />
        <Route path="graph"                  element={<GraphView />} />
        <Route path="analytics"              element={<Analytics />} />
        <Route path="transaction-clusters"   element={<TransactionClusters />} />
        <Route path="export"                 element={<ExportPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
)
