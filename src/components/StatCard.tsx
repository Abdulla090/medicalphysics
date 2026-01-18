interface StatCardProps {
  value: string;
  label: string;
}

const StatCard = ({ value, label }: StatCardProps) => {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-primary">{value}</div>
      <div className="text-muted-foreground mt-1">{label}</div>
    </div>
  );
};

export default StatCard;
