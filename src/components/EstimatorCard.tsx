import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import ValueEstimator from "@/components/ValueEstimator";

interface Props {
  customerId?: string | null;
  onSaved?: () => void;
  title?: string;
  description?: string;
  className?: string;
}

const EstimatorCard: React.FC<Props> = ({ customerId, onSaved, title = "Värdera bilder", description = "Analysera bilder och spara värdering", className = "" }) => {
  if (!customerId) return null;

  return (
    <Card className={`mb-8 lg:mb-10 ${className}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <ValueEstimator customerId={customerId} onSaved={onSaved} />
      </CardContent>
    </Card>
  );
};

export default EstimatorCard;