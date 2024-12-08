import { useState } from "react";
import { FaEnvelope, FaEye, FaEyeSlash, FaLock } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

export const Login = ({ setLoged, setUser, setToken }) => {
  const [form, setForm] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const getFetch = async (url, body) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.status == "success") {
      setLoged("loged");
      setToken(data.token);
      setUser(data.recruiter);
    } else {
      toast.error(data.message);
    }
  };

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    getFetch(
      "https://dashboard-ofrecetutalento.com:3100/api/recruiter/login",
      form
    );
  };

  return (
    <div className="flex justify-center items-center w-full h-screen">
      {" "}
      <div>
        <h1 className="font-bold text-2xl text-gray-800">¡Hola de nuevo!</h1>
        <p className="text-lg text-gray-700 mb-10">Bienvenido de nuevo</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
          <div className="authInput">
            <FaEnvelope className="text-gray-400 mr-2" />
            <input
              required
              onChange={handleOnChange}
              type="email"
              name="email"
              placeholder="Email"
              className="outline-none w-full  "
              autoComplete="username"
            />
          </div>

          <div className="authInput">
            <FaLock className="text-gray-400 mr-2" />
            <input
              required
              onChange={handleOnChange}
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Contraseña"
              className="outline-none w-full"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={handleTogglePassword}
              className="ml-2"
            >
              {showPassword ? (
                <FaEyeSlash className="text-gray-400" />
              ) : (
                <FaEye className="text-gray-400" />
              )}
            </button>
          </div>

          <button type="submit" className="authSubmitButton">
            Login
          </button>
        </form>

        <div className=" text-center">
          <p className="text-gray-500 ">Has olvidado tu contraseña</p>
          <p className="text-gray-500">
            ¿No tienes una cuenta?{" "}
            <NavLink to="/register" className="text-secondary ">
              Regístrate
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
};
