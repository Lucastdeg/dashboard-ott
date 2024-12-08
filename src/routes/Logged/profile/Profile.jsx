import React, { useEffect, useState } from "react";
import {
  FaBell,
  FaHeart,
  FaEdit,
  FaInfoCircle,
  FaCamera,
  FaStar,
} from "react-icons/fa";
import defaultUserImg from "../../../assets/user.png";
import NotificationsList from "../../../components/notifications/Notifications";

const fakeFavorites = [
  {
    id: 1,
    name: "Juan Pérez",
    email: "juan.perez@example.com",
    profileImg: "",
  },
  {
    id: 2,
    name: "María González",
    email: "maria.gonzalez@example.com",
    profileImg: "",
  },
  {
    id: 3,
    name: "Luis Fernández",
    email: "luis.fernandez@example.com",
    profileImg: "",
  },
  {
    id: 4,
    name: "Ana López",
    email: "ana.lopez@example.com",
    profileImg: "",
  },
  {
    id: 5,
    name: "Carlos Martínez",
    email: "carlos.martinez@example.com",
    profileImg: "",
  },
];
export const Profile = ({ user, token }) => {
  const [activeTab, setActiveTab] = useState("infos");
  const [previewImage, setPreviewImage] = useState(null);

  // Fonction pour mettre à jour l'image de prévisualisation
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-1 items-center pb-6 border-b">
        <div className="flex items-center">
          <img
            src={defaultUserImg}
            alt="Avatar"
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mr-4"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">
              {user.name} {user.lastname}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2  justify-center sm:justify-start text-sm xl:text-base mt-4 sm:mt-0 ">
          {["infos", "modify", "favorites", "notifications"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md flex items-center font-semibold gap-2 transition-all duration-200 ${
                activeTab === tab
                  ? "bg-secondary text-white"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab === "infos" && <FaInfoCircle />}
              {tab === "modify" && <FaEdit />}

              <span>
                {tab === "infos" && "Información"}
                {tab === "modify" && "Modificar"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenu des onglets */}
      <div className="bg-white  py-6">
        {activeTab === "infos" && (
          <div className="bg-white ">
            <h2 className="text-2xl font-bold mb-4  pb-2">Información</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">
                  Nombre de usuario :
                </span>
                <span className="text-gray-600">{user.user}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Email :</span>
                <span className="text-gray-600">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">
                  Fecha de creación :
                </span>
                <span className="text-gray-600">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "modify" && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Modificar información</h2>
            <form className="space-y-4 py-6 mb-8">
              <div>
                <label className="text-gray-600 font-semibold">Nombre</label>
                <input
                  type="text"
                  value={user.lastname}
                  className="inputForm"
                />
              </div>
              <div>
                <label className="text-gray-600 font-semibold">Apellido</label>
                <input type="text" value={user.name} className="inputForm" />
              </div>
              <div>
                <label className="text-gray-600 font-semibold">
                  Correo electrónico
                </label>
                <input type="email" className="inputForm" value={user.email} />
              </div>
              <div>
                <label className="text-gray-600 font-medium">
                  Foto de perfil
                </label>
                <div className="mt-2">
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex items-center justify-center w-full md:w-auto border border-gray-300 rounded-lg py-2 px-4 text-gray-600 hover:bg-gray-100 transition duration-150 ease-in-out"
                  >
                    <FaCamera className="mr-2 text-gray-500" />
                    <span>Subir imagen</span>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                {previewImage && (
                  <div className="mt-4 flex justify-center">
                    <img
                      src={previewImage}
                      alt="Previsualización de la foto de perfil"
                      className="w-24 h-24 rounded-full border border-gray-300 shadow-sm mt-2   object-cover"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button className="buttonPrimary w-full lg:w-auto">
                  Guardar información
                </button>
              </div>
            </form>

            <h3 className="text-2xl font-bold mb-4">Modificar contraseña</h3>

            {/* password */}
            <form className="space-y-4 py-6">
              <div>
                <label className="text-gray-600 font-semibold">
                  Nueva contraseña
                </label>
                <input type="password" className="inputForm" />
              </div>
              <div>
                <label className="text-gray-600 font-semibold">
                  Confirmar contraseña
                </label>
                <input type="password" className="inputForm" />
              </div>
              <div className="flex justify-end">
                <button className="buttonPrimary w-full lg:w-auto">
                  Guardar contraseña
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
