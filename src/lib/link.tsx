import { forwardRef } from "react";
import { Link as RouterLink } from "react-router";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; prefetch?: boolean; scroll?: boolean; replace?: boolean };

/** `next/link` look-alike: internal paths use the router, anything else (downloads under /api, mailto:, http:) is a plain anchor. */
const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch: _p, scroll: _s, replace, ...rest }, ref) {
  // a link to any other scheme (javascript:, data:, …) is never made clickable
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^(https?|mailto|tel):/i.test(href)) return <span {...(rest as React.HTMLAttributes<HTMLSpanElement>)} />;
  if (/^([a-z]+:|\/api\/|#)/i.test(href)) return <a ref={ref} href={href} {...rest} />;
  return <RouterLink ref={ref} to={href} replace={replace} {...rest} />;
});

export default Link;
