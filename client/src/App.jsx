import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="*" element={<div>Page not found</div>} />
      <Route path="/reports/attendance" element={<AttendanceReportPage />} />
    </Routes>
  )
}

export default App