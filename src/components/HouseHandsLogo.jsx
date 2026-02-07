import React from 'react';

import LogoSymbol from '../assets/trygghandlogo.png';

const HouseHandsLogo = () => (
  <div className="flex items-center justify-center">
    <img
      src={LogoSymbol}
      alt="Trygg Hand logotyp"
      className="h-14 w-auto sm:h-16 rounded-lg shadow"
      onError={e => { e.target.onerror = null; e.target.src = "https://placehold.co/100x100/ef4444/ffffff?text=Err"; }}
    />
  </div>
);

export default HouseHandsLogo;
