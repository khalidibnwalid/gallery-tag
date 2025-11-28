import { Button } from "@/components/ui/button";
import { FileRoutesByTo } from "@/routeTree.gen";
import {
  GearIcon,
  HouseSimpleIcon,
  Icon,
  ImagesIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { useLocation, useRouter } from "@tanstack/react-router";

interface NavItem {
  route: keyof FileRoutesByTo;
  icon: Icon;
}

const navigationItems: NavItem[] = [
  { icon: HouseSimpleIcon, route: "/" },
  { icon: ImagesIcon, route: "/gallery" },
  { icon: StarIcon, route: "/favorites" },
  { icon: GearIcon, route: "/settings" },
];

export function Sidebar() {
  const router = useRouter();
  const { pathname } = useLocation();

  return (
    <nav className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-background/80 backdrop-blur-sm border rounded-xl shadow-lg">
      {navigationItems.map((item) => {
        const isActive = pathname === item.route;

        return (
          <Button
            key={item.route}
            variant={isActive ? "default" : "outline"}
            size="icon"
            onClick={() => router.navigate({ to: item.route })}
            className="size-12 "
            title={item.route}
          >
            <item.icon
              className="size-6"
              weight={isActive ? "fill" : "regular"}
            />
          </Button>
        );
      })}
    </nav>
  );
}
