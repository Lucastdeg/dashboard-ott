function Loader({ pixelSize = "48" }) {
  return (
    <div
      className="border-4 border-secondary border-t-transparent rounded-full animate-spin"
      style={{ width: `${pixelSize}px`, height: `${pixelSize}px` }}
    ></div>
  );
}

export default Loader;
