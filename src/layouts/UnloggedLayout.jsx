import { Route, Routes, Navigate } from "react-router-dom";
import { Login } from "../routes/Unlogged/Login";
import logo from "../assets/logo_full_solo_blanco.svg";
import { Register } from "../routes/Unlogged/Register";

export const UnloggedLayout = ({ setLoged, setUser, setToken }) => {
  return (
    <div className="h-screen">
      <div className="w-full flex flex-col md:flex-row min-h-full ">
        <div className="min-w-[60%] px-2 sm:px-0 bg-primary justify-center items-center py-4 pb-6 md:relative flex fixed top-0 left-0 w-full">
          <div className="invisible md:visible border border-secondary rounded-full h-[400px] w-[400px] fixed bottom-[-190px] left-[-100px]"></div>
          <div className="invisible md:visible border border-secondary rounded-full h-[400px] w-[400px] fixed bottom-[-170px] left-[-150px]"></div>
          <div className="flex flex-col">
            <img
              className=" w-full max-w-[240px] transfrom translate-x-[-4%]"
              src={logo}
              alt="logo-complete"
            />
            <p className="text-white">
              Conecta talentos y oportuniadas en un solo clic.{" "}
            </p>
          </div>
        </div>

        <Routes>
          <Route path="/*" element={<Navigate to="/" />}></Route>
          <Route
            path="/"
            element={
              <Login
                setLoged={setLoged}
                setUser={setUser}
                setToken={setToken}
              ></Login>
            }
          ></Route>

          <Route
            path="/login"
            element={
              <Login
                setLoged={setLoged}
                setUser={setUser}
                setToken={setToken}
              ></Login>
            }
          ></Route>

          <Route path="/register" element={<Register />}></Route>
        </Routes>
      </div>
    </div>
  );
};
