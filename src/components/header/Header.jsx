import { useRef } from "react";
import logo from "../../assets/logo_solo.svg";

import { FaBars, FaHeart, FaStar, FaTimes } from "react-icons/fa";
import { FaBell } from "react-icons/fa";
import { FaUserCircle } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import defaultUserImg from "../../assets/user.png";
import NotificationsList from "../notifications/Notifications";
import { fakeNotifications } from "../../data/notifications";

const fakeFavorites = [
  { id: 1, name: "Juan Pérez", profileImg: "" },
  { id: 2, name: "María López", profileImg: "" },
  { id: 3, name: "Carlos Fernández", profileImg: "" },
];

export const Header = ({
  setIsOpenMobilMenu,
  isOpenMobilMenu,
  user = { user: "" },
  token,
}) => {
  const dialogRef = useRef(null);
  const dialogRefTwo = useRef(null);

  const showPopup = (dialog) => {
    dialog.current.showModal();
  };

  const closePopupFavorites = () => {
    dialogRef.current.close();
  };

  const closePopupNotif = () => {
    dialogRefTwo.current.close();
  };

  return (
    <>
      <div className="flex fixed top-0 w-full left-0 z-20 bg-primary justify-between items-center py-3 border-b border-secondary shadow-sm shadow-secondary px-5 sm:px-10 lg:pr-10 lg:pl-0">
        <div className="lg:flex lg:justify-center lg:items-center lg:w-[250px]">
          <NavLink to="/">
            <img className=" w-10" src={logo} alt="logo" />
          </NavLink>
        </div>

        <div className="flex items-center gap-6 lg:gap-10 text-white">
          <button
            onClick={() => showPopup(dialogRef)}
            className="cursor-pointer"
          >
            <FaHeart className="text-xl lg:text-2xl" />
          </button>
          <button
            onClick={() => showPopup(dialogRefTwo)}
            className="cursor-pointer relative"
          >
            <FaBell className="text-xl lg:text-2xl" />

            <span
              className={`absolute bg-secondary  text-white rounded-full -top-3 -right-4   text-sm ${
                fakeNotifications.length > 9 ? "px-1" : "px-1.5"
              } `}
            >
              <span className="text-xs font-bold ">
                {fakeNotifications.length}
              </span>
            </span>
          </button>

          <NavLink
            to="/profile"
            className="flex items-center gap-2 cursor-pointer w-full"
          >
            <FaUserCircle className="text-2xl lg:text-3xl" />
            <span className="hidden lg:block">{user.user}</span>
          </NavLink>
        </div>

        <button
          onClick={() => setIsOpenMobilMenu(!isOpenMobilMenu)}
          className="cursor-pointer block lg:hidden"
        >
          {isOpenMobilMenu ? (
            <FaTimes className="text-xl lg:text-2xl text-white" />
          ) : (
            <FaBars className="text-xl lg:text-2xl text-white" />
          )}
        </button>
      </div>

      {/* Favorites */}
      <dialog ref={dialogRef} className="rounded-lg ">
        <div className="p-6 lg:min-w-[500px] w-full max-w-md bg-white shadow-lg rounded-xl relative transition-all">
          <button
            onClick={closePopupFavorites}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition duration-200"
          >
            <FaTimes className="w-5 h-5" />
          </button>
          <div className="text-center ">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              Usuarios Favoritos <FaStar className="inline text-secondary" />
            </h3>
            <p className="text-gray-500 mb-4">
              Lista de tus usuarios favoritos
            </p>
            {fakeFavorites.length > 0 ? (
              <ul className="space-y-3 text-left mt-4 max-h-[500px] p-1  overflow-y-auto">
                {fakeFavorites.map((user) => (
                  <li
                    key={user.id}
                    className="flex cursor-pointer items-center p-4 bg-gray-50 rounded-lg shadow-md transform transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg"
                  >
                    <img
                      src={user.profileImg || defaultUserImg}
                      alt={`${user.name}'s profile`}
                      className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-primary"
                    />
                    <div className="flex-1">
                      <p className="text-gray-700 font-medium">{user.name}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6  mt-4">
                <p className="text-gray-600">No has agregado favoritos aún.</p>
              </div>
            )}
          </div>
        </div>
      </dialog>

      {/* Notifications */}
      <dialog ref={dialogRefTwo} className="rounded-lg">
        <div className="p-6 lg:min-w-[500px] w-full max-w-md bg-white shadow-lg rounded-xl relative transition-all">
          <button
            onClick={closePopupNotif}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition duration-200"
          >
            <FaTimes className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex justify-center items-center gap-2">
              Notificaciones{" "}
              <span className="bg-secondary text-white rounded-full px-2 py-0.5 text-sm">
                {fakeNotifications.length}
              </span>
            </h3>
            <NotificationsList fakeNotifications={fakeNotifications} />
          </div>
        </div>
      </dialog>
    </>
  );
};
