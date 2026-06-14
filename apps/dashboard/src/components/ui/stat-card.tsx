import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  className?: string;
}

function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-1 mt-1">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center text-xs font-medium",
                  trend.direction === "up" && "text-emerald-600",
                  trend.direction === "down" && "text-destructive",
                  trend.direction === "neutral" && "text-muted-foreground",
                )}
              >
                {trend.direction === "up" && (
                  <TrendingUp className="mr-0.5 h-3 w-3" />
                )}
                {trend.direction === "down" && (
                  <TrendingDown className="mr-0.5 h-3 w-3" />
                )}
                {trend.direction === "neutral" && (
                  <Minus className="mr-0.5 h-3 w-3" />
                )}
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { StatCard, type StatCardProps };
