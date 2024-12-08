import { useState } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";

import { General } from "../routes/Logged/general/General";
import { CreateOffers } from "../routes/Logged/create-offers/CreateOffers";
import { Offers } from "../routes/Logged/offers/Offers";
import { Profile } from "../routes/Logged/profile/Profile";
import { Bot } from "../routes/Logged/bot/Bot";

import { Navbar } from "../components/navbar/Navbar";
import { Header } from "../components/header/Header";
import Entrevistas from "../routes/Logged/entrevistas/Entrevistas";

export const LoggedLayout = ({ setLoged, user, token }) => {
  const [isOpenMobilMenu, setIsOpenMobilMenu] = useState(false);
  const location = useLocation();
  return (
    <div className="flex w-full min-h-screen">
      <Header
        setIsOpenMobilMenu={setIsOpenMobilMenu}
        isOpenMobilMenu={isOpenMobilMenu}
        user={user}
        token={token}
      ></Header>

      <Navbar
        setLoged={setLoged}
        setIsOpenMobilMenu={setIsOpenMobilMenu}
        isOpenMobilMenu={isOpenMobilMenu}
      ></Navbar>

      <div
        className={`flex justify-center w-full   ${
          location?.pathname?.includes("bot")
            ? "px-0  pt-[66px] xl:px-6 xl:pb-10 xl:pt-24"
            : "px-6 pt-24 pb-10"
        }`}
      >
        <div className="max-w-7xl w-full">
          <Routes>
            <Route
              path="/"
              element={<General user={user} token={token} />}
            ></Route>
            <Route
              path="/general"
              element={<General user={user} token={token} />}
            ></Route>

            <Route
              path="/create-offers"
              element={<CreateOffers user={user} token={token} />}
            ></Route>
            <Route
              path="/offers"
              element={<Offers user={user} token={token} />}
            ></Route>
            <Route
              path="/entrevistas"
              element={<Entrevistas user={user} token={token} />}
            ></Route>

            <Route
              path="/profile"
              element={<Profile user={user} token={token} />}
            ></Route>

            <Route
              path="/bot"
              element={<Bot user={user} token={token} />}
            ></Route>

            <Route path="/*" element={<Navigate to="/general" />}></Route>
          </Routes>
        </div>
      </div>
    </div>
  );
};

// <div className="card-profile">
//   <h2>Tus entrevistas</h2>
//   <div className="edit-profile">
//     <FaPen className="icon-profile" />
//     <h3>Has agendado 0 entrevistas</h3>
//   </div>
//   <div className="edit-profile">
//     <FaPen className="icon-profile" />
//     <h3>0 personas estan esperando por una entrevista</h3>
//   </div>
// </div>
