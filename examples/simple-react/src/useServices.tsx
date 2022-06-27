import React, { useContext } from "react";
import { Services } from "js-hashchat";

const services = new Services(process.env.REACT_APP_STREAM_KEY!);
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
