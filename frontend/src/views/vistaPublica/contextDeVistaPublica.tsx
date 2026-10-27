import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface VistaPublicaContextType {
    verGrafico: boolean;
    setVerGrafico: (ver: boolean) => void;
}

const VistaPublicaContext = createContext<VistaPublicaContextType | undefined>(undefined);

export const VistaPublicaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [verGrafico, setVerGrafico] = useState<boolean>(true);

    return (
        <VistaPublicaContext.Provider value={{ verGrafico, setVerGrafico }}>
            {children}
        </VistaPublicaContext.Provider>
    );
};

export const useVistaPublica = () => {
    const context = useContext(VistaPublicaContext);
    if (!context) {
        throw new Error('useVistaPublica debe usarse dentro de un VistaPublicaProvider');
    }
    return context;
};