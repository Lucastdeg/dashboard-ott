import { FaChevronDown } from "react-icons/fa";

const filtersOptions = [
  {
    name: "experience",
    placeholder: "Experiencia",
    options: [
      { value: "todas", label: "Todas" },
      { value: "menos de 1 año", label: "Menos de 1 año" },
      { value: "de 1 a 3 años", label: "De 1 a 3 años" },
      { value: "de 3 a 5 años", label: "De 3 a 5 años" },
      { value: "de 5 a 8 años", label: "De 5 a 8 años" },
      { value: "más de 10 años", label: "Más de 10 años" },
    ],
  },
  {
    name: "languaje",
    placeholder: "Idioma",
    options: [
      { value: "todos", label: "Todos" },
      { value: "ingles", label: "Ingles" },
      { value: "frances", label: "Frances" },
      { value: "portugues", label: "Portugues" },
    ],
  },
  {
    name: "country",
    placeholder: "País",
    options: [
      { value: "todos", label: "Todos" },
      { value: "Panamá", label: "Panamá" },
      { value: "Colombia", label: "Colombia" },
      { value: "Argentina", label: "Argentina" },
      { value: "Chile", label: "Chile" },
    ],
  },
  {
    name: "video",
    placeholder: "Usuarios con video",
    options: [
      { value: "si", label: "Si" },
      { value: "no", label: "No" },
    ],
  },
];

const FilterModule = ({ setAllFilters, handleOnChange }) => {
  return (
    <div className="flex flex-col space-y-4 w-full py-4">
      <div className="flex gap-4 flex-col lg:flex-row">
        {filtersOptions.map((filter) => (
          <div className="relative w-full">
            <select
              key={filter.placeholder}
              name={filter.name}
              className="appearance-none border hover:bg-gray-50 cursor-pointer border-gray-300 rounded-lg py-2 px-4 pr-10 w-full focus:outline-none  focus:border-[3px] focus:border-secondary transition duration-200 bg-white"
              defaultValue=""
              onChange={handleOnChange}
            >
              <option value="" disabled>
                {filter.placeholder}
              </option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
              <FaChevronDown className="text-gray-500 text-xs" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilterModule;
