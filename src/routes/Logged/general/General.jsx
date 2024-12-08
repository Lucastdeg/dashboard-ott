import { useRef, useState, useEffect } from "react";

import { FaHeart, FaRegFrown, FaTimes } from "react-icons/fa";
import FilterModule from "../../../components/filters/Filters";
import Loader from "../../../components/loader/Loader";
import Candidate from "../../../components/candidate/Candidate";
import SearchBar from "../../../components/searchBar/SearchBar";
import defaultUserImg from "../../../assets/user.png";
import { toast } from "react-toastify";

export const General = ({ user, token }) => {
  const [listUsers, setListUsers] = useState([]);
  const [urlCv, setUrlCv] = useState("");
  const [userData, setUser] = useState({
    name: "",
    talents: "",
    experience: "",
    availability: "",
  });

  const [listOffers, setListOffers] = useState([]);
  const [filter, setFilter] = useState(false);
  const [experience, setExperience] = useState("0");
  const [talents, setTalents] = useState("");
  const [languajes, setLanguajes] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingDialogData, setWaitingDialogData] = useState(false);

  useEffect(() => {
    getUsers();
    getOffers();
  }, []);

  const getUsers = async () => {
    setLoading(true);
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

    if (data.status == "success") {
      setListUsers(data.users);
    }
    setLoading(false);
  };

  const getOffers = async () => {
    setWaitingDialogData(true);
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

    if (data.status == "success") {
      setListOffers(data.offers);
    } else {
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

  const addFilter = async (id) => {
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
      // Convertir experiencia a número
      const experienciaNum = parseInt(data.offer.experience);

      // Convertir talentos e idiomas a arreglos
      const talentosArray = data.offer.area
        .split(",")
        .map((talento) => talento.trim().toLowerCase());
      const idiomasArray = data.offer.languajes
        .split(",")
        .map((idioma) => idioma.trim().toLowerCase());

      setFilter(true);
      setExperience(experienciaNum);
      setLanguajes(idiomasArray);
      setTalents(talentosArray);
      setCountry(data.offer.country);
      closePopupPreFilter();

      toast.success("Has creado la vacante de manera satisfactoria");
    }
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

  const dialogRef = useRef(null);
  const dialogRefTwo = useRef(null);

  const showPopupCandidate = async (id) => {
    await getUser(id);
    dialogRef.current.showModal();
    document.body.classList.add("blur");
  };

  const closePopupCandidate = () => {
    dialogRef.current.close();
    document.body.classList.remove("blur");
  };

  const showPopupPreFilter = async () => {
    await getOffers();
    dialogRefTwo.current.showModal();
    document.body.classList.add("blur");
  };

  const closePopupPreFilter = () => {
    dialogRefTwo.current.close();
    document.body.classList.remove("blur");
  };

  const setAllFilters = () => {
    setFilter(false);
  };

  const usersList = !filter
    ? listUsers
    : listUsers.filter((user) => {
        const experienciaUserNum = parseInt(user.experience);
        const talentosUserArray = user.talents
          .split(",")
          .map((talento) => talento.trim().toLowerCase());
        const idiomasUserArray = user.languaje
          .split(",")
          .map((idioma) => idioma.trim().toLowerCase());

        return (
          experienciaUserNum >= experience &&
          talentosUserArray.some((talento) => talents.includes(talento)) &&
          idiomasUserArray.some((idioma) => languajes.includes(idioma)) &&
          user.country.toLowerCase() === country.toLowerCase()
        );
      });

  if (loading)
    return (
      <div className="flex justify-center items-center  h-full w-full">
        <Loader />
      </div>
    );

  return (
    <div>
      <SearchBar />

      <FilterModule setAllFilters={setAllFilters} />
      <div className="flex justify-between gap-4 mb-6 ">
        <button onClick={() => showPopupPreFilter()} className="buttonPrimary">
          Pre-Filtro OTT
        </button>
        {filter && (
          <button
            onClick={() => setAllFilters()}
            className="px-4 text-gray-500 border font-bold bg-white hover:text-red-600 rounded-lg py-2  transition duration-200"
          >
            Quitar filtros
          </button>
        )}
      </div>
      <div>
        {usersList && usersList.length ? (
          <div
            key={user.id}
            className={`grid  ${
              usersList.length === 1
                ? "grid-cols-1"
                : "grid-cols-1 lg:grid-cols-2"
            } gap-4`}
          >
            {usersList.map((user) => (
              <div key={user.id}>
                <Candidate
                  showPopupCandidate={showPopupCandidate}
                  user={user}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center mt-4 w-full">
            <h2 className="text-gray-500 text-xl py-10">
              {!filter
                ? "Aun no hay postulantes para mostrar"
                : "No hay postulantes que coincidan con los filtros."}
            </h2>
          </div>
        )}
      </div>

      {waitingDialogData && (
        <div className="fixed  top-0 left-0   flex justify-center items-center h-screen w-screen">
          <Loader />
        </div>
      )}

      <dialog ref={dialogRef} className=" rounded-lg">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xl lg:min-w-[36rem] relative transition-transform  ">
          <button
            onClick={closePopupCandidate}
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
            <button className="bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition duration-200 shadow-md hover:shadow-lg">
              Agendar entrevista
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={dialogRefTwo} className="rounded-lg">
        <div className="p-8 w-full max-w-lg bg-white shadow-lg rounded-md relative transform transition-all">
          <button
            onClick={closePopupPreFilter}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors duration-200"
          >
            <FaTimes className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 mt-2">
              Con que oferta quieres aplicar el filtro:
            </h2>
            {listOffers && listOffers.length > 0 ? (
              <div className="grid gap-4 grid-cols-1">
                {listOffers.map((offer) => (
                  <button
                    key={offer._id}
                    onClick={() => addFilter(offer._id)}
                    className="buttonPrimary"
                  >
                    {offer.title}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center mt-8 text-gray-500">
                <FaRegFrown className="w-12 h-12 mb-4 opacity-80" />
                <p className="text-base font-medium">
                  No has creado ofertas aún
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Agrega nuevas ofertas para comenzar a aplicar filtros.
                </p>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
};
