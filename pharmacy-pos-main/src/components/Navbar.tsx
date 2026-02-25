import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  BarChart3,
  Users
} from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/pos", label: "POS", icon: ShoppingCart },
    { path: "/inventory", label: "Inventory", icon: Package },
    { path: "/alerts", label: "Alerts", icon: AlertTriangle },
    { path: "/reports", label: "Reports", icon: BarChart3 },
    { path: "/suppliers", label: "Suppliers", icon: Users },
  ];

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Smart Pharmacy
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "ghost"}
                size="sm"
                asChild
                className={isActive(item.path) ? "bg-primary text-primary-foreground" : ""}
              >
                <Link to={item.path} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
