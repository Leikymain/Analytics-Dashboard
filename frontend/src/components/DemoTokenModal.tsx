import React, { useState } from "react";

interface Props {
  onSubmit: (token: string) => void;
}

const DemoTokenModal: React.FC<Props> = ({ onSubmit }) => {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!token.trim()) {
      setError("Debes introducir un token válido");
      return;
    }

    onSubmit(token.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          Acceso a la Demo
        </h2>

        <p className="text-gray-600 text-sm mb-4">
          Introduce tu token de acceso para usar esta demo.
        </p>

        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Pega tu token aquí"
          className="w-full border border-gray-300 p-3 rounded-lg mb-3 text-gray-700"
        />

        {error && (
          <p className="text-red-500 text-sm mb-3">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
        >
          Confirmar Token
        </button>
      </div>
    </div>
  );
};

export default DemoTokenModal;
