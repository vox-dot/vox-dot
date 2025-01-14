import "./App.css";
import LoginPage from "./app/login/page";
import SignupPage from "./app/signup/page";
import Page from "./app/dashboard/page";
import ErrorPage from "./components/ui/ErrorPage";
import { BrowserRouter, Route, Routes } from "react-router";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-up" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Page />} />
        <Route path="/*" element={<ErrorPage />}  />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
