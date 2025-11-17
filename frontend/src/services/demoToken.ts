// Guarda el token de la demo y lo recupera
export const getDemoToken = (): string | null => {
    return localStorage.getItem("demo_token");
  };
  
  export const askForDemoToken = (): string => {
    let token = localStorage.getItem("demo_token");
  
    if (!token) {
      token = prompt("Introduce tu token de acceso a la demo:");
  
      if (!token || token.trim().length < 10) {
        alert("Token inválido");
        throw new Error("No hay token válido");
      }
  
      localStorage.setItem("demo_token", token);
    }
  
    return token;
  };
  