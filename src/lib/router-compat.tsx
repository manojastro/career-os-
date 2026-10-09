import { Link as RouterLink, useNavigate, useRouterState } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children?: ReactNode;
};

export function Link({ href, children, ...rest }: LinkProps) {
  return (
    <RouterLink to={href as never} {...(rest as Record<string, unknown>)}>
      {children}
    </RouterLink>
  );
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (to: string) => {
      void navigate({ to: to as never });
    },
    replace: (to: string) => {
      void navigate({ to: to as never, replace: true });
    },
    refresh: () => {},
  };
}

export function usePathname() {
  return useRouterState({ select: (state) => state.location.pathname });
}

