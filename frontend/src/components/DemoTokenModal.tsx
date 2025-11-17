import React, { useState } from "react";
import { Lock, AlertCircle } from "lucide-react";

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
    <div className="fixed inset-0 w-full h-full bg-black/70 backdrop-blur-sm grid place-items-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-10 grid gap-6">
        <div className="flex flex-col items-center text-center">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl mb-4 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800">Acceso a la Demo</h2>
          <p className="text-gray-600 text-sm">
            Introduce tu token de acceso para usar esta demo.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <input
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="Pega tu token aquí"
              className="w-full border-2 border-gray-200 p-4 rounded-xl text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
          >
            Confirmar Token
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoTokenModal;
