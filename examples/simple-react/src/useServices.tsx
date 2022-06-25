import React, { useContext } from "react";
import { Services, services } from "js-hashchat";

export const ServicesContext = React.createContext<Services>(services);

export const ServicesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => {
  return useContext(ServicesContext);
};
