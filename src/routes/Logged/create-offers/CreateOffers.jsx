import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export const CreateOffers = ({ user, token }) => {
  const navigate = useNavigate();
  const initialForm = {
    title: "",
    description: "",
    area: "",
    experience: "",
    availability: "Remoto",
    salary: "200-500",
    languajes: "",
    country: "",
    city: "",
    region: "",
  };

  const [form, setForm] = useState({});

  const getFetch = async (url, body) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.status == "success") {
      toast.success("Has creado la vacante de manera satisfactoria");
      setForm(initialForm);
    } else {
      toast.error(data.message);
    }
  };

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await getFetch(
      `https://dashboard-ofrecetutalento.com:3100/api/offer/create-offer/${user._id}`,
      form
    );
    navigate("/offers");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-center mb-6">
        Crea una nueva vacante
      </h1>
      <div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="title"
              className="block text-gray-700 font-semibold "
            >
              Nombre vacante
            </label>
            <input
              required
              value={form.title}
              onChange={handleOnChange}
              type="text"
              name="title"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-primary "
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-gray-700 font-semibold "
            >
              Descripción vacante
            </label>
            <textarea
              required
              value={form.description}
              onChange={handleOnChange}
              name="description"
              placeholder="descripcion..."
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-primary "
            ></textarea>
          </div>

          <div>
            <label
              htmlFor="area"
              className="block text-gray-700 font-semibold "
            >
              Área de la vacante
            </label>
            <input
              required
              value={form.area}
              onChange={handleOnChange}
              type="text"
              name="area"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-primary "
            />
          </div>

          <div>
            <label
              htmlFor="experience"
              className="block text-gray-700 font-semibold "
            >
              Experiencia requerida
            </label>
            <input
              required
              value={form.experience}
              onChange={handleOnChange}
              type="text"
              name="experience"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-primary "
            />
          </div>

          <div>
            <label
              htmlFor="country"
              className="block text-gray-700 font-semibold "
            >
              País
            </label>
            <input
              required
              value={form.country}
              onChange={handleOnChange}
              type="text"
              name="country"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-primary "
            />
          </div>

          <div>
            <label
              htmlFor="city"
              className="block text-gray-700 font-semibold "
            >
              Distrito
            </label>
            <input
              required
              value={form.city}
              onChange={handleOnChange}
              type="text"
              name="city"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-primary "
            />
          </div>

          <div>
            <label
              htmlFor="region"
              className="block text-gray-700 font-semibold "
            >
              Corregimiento
            </label>
            <input
              required
              value={form.region}
              onChange={handleOnChange}
              type="text"
              name="region"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-primary "
            />
          </div>

          <div>
            <label
              htmlFor="availability"
              className="block text-gray-700 font-semibold "
            >
              Disponibilidad requerida
            </label>
            <select
              required
              value={form.availability}
              name="availability"
              onChange={handleOnChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-primary "
            >
              <option selected disabled value="">
                Selecciona una disponibilidad
              </option>
              <option value="remoto">Remoto</option>
              <option value="presencial">Presencial</option>
              <option value="hibrido">Hibrido</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="salary"
              className="block text-gray-700 font-semibold "
            >
              Salario en dólares
            </label>
            <select
              required
              value={form.salary}
              name="salary"
              onChange={handleOnChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-primary "
            >
              <option selected disabled value="">
                Selecciona un salario
              </option>
              <option value="200-500">$200-$500</option>
              <option value="600-1000">$600-$1000</option>
              <option value="1100-1500">$1100-$1500</option>
              <option value="1600-2000">$1600-$2000</option>
              <option value="2000-3000">$2000-$3000</option>
              <option value="3500">Más de $3500</option>
            </select>
          </div>

          <div className="pb-4">
            <fieldset>
              <label
                htmlFor="languajes"
                className="block text-gray-700 font-semibold "
              >
                Idiomas:
              </label>
              <input
                required
                value={form.languajes}
                onChange={handleOnChange}
                type="text"
                name="languajes"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-primary "
              />
            </fieldset>
          </div>
          <div className="flex justify-end ">
            <button type="submit" className="buttonPrimary  w-full lg:w-auto ">
              Crear vacante
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
