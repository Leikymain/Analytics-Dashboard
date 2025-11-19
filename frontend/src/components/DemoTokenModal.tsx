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
    <div 
      className="fixed inset-0 w-full h-full flex items-center justify-center z-50 p-4 transition-all duration-250 ease-out"
      style={{ 
        background: 'rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div 
        className="bg-white/95 backdrop-blur-sm w-full min-w-[480px] max-w-lg mx-auto transition-all duration-250 ease-out"
        style={{
          padding: '36px',
          borderRadius: '20px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Encabezado */}
        <div className="flex flex-col items-center text-center space-y-5 mb-8">
          <div className="bg-linear-to-br from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg transition-all duration-250 ease-out">
            <Lock className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-2">
            <h2 
              className="text-gray-900 tracking-tight transition-all duration-250 ease-out"
              style={{
                fontSize: '22px',
                fontWeight: 700
              }}
            >
              Acceso a la Demo
            </h2>
            <p 
              className="leading-[1.4] max-w-sm transition-all duration-250 ease-out"
              style={{
                fontSize: '15px',
                color: '#555'
              }}
            >
              Introduce tu token de acceso para usar esta demo.
            </p>
            <br />
          </div>
        </div>

        {/* Formulario */}
        <div className="space-y-5">
          <div>
            <input
              value={token}
              onChange={(e) => { setToken(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="Pega tu token aquí"
              className="w-full border border-gray-300 text-gray-900 placeholder-gray-400 outline-none transition-all duration-250 ease-out text-base font-medium focus:border-blue-500"
              style={{
                height: '44px',
                borderRadius: '10px',
                padding: '0 16px',
                boxShadow: 'none'
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
              }}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-200 transition-all duration-250 ease-out">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{error}</p>
            </div>
          )}
          <br />
          <button
            onClick={handleSubmit}
            className="w-full text-white font-bold text-base transition-all duration-250 ease-out focus:outline-none focus:ring-4 focus:ring-blue-500/30"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              height: '46px',
              borderRadius: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
          >
            Confirmar Token
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoTokenModal;
