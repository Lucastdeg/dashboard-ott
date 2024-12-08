import React from "react";
import { FaSearch } from "react-icons/fa";

function SearchBar() {
  return (
    <div className="relative w-full ">
      {" "}
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <FaSearch className="text-gray-400" />
      </div>
      <input
        className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full focus:outline-none  focus:border-[3px] focus:border-secondary transition duration-200 hover:bg-gray-50"
        type="text"
        placeholder="Buscar"
      />
    </div>
  );
}

export default SearchBar;
