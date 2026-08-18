import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
    className?: string;
    to?: string;
}

export function BackButton({ className, to }: BackButtonProps) {
    const navigate = useNavigate();

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                "h-10 w-10 md:h-9 md:w-9 rounded-full hover:bg-accent/50 group transition-all",
                className
            )}
            onClick={() => (to ? navigate(to) : navigate(-1))}
            title="Back"
        >
            <ArrowLeft className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Button>
    );
}
