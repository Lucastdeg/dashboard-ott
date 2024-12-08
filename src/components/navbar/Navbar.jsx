import { NavLink, useLocation } from "react-router-dom";

import {
  FaHouseUser,
  FaPortrait,
  FaUserTie,
  FaUserCheck,
  FaRobot,
  FaLockOpen,
  FaClipboardList,
} from "react-icons/fa";
import { useEffect } from "react";

const links = [
  {
    icon: FaHouseUser,
    title: "Candidatos",
    path: "/general",
    matchingPaths: ["/", "/general"],
  },
  {
    icon: FaUserTie,
    title: "Vacantes",
    path: "/offers",
    matchingPaths: ["/offers", "/create-offers"],
  },
  { icon: FaClipboardList, title: "Entrevistas", path: "/entrevistas" },
  { icon: FaPortrait, title: "Perfil", path: "/profile" },
  { icon: FaRobot, title: "Bot", path: "/bot" },
];

export const Navbar = ({ setLoged, setIsOpenMobilMenu, isOpenMobilMenu }) => {
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setIsOpenMobilMenu(false);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const location = useLocation();
  const handleOnClickLoged = () => {
    setLoged("");
  };

  return (
    <>
      <div className="lg:flex hidden bg-primary max-w-[250px] min-w-[250px]  justify-between flex-col max-h-screen sticky top-0 pt-40">
        <ul className="flex flex-col gap-8 h-full text-lg">
          {links.map((link, i) => (
            <li
              className={`px-10 py-2
              transition-all duration-150
            ${
              (link.matchingPaths &&
                link.matchingPaths.includes(location.pathname)) ||
              location.pathname === link.path
                ? "bg-secondary shadow-xl text-white"
                : "hover:text-white"
            }`}
              key={link.path}
            >
              <NavLink className="flex gap-2 items-center " to={link.path}>
                <link.icon className="text-3xl" /> {link.title}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="flex justify-center py-6 transition-all duration-150 hover:text-red-600">
          <NavLink
            className="flex gap-2 items-center text-lg"
            onClick={handleOnClickLoged}
            to="/login"
          >
            <FaLockOpen className="text-3xl"></FaLockOpen>Cerrar Sesion
          </NavLink>
        </div>
      </div>

      {isOpenMobilMenu && (
        <div className="fixed z-10 top-0 left-0 w-screen h-screen bg-white flex justify-end items-end">
          <div className="w-full h-full flex flex-col items-end justify-end pt-20">
            <ul className="flex flex-col gap-8 w-full text-lg h-[90%] overflow-y-auto  pb-10">
              {links.map((link, i) => (
                <li
                  onClick={() => setIsOpenMobilMenu(false)}
                  className={` px-10 py-2  transition-all duration-150 ${
                    (i === 0 && [link.path, "/"].includes(location.pathname)) ||
                    location.pathname === link.path
                      ? "bg-secondary text-white"
                      : "hover:bg-secondary/20"
                  }`}
                  key={link.path}
                >
                  <NavLink className="flex gap-2 items-center" to={link.path}>
                    <link.icon className="text-3xl" /> {link.title}
                  </NavLink>
                </li>
              ))}
            </ul>

            <li className="  flex justify-center  border-t py-3 w-full bg-white transition-all duration-150 hover:text-red-600">
              <NavLink
                className="flex gap-2 items-center"
                onClick={handleOnClickLoged}
                to="/login"
              >
                <FaLockOpen className="text-3xl"></FaLockOpen>Cerrar Sesion
              </NavLink>
            </li>
          </div>
        </div>
      )}
    </>
  );
};
