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
    <div className="fixed inset-0 w-full h-full bg-black/70 backdrop-blur-sm grid place-items-center z-50 p-4 md:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg ring-4 ring-blue-500/20">
            <Lock className="w-8 h-8 md:w-9 md:h-9 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Acceso a la Demo</h2>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-sm">
              Introduce tu token de acceso para usar esta demo.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
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
              className="w-full border-2 border-gray-200 p-4 md:p-5 rounded-xl text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 text-base font-medium hover:border-gray-300"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-200 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 md:py-5 rounded-xl font-semibold text-base md:text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30"
          >
            Confirmar Token
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoTokenModal;
