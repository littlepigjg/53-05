import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UploadPage } from '@/pages/UploadPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { AdminPage } from '@/pages/AdminPage';
import { MergePage } from '@/pages/MergePage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MergePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/review/:token" element={<ReviewPage />} />
        <Route path="/admin/:docId" element={<AdminPage />} />
        <Route path="/merge" element={<MergePage />} />
        <Route path="*" element={<MergePage />} />
      </Routes>
    </Router>
  );
}
