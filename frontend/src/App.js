import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import { getSessionId } from "@/lib/analytics";

function App() {
  // Initialize session on app load
  useEffect(() => {
    getSessionId();
    
    // Apply initial theme
    const savedTheme = localStorage.getItem('theme') || 'system';
    if (savedTheme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', systemDark);
    } else {
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
