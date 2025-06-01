import "./App.css";
import LoginPage from "./app/login/page";
import SignupPage from "./app/signup/page";
import Page from "./app/dashboard/page";
import ForgotPasswordPage from "./app/forgotPassword/page";
import ErrorPage from "./components/ui/ErrorPage";
import { BrowserRouter, Route, Routes } from "react-router";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/" element={<Page />} />
        <Route path="/*" element={<ErrorPage />}  />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
