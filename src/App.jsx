import { useState } from "react";
import { LoggedLayout } from "./layouts/LoggedLayout";
import { UnloggedLayout } from "./layouts/UnloggedLayout";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const App = () => {
  const [loged, setLoged] = useState("");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

  return (
    <div className="min-h-screen ">
      {loged === "loged" ? (
        <LoggedLayout
          setLoged={setLoged}
          user={user}
          token={token}
          setUser={setUser}
        ></LoggedLayout>
      ) : (
        <UnloggedLayout
          setLoged={setLoged}
          setUser={setUser}
          setToken={setToken}
        ></UnloggedLayout>
      )}

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};
