
// Handplockat logotyp-komponent
import handplockatLogo from '../assets/handplockat_logo.png';

const HandplockatLogo = ({ className = "h-16 w-auto md:h-20" }: { className?: string }) => (
  <img src={handplockatLogo} alt="Handplockat logotyp" className={className} />
);

export default HandplockatLogo;