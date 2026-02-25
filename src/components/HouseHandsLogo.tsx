import React from "react";
import tryggLogo from "@/assets/trygghandlogo.png";
import handplockatLogo from "@/assets/handplockat_logo.png";

type Props = {
  className?: string;
  variant?: "trygghand" | "handplockat";
};

export default function HouseHandsLogo({
  className = "",
  variant = "trygghand",
}: Props) {
  const logo = variant === "handplockat" ? handplockatLogo : tryggLogo;

  return <img src={logo} alt="Logo" className={className} />;
}