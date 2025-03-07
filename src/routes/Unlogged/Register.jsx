import { useState } from "react";

import {
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaUser,
  FaUserCheck,
  FaUserTie,
} from "react-icons/fa";
import { toast } from "react-toastify";

export const Register = () => {
  const initialForm = {
    name: "",
    lastname: "",
    user: "",
    email: "",
    password: "",
  };

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
      toast.success("Te has registrado de manera satisfactoria");
      setForm(initialForm);
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
      "https://dashboard-ofrecetutalento.com:3100/api/recruiter/register",
      form
    );
  };

  return (
    <>
      <div className="flex justify-center items-center w-full h-screen">
        {" "}
        <div>
          <h1 className="font-bold text-2xl text-gray-800">¡Hola!</h1>
          <p className="text-lg text-gray-700 mb-10">
            Regístrese para comenzar
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
            <div className="authInput">
              <FaUser className="text-gray-400 mr-2" />
              <input
                required
                onChange={handleOnChange}
                type="text"
                name="name"
                placeholder="Nombre"
                className="outline-none w-full"
              />
            </div>

            <div className="authInput">
              <FaUserTie className="text-gray-400 mr-2" />
              <input
                required
                onChange={handleOnChange}
                type="text"
                name="lastname"
                placeholder="Apellido"
                className="outline-none w-full "
              />
            </div>
            <div className="authInput">
              <FaUserCheck className="text-gray-400 mr-2" />
              <input
                required
                onChange={handleOnChange}
                type="text"
                name="user"
                placeholder="Usuario"
                className="outline-none w-full"
              />
            </div>
            <div className="authInput">
              <FaEnvelope className="text-gray-400 mr-2" />
              <input
                required
                onChange={handleOnChange}
                type="email"
                name="email"
                placeholder="Email"
                className="outline-none w-full"
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
              Register
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
