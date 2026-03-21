import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-display font-bold text-foreground">404</h1>
        <p className="text-xl text-muted-foreground">Faqja nuk u gjet</p>
        <Button variant="gold" onClick={() => navigate('/')}>
          Kthehu në Fillim
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
