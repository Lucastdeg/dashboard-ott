import React, { useRef, useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Iframe from "react-iframe";

import { FaEdit, FaPlus, FaTimes, FaTrash, FaRobot, FaHeart } from "react-icons/fa";
import Loader from "../../../components/loader/Loader";
import { toast } from "react-toastify";
import defaultUserImg from "../../../assets/user.png";

export const Offers = ({ user, token }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [listOffers, setListOffers] = useState([]);
  const [listCandidates, setListCandidates] = useState([]);
  const [waitingDialogData, setWaitingDialogData] = useState(false);
  const [urlCv, setUrlCv] = useState("");
  const [userData, setUser] = useState({
    name: "",
    talents: "",
    experience: "",
    availability: "",
  });

  const [offer, setOffer] = useState({
    title: "",
    description: "",
    area: "",
    availability: "",
    _id: "",
  });

  useEffect(() => {
    getOffers();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        dialogRefTwo.current.close();
        dialogRef.current.close();
        dialogRefThree.current.close();
        dialogRefFour.current.close();
        document.body.classList.remove("blur");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const getFetch = async () => {
    const params = new URLSearchParams();

    const users = listCandidates.map((user) => ({
      name: user.name,
      experience: user.experience,
      talents: user.talents,
      languajes: user.languaje,
    }));

    params.append("users", JSON.stringify(users));
    params.append("offer", JSON.stringify(offer));

    const response = await fetch(
      "https://minichatbot.com:4900/api/results/get-results",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const data = await response.json();
    if (data.status !== "success") {
      console.error(data.message);
    }
  };

  const getOffers = async () => {
    setLoading(true);
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

    if (data.status == "success") setListOffers(data.offers);
    setLoading(false);
  };

  const getOffer = async (id) => {
    setWaitingDialogData(true);
    const response = await fetch(
      `https://dashboard-ofrecetutalento.com:3100/api/offer/get-offer/${user._id}/${id}`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
          Authorization: token,
        },
      }
    );

    const data = await response.json();

    if (data.status == "success") {
      setOffer(data.offer);
    }
    setWaitingDialogData(false);
  };

  const getUser = async (id) => {
    setWaitingDialogData(true);
    const response = await fetch(
      `https://dashboard-ofrecetutalento.com:3100/api/user/get-user/${id}`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
          Authorization: token,
        },
      }
    );

    const data = await response.json();

    if (data.status == "success") {
      setUser(data.user);
      setUrlCv(
        `https://dashboard-ofrecetutalento.com:3100/api/user/get-pdf/${data.user.cv}`
      );
    }
    setWaitingDialogData(false);
  };

  const getCandidate = async (id) => {
    setWaitingDialogData(true);
    const response = await fetch(
      `https://dashboard-ofrecetutalento.com:3100/api/offer/get-offer/${user._id}/${id}`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json",
          Authorization: token,
        },
      }
    );

    const data = await response.json();

    if (data.status == "success") {
      setListCandidates(data.offer.user);
    }
    setWaitingDialogData(false);
  };

  const interviewWhats = (tel) => {
    const url = `https://wa.me/${tel}`;
    window.open(url, "_blank");
  }

  const handleDelete = async (id) => {
    const result = confirm("Estas seguro de querer eliminar la vacante?");

    if (result) {
      const response = await fetch(
        `https://dashboard-ofrecetutalento.com:3100/api/offer/delete-offer/${id}`,
        {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
            Authorization: token,
          },
        }
      );
      const data = await response.json();

      if (data.status == "success") {
        toast.success("Has eliminado la vacante de manera satisfactoria");
        closePopup();
        setListOffers([]);
        await getOffers();
      } else {
        console.log(data);
      }
    }
  };

  const dialogRef = useRef(null);
  const dialogRefTwo = useRef(null);
  const dialogRefThree = useRef(null);
  const dialogRefFour = useRef(null);

  const showPopup = async (id) => {
    await getOffer(id);
    dialogRef.current.showModal();
    document.body.classList.add("blur");
  };

  const showCv = async () => {
    try {
      const response = await fetch(urlCv, {
        method: "GET",
        headers: {
          Authorization: token,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        throw new Error("Error al obtener el PDF");
      }
    } catch (error) {
      console.error("Error al abrir el PDF:", error);
    }
  };

  const closePopup = () => {
    dialogRef.current.close();
    document.body.classList.remove("blur");
  };

  const closePopupTwo = () => {
    dialogRefTwo.current.close();
    dialogRef.current.close();
    document.body.classList.remove("blur");
  };

  const closePopupCandidateOne = () => {
    dialogRefFour.current.close();
  };

  const showCandidates = async (id) => {
    await getCandidate(id);
    dialogRefTwo.current.showModal();
    document.body.classList.add("blur");
  }

  const showOneCandidate = async (id) => {
    await getUser(id);
    dialogRefFour.current.showModal();
    document.body.classList.add("blur");
  }

  const showBot = async () => {
    await getFetch();
    dialogRefThree.current.showModal();
    document.body.classList.add("blur");
  }

  const closePopupThree = () => {
    dialogRefThree.current.close();
  };

  if (loading)
    return (
      <div className="flex justify-center items-center  h-full w-full">
        <Loader />
      </div>
    );

  return (
    <div>
      <div className="flex justify-end mb-6 ">
        <NavLink
          to="/create-offers"
          className="buttonPrimary w-full lg:w-auto flex justify-center items-center gap-2"
        >
          Crear Vacante
          <FaPlus className="" />
        </NavLink>
      </div>

      {listOffers && listOffers.length ? (
        <div
          className={`grid  ${listOffers.length === 1
            ? "grid-cols-1"
            : "grid-cols-1 lg:grid-cols-2"
            } gap-4`}
        >
          {listOffers.map((offer) => (
            <div
              key={offer._id}
              onClick={() => showPopup(offer._id)}
              className="bg-white shadow-lg rounded-lg border border-gray-200 p-6 transition-transform transform hover:scale-[1.02] cursor-pointer border-t-4 border-t-secondary hover:shadow-xl"
            >
              <h3 className="text-xl font-bold text-primary  mb-2  transition-colors duration-200">
                {offer.title}
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Localización:</span> {offer.city},{" "}
                {offer.country}
              </p>
              <p className="text-lg text-primary font-semibold mt-2 mb-1">
                Salario:{" "}
                <span className="text-secondary">{offer.salary} €</span>
              </p>
              <div className="flex flex-col space-y-1">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Experiencia:</span>{" "}
                  {offer.experience}
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Disponibilidad:</span>{" "}
                  {offer.availability}
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Postulados:</span>{" "}
                  {offer.user.length}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold text-gray-500">
            No has creado vacantes aún
          </h2>
        </div>
      )}
      {waitingDialogData && (
        <div className="fixed  top-0 left-0   flex justify-center items-center h-screen w-screen">
          <Loader />
        </div>
      )}

      <dialog ref={dialogRef} className="rounded-lg">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl lg:min-w-[40rem] relative ">
          <button
            onClick={closePopup}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition duration-200"
          >
            <FaTimes className="w-6 h-6" />
          </button>

          <h3 className="text-3xl font-extrabold text-secondary mb-6 leading-tight">
            {offer?.title}
          </h3>

          <div className="space-y-4 text-lg">
            <div>
              <h4 className="text-lg font-semibold text-primary ">
                Descripción de la vacante:
              </h4>
              <p className="text-gray-600 leading-relaxed">
                {offer?.description}
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-primary ">
                Ubicación:
              </h4>
              <p className="text-gray-600">{`${offer?.city}, ${offer?.country}`}</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-primary ">Salario:</h4>
              <p className=" text-xl font-bold text-secondary">
                {offer?.salary} €
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-primary ">
                Experiencia:
              </h4>
              <p className="text-gray-600">{offer?.experience}</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-primary ">
                Disponibilidad:
              </h4>
              <p className="text-gray-600">{offer?.availability}</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-primary ">Idiomas:</h4>
              <p className="text-gray-600">{offer?.languajes}</p>
            </div>
          </div>

          <div className="flex justify-between mt-8 gap-4">
            <button
              onClick={() => handleDelete(offer._id)}
              className="flex items-center gap-2 border border-red-500 text-red-500 font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-red-500 hover:text-white transition duration-200"
            >
              <FaTrash className="w-5 h-5" /> Eliminar vacante
            </button>
            <button onClick={() => showCandidates(offer._id)} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-primary-dark transition duration-200">
              <FaEdit className="w-5 h-5" /> Ver postulaciones
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={dialogRefTwo} className="rounded-lg">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl lg:min-w-[40rem] relative ">
          <button
            onClick={closePopupTwo}
            className="absolute top-2 right-4 text-gray-400 hover:text-gray-600 transition duration-200"
          >
            <FaTimes className="w-6 h-6" />
          </button>

          {listCandidates && listCandidates.length ? (
            <div>
              <div
                className={`grid  ${listCandidates.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-1 lg:grid-cols-2"
                  } gap-4`}
              >
                {listCandidates.map((candidate) => (
                  <div
                    key={candidate._id}
                    onClick={() => showOneCandidate(candidate._id)}
                    className="bg-white shadow-lg rounded-lg border border-gray-200 p-6 transition-transform transform hover:scale-[1.02] cursor-pointer border-t-4 border-t-secondary hover:shadow-xl"
                  >
                    <h3 className="text-xl font-bold text-primary  mb-2  transition-colors duration-200">
                      {candidate.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Experiencia:</span> {candidate.experience},{" "}
                      País:{candidate.country}
                    </p>
                    <p className="text-lg text-primary font-semibold mt-2 mb-1">
                      talentos:{" "}
                      <span className="text-secondary">{candidate.talents}</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-4">
                <button onClick={() => showBot(offer._id)} className="flex items-center gap-2 bg-primary text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-primary-dark transition duration-200">
                  <FaRobot className="w-5 h-5" /> Comparar con IA
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <h2 className="text-xl font-semibold text-gray-500">
                Aún no hay candidatos que hayan postulado a tu vacante
              </h2>
            </div>
          )}
          {waitingDialogData && (
            <div className="fixed  top-0 left-0   flex justify-center items-center h-screen w-screen">
              <Loader />
            </div>
          )}

        </div>
      </dialog >

      <dialog ref={dialogRefThree} className="rounded-lg w-full max-w-5xl h-[80vh] p-6">
        <button
          onClick={closePopupThree}
          className="absolute top-1 right-6 text-gray-400 hover:text-gray-600 transition duration-200"
        >
          <FaTimes className="w-6 h-6" />
        </button>
        <Iframe
          url="https://bot-bgps.netlify.app"
          width="100%"
          height="100%"
          display="initial"
          className="xl:rounded-lg"
          position="relative"
        />
      </dialog>

      <dialog ref={dialogRefFour} className=" rounded-lg">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xl lg:min-w-[36rem] relative transition-transform  ">
          <button
            onClick={closePopupCandidateOne}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition duration-200"
          >
            <FaTimes className="w-5 h-5" />
          </button>

          <div className="flex items-center mb-4">
            <img
              src={userData.photo || defaultUserImg}
              alt={`Photo de ${userData.name}`}
              className="w-20 h-20 rounded-full border-4 border-primary shadow-md mr-4"
            />
            <div>
              <h3 className="text-2xl font-semibold text-secondary">{`Perfil ${userData.name}`}</h3>
              <button className="mt-1 flex items-center text-gray-600 hover:text-red-500 transition duration-200">
                <FaHeart className="mr-1" />
                Añadir a favoritos
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="border-b pb-2">
              <h4 className="font-bold text-gray-700">Talentos:</h4>
              <h6 className="text-gray-600">{userData.talents}</h6>
            </div>
            <div className="border-b pb-2">
              <h4 className="font-bold text-gray-700">Años de experiencia:</h4>
              <h6 className="text-gray-600">{userData.experience}</h6>
            </div>
            <div className="border-b pb-2">
              <h4 className="font-bold text-gray-700">Disponibilidad:</h4>
              <h6 className="text-gray-600">{userData.availability}</h6>
            </div>
            {userData?.retail?.toLowerCase() === 'si' && <div className="border-b pb-2">
              <h4 className="font-bold text-gray-700">Supermercados:</h4>
              <h6 className="text-gray-600">{userData.retail}</h6>

              <h4 className="font-bold text-gray-700">Turnos rotativos:</h4>
              <h6 className="text-gray-600">{userData.turnos}</h6>

              <h4 className="font-bold text-gray-700">Disponibilidad dias feriados nacionales:</h4>
              <h6 className="text-gray-600">{userData.holidays}</h6>

              <h4 className="font-bold text-gray-700">Disponibilidad de lunes a domingos:</h4>
              <h6 className="text-gray-600">{userData.sundays}</h6>

              <h4 className="font-bold text-gray-700">Carnet blanco:</h4>
              <h6 className="text-gray-600">{userData.whitecard}</h6>

              <h4 className="font-bold text-gray-700">Carnet verde:</h4>
              <h6 className="text-gray-600">{userData.greencard}</h6>
            </div>}
          </div>

          <div className="flex flex-col space-y-2">
            <button
              onClick={showCv}
              className="bg-primary text-white py-2 rounded-lg hover:bg-primary-dark transition duration-200 shadow-md hover:shadow-lg"
            >
              Ver CV
            </button>
            <button className="bg-secondary text-white py-2 rounded-lg hover:bg-secondary-dark transition duration-200 shadow-md hover:shadow-lg">
              Ver video
            </button>
            <button onClick={() => { interviewWhats(userData.tel) }} className="bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition duration-200 shadow-md hover:shadow-lg">
              Agendar entrevista via whatsapp
            </button>
          </div>
        </div>
      </dialog>
    </div >
  );
};
