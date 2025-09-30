import React from 'react';

import LogoSymbol from '../assets/trygghandlogo.png';

const HouseHandsLogo = () => (
  <div className="flex items-center justify-center">
    <img
      style={{ height: "134px", width: "172px" }}
      src={LogoSymbol}
      alt="Trygg Hand logotyp"
      className="h-[20px] w-[20px] !h-[28px] !w-[28px] rounded-lg shadow"
      onError={e => { e.target.onerror = null; e.target.src = "https://placehold.co/100x100/ef4444/ffffff?text=Err"; }}
    />
  </div>
);

export default HouseHandsLogo;
