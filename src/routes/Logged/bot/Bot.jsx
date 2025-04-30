import React, { useEffect, useState } from "react";
import Iframe from "react-iframe";

export const Bot = ({ user, token }) => {
  const [listOffers, setListOffers] = useState([]);
  const [listUsers, setListUsers] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getOffers();
    getUsers();
  }, []);

  const getOffers = async () => {
    const response = await fetch(
      `https://dashboard-ofrecetutalento.com:3100/api/offer/get-offers/${user._id}`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
          Authorization: token,
        },
      }
    );

    const data = await response.json();
    if (data.status === "success") {
      setListOffers(data.offers);
    } else {
      console.error(data.message);
    }
  };

  const getUsers = async () => {
    const response = await fetch(
      "https://dashboard-ofrecetutalento.com:3100/api/user/get-users",
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
          Authorization: token,
        },
      }
    );

    const data = await response.json();
    if (data.status === "success") {
      setListUsers(data.users);
    } else {
      console.error(data.message);
    }
  };

  const getFetch = async () => {

    const users = listUsers.map((user) => ({
      name: user.name,
      experience: user.experience,
      talents: user.talents,
      languajes: user.languaje,
    }));
    const offers = listOffers.map((offer) => ({
      title: offer.title,
      description: offer.description,
      area: offer.area,
      experience: offer.experience,
      languajes: offer.languajes,
    }));

    const body = {
      users,
      offer: offers,
    };

    const response = await fetch(
      "https://dashboard-ofrecetutalento.com:4900/api/results/get-results",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (data.status !== "success") {
      console.error(data.message);
    } else {
      setReady(true);
    }
  };

  /*useEffect(() => {
    getFetch();
    setReady(true);
  }, []);*/

  return (
    <>
      {user.suscription === "ninguna" || user.suscription === "Null" ? (
        <div className="text-center py-6">
          <h1 className="text-2xl font-bold text-gray-800">
            No cuentas con una suscripción para acceder al bot
          </h1>
        </div>
      ) : (
        <div className="h-full w-full rounded-lg shadow-2xl xl:border border-gray-200 relative">
          <div className="absolute xl:w-[80%] w-[75%] right-0">
            <div className="text-center py-6">
              <h1 className="xl:text-4xl text-lg font-bold text-gray-800 mb-4">
                ¡Bienvenido a nuestro Asistente Virtual!
              </h1>
              <p className="lg:text-lg text-sm text-gray-600 max-w-2xl mx-auto">
                Haz tus preguntas sobre los usuarios y las ofertas actuales, y el bot te dará toda la información que necesitas.
              </p>
              <button onClick={getFetch} className="buttonPrimary mt-4">
                Preguntarle a la IA
              </button>
            </div>
          </div>

          {ready && (
            <Iframe
              url="https://bot-ott.netlify.app/"
              width="100%"
              height="100%"
              display="initial"
              className="xl:rounded-lg"
              position="relative"
            />
          )}
        </div>
      )}
    </>
  );
};
