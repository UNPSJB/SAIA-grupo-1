import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface VistaPublicaConfig{
    verGrafico: boolean;

    // ACA AGREGAMOS LOS DEMAS SWITCHS POR SI QUEREMOS MOSTRAR ALGO MAS EN LA VISTA PUBLICA

    // NOTA EN EL BACKEND DE QR Y DE IDENTIFICADOR UNICO AGREGA UN ATRIBUTO POR CADA GRAFICO O LISTADO ,ETC.. ,
    // QUE QUIERAS MOSTRAR EN LA VISTA PUBLICA, ESTO PARA QUE A LA VISTA LE LLEGUE LA INFO DE CUANDO ALGO 
    // SE DESACTIVO O ACTIVO
}
/*
interface VistaPublicaContextType {
    verGrafico: boolean;
    setVerGrafico: (ver: boolean) => void;
}*/

interface VistaPublicaContextType{
    config: VistaPublicaConfig

    actualizarConfig: (campo: keyof VistaPublicaConfig, valor: boolean) => void;
    setConfig: React.Dispatch<React.SetStateAction<VistaPublicaConfig>>;
}

const VistaPublicaContext = createContext<VistaPublicaContextType | undefined>(undefined);

export const VistaPublicaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<VistaPublicaConfig>({
        verGrafico: true

        //TODO LO QUE AGREGUEMOS EN EL VISTAPUBILICACONFIG VA ACA TAMBIEN INICIALIZADO EN TRU O FALSE DEPENDIENDO DE CADA UNO
    });

    const actualizarConfig = (campo: keyof VistaPublicaConfig, valor: boolean) => {
        setConfig(prev => ({ ...prev, [campo]: valor }));
    };

    return (
        <VistaPublicaContext.Provider value={{ config, actualizarConfig, setConfig }}>
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