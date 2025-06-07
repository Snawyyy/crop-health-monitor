// src/components/LayerControlPanel.tsx
import React from "react";
import Logo from "../assets/Logo.png";

const Header: React.FC = () => {
  return (
    <div className="Header">
      {" "}
      {/* This className should match the CSS in App.css */}
      <img src={Logo} alt="Logo" className="Logo" />{" "}
      {/* This className should match App.css */}
      <h2>My Geospatial Dashboard</h2>{" "}
      {/* This h2 can also be styled via App.css or here */}
    </div>
  );
};

export default Header;
