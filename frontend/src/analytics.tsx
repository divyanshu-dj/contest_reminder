// src/analytics.js
import ReactGA from "react-ga4";

export const initGA = () => {
  ReactGA.initialize("G-M73HHC5WCL");
};

export const trackPageview = (path: string) => {
  ReactGA.send({ hitType: "pageview", page: path });
};
export const trackEvent = (category: string, action: string, label: string) => {
  ReactGA.event({
    category,
    action,
    label,
  });
};
