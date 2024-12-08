import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../../../components/loader/Loader";
import { FaTimes } from "react-icons/fa"; // Assurez-vous que 'react-icons' est installé
import defaultUserImg from "../../../assets/user.png";

function Entrevistas() {
  const [listInterview, setListInterview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [interview, setInterview] = useState(null);
  const [waitingDialogData, setWaitingDialogData] = useState(false);
  const navigate = useNavigate();
  const dialogRef = useRef(null);

  const fakeInterviews = [
    { id: 1, userName: "Carlos", date: "2024-11-03" },
    { id: 2, userName: "Luis", date: "2024-11-05" },
    { id: 3, userName: "Pedro", date: "2024-11-10" },
    { id: 4, userName: "Sofia", date: "2024-11-15" },
    { id: 5, userName: "Jorge", date: "2024-11-20" },
  ];
  const getInterview = async (interview) => {
    setWaitingDialogData(true);

    return new Promise((resolve) => {
      setTimeout(() => {
        setInterview(interview); // Met à jour avec l'interview sélectionnée
        setWaitingDialogData(false);
        resolve(interview); // Résout la promesse avec les données de l'interview
      }, 1000);
    });
  };

  const showPopup = async (interview) => {
    await getInterview(interview);
    dialogRef.current.showModal();
    document.body.classList.add("blur");
  };
  const closePopup = () => {
    dialogRef.current.close();
    document.body.classList.remove("blur");
    setInterview(null); // Réinitialise l'interview après la fermeture
  };

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setListInterview(fakeInterviews);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-full w-full">
        <Loader />
      </div>
    );

  return (
    <>
      <div className="min-h-screen">
        <ul className="mt-8 space-y-6">
          {listInterview.length > 0 ? (
            listInterview.map((interview) => (
              <li
                key={interview.id}
                onClick={() => showPopup(interview)}
                className="bg-gradient-to-br group from-white to-gray-50 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-shadow cursor-pointer transform hover:-translate-y-1 duration-200"
              >
                <div className="flex items-center space-x-4">
                  {/* Photo de l'utilisateur */}
                  <img
                    src={interview?.userPhoto || defaultUserImg}
                    alt={`Photo de ${interview.userName}`}
                    className="w-14 h-14 rounded-full border-4 border-primary shadow-md"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-800 group-hover:text-secondary transition-all duration-100">
                        {interview.userName}
                      </span>
                      <div className="ml-4 bg-secondary text-white py-1 px-3 rounded-full text-sm font-medium">
                        {new Date(interview.date).toLocaleDateString("es-ES", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Entrevista programada pour{" "}
                      {new Date(interview.date).toLocaleDateString("es-ES", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <p className="text-center text-gray-500">
              No hay entrevistas próximas.
            </p>
          )}
        </ul>
      </div>

      {waitingDialogData && (
        <div className="fixed top-0 left-0 flex justify-center items-center h-screen w-screen ">
          <Loader />
        </div>
      )}

      <dialog ref={dialogRef} className="rounded-lg bg-opacity-0">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl lg:min-w-[40rem] relative">
          <button
            onClick={closePopup}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition duration-200"
          >
            <FaTimes className="w-6 h-6" />
          </button>

          {interview && (
            <div className="flex items-center space-x-4 mb-6">
              {/* Photo de l'utilisateur */}
              <img
                src={interview.userPhoto || defaultUserImg}
                alt={`Photo de ${interview.userName}`}
                className="w-16 h-16 rounded-full border-4 border-primary shadow-md"
              />
              <div>
                <h3 className="text-3xl font-extrabold text-secondary leading-tight">
                  Entrevista con {interview.userName}
                </h3>
                <p className="text-lg text-gray-700 mb-2">
                  <strong>Fecha:</strong>{" "}
                  {new Date(interview.date).toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}

          <div className="text-gray-600">
            {interview && (
              <>
                <p>
                  Información detallée de l'entrevue pour {interview.userName}.
                </p>
                <p>
                  Des détails supplémentaires pourraient être affichés ici pour
                  une meilleure expérience utilisateur.
                </p>
              </>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

export default Entrevistas;
