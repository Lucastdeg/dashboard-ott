import React from "react";
import defaultUserImg from "../../assets/user.png";

function Candidate({ user, showPopupCandidate }) {
  return (
    <div
      key={user._id}
      onClick={() => showPopupCandidate(user._id)}
      className="cursor-pointer p-6 bg-white rounded-lg border border-gray-300 shadow-md hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
    >
      <div className="flex items-center">
        <img
          src={user.photoUrl || defaultUserImg}
          alt={user.name}
          className="w-24 h-24 rounded-full border-4 border-secondary mr-4"
        />
        <div className="flex flex-col justify-center">
          <h4 className="text-2xl font-bold text-secondary">{user.name}</h4>
          <div className="mt-2 space-y-1">
            <div>
              <h5 className="text-gray-600">Talentos:</h5>
              <h4 className="text-gray-800 font-medium">{user.talents}</h4>
            </div>
            <div>
              <h5 className="text-gray-600">Experiencia:</h5>
              <h4 className="text-gray-800 font-medium">{user.experience}</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Candidate;
