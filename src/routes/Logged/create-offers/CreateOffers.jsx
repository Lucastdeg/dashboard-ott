import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { FaTimes } from "react-icons/fa";

const stripePromise = loadStripe('pk_test_51QctMq2K6ZGeF5ycLEZyFJXJpyqrf2JpfeszoTcIeVbRK7sCBDMehXE1Bsu9wFo9LtS4gGxsh2BpgLLVQX8NPDvf002pL0HMxT');

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
      closePopup();
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

    showPopup();

  };

  const CheckoutForm = () => {
    const stripe = useStripe();
    const element = useElements();
    const handleOnSubmitMethod = async (e) => {
      e.preventDefault();

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: element.getElement(CardElement)
      })

      if (!error) {
        const { id } = paymentMethod;
        const body = {
          id: id,
          amount: 7500
        }
        const response = await fetch('https://dashboard-ofrecetutalento.com:3500/api/recruiter/checkout', {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const data = await response.json();

        if (data.status == 'success') {
          await getFetch(
            `https://dashboard-ofrecetutalento.com:3100/api/offer/create-offer/${user._id}`,
            form
          );
          toast.success(data.message);
          navigate("/offers");
        }else {
          toast.error(data.message);
          closePopup();
        }
          
        }
      }
      return (
        <form onSubmit={handleOnSubmitMethod} className="space-y-3">
          <label
            className="block text-gray-700 font-semibold "
          >
            Pago por vacante:
            costo $75.00
          </label>
          <div className="p-4 border border-gray-300 w-full">
          <CardElement />
          </div>
          <button type="submit" className="buttonPrimary  w-full lg:w-auto ">
            Comprar vacante
          </button>
        </form>
      );
    }

    const showPopup = () => {
      dialogRef.current.showModal();
      document.body.classList.add("blur");
    };

    const closePopup = () => {
      dialogRef.current.close();
      document.body.classList.remove("blur");
    };

    const dialogRef = useRef(null);

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
                Comprar vacante
              </button>
            </div>
          </form>
        </div>
        <dialog ref={dialogRef} className="rounded-lg">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xl lg:min-w-[36rem] relative transition-transform  ">
            <div className="space-y-3 mb-4">
              <button
                onClick={closePopup}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition duration-200"
              >
                <FaTimes className="w-5 h-5" />
              </button>

              <Elements stripe={stripePromise} className="w-full p-2 border border-gray-300 rounded-md focus:outline-primary ">
                <CheckoutForm />
              </Elements>
            </div>
          </div>
        </dialog>
      </div>
    );
  };
